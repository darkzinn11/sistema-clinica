package br.com.multisaude.agenda;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
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
    private static final Set<String> CAN_CANCEL = Set.of("agendado", "confirmado", "check_in");
    private static final Set<String> CAN_RESCHEDULE = Set.of("agendado", "confirmado");

    private final AgendaRepository repo;
    private final TenantTransactions tx;

    public AppointmentService(AgendaRepository repo, TenantTransactions tx) {
        this.repo = repo;
        this.tx = tx;
    }

    public AppointmentView updateStatus(Session s, UUID id, StatusRequest request) {
        if (!MANUAL_TRANSITIONS.values().stream().anyMatch(targets -> targets.contains(request.status()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status inválido. Para cancelar ou remarcar use as rotas próprias.");
        }
        return tx.inTenant(s.identity().tenantId(), () -> {
            AppointmentView current = load(s, id, request.versao());
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
            if (repo.hasConflict(current.profissionalId(), request.inicio(), request.fim(), current.id())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Horário ocupado para este profissional.");
            }
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
        AppointmentView current = repo.lockAppointment(id)
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
