package br.com.multisaude.cadastros;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import static br.com.multisaude.cadastros.SpecialtyModels.*;

@RestController
@RequestMapping("/api/v1")
public class SpecialtyController {
    private final SpecialtyService service;

    public SpecialtyController(SpecialtyService service) {
        this.service = service;
    }

    // profissionais:ler também lista: o formulário de profissional precisa escolher a especialidade.
    @GetMapping("/especialidades") @PreAuthorize("hasAnyAuthority('especialidades:ler', 'profissionais:ler')")
    public List<SpecialtyView> list(@AuthenticationPrincipal Session s, @RequestParam(required = false) String busca,
                                    @RequestParam(required = false) Boolean ativo, @RequestParam(required = false) String letra) {
        return service.list(s, busca, ativo, letra);
    }

    @GetMapping("/especialidades/{id}") @PreAuthorize("hasAnyAuthority('especialidades:ler', 'profissionais:ler')")
    public SpecialtyView find(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.find(s, id);
    }

    @PostMapping("/especialidades") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('especialidades:criar')")
    public SpecialtyView create(@AuthenticationPrincipal Session s, @Valid @RequestBody SpecialtyRequest x) {
        return service.create(s, x);
    }

    @PutMapping("/especialidades/{id}") @PreAuthorize("hasAuthority('especialidades:editar')")
    public SpecialtyView update(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody SpecialtyUpdateRequest x) {
        return service.update(s, id, x);
    }

    /** Sugestões do sistema; só quem pode adicionar precisa vê-las. */
    @GetMapping("/catalogo/especialidades") @PreAuthorize("hasAuthority('especialidades:criar')")
    public List<CatalogSpecialtyView> catalog(@AuthenticationPrincipal Session s, @RequestParam(required = false) String busca) {
        return service.catalog(s, busca);
    }
}
