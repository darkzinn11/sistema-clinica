package br.com.multisaude.inicio;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import br.com.multisaude.auditoria.AccessAudit;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.pacientes.PatientReadGuard;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.inicio.InicioModels.*;

/**
 * A tela de Início da recepção, num pedido só: números do dia da unidade da sessão, próximos atendimentos, sala de espera, ocupação e
 * aniversariantes. Mostra nomes de pacientes, então passa pelo mesmo contenção de volume e pela mesma trilha de acesso das listagens.
 */
@RestController
@RequestMapping("/api/v1/inicio")
public class InicioController {
    private final InicioRepository repository;
    private final TenantTransactions transactions;
    private final PatientReadGuard guard;
    private final AccessAudit audit;

    public InicioController(InicioRepository repository, TenantTransactions transactions, PatientReadGuard guard, AccessAudit audit) {
        this.repository = repository; this.transactions = transactions; this.guard = guard; this.audit = audit;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('agenda:ler') and hasAuthority('pacientes:ler')")
    public Resumo today(@AuthenticationPrincipal Session session) {
        var identity = session.identity();
        boolean values = identity.permissoes().contains("agenda:ver_valores");
        guard.request(identity.tenantId(), identity.usuarioId(), true);
        return transactions.inTenant(identity.tenantId(), () -> {
            var unit = identity.unidadeId();
            var zone = repository.zone(unit);
            LocalDate today = LocalDate.now(zone);
            int[] confirmation = repository.confirmation(unit, today, zone);
            List<Proximo> next = repository.next(unit, OffsetDateTime.now(), today, zone, 6);
            List<Espera> waiting = repository.waiting(unit, today, zone, 6);
            List<Aniversariante> birthdays = repository.birthdays(today, 8);
            List<UUID> shown = new ArrayList<>();
            next.forEach(p -> shown.add(p.pacienteId()));
            waiting.forEach(w -> shown.add(w.pacienteId()));
            birthdays.forEach(b -> shown.add(b.pacienteId()));
            guard.records(identity.tenantId(), identity.usuarioId(), true, shown.size());
            audit.patients(identity.tenantId(), identity.usuarioId(), shown.stream().distinct().toList(), "listar_pacientes");
            return new Resumo(today, repository.count(unit, today, zone), repository.count(unit, today.minusDays(1), zone), confirmation[0],
                confirmation[1] == 0 ? 0 : Math.round(confirmation[0] * 100f / confirmation[1]), repository.waitingCount(unit, today, zone),
                values ? repository.revenue(unit, today, zone) : null, values ? repository.revenue(unit, today.minusDays(1), zone) : null,
                repository.unconfirmed(unit, today.plusDays(1), zone), next, waiting, repository.occupancy(unit, today, zone), birthdays);
        });
    }
}
