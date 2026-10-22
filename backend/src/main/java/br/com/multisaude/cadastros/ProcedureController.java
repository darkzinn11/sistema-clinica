package br.com.multisaude.cadastros;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import static br.com.multisaude.cadastros.ProcedureModels.*;

@RestController
@RequestMapping("/api/v1")
public class ProcedureController {
    private static final String READ = "hasAnyAuthority('procedimentos:ler', 'agenda:ler', 'agenda:ler_proprios')";
    private final ProcedureService service;

    public ProcedureController(ProcedureService service) {
        this.service = service;
    }

    /** O total de itens vai no cabeçalho X-Total-Count para a tela paginar. Sem `ativo`, devolve todos. */
    @GetMapping("/procedimentos") @PreAuthorize(READ)
    public ResponseEntity<List<ProcedureView>> list(@AuthenticationPrincipal Session s, @RequestParam(required = false) String busca,
                                                    @RequestParam(required = false) String tipo, @RequestParam(required = false) Boolean ativo,
                                                    @RequestParam(required = false) String letra, @RequestParam(defaultValue = "0") int pagina,
                                                    @RequestParam(defaultValue = "50") int tamanho) {
        ProcedureService.Page<ProcedureView> page = service.list(s, busca, tipo, ativo, letra, pagina, tamanho);
        return ResponseEntity.ok().header("X-Total-Count", String.valueOf(page.total())).body(page.items());
    }

    @GetMapping("/procedimentos/{id}") @PreAuthorize(READ)
    public ProcedureView find(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.find(s, id);
    }

    @PostMapping("/procedimentos") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('procedimentos:criar')")
    public ProcedureView create(@AuthenticationPrincipal Session s, @Valid @RequestBody ProcedureRequest x) {
        return service.create(s, x);
    }

    @PutMapping("/procedimentos/{id}") @PreAuthorize("hasAuthority('procedimentos:editar')")
    public ProcedureView update(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody ProcedureUpdateRequest x) {
        return service.update(s, id, x);
    }

    @GetMapping("/procedimentos/{id}/historico") @PreAuthorize("hasAuthority('procedimentos:editar')")
    public List<HistoryEntry> history(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.history(s, id);
    }

    /** Sugestões oficiais da ANS (TUSS); só quem pode adicionar precisa vê-las. */
    @GetMapping("/catalogo/procedimentos") @PreAuthorize("hasAuthority('procedimentos:criar')")
    public ResponseEntity<List<CatalogProcedureView>> catalog(@AuthenticationPrincipal Session s, @RequestParam(required = false) String busca,
                                                              @RequestParam(defaultValue = "false") boolean naoAdicionados,
                                                              @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "50") int tamanho) {
        ProcedureService.Page<CatalogProcedureView> page = service.catalog(s, busca, naoAdicionados, pagina, tamanho);
        return ResponseEntity.ok().header("X-Total-Count", String.valueOf(page.total())).body(page.items());
    }
}
