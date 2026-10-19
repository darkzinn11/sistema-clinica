package br.com.multisaude.pacientes;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.auditoria.AccessAudit;
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
    private final PatientReadGuard guard;
    private final AccessAudit audit;
    public PatientController(PatientRepository repository, TenantTransactions transactions, ProfessionalRepository professionals, PatientReadGuard guard, AccessAudit audit) {
        this.repository = repository; this.transactions = transactions; this.professionals = professionals; this.guard = guard; this.audit = audit;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:ler_vinculados')")
    public List<PatientView> search(@AuthenticationPrincipal Session session,
        @RequestParam(defaultValue = "") String busca,
        @RequestParam(defaultValue = "50") int limite) {
        int safeLimit = Math.max(1, Math.min(limite, 100));
        boolean full = seesEveryPatient(session);
        guard.request(session.identity().tenantId(), session.identity().usuarioId(), full);
        return transactions.inTenant(session.identity().tenantId(), () -> {
            List<PatientView> found = full
                ? repository.search(busca, safeLimit)
                : professionals.idOfUser(session.identity().usuarioId()).map(p -> repository.searchConnected(busca, safeLimit, p)).orElse(List.of());
            // Dentro da transação: se o orçamento por hora recusar, nada é entregue nem registrado.
            guard.records(session.identity().tenantId(), session.identity().usuarioId(), full, found.size());
            audit.patients(session.identity().tenantId(), session.identity().usuarioId(), found.stream().map(PatientView::id).toList(), "listar_pacientes");
            return found;
        });
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
        boolean full = seesEveryPatient(session);
        guard.request(session.identity().tenantId(), session.identity().usuarioId(), full);
        return transactions.inTenant(session.identity().tenantId(), () -> {
            PatientView found = full ? repository.find(id)
                // 404 também quando existe mas não há vínculo: não revela que o paciente é da clínica.
                : professionals.idOfUser(session.identity().usuarioId()).flatMap(p -> repository.findConnected(id, p))
                    .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));
            guard.records(session.identity().tenantId(), session.identity().usuarioId(), full, 1);
            audit.patients(session.identity().tenantId(), session.identity().usuarioId(), List.of(found.id()), "ver_paciente");
            return found;
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
