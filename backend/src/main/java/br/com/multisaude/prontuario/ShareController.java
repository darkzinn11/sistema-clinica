package br.com.multisaude.prontuario;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.prontuario.EvolutionModels.*;

/**
 * O administrador habilita que um médico (leitor) veja as evoluções de outro (autor). Tem direção: habilitar
 * João -> José não dá a José acesso ao que João escreveu, e não é transitivo.
 */
@RestController
@RequestMapping("/api/v1/prontuario/compartilhamentos")
public class ShareController {
    private final ShareRepository repo;
    private final TenantTransactions tx;

    public ShareController(ShareRepository repo, TenantTransactions tx) {
        this.repo = repo;
        this.tx = tx;
    }

    @GetMapping @PreAuthorize("hasAuthority('prontuario:compartilhar')")
    public List<ShareView> list(@AuthenticationPrincipal Session s, @RequestParam(defaultValue = "false") boolean incluirRevogados) {
        return tx.inTenant(s.identity().tenantId(), () -> repo.list(incluirRevogados));
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED) @PreAuthorize("hasAuthority('prontuario:compartilhar')")
    public ShareView create(@AuthenticationPrincipal Session s, @Valid @RequestBody ShareRequest x) {
        if (x.leitorProfissionalId().equals(x.autorProfissionalId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Leitor e autor devem ser profissionais diferentes.");
        }
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                if (!repo.readerAndAuthorAreUsable(x.leitorProfissionalId(), x.autorProfissionalId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Profissional inválido, inativo ou o leitor não tem usuário no sistema.");
                }
                if (repo.activeExists(x.leitorProfissionalId(), x.autorProfissionalId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta habilitação já existe.");
                }
                return repo.create(s.identity().tenantId(), x.leitorProfissionalId(), x.autorProfissionalId(), s.identity().usuarioId());
            });
        } catch (DataIntegrityViolationException e) {
            // Corrida entre duas habilitações iguais: o índice único é a última palavra.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta habilitação já existe.");
        }
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasAuthority('prontuario:compartilhar')")
    public void revoke(@AuthenticationPrincipal Session s, @PathVariable UUID id) {
        if (!tx.inTenant(s.identity().tenantId(), () -> repo.revoke(id, s.identity().usuarioId()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Habilitação não encontrada ou já revogada.");
        }
    }
}
