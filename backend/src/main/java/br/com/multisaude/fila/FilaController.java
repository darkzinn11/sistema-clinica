package br.com.multisaude.fila;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.pacientes.PatientModels.CreatePatientRequest;
import static br.com.multisaude.fila.FilaModels.*;

@RestController
@RequestMapping("/api/v1")
public class FilaController {
    private final FilaService service;

    public FilaController(FilaService service) {
        this.service = service;
    }

    // ---- configuração ----

    @GetMapping("/tipos-senha") @PreAuthorize("hasAuthority('fila:ler')")
    public List<TicketTypeView> types(@AuthenticationPrincipal Session s) {
        return service.types(s);
    }

    @PostMapping("/tipos-senha") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('fila:configurar')")
    public TicketTypeView createType(@AuthenticationPrincipal Session s, @Valid @RequestBody TicketTypeRequest x) {
        return service.createType(s, x);
    }

    @PutMapping("/tipos-senha/{id}") @PreAuthorize("hasAuthority('fila:configurar')")
    public TicketTypeView updateType(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody TicketTypeRequest x) {
        return service.updateType(s, id, x);
    }

    @GetMapping("/guiches") @PreAuthorize("hasAuthority('fila:ler')")
    public List<CounterView> counters(@AuthenticationPrincipal Session s) {
        return service.counters(s);
    }

    @PostMapping("/guiches") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('fila:configurar')")
    public CounterView createCounter(@AuthenticationPrincipal Session s, @Valid @RequestBody CounterRequest x) {
        return service.createCounter(s, x);
    }

    @PutMapping("/guiches/{id}") @PreAuthorize("hasAuthority('fila:configurar')")
    public CounterView updateCounter(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody CounterRequest x) {
        return service.updateCounter(s, id, x);
    }

    // ---- operação ----

    @PostMapping("/senhas") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('fila:gerar')")
    public TicketView generate(@AuthenticationPrincipal Session s, @Valid @RequestBody GenerateTicketRequest x) {
        return service.generate(s, x.tipoId());
    }

    @GetMapping("/senhas/fila") @PreAuthorize("hasAuthority('fila:ler')")
    public QueueView queue(@AuthenticationPrincipal Session s, @RequestParam(required = false) UUID tipoId, @RequestParam(required = false) UUID guicheId) {
        return service.queue(s, tipoId, guicheId);
    }

    /** 204 quando o guichê não tem senha em atendimento. */
    @GetMapping("/guiches/{id}/atual") @PreAuthorize("hasAuthority('fila:ler')")
    public ResponseEntity<TicketView> current(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        TicketView ticket = service.current(s, id);
        return ticket == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(ticket);
    }

    @PostMapping("/guiches/{id}/chamar-proxima") @PreAuthorize("hasAuthority('fila:chamar')")
    public TicketView callNext(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.callNext(s, id);
    }

    @PostMapping("/senhas/{id}/chamar") @PreAuthorize("hasAuthority('fila:chamar')")
    public TicketView call(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody CallRequest x) {
        return service.call(s, id, x.guicheId());
    }

    @PostMapping("/senhas/{id}/rechamar") @PreAuthorize("hasAuthority('fila:chamar')")
    public TicketView recall(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.recall(s, id);
    }

    @PostMapping("/senhas/{id}/identificar") @PreAuthorize("hasAuthority('fila:chamar') and hasAuthority('pacientes:ler')")
    public IdentifiedTicket identify(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody IdentifyRequest x) {
        return service.identify(s, id, x.cpf());
    }

    @PostMapping("/senhas/{id}/cadastrar-paciente") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('fila:chamar') and hasAuthority('pacientes:criar')")
    public IdentifiedTicket register(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody CreatePatientRequest x) {
        return service.registerAndAttach(s, id, x);
    }

    @PostMapping("/senhas/{id}/finalizar") @PreAuthorize("hasAuthority('fila:chamar')")
    public TicketView finish(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.finish(s, id);
    }

    @PostMapping("/senhas/{id}/ausente") @PreAuthorize("hasAuthority('fila:chamar')")
    public TicketView absent(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        return service.absent(s, id);
    }

    @PostMapping("/senhas/{id}/cancelar") @PreAuthorize("hasAuthority('fila:chamar')")
    public TicketView cancel(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody CancelTicketRequest x) {
        return service.cancel(s, id, x.motivo());
    }
}
