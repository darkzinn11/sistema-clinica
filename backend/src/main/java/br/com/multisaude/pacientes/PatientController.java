package br.com.multisaude.pacientes;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.agenda.AgendaViewModels.PatientAppointment;
import br.com.multisaude.agenda.AgendaViewRepository;
import br.com.multisaude.agenda.ScheduleRepository;
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
    private final AgendaViewRepository agendaView;
    private final ScheduleRepository schedule;
    public PatientController(PatientRepository repository, TenantTransactions transactions, ProfessionalRepository professionals, PatientReadGuard guard, AccessAudit audit,
        AgendaViewRepository agendaView, ScheduleRepository schedule) {
        this.repository = repository; this.transactions = transactions; this.professionals = professionals; this.guard = guard; this.audit = audit;
        this.agendaView = agendaView; this.schedule = schedule;
    }

    private static final String PRIORITIES = "prioridades", ORIGINS = "origens_paciente";

    /** Busca paginada: `pagina` (a partir de 0) e `tamanho` (ou `limite`, mais antigo); o total vem em X-Total-Count. */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:ler_vinculados')")
    public ResponseEntity<List<PatientSummary>> search(@AuthenticationPrincipal Session session,
        @RequestParam(defaultValue = "") String busca, @RequestParam(defaultValue = "") String inicial,
        @RequestParam(defaultValue = "ativos") String situacao, @RequestParam(defaultValue = "50") int limite,
        @RequestParam(required = false) Integer tamanho, @RequestParam(defaultValue = "0") int pagina) {
        int size = Math.max(1, Math.min(tamanho != null ? tamanho : limite, 100));
        int offset = Math.max(0, pagina) * size;
        boolean full = seesEveryPatient(session);
        guard.request(session.identity().tenantId(), session.identity().usuarioId(), full);
        return transactions.inTenant(session.identity().tenantId(), () -> {
            UUID professional = full ? null : professionals.idOfUser(session.identity().usuarioId()).orElse(null);
            if (!full && professional == null) return ResponseEntity.ok().header("X-Total-Count", "0").body(List.<PatientSummary>of());
            List<PatientSummary> found = repository.search(busca, inicial, situacao, size, offset, professional);
            int total = repository.count(busca, inicial, situacao, professional);
            // Dentro da transação: se o orçamento por hora recusar, nada é entregue nem registrado.
            guard.records(session.identity().tenantId(), session.identity().usuarioId(), full, found.size());
            audit.patients(session.identity().tenantId(), session.identity().usuarioId(), found.stream().map(PatientSummary::id).toList(), "listar_pacientes");
            return ResponseEntity.ok().header("X-Total-Count", String.valueOf(total)).body(found);
        });
    }

    /** Números do topo da lista de pacientes (sem dados individuais). */
    @GetMapping("/resumo")
    @PreAuthorize("hasAuthority('pacientes:ler')")
    public PatientStats stats(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), () -> {
            java.time.ZoneId zone = schedule.unitZone(session.identity().unidadeId());
            LocalDate today = LocalDate.now(zone);
            return repository.stats(today.withDayOfMonth(1).atStartOfDay(zone).toOffsetDateTime(), today);
        });
    }

    /** Agendamentos do paciente (passados e futuros, de todas as unidades da clínica). */
    @GetMapping("/{id}/agendamentos")
    @PreAuthorize("hasAuthority('pacientes:ler') and hasAnyAuthority('agenda:ler', 'agenda:ler_proprios')")
    public List<PatientAppointment> appointments(@AuthenticationPrincipal Session session, @PathVariable UUID id) {
        var identity = session.identity();
        guard.request(identity.tenantId(), identity.usuarioId(), true);
        return transactions.inTenant(identity.tenantId(), () -> {
            repository.findOptional(id).orElseThrow(PatientController::notFound);
            List<PatientAppointment> found = agendaView.ofPatient(id, identity.permissoes().contains("agenda:ver_valores"));
            guard.records(identity.tenantId(), identity.usuarioId(), true, 1);
            audit.patients(identity.tenantId(), identity.usuarioId(), List.of(id), "ver_paciente");
            return found;
        });
    }

    /** Cadastro completo (Feegow): CPF, "sem CPF" ou estrangeiro, e celular. O número do prontuário nasce aqui. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('pacientes:criar')")
    public PatientView create(@AuthenticationPrincipal Session session, @Valid @RequestBody PatientForm request) {
        PatientRules.validateComplete(request);
        return transactions.inTenant(session.identity().tenantId(), () -> repository.create(request, session.identity().tenantId()));
    }

    // ---- listas da clínica ----

    @GetMapping("/prioridades")
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:criar')")
    public List<LookupView> priorities(@AuthenticationPrincipal Session session, @RequestParam(defaultValue = "false") boolean todas) {
        return lookups(session, PRIORITIES, todas);
    }

    @GetMapping("/origens-paciente")
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:criar')")
    public List<LookupView> origins(@AuthenticationPrincipal Session session, @RequestParam(defaultValue = "false") boolean todas) {
        return lookups(session, ORIGINS, todas);
    }

    // Quem edita pacientes mantém as listas (não criei permissão nova para não migrar os papéis existentes).
    @PostMapping("/prioridades")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('pacientes:editar')")
    public LookupView createPriority(@AuthenticationPrincipal Session session, @Valid @RequestBody LookupRequest request) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.createLookup(PRIORITIES, session.identity().tenantId(), request.nome()));
    }

    @PutMapping("/prioridades/{id}")
    @PreAuthorize("hasAuthority('pacientes:editar')")
    public LookupView updatePriority(@AuthenticationPrincipal Session session, @PathVariable UUID id, @Valid @RequestBody LookupRequest request) {
        return updateLookup(session, PRIORITIES, id, request);
    }

    @PostMapping("/origens-paciente")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('pacientes:editar')")
    public LookupView createOrigin(@AuthenticationPrincipal Session session, @Valid @RequestBody LookupRequest request) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.createLookup(ORIGINS, session.identity().tenantId(), request.nome()));
    }

    @PutMapping("/origens-paciente/{id}")
    @PreAuthorize("hasAuthority('pacientes:editar')")
    public LookupView updateOrigin(@AuthenticationPrincipal Session session, @PathVariable UUID id, @Valid @RequestBody LookupRequest request) {
        return updateLookup(session, ORIGINS, id, request);
    }

    private List<LookupView> lookups(Session session, String table, boolean all) {
        // A lista completa (com inativos) é para quem mantém a lista.
        boolean onlyActive = !(all && session.identity().permissoes().contains("pacientes:editar"));
        return transactions.inTenant(session.identity().tenantId(), () -> repository.lookups(table, onlyActive));
    }

    private LookupView updateLookup(Session session, String table, UUID id, LookupRequest request) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.updateLookup(table, id, request.nome(), !Boolean.FALSE.equals(request.ativo()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item não encontrado.")));
    }

    // ---- duplicados ----

    /** Para a recepção conferir antes de salvar: mesmo CPF, mesmo telefone, ou mesmo nome e nascimento. */
    @GetMapping("/duplicados")
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:criar')")
    public List<DuplicateView> duplicates(@AuthenticationPrincipal Session session, @RequestParam(required = false) String nome,
        @RequestParam(required = false) LocalDate nascimento, @RequestParam(required = false) String cpf, @RequestParam(required = false) String celular) {
        var tenant = session.identity().tenantId();
        var user = session.identity().usuarioId();
        guard.request(tenant, user, true);
        return transactions.inTenant(tenant, () -> {
            List<DuplicateView> found = repository.duplicates(nome, nascimento, cpf, celular);
            guard.records(tenant, user, true, found.size());
            audit.patients(tenant, user, found.stream().map(d -> d.paciente().id()).toList(), "conferir_duplicados");
            return found;
        });
    }

    // ---- ficha ----

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('pacientes:ler', 'pacientes:ler_vinculados')")
    public PatientView find(@AuthenticationPrincipal Session session, @PathVariable UUID id) {
        boolean full = seesEveryPatient(session);
        guard.request(session.identity().tenantId(), session.identity().usuarioId(), full);
        return transactions.inTenant(session.identity().tenantId(), () -> {
            PatientView found = full ? repository.findOptional(id).orElseThrow(PatientController::notFound)
                // 404 também quando existe mas não há vínculo: não revela que o paciente é da clínica.
                : professionals.idOfUser(session.identity().usuarioId()).flatMap(p -> repository.findConnected(id, p)).map(PatientView::restricted)
                    .orElseThrow(PatientController::notFound);
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
    public PatientView update(@AuthenticationPrincipal Session session, @PathVariable UUID id, @Valid @RequestBody PatientForm request) {
        PatientRules.validateComplete(request);
        var tenant = session.identity().tenantId();
        return transactions.inTenant(tenant, () -> repository.update(id, request, tenant, session.identity().usuarioId())
            .orElseThrow(() -> repository.findOptional(id).isPresent()
                ? new ResponseStatusException(HttpStatus.CONFLICT, "Paciente inativo. Reative antes de editar.") : notFound()));
    }

    /** Campos alterados (só os nomes) e quem alterou. Somente-inserção. */
    @GetMapping("/{id}/historico")
    @PreAuthorize("hasAuthority('pacientes:ler')")
    public List<HistoryView> history(@AuthenticationPrincipal Session session, @PathVariable UUID id) {
        return transactions.inTenant(session.identity().tenantId(), () -> {
            repository.findOptional(id).orElseThrow(PatientController::notFound);
            return repository.history(id);
        });
    }

    @PostMapping("/{id}/inativar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('pacientes:inativar')")
    public void deactivate(@AuthenticationPrincipal Session session, @PathVariable UUID id, @Valid @RequestBody DeactivateRequest request) {
        deactivate(session, id, request.motivo(), request.observacao());
    }

    /** Mantido por compatibilidade: inativa sem motivo. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('pacientes:inativar')")
    public void deactivate(@AuthenticationPrincipal Session session, @PathVariable UUID id) {
        deactivate(session, id, "sem_motivo", null);
    }

    @PostMapping("/{id}/reativar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('pacientes:inativar')")
    public void reactivate(@AuthenticationPrincipal Session session, @PathVariable UUID id) {
        var tenant = session.identity().tenantId();
        transactions.inTenant(tenant, () -> {
            if (!repository.reactivate(id, tenant, session.identity().usuarioId()))
                throw repository.findOptional(id).isPresent() ? new ResponseStatusException(HttpStatus.CONFLICT, "Paciente já está ativo.") : notFound();
            return null;
        });
    }

    private void deactivate(Session session, UUID id, String reason, String note) {
        var tenant = session.identity().tenantId();
        transactions.inTenant(tenant, () -> {
            if (!repository.deactivate(id, reason, note, tenant, session.identity().usuarioId()))
                throw repository.findOptional(id).isPresent() ? new ResponseStatusException(HttpStatus.CONFLICT, "Paciente já está inativo.") : notFound();
            return null;
        });
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado.");
    }
}
