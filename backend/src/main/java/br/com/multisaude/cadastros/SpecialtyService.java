package br.com.multisaude.cadastros;

import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.cadastros.SpecialtyModels.*;

/** Cadastro de especialidades da clínica. O catálogo só sugere: adicionar copia para o cadastro da clínica. */
@Service
public class SpecialtyService {
    private static final String NAME_TAKEN = "Já existe uma especialidade com este nome.";
    private final SpecialtyRepository repo;
    private final TenantTransactions tx;

    public SpecialtyService(SpecialtyRepository repo, TenantTransactions tx) {
        this.repo = repo;
        this.tx = tx;
    }

    public List<SpecialtyView> list(Session s, String search, Boolean active, String letter) {
        String safeLetter = letter == null || letter.isBlank() ? null : letter.trim().substring(0, 1).toUpperCase();
        return tx.inTenant(s.identity().tenantId(), () -> repo.list(search == null ? "" : search, active, safeLetter));
    }

    public SpecialtyView find(Session s, UUID id) {
        return tx.inTenant(s.identity().tenantId(), () -> repo.find(id).orElseThrow(SpecialtyService::notFound));
    }

    public List<CatalogSpecialtyView> catalog(Session s, String search) {
        return tx.inTenant(s.identity().tenantId(), () -> repo.catalog(search == null ? "" : search));
    }

    public SpecialtyView create(Session s, SpecialtyRequest x) {
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                String name = x.nome();
                String shortName = x.nomeResumido();
                String code = x.codigo();
                String cbos = x.cbos();
                if (x.catalogoId() != null) {
                    CatalogSpecialtyView entry = repo.catalogEntry(x.catalogoId()).orElseThrow(() -> bad("Especialidade do catálogo inexistente."));
                    if (entry.jaAdicionada()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta especialidade do catálogo já foi adicionada.");
                    if (name == null || name.isBlank()) name = entry.nome();
                    if (shortName == null) shortName = entry.nomeResumido();
                    if (code == null) code = entry.codigo();
                    if (cbos == null) cbos = entry.cbos();
                } else if (name == null || name.isBlank()) {
                    throw bad("Informe o nome da especialidade ou escolha uma do catálogo.");
                }
                if (repo.nameTaken(name, null)) throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
                return repo.insert(s.identity().tenantId(), name, shortName, code, cbos, x.catalogoId());
            });
        } catch (DataIntegrityViolationException e) {
            // Corrida entre duas requisições: os índices únicos do banco são a última palavra.
            throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
        }
    }

    public SpecialtyView update(Session s, UUID id, SpecialtyUpdateRequest x) {
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                repo.find(id).orElseThrow(SpecialtyService::notFound);
                if (repo.nameTaken(x.nome(), id)) throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
                repo.update(id, x);
                return repo.find(id).orElseThrow();
            });
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Especialidade não encontrada.");
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
