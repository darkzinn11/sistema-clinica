package br.com.multisaude.salas;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.agenda.ScheduleRepository;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.salas.SalaModels.*;

/**
 * Salas e equipamentos da unidade da sessão. Ver é de quem lê a agenda; cadastrar e alterar é de quem configura a agenda.
 * A sala padrão do profissional vem junto: é o que alimenta a agenda por sala.
 */
@RestController
@RequestMapping("/api/v1")
public class SalaController {
    private final SalaRepository repository;
    private final ScheduleRepository schedule;
    private final TenantTransactions transactions;

    public SalaController(SalaRepository repository, ScheduleRepository schedule, TenantTransactions transactions) {
        this.repository = repository; this.schedule = schedule; this.transactions = transactions;
    }

    // ---- salas ----

    @GetMapping("/salas")
    @PreAuthorize("hasAuthority('agenda:ler')")
    public List<RoomView> rooms(@AuthenticationPrincipal Session s) {
        return transactions.inTenant(s.identity().tenantId(), () -> repository.rooms(s.identity().unidadeId()));
    }

    @PostMapping("/salas")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('agenda:configurar')")
    public RoomView createRoom(@AuthenticationPrincipal Session s, @Valid @RequestBody RoomRequest x) {
        return transactions.inTenant(s.identity().tenantId(), () -> repository.createRoom(s.identity().tenantId(), s.identity().unidadeId(), x.nome()));
    }

    @PutMapping("/salas/{id}")
    @PreAuthorize("hasAuthority('agenda:configurar')")
    public RoomView updateRoom(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody RoomRequest x) {
        return transactions.inTenant(s.identity().tenantId(), () -> repository.updateRoom(id, s.identity().unidadeId(), x.nome(), !Boolean.FALSE.equals(x.ativo()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sala não encontrada.")));
    }

    // ---- equipamentos ----

    @GetMapping("/equipamentos")
    @PreAuthorize("hasAuthority('agenda:ler')")
    public List<EquipmentView> equipment(@AuthenticationPrincipal Session s) {
        return transactions.inTenant(s.identity().tenantId(), () -> repository.equipment(s.identity().unidadeId()));
    }

    @PostMapping("/equipamentos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('agenda:configurar')")
    public EquipmentView createEquipment(@AuthenticationPrincipal Session s, @Valid @RequestBody EquipmentRequest x) {
        return transactions.inTenant(s.identity().tenantId(), () -> {
            validate(s, x);
            UUID id = repository.createEquipment(s.identity().tenantId(), s.identity().unidadeId(), x);
            return repository.findEquipment(id, s.identity().unidadeId()).orElseThrow();
        });
    }

    @PutMapping("/equipamentos/{id}")
    @PreAuthorize("hasAuthority('agenda:configurar')")
    public EquipmentView updateEquipment(@AuthenticationPrincipal Session s, @PathVariable UUID id, @Valid @RequestBody EquipmentRequest x) {
        return transactions.inTenant(s.identity().tenantId(), () -> {
            validate(s, x);
            if (!repository.updateEquipment(s.identity().tenantId(), id, s.identity().unidadeId(), x))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipamento não encontrado.");
            return repository.findEquipment(id, s.identity().unidadeId()).orElseThrow();
        });
    }

    private void validate(Session s, EquipmentRequest x) {
        if (x.salaId() != null && !repository.roomInUnit(x.salaId(), s.identity().unidadeId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sala inválida para esta unidade.");
        long distinct = x.procedimentoIds().stream().distinct().count();
        if (repository.existingProcedures(x.procedimentoIds().stream().distinct().toList()) != distinct)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Procedimento inválido.");
    }

    // ---- sala padrão do profissional ----

    @GetMapping("/profissionais-salas")
    @PreAuthorize("hasAuthority('agenda:ler')")
    public List<ProfessionalRoomView> professionalRooms(@AuthenticationPrincipal Session s) {
        return transactions.inTenant(s.identity().tenantId(), () -> repository.professionalRooms(s.identity().unidadeId()));
    }

    /** salaId nulo remove a sala padrão. */
    @PutMapping("/profissionais/{id}/sala")
    @PreAuthorize("hasAuthority('profissionais:editar')")
    public ProfessionalRoomView setProfessionalRoom(@AuthenticationPrincipal Session s, @PathVariable UUID id, @RequestBody ProfessionalRoomRequest x) {
        return transactions.inTenant(s.identity().tenantId(), () -> {
            UUID unit = s.identity().unidadeId();
            if (!repository.professionalServesUnit(id, unit)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profissional não atende nesta unidade.");
            if (x.salaId() != null && !repository.roomInUnit(x.salaId(), unit)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sala inválida para esta unidade.");
            repository.setProfessionalRoom(s.identity().tenantId(), id, unit, x.salaId());
            return new ProfessionalRoomView(id, x.salaId());
        });
    }

    // ---- uso do dia ----

    @GetMapping("/agenda/equipamentos")
    @PreAuthorize("hasAuthority('agenda:ler')")
    public EquipmentDayView day(@AuthenticationPrincipal Session s, @RequestParam LocalDate data) {
        return transactions.inTenant(s.identity().tenantId(), () -> {
            var zone = schedule.unitZone(s.identity().unidadeId());
            return new EquipmentDayView(data, repository.day(s.identity().unidadeId(), data, zone));
        });
    }
}
