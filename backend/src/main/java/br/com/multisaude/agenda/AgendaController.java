package br.com.multisaude.agenda;

import java.time.OffsetDateTime; import java.util.*; import jakarta.validation.Valid; import org.springframework.dao.DataIntegrityViolationException; import org.springframework.http.HttpStatus; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.annotation.AuthenticationPrincipal; import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException; import br.com.multisaude.identidade.IdentityModels.Session; import br.com.multisaude.shared.TenantTransactions; import static br.com.multisaude.agenda.AgendaModels.*;

@RestController @RequestMapping("/api/v1") public class AgendaController { private final AgendaRepository repo; private final TenantTransactions tx; public AgendaController(AgendaRepository repo,TenantTransactions tx){this.repo=repo;this.tx=tx;}
 @GetMapping("/procedimentos") @PreAuthorize("hasAuthority('agenda:ler')") public List<ProcedureView> procedures(@AuthenticationPrincipal Session s){return tx.inTenant(s.identity().tenantId(),repo::procedures);}
 @PostMapping("/procedimentos") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('agenda:criar')") public ProcedureView procedure(@AuthenticationPrincipal Session s,@Valid @RequestBody CreateProcedureRequest x){return tx.inTenant(s.identity().tenantId(),()->repo.createProcedure(x,s.identity().tenantId()));}
 @GetMapping("/agendamentos") @PreAuthorize("hasAuthority('agenda:ler')") public List<AppointmentView> appointments(@AuthenticationPrincipal Session s,@RequestParam UUID profissionalId,@RequestParam OffsetDateTime de,@RequestParam OffsetDateTime ate){if(!ate.isAfter(de))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Intervalo inválido.");return tx.inTenant(s.identity().tenantId(),()->repo.appointments(profissionalId,de,ate));}
 @PostMapping("/agendamentos") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('agenda:criar')") public AppointmentView appointment(@AuthenticationPrincipal Session s,@Valid @RequestBody CreateAppointmentRequest x){
  if(!x.fim().isAfter(x.inicio()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Fim deve ser posterior ao início.");
  if(!x.unidadeId().equals(s.identity().unidadeId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Unidade diferente da unidade ativa da sessão.");
  try{return tx.inTenant(s.identity().tenantId(),()->{
    if(!repo.referencesAreValid(x.unidadeId(),x.profissionalId(),x.pacienteId(),x.procedimentoId()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Paciente, profissional, procedimento ou unidade inválidos.");
    if(repo.hasConflict(x.profissionalId(),x.inicio(),x.fim()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Horário ocupado para este profissional.");
    return repo.createAppointment(x,s.identity().tenantId(),s.identity().usuarioId());});
  }catch(DataIntegrityViolationException e){
    // Corrida entre duas requisições: a constraint do banco é a última palavra.
    if(String.valueOf(e.getMostSpecificCause().getMessage()).contains("agendamento_profissional_sem_conflito"))throw new ResponseStatusException(HttpStatus.CONFLICT,"Horário ocupado para este profissional.");
    throw e;}}
}
