package br.com.multisaude.prontuario;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import static br.com.multisaude.prontuario.EvolutionModels.*;

@RestController
@RequestMapping("/api/v1")
public class EvolutionController {
    private final EvolutionService service;

    public EvolutionController(EvolutionService service) {
        this.service = service;
    }

    @PostMapping("/agendamentos/{id}/evolucoes") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('prontuario:escrever')")
    public EvolutionView create(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody CreateEvolutionRequest x) {
        return service.create(s, id, x);
    }

    @PostMapping("/evolucoes/{id}/corrigir") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('prontuario:escrever')")
    public EvolutionView correct(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody CreateEvolutionRequest x) {
        return service.correct(s, id, x);
    }

    @GetMapping("/pacientes/{id}/evolucoes") @PreAuthorize("hasAuthority('prontuario:ler')")
    public List<EvolutionView> list(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.list(s, id);
    }
}
