package br.com.multisaude.cadastros;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.cadastros.ProcedureModels.*;

/**
 * Cadastro de procedimentos da clínica. O catálogo só sugere: adicionar copia descrição e código TUSS para o cadastro dela.
 * Preço só é visto (e alterado) por quem tem agenda:ver_valores; mudança de preço, tempo, tipo e situação fica no histórico.
 */
@Service
public class ProcedureService {
    private static final String NAME_TAKEN = "Já existe um procedimento com este nome.";
    private static final int MAX_PAGE_SIZE = 200;
    private final ProcedureRepository repo;
    private final TenantTransactions tx;

    public ProcedureService(ProcedureRepository repo, TenantTransactions tx) {
        this.repo = repo;
        this.tx = tx;
    }

    public record Page<T>(List<T> items, int total) {}

    public Page<ProcedureView> list(Session s, String search, String type, Boolean active, String letter, int page, int size) {
        String safeLetter = letter == null || letter.isBlank() ? null : letter.trim().substring(0, 1).toUpperCase();
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        int offset = Math.max(0, page) * safeSize;
        return tx.inTenant(s.identity().tenantId(), () -> new Page<>(
            repo.list(search, type, active, safeLetter, safeSize, offset).stream().map(p -> mask(s, p)).toList(), repo.count(search, type, active, safeLetter)));
    }

    public ProcedureView find(Session s, UUID id) {
        return tx.inTenant(s.identity().tenantId(), () -> mask(s, repo.find(id).orElseThrow(ProcedureService::notFound)));
    }

    public Page<CatalogProcedureView> catalog(Session s, String search, boolean onlyNotAdded, int page, int size) {
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        return tx.inTenant(s.identity().tenantId(), () -> new Page<>(repo.catalog(search, onlyNotAdded, safeSize, Math.max(0, page) * safeSize), repo.catalogCount(search, onlyNotAdded)));
    }

    public ProcedureView create(Session s, ProcedureRequest x) {
        Integer minutes = minutes(x.duracaoMin());
        if (x.valorCentavos() != null && !canSeePrice(s)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem permissão para informar valores.");
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                String name = x.nome();
                String type = x.tipo();
                String code = x.codigoTuss();
                if (x.catalogoId() != null) {
                    CatalogProcedureView entry = repo.catalogEntry(x.catalogoId()).orElseThrow(() -> bad("Procedimento do catálogo inexistente."));
                    if (entry.jaAdicionado()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Este procedimento do catálogo já foi adicionado.");
                    if (name == null || name.isBlank()) name = entry.descricao();
                    if (code == null) code = entry.codigoTuss();
                    if (type == null) type = "procedimento";
                } else if (name == null || name.isBlank() || type == null) {
                    throw bad("Informe nome e tipo do procedimento, ou escolha um do catálogo.");
                }
                if (name.trim().length() > 160) name = name.trim().substring(0, 160);
                if (repo.nameTaken(name, null)) throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
                UUID id = repo.insert(s.identity().tenantId(), s.identity().usuarioId(), name, type, code, x.sigla(), minutes, x.valorCentavos(), x.diasRetorno(),
                    x.avisoAgendamento(), x.preparo(), x.observacoes(), x.catalogoId());
                return mask(s, repo.find(id).orElseThrow());
            });
        } catch (DataIntegrityViolationException e) {
            // Corrida entre duas requisições: os índices únicos do banco são a última palavra.
            throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
        }
    }

    public ProcedureView update(Session s, UUID id, ProcedureUpdateRequest x) {
        Integer minutes = minutes(x.duracaoMin());
        boolean canSetPrice = canSeePrice(s);
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                ProcedureView before = repo.find(id).orElseThrow(ProcedureService::notFound);
                if (repo.nameTaken(x.nome(), id)) throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
                repo.update(id, s.identity().usuarioId(), x, minutes, canSetPrice);
                ProcedureView after = repo.find(id).orElseThrow();
                for (String[] change : changes(before, after)) {
                    repo.addHistory(s.identity().tenantId(), id, change[0], change[1], change[2], s.identity().usuarioId());
                }
                return mask(s, after);
            });
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, NAME_TAKEN);
        }
    }

    public List<HistoryEntry> history(Session s, UUID id) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            repo.find(id).orElseThrow(ProcedureService::notFound);
            boolean seesPrice = canSeePrice(s);
            return repo.history(id).stream()
                .filter(h -> seesPrice || !"valor".equals(h.campo())).toList();
        });
    }

    /** Campos que o histórico registra: valor, tempo, tipo e situação. */
    private static List<String[]> changes(ProcedureView before, ProcedureView after) {
        List<String[]> changes = new ArrayList<>();
        if (!Objects.equals(before.valorCentavos(), after.valorCentavos())) changes.add(new String[] {"valor", text(before.valorCentavos()), text(after.valorCentavos())});
        if (!Objects.equals(before.duracaoMin(), after.duracaoMin())) changes.add(new String[] {"tempo", text(before.duracaoMin()), text(after.duracaoMin())});
        if (!Objects.equals(before.tipo(), after.tipo())) changes.add(new String[] {"tipo", before.tipo(), after.tipo()});
        if (before.ativo() != after.ativo()) changes.add(new String[] {"ativo", String.valueOf(before.ativo()), String.valueOf(after.ativo())});
        return changes;
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    /** Vazio ou 0 = ainda não medido (nulo); de 1 a 4 minutos não faz sentido. */
    private static Integer minutes(Integer value) {
        if (value == null || value == 0) return null;
        if (value < 5) throw bad("Tempo do procedimento: deixe vazio (ainda não medido) ou use 5 minutos ou mais.");
        return value;
    }

    private static boolean canSeePrice(Session s) {
        return s.identity().permissoes().contains("agenda:ver_valores");
    }

    private static ProcedureView mask(Session s, ProcedureView p) {
        if (canSeePrice(s)) return p;
        return new ProcedureView(p.id(), p.nome(), p.sigla(), p.tipo(), p.codigoTuss(), p.duracaoMin(), null, p.diasRetorno(), p.avisoAgendamento(),
            p.preparo(), p.observacoes(), p.ativo(), p.catalogoId());
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Procedimento não encontrado.");
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
