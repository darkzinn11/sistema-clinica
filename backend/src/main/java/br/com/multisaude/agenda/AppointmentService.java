package br.com.multisaude.agenda;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.agenda.ScheduleModels.GradeView;
import br.com.multisaude.profissionais.ProfessionalRepository;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.agenda.AgendaModels.*;

/**
 * Ciclo de vida do agendamento. Cada ação valida tudo antes de alterar qualquer linha e grava o histórico
 * na mesma transação; assim, uma recusa nunca deixa o agendamento pela metade.
 */
@Service
public class AppointmentService {
    // Cancelar e remarcar têm rota própria porque exigem motivo; aqui ficam só as transições comuns.
    private static final Map<String, Set<String>> MANUAL_TRANSITIONS = Map.of(
        "agendado", Set.of("confirmado", "check_in", "nao_compareceu"),
        "confirmado", Set.of("check_in", "nao_compareceu"),
        "check_in", Set.of("em_atendimento"),
        "em_atendimento", Set.of("atendido"));
    // Iniciar e finalizar atendimento é do médico, e só no próprio; confirmar, check-in e falta são da recepção.
    private static final Set<String> CLINICAL_STATUS = Set.of("em_atendimento", "atendido");
    private static final Set<String> CAN_CANCEL = Set.of("agendado", "confirmado", "check_in");
    private static final Set<String> CAN_RESCHEDULE = Set.of("agendado", "confirmado");

    private final AgendaRepository repo;
    private final ScheduleRepository schedule;
    private final ProfessionalRepository professionals;
    private final TenantTransactions tx;

    public AppointmentService(AgendaRepository repo, ScheduleRepository schedule, ProfessionalRepository professionals, TenantTransactions tx) {
        this.repo = repo;
        this.schedule = schedule;
        this.professionals = professionals;
        this.tx = tx;
    }

    public AppointmentView create(Session s, CreateAppointmentRequest x) {
        if (x.fim() != null && !x.fim().isAfter(x.inicio())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fim deve ser posterior ao início.");
        if (!x.unidadeId().equals(s.identity().unidadeId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unidade diferente da unidade ativa da sessão.");
        }
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                if (!repo.referencesAreValid(x.unidadeId(), x.profissionalId(), x.pacienteId(), x.procedimentoId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente, profissional, procedimento ou unidade inválidos.");
                }
                if (!professionals.isEnabled(x.profissionalId(), x.procedimentoId())) {
                    throw unprocessable("Este profissional não realiza este procedimento.");
                }
                OffsetDateTime end = requireFreeSlot(x.unidadeId(), x.profissionalId(), x.procedimentoId(), x.inicio(), x.fim(), null);
                AppointmentView created = repo.createAppointment(new CreateAppointmentRequest(x.unidadeId(), x.profissionalId(), x.pacienteId(),
                    x.procedimentoId(), x.inicio(), end, x.observacao(), x.canal()), s.identity().tenantId(), s.identity().usuarioId(), null);
                repo.addHistory(s.identity().tenantId(), created.id(), null, created.status(), null, null, s.identity().usuarioId());
                return created;
            });
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Corrida entre duas requisições: a constraint do banco é a última palavra.
            if (String.valueOf(e.getMostSpecificCause().getMessage()).contains("agendamento_profissional_sem_conflito")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Horário ocupado para este profissional.");
            }
            throw e;
        }
    }

    /**
     * Regra da clínica: só se agenda dentro da grade do profissional, em blocos. Não há encaixe fora dela nem sobre bloqueio.
     * O início precisa cair num bloco da janela; o procedimento ocupa um bloco (ou blocos seguidos, se o tempo medido for
     * maior). Se o cliente mandar o fim, ele precisa bater com o cálculo. Devolve o fim calculado.
     * 422 = o horário pedido é inválido para esta agenda; 409 = o horário é válido mas já está ocupado.
     */
    private OffsetDateTime requireFreeSlot(UUID unit, UUID professional, UUID procedure, OffsetDateTime from, OffsetDateTime requestedEnd, UUID ignoring) {
        ZoneId zone = schedule.unitZone(unit);
        ZonedDateTime localStart = from.atZoneSameInstant(zone);
        GradeView window = schedule.windowAt(professional, unit, localStart.toLocalDate(), localStart.toLocalTime())
            .orElseThrow(() -> unprocessable("Horário fora da grade do profissional."));
        int block = window.duracaoBlocoMin();
        int windowStart = AgendaSlots.minutesOfDay(window.inicio());
        int startMinute = AgendaSlots.minutesOfDay(localStart.toLocalTime());
        if (localStart.getSecond() != 0 || localStart.getNano() != 0 || (startMinute - windowStart) % block != 0) {
            throw unprocessable("Horário fora dos blocos da agenda: use horários de " + block + " em " + block + " minutos a partir das " + window.inicio() + ".");
        }
        int blocks = AgendaSlots.blocksNeeded(schedule.procedureTime(procedure).orElseThrow().minutes(), block);
        OffsetDateTime end = from.plusMinutes((long) blocks * block);
        if (requestedEnd != null && !requestedEnd.toInstant().equals(end.toInstant())) {
            throw unprocessable("Duração inválida: este procedimento ocupa " + blocks + " bloco(s) de " + block + " min (" + blocks * block + " min).");
        }
        if (startMinute + blocks * block > AgendaSlots.minutesOfDay(window.fim())) {
            throw unprocessable("Horário fora da grade do profissional.");
        }
        schedule.blockReason(unit, professional, from, end).ifPresent(reason -> {
            throw unprocessable("Horário bloqueado: " + reason);
        });
        if (repo.hasConflict(professional, from, end, ignoring)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Horário ocupado para este profissional.");
        }
        return end;
    }

    private static ResponseStatusException unprocessable(String message) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }

    public AppointmentView updateStatus(Session s, UUID id, StatusRequest request) {
        if (!MANUAL_TRANSITIONS.values().stream().anyMatch(targets -> targets.contains(request.status()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status inválido. Para cancelar ou remarcar use as rotas próprias.");
        }
        boolean clinical = CLINICAL_STATUS.contains(request.status());
        if (!s.identity().permissoes().contains(clinical ? "agenda:atender" : "agenda:editar")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissão para esta mudança de status.");
        }
        return tx.inTenant(s.identity().tenantId(), () -> {
            UUID ownOnly = clinical ? professionals.idOfUser(s.identity().usuarioId()).orElse(new UUID(0, 0)) : null;
            AppointmentView current = load(s, id, request.versao(), ownOnly);
            if (!MANUAL_TRANSITIONS.getOrDefault(current.status(), Set.of()).contains(request.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição não permitida: " + current.status() + " para " + request.status() + ".");
            }
            apply(s, current, request.versao(), request.status(), null, request.observacao());
            return reload(id);
        });
    }

    public AppointmentView cancel(Session s, UUID id, CancelRequest request) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            AppointmentView current = load(s, id, request.versao());
            requireMotive(request.motivoId());
            if (!CAN_CANCEL.contains(current.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Agendamento em estado " + current.status() + " não pode ser cancelado.");
            }
            apply(s, current, request.versao(), "cancelado", request.motivoId(), request.observacao());
            return reload(id);
        });
    }

    /** Devolve o NOVO agendamento; o original vira 'remarcado' e permanece consultável. */
    public AppointmentView reschedule(Session s, UUID id, RescheduleRequest request) {
        if (request.fim() != null && !request.fim().isAfter(request.inicio())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fim deve ser posterior ao início.");
        }
        return tx.inTenant(s.identity().tenantId(), () -> {
            AppointmentView current = load(s, id, request.versao());
            requireMotive(request.motivoId());
            if (!CAN_RESCHEDULE.contains(current.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Agendamento em estado " + current.status() + " não pode ser remarcado.");
            }
            // O próprio agendamento fica fora da checagem: com procedimento de vários blocos, remarcar um bloco adiante sobrepõe o horário antigo.
            OffsetDateTime end = requireFreeSlot(current.unidadeId(), current.profissionalId(), current.procedimentoId(), request.inicio(), request.fim(), current.id());
            // O antigo precisa liberar o horário antes do insert, por causa da constraint de exclusão.
            apply(s, current, request.versao(), "remarcado", request.motivoId(), request.observacao());
            AppointmentView created = repo.createAppointment(new CreateAppointmentRequest(current.unidadeId(), current.profissionalId(),
                current.pacienteId(), current.procedimentoId(), request.inicio(), end, current.observacao(), current.canal()),
                s.identity().tenantId(), s.identity().usuarioId(), current.id());
            repo.addHistory(s.identity().tenantId(), created.id(), null, created.status(), request.motivoId(), "Remarcado de " + current.id(), s.identity().usuarioId());
            return created;
        });
    }

    private AppointmentView load(Session s, UUID id, int expectedVersion) {
        return load(s, id, expectedVersion, null);
    }

    /** ownOnly: se informado, o agendamento precisa ser desse profissional; senão 404, igual a inexistente. */
    private AppointmentView load(Session s, UUID id, int expectedVersion, UUID ownOnly) {
        AppointmentView current = repo.lockAppointment(id)
            .filter(a -> ownOnly == null || a.profissionalId().equals(ownOnly))
            // Outra unidade responde 404, igual a inexistente: cada unidade só conhece a própria agenda.
            .filter(a -> a.unidadeId().equals(s.identity().unidadeId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agendamento não encontrado."));
        if (current.versao() != expectedVersion) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Agendamento foi alterado por outra pessoa. Recarregue e tente de novo.");
        }
        return current;
    }

    private void requireMotive(int motiveId) {
        if (!repo.motiveExists(motiveId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Motivo inválido.");
    }

    private void apply(Session s, AppointmentView current, int version, String to, Integer motive, String note) {
        if (!repo.changeStatus(current.id(), version, to)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Agendamento foi alterado por outra pessoa. Recarregue e tente de novo.");
        }
        repo.addHistory(s.identity().tenantId(), current.id(), current.status(), to, motive, note, s.identity().usuarioId());
    }

    private AppointmentView reload(UUID id) {
        return repo.lockAppointment(id).orElseThrow();
    }
}
