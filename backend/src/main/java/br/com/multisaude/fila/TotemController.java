package br.com.multisaude.fila;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import static br.com.multisaude.fila.FilaModels.*;

/** O que o totem alcança: listar os tipos de senha e gerar uma senha. Nada mais. */
@RestController
@RequestMapping("/api/v1/totem")
public class TotemController {
    private final FilaService service;

    public TotemController(FilaService service) {
        this.service = service;
    }

    @GetMapping("/tipos") @PreAuthorize("hasAuthority('totem:usar')")
    public List<TotemTypeView> types(@AuthenticationPrincipal Session s) {
        return service.totemTypes(s);
    }

    @PostMapping("/senhas") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('totem:usar')")
    public TotemTicketView generate(@AuthenticationPrincipal Session s, @Valid @RequestBody TotemTicketRequest x) {
        return service.generateAtTotem(s, x);
    }
}
