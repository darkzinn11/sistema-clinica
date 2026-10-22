package br.com.multisaude.agenda;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.auditoria.AccessAudit;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.pacientes.PatientReadGuard;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.agenda.AgendaViewModels.*;

/**
 * A agenda como a tela a desenha: agendamentos da unidade da sessão num intervalo de dias, com nomes de paciente, profissional e procedimento.
 * Quem tem agenda:ler vê todos os profissionais; quem só tem agenda:ler_proprios vê só os agendamentos do profissional ligado ao seu usuário.
 * Mostra nomes de pacientes, então conta no limite de volume e entra na trilha de acesso, como as listagens de pacientes.
 */
@RestController
@RequestMapping("/api/v1/agenda")
public class AgendaViewController {
    private static final int MAX_DAYS = 31;
    private final AgendaViewRepository repository;
    private final ScheduleRepository schedule;
    private final AgendaAccess access;
    private final TenantTransactions transactions;
    private final PatientReadGuard guard;
    private final AccessAudit audit;

    public AgendaViewController(AgendaViewRepository repository, ScheduleRepository schedule, AgendaAccess access, TenantTransactions transactions, PatientReadGuard guard, AccessAudit audit) {
        this.repository = repository; this.schedule = schedule; this.access = access; this.transactions = transactions; this.guard = guard; this.audit = audit;
    }

    @GetMapping("/agendamentos")
    @PreAuthorize("hasAnyAuthority('agenda:ler', 'agenda:ler_proprios')")
    public List<AgendaItem> between(@AuthenticationPrincipal Session session, @RequestParam LocalDate de, @RequestParam LocalDate ate,
        @RequestParam(required = false) UUID profissionalId) {
        if (ate.isBefore(de)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Intervalo inválido.");
        if (ChronoUnit.DAYS.between(de, ate) >= MAX_DAYS) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consulte no máximo " + MAX_DAYS + " dias por vez.");
        var identity = session.identity();
        boolean full = identity.permissoes().contains("agenda:ler");
        boolean values = identity.permissoes().contains("agenda:ver_valores");
        guard.request(identity.tenantId(), identity.usuarioId(), full);
        return transactions.inTenant(identity.tenantId(), () -> {
            var scope = access.scope(session);
            UUID professional = profissionalId;
            if (!scope.all()) {
                if (scope.professional() == null) return List.of();                       // médico sem profissional ligado: nada para ver
                if (professional != null) scope.requireCanSee(professional);
                professional = scope.professional();
            }
            ZoneId zone = schedule.unitZone(identity.unidadeId());
            List<AgendaItem> found = repository.between(identity.unidadeId(), zone, de, ate, professional, values);
            guard.records(identity.tenantId(), identity.usuarioId(), full, found.size());
            audit.patients(identity.tenantId(), identity.usuarioId(), found.stream().map(AgendaItem::pacienteId).distinct().toList(), "listar_pacientes");
            return found;
        });
    }
}
