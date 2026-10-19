package br.com.multisaude.pacientes;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.profissionais.ProfessionalRepository;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.pacientes.PatientModels.*;

@RestController
@RequestMapping("/api/v1/pacientes")
public class PatientController {
    private final PatientRepository repository;
    private final TenantTransactions transactions;
    private final ProfessionalRepository professionals;
    public PatientController(PatientRepository repository, TenantTransactions transactions, ProfessionalRepository professionals) {
        this.repository = repository; this.transactions = transactions; this.professionals = professionals;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:ler_vinculados')")
    public List<PatientView> search(@AuthenticationPrincipal Session session,
        @RequestParam(defaultValue = "") String busca,
        @RequestParam(defaultValue = "50") int limite) {
        int safeLimit = Math.max(1, Math.min(limite, 100));
        return transactions.inTenant(session.identity().tenantId(), () -> seesEveryPatient(session)
            ? repository.search(busca, safeLimit)
            : professionals.idOfUser(session.identity().usuarioId()).map(p -> repository.searchConnected(busca, safeLimit, p)).orElse(List.of()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('pacientes:criar')")
    public PatientView create(@AuthenticationPrincipal Session session, @Valid @RequestBody CreatePatientRequest request) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.create(request, session.identity().tenantId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:ler_vinculados')")
    public PatientView find(@AuthenticationPrincipal Session session, @PathVariable java.util.UUID id) {
        return transactions.inTenant(session.identity().tenantId(), () -> {
            if (seesEveryPatient(session)) return repository.find(id);
            // 404 também quando existe mas não há vínculo: não revela que o paciente é da clínica.
            return professionals.idOfUser(session.identity().usuarioId()).flatMap(p -> repository.findConnected(id, p))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
        });
    }

    private static boolean seesEveryPatient(Session session) {
        return session.identity().permissoes().contains("pacientes:ler");
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
