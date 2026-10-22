package br.com.multisaude.auditoria;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.auditoria.AccessAudit.AccessView;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;

@RestController
@RequestMapping("/api/v1/auditoria")
public class AuditController {
    private final AccessAudit audit;
    private final TenantTransactions tx;

    public AuditController(AccessAudit audit, TenantTransactions tx) {
        this.audit = audit;
        this.tx = tx;
    }

    @GetMapping("/acessos") @PreAuthorize("hasAuthority('auditoria:ler')")
    public List<AccessView> accesses(@AuthenticationPrincipal Session s, @RequestParam(required = false) UUID pacienteId,
                                     @RequestParam(required = false) UUID usuarioId, @RequestParam(required = false) OffsetDateTime de,
                                     @RequestParam(required = false) OffsetDateTime ate, @RequestParam(defaultValue = "100") int limite) {
        int safeLimit = Math.max(1, Math.min(limite, 200));
        return tx.inTenant(s.identity().tenantId(), () -> audit.search(pacienteId, usuarioId, de, ate, safeLimit));
    }
}
