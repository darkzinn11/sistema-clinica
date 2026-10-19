package br.com.multisaude.agenda;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import br.com.multisaude.identidade.IdentityModels.Session;
import static br.com.multisaude.agenda.ScheduleModels.*;

@RestController
@RequestMapping("/api/v1")
public class ScheduleController {
    private final ScheduleService schedule;

    public ScheduleController(ScheduleService schedule) {
        this.schedule = schedule;
    }

    @GetMapping("/grades") @PreAuthorize("hasAuthority('agenda:ler')")
    public List<GradeView> grades(@AuthenticationPrincipal Session s, @RequestParam(required = false) UUID profissionalId) {
        return schedule.grades(s, profissionalId);
    }

    @PostMapping("/grades") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('agenda:configurar')")
    public GradeView createGrade(@AuthenticationPrincipal Session s, @Valid @RequestBody CreateGradeRequest x) {
        return schedule.createGrade(s, x);
    }

    @DeleteMapping("/grades/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAuthority('agenda:configurar')")
    public void deactivateGrade(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        schedule.deactivateGrade(s, id);
    }

    @GetMapping("/bloqueios") @PreAuthorize("hasAuthority('agenda:ler')")
    public List<BlockView> blocks(@AuthenticationPrincipal Session s, @RequestParam OffsetDateTime de, @RequestParam OffsetDateTime ate) {
        return schedule.blocks(s, de, ate);
    }

    @PostMapping("/bloqueios") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('agenda:configurar')")
    public BlockView createBlock(@AuthenticationPrincipal Session s, @Valid @RequestBody CreateBlockRequest x) {
        return schedule.createBlock(s, x);
    }

    @DeleteMapping("/bloqueios/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAuthority('agenda:configurar')")
    public void revokeBlock(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        schedule.revokeBlock(s, id);
    }

    @GetMapping("/agenda/disponibilidade") @PreAuthorize("hasAuthority('agenda:ler')")
    public List<SlotView> availability(@AuthenticationPrincipal Session s, @RequestParam UUID profissionalId, @RequestParam UUID procedimentoId,
                                       @RequestParam LocalDate de, @RequestParam LocalDate ate) {
        return schedule.availability(s, profissionalId, procedimentoId, de, ate);
    }
}
