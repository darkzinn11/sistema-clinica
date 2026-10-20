package br.com.multisaude.cadastros;

import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.cadastros.ProcedureModels.*;

/** Sempre chamado dentro de TenantTransactions.inTenant. */
@Repository
public class ProcedureRepository {
    private static final String COLUMNS = "id, nome, sigla, tipo, codigo_tuss, duracao_min, valor_centavos, dias_retorno, aviso_agendamento, preparo, observacoes, ativo, catalogo_id";
    private final JdbcTemplate jdbc;

    public ProcedureRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Cada palavra da busca precisa aparecer no nome, na sigla ou no código. Sem diferenciar maiúsculas nem acentos. */
    public List<ProcedureView> list(String search, String type, Boolean active, String letter, int limit, int offset) {
        List<Object> params = new ArrayList<>();
        String where = filter(search, type, active, letter, params);
        params.add(limit);
        params.add(offset);
        return jdbc.query("SELECT " + COLUMNS + " FROM clinica.procedimentos WHERE " + where + " ORDER BY nome, id LIMIT ? OFFSET ?", (r, n) -> view(r), params.toArray());
    }

    public int count(String search, String type, Boolean active, String letter) {
        List<Object> params = new ArrayList<>();
        return jdbc.queryForObject("SELECT count(*) FROM clinica.procedimentos WHERE " + filter(search, type, active, letter, params), Integer.class, params.toArray());
    }

    private static String filter(String search, String type, Boolean active, String letter, List<Object> params) {
        StringBuilder where = new StringBuilder("TRUE");
        for (String word : words(search)) {
            where.append(" AND (clinica.unaccent(lower(nome)) LIKE clinica.unaccent(?) OR clinica.unaccent(lower(coalesce(sigla, ''))) LIKE clinica.unaccent(?) OR coalesce(codigo_tuss, '') LIKE ?)");
            params.add("%" + word + "%");
            params.add("%" + word + "%");
            params.add("%" + word + "%");
        }
        if (type != null) {
            where.append(" AND tipo = ?");
            params.add(type);
        }
        if (active != null) {
            where.append(" AND ativo = ?");
            params.add(active);
        }
        if (letter != null) {
            where.append(" AND upper(left(nome, 1)) = ?");
            params.add(letter);
        }
        return where.toString();
    }

    public Optional<ProcedureView> find(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM clinica.procedimentos WHERE id = ?", (r, n) -> view(r), id).stream().findFirst();
    }

    public boolean nameTaken(String name, UUID exceptId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.procedimentos WHERE lower(nome) = lower(?) AND id IS DISTINCT FROM ?)",
            Boolean.class, name.trim(), exceptId));
    }

    public UUID insert(UUID tenant, UUID user, String name, String type, String tussCode, String shortName, Integer minutes, Long cents, Integer returnDays,
                       String notice, String preparation, String notes, UUID catalogId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.procedimentos(id, tenant_id, nome, tipo, codigo_tuss, sigla, duracao_min, valor_centavos, dias_retorno, aviso_agendamento, preparo, observacoes, catalogo_id, atualizado_por) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id, tenant, name.trim(), type, blank(tussCode), blank(shortName), minutes, cents, returnDays,
            blank(notice), blank(preparation), blank(notes), catalogId, user);
        return id;
    }

    /** canSetPrice falso mantém o valor atual: quem não vê preço não pode alterá-lo. */
    public void update(UUID id, UUID user, ProcedureUpdateRequest x, Integer minutes, boolean canSetPrice) {
        jdbc.update("UPDATE clinica.procedimentos SET nome = ?, tipo = ?, codigo_tuss = ?, sigla = ?, duracao_min = ?, "
            + "valor_centavos = CASE WHEN ? THEN ?::bigint ELSE valor_centavos END, dias_retorno = ?, aviso_agendamento = ?, preparo = ?, observacoes = ?, "
            + "ativo = COALESCE(?, ativo), atualizado_em = now(), atualizado_por = ? WHERE id = ?",
            ps -> {
                ps.setString(1, x.nome().trim());
                ps.setString(2, x.tipo());
                ps.setString(3, blank(x.codigoTuss()));
                ps.setString(4, blank(x.sigla()));
                ps.setObject(5, minutes, Types.INTEGER);
                ps.setBoolean(6, canSetPrice);
                ps.setObject(7, x.valorCentavos(), Types.BIGINT);
                ps.setObject(8, x.diasRetorno(), Types.INTEGER);
                ps.setString(9, blank(x.avisoAgendamento()));
                ps.setString(10, blank(x.preparo()));
                ps.setString(11, blank(x.observacoes()));
                ps.setObject(12, x.ativo(), Types.BOOLEAN);
                ps.setObject(13, user);
                ps.setObject(14, id);
            });
    }

    public void addHistory(UUID tenant, UUID procedure, String field, String from, String to, UUID user) {
        jdbc.update("INSERT INTO clinica.procedimento_historico(tenant_id, procedimento_id, campo, de, para, usuario_id) VALUES (?, ?, ?, ?, ?, ?)", tenant, procedure, field, from, to, user);
    }

    public List<HistoryEntry> history(UUID procedure) {
        return jdbc.query("SELECT h.campo, h.de, h.para, h.usuario_id, u.nome, h.em FROM clinica.procedimento_historico h "
            + "JOIN clinica.usuarios u ON u.tenant_id = h.tenant_id AND u.id = h.usuario_id WHERE h.procedimento_id = ? ORDER BY h.id",
            (r, n) -> new HistoryEntry(r.getString(1), r.getString(2), r.getString(3), r.getObject(4, UUID.class), r.getString(5), r.getObject(6, OffsetDateTime.class)), procedure);
    }

    // ---- catálogo ----

    public Optional<CatalogProcedureView> catalogEntry(UUID id) {
        return jdbc.query("SELECT c.id, c.codigo_tuss, c.descricao, EXISTS(SELECT 1 FROM clinica.procedimentos p WHERE p.catalogo_id = c.id) FROM clinica.catalogo_procedimentos c WHERE c.id = ?",
            (r, n) -> new CatalogProcedureView(r.getObject(1, UUID.class), r.getString(2), r.getString(3), r.getBoolean(4)), id).stream().findFirst();
    }

    public List<CatalogProcedureView> catalog(String search, boolean onlyNotAdded, int limit, int offset) {
        List<Object> params = new ArrayList<>();
        String where = catalogFilter(search, onlyNotAdded, params);
        params.add(limit);
        params.add(offset);
        return jdbc.query("SELECT c.id, c.codigo_tuss, c.descricao, EXISTS(SELECT 1 FROM clinica.procedimentos p WHERE p.catalogo_id = c.id) FROM clinica.catalogo_procedimentos c WHERE "
            + where + " ORDER BY c.codigo_tuss LIMIT ? OFFSET ?",
            (r, n) -> new CatalogProcedureView(r.getObject(1, UUID.class), r.getString(2), r.getString(3), r.getBoolean(4)), params.toArray());
    }

    public int catalogCount(String search, boolean onlyNotAdded) {
        List<Object> params = new ArrayList<>();
        return jdbc.queryForObject("SELECT count(*) FROM clinica.catalogo_procedimentos c WHERE " + catalogFilter(search, onlyNotAdded, params), Integer.class, params.toArray());
    }

    private static String catalogFilter(String search, boolean onlyNotAdded, List<Object> params) {
        StringBuilder where = new StringBuilder("TRUE");
        for (String word : words(search)) {
            where.append(" AND (clinica.unaccent(lower(c.descricao)) LIKE clinica.unaccent(?) OR c.codigo_tuss LIKE ?)");
            params.add("%" + word + "%");
            params.add(word + "%");
        }
        if (onlyNotAdded) where.append(" AND NOT EXISTS(SELECT 1 FROM clinica.procedimentos p WHERE p.catalogo_id = c.id)");
        return where.toString();
    }

    private static List<String> words(String search) {
        if (search == null || search.isBlank()) return List.of();
        return List.of(search.trim().toLowerCase().split("\\s+"));
    }

    private static ProcedureView view(java.sql.ResultSet r) throws java.sql.SQLException {
        return new ProcedureView(r.getObject("id", UUID.class), r.getString("nome"), r.getString("sigla"), r.getString("tipo"), r.getString("codigo_tuss"),
            r.getObject("duracao_min", Integer.class), r.getObject("valor_centavos", Long.class), r.getObject("dias_retorno", Integer.class),
            r.getString("aviso_agendamento"), r.getString("preparo"), r.getString("observacoes"), r.getBoolean("ativo"), r.getObject("catalogo_id", UUID.class));
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
