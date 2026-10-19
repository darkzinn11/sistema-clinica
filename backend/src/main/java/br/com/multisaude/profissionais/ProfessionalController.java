package br.com.multisaude.profissionais;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.profissionais.ProfessionalModels.*;

@RestController @RequestMapping("/api/v1")
public class ProfessionalController {
    private final ProfessionalRepository repository; private final TenantTransactions transactions;
    public ProfessionalController(ProfessionalRepository repository,TenantTransactions transactions){this.repository=repository;this.transactions=transactions;}
    @GetMapping("/profissionais") @PreAuthorize("hasAuthority('profissionais:ler')")
    public List<ProfessionalView> list(@AuthenticationPrincipal Session s,@RequestParam(defaultValue="") String busca,@RequestParam(defaultValue="50") int limite){
        return transactions.inTenant(s.identity().tenantId(),()->repository.list(busca,Math.max(1,Math.min(limite,100))));
    }
    @GetMapping("/especialidades") @PreAuthorize("hasAuthority('profissionais:ler')")
    public List<SpecialtyView> specialties(@AuthenticationPrincipal Session s){return transactions.inTenant(s.identity().tenantId(),repository::specialties);}
    @PostMapping("/profissionais") @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('profissionais:criar')")
    public ProfessionalView create(@AuthenticationPrincipal Session s,@Valid @RequestBody CreateProfessionalRequest req){
        return transactions.inTenant(s.identity().tenantId(),()->{if(!repository.destinationsBelongToTenant(req,s.identity().tenantId()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unidade ou especialidade inválida.");return repository.create(req,s.identity().tenantId());});
    }
}
