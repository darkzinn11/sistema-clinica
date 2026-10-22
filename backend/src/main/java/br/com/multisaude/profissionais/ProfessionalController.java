package br.com.multisaude.profissionais;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import static br.com.multisaude.profissionais.ProfessionalModels.*;

@RestController
@RequestMapping("/api/v1")
public class ProfessionalController {
    private final ProfessionalService service;

    public ProfessionalController(ProfessionalService service) {
        this.service = service;
    }

    /** Total no cabeçalho X-Total-Count. Sem `ativo`, devolve todos; `naAgenda=true` devolve só ativos e não ocultos. */
    @GetMapping("/profissionais") @PreAuthorize("hasAuthority('profissionais:ler')")
    public ResponseEntity<List<ProfessionalView>> list(@AuthenticationPrincipal Session s, @RequestParam(required = false) String busca,
                                                       @RequestParam(required = false) UUID especialidadeId, @RequestParam(required = false) Boolean ativo,
                                                       @RequestParam(required = false) String letra, @RequestParam(defaultValue = "false") boolean naAgenda,
                                                       @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "50") int tamanho) {
        ProfessionalService.Page<ProfessionalView> page = service.list(s, busca, especialidadeId, ativo, letra, naAgenda, pagina, tamanho);
        return ResponseEntity.ok().header("X-Total-Count", String.valueOf(page.total())).body(page.items());
    }

    @GetMapping("/profissionais/{id}") @PreAuthorize("hasAuthority('profissionais:ler')")
    public ProfessionalView find(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.find(s, id);
    }

    @PostMapping("/profissionais") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('profissionais:criar')")
    public ProfessionalView create(@AuthenticationPrincipal Session s, @Valid @RequestBody CreateProfessionalRequest x) {
        return service.create(s, x);
    }

    @PutMapping("/profissionais/{id}") @PreAuthorize("hasAuthority('profissionais:editar')")
    public ProfessionalView update(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody UpdateProfessionalRequest x) {
        return service.update(s, id, x);
    }

    @GetMapping("/profissionais/{id}/procedimentos") @PreAuthorize("hasAuthority('profissionais:ler')")
    public List<EnabledProcedure> enabledProcedures(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.enabledProcedures(s, id);
    }

    @PutMapping("/profissionais/{id}/procedimentos") @PreAuthorize("hasAuthority('profissionais:editar')")
    public List<EnabledProcedure> replaceEnabledProcedures(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody ProceduresRequest x) {
        return service.replaceEnabledProcedures(s, id, x.procedimentoIds());
    }
}
