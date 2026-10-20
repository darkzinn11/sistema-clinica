package br.com.multisaude.pacientes;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.pacientes.PatientModels.*;

@RestController
@RequestMapping("/api/v1/pacientes")
public class PatientController {
    private final PatientRepository repository;
    private final TenantTransactions transactions;
    public PatientController(PatientRepository repository, TenantTransactions transactions) {
        this.repository = repository; this.transactions = transactions;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('pacientes:ler')")
    public List<PatientView> search(@AuthenticationPrincipal Session session,
        @RequestParam(defaultValue = "") String busca,
        @RequestParam(defaultValue = "50") int limite) {
        int safeLimit = Math.max(1, Math.min(limite, 100));
        return transactions.inTenant(session.identity().tenantId(), () -> repository.search(busca, safeLimit));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('pacientes:criar')")
    public PatientView create(@AuthenticationPrincipal Session session, @Valid @RequestBody CreatePatientRequest request) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.create(request, session.identity().tenantId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('pacientes:ler')")
    public PatientView find(@AuthenticationPrincipal Session session, @PathVariable java.util.UUID id) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.find(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('pacientes:editar')")
    public PatientView update(@AuthenticationPrincipal Session session, @PathVariable java.util.UUID id,
        @Valid @RequestBody UpdatePatientRequest request) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('pacientes:inativar')")
    public void deactivate(@AuthenticationPrincipal Session session, @PathVariable java.util.UUID id) {
        transactions.inTenant(session.identity().tenantId(), () -> { repository.deactivate(id); return null; });
    }
}
