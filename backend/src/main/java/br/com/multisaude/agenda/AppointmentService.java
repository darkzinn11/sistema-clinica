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
        if (!x.fim().isAfter(x.inicio())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fim deve ser posterior ao início.");
        if (!x.unidadeId().equals(s.identity().unidadeId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unidade diferente da unidade ativa da sessão.");
        }
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                if (!repo.referencesAreValid(x.unidadeId(), x.profissionalId(), x.pacienteId(), x.procedimentoId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paciente, profissional, procedimento ou unidade inválidos.");
                }
                requireFreeSlot(x.unidadeId(), x.profissionalId(), x.inicio(), x.fim(), null);
                AppointmentView created = repo.createAppointment(x, s.identity().tenantId(), s.identity().usuarioId(), null);
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
     * Regra da clínica: só se agenda dentro da grade do profissional. Não há encaixe fora dela nem sobre bloqueio.
     * 422 = o horário pedido é inválido para esta agenda; 409 = o horário é válido mas já está ocupado.
     */
    private void requireFreeSlot(UUID unit, UUID professional, OffsetDateTime from, OffsetDateTime to, UUID ignoring) {
        ZoneId zone = schedule.unitZone(unit);
        ZonedDateTime localStart = from.atZoneSameInstant(zone);
        ZonedDateTime localEnd = to.atZoneSameInstant(zone);
        if (!localEnd.toLocalDate().equals(localStart.toLocalDate())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "O agendamento não pode atravessar a meia-noite.");
        }
        if (!schedule.fitsInGrade(professional, unit, localStart.toLocalDate(), localStart.toLocalTime(), localEnd.toLocalTime())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Horário fora da grade do profissional.");
        }
        schedule.blockReason(unit, professional, from, to).ifPresent(reason -> {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Horário bloqueado: " + reason);
        });
        if (repo.hasConflict(professional, from, to, ignoring)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Horário ocupado para este profissional.");
        }
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
        if (!request.fim().isAfter(request.inicio())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fim deve ser posterior ao início.");
        }
        return tx.inTenant(s.identity().tenantId(), () -> {
            AppointmentView current = load(s, id, request.versao());
            requireMotive(request.motivoId());
            if (!CAN_RESCHEDULE.contains(current.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Agendamento em estado " + current.status() + " não pode ser remarcado.");
            }
            // O próprio agendamento fica fora da checagem: remarcar 15 minutos adiante sobrepõe o horário antigo.
            requireFreeSlot(current.unidadeId(), current.profissionalId(), request.inicio(), request.fim(), current.id());
            // O antigo precisa liberar o horário antes do insert, por causa da constraint de exclusão.
            apply(s, current, request.versao(), "remarcado", request.motivoId(), request.observacao());
            AppointmentView created = repo.createAppointment(new CreateAppointmentRequest(current.unidadeId(), current.profissionalId(),
                current.pacienteId(), current.procedimentoId(), request.inicio(), request.fim(), current.observacao(), current.canal()),
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
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agendamento não encontrado."));
        if (!current.unidadeId().equals(s.identity().unidadeId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Agendamento pertence a outra unidade.");
        }
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
