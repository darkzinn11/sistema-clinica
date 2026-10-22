package br.com.multisaude.fila;

import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import br.com.multisaude.agenda.ScheduleRepository;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.identidade.IdentityRepository;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.fila.PainelModels.*;

@RestController
@RequestMapping("/api/v1/painel")
public class PainelController {
    private final PainelRepository repository;
    private final TenantTransactions transactions;
    private final IdentityRepository identities;
    private final ScheduleRepository schedule;

    public PainelController(PainelRepository repository, TenantTransactions transactions, IdentityRepository identities, ScheduleRepository schedule) {
        this.repository = repository;
        this.transactions = transactions;
        this.identities = identities;
        this.schedule = schedule;
    }

    @GetMapping("/chamadas")
    @PreAuthorize("hasAuthority('painel:ver')")
    public Calls calls(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), () -> {
            // O dia da senha é o dia da UNIDADE (fuso dela), não o do servidor: depois das 21h aqui o servidor já está no dia seguinte.
            List<Call> latest = repository.latest(session.identity().unidadeId(), LocalDate.now(schedule.unitZone(session.identity().unidadeId())), 8);
            String[] names = identities.names(session.identity().unidadeId()).orElse(new String[] {"", ""});
            return new Calls(names[0], names[1], latest.isEmpty() ? null : latest.get(0), latest);
        });
    }
}
