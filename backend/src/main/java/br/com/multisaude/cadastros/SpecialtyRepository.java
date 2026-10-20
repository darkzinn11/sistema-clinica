package br.com.multisaude.cadastros;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.cadastros.SpecialtyModels.*;

/** Sempre chamado dentro de TenantTransactions.inTenant. */
@Repository
public class SpecialtyRepository {
    private static final String COLUMNS = "id, nome, nome_resumido, codigo, cbos, ativo, catalogo_id";
    private final JdbcTemplate jdbc;

    public SpecialtyRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SpecialtyView> list(String search, Boolean active, String letter) {
        return jdbc.query("SELECT " + COLUMNS + " FROM clinica.especialidades WHERE (?::boolean IS NULL OR ativo = ?) AND lower(nome) LIKE ? "
            + "AND (?::text IS NULL OR upper(left(nome, 1)) = ?) ORDER BY nome LIMIT 300", (r, n) -> view(r),
            active, active, "%" + search.trim().toLowerCase() + "%", letter, letter);
    }

    public Optional<SpecialtyView> find(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM clinica.especialidades WHERE id = ?", (r, n) -> view(r), id).stream().findFirst();
    }

    /** exceptId ignora a própria linha ao editar. */
    public boolean nameTaken(String name, UUID exceptId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.especialidades WHERE lower(nome) = lower(?) AND id IS DISTINCT FROM ?)",
            Boolean.class, name.trim(), exceptId));
    }

    public Optional<CatalogSpecialtyView> catalogEntry(UUID id) {
        return jdbc.query("SELECT c.id, c.nome, c.nome_resumido, c.codigo, c.cbos, EXISTS(SELECT 1 FROM clinica.especialidades e WHERE e.catalogo_id = c.id) "
            + "FROM clinica.catalogo_especialidades c WHERE c.id = ?", (r, n) -> catalogView(r), id).stream().findFirst();
    }

    public List<CatalogSpecialtyView> catalog(String search) {
        return jdbc.query("SELECT c.id, c.nome, c.nome_resumido, c.codigo, c.cbos, EXISTS(SELECT 1 FROM clinica.especialidades e WHERE e.catalogo_id = c.id) "
            + "FROM clinica.catalogo_especialidades c WHERE lower(c.nome) LIKE ? ORDER BY c.nome LIMIT 300", (r, n) -> catalogView(r),
            "%" + search.trim().toLowerCase() + "%");
    }

    public SpecialtyView insert(UUID tenant, String name, String shortName, String code, String cbos, UUID catalogId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.especialidades(id, tenant_id, nome, nome_resumido, codigo, cbos, catalogo_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            id, tenant, name.trim(), blank(shortName), blank(code), blank(cbos), catalogId);
        return find(id).orElseThrow();
    }

    public boolean update(UUID id, SpecialtyUpdateRequest x) {
        return jdbc.update("UPDATE clinica.especialidades SET nome = ?, nome_resumido = ?, codigo = ?, cbos = ?, ativo = COALESCE(?, ativo), atualizado_em = now() WHERE id = ?",
            x.nome().trim(), blank(x.nomeResumido()), blank(x.codigo()), blank(x.cbos()), x.ativo(), id) == 1;
    }

    private static SpecialtyView view(java.sql.ResultSet r) throws java.sql.SQLException {
        return new SpecialtyView(r.getObject("id", UUID.class), r.getString("nome"), r.getString("nome_resumido"), r.getString("codigo"),
            r.getString("cbos"), r.getBoolean("ativo"), r.getObject("catalogo_id", UUID.class));
    }

    private static CatalogSpecialtyView catalogView(java.sql.ResultSet r) throws java.sql.SQLException {
        return new CatalogSpecialtyView(r.getObject(1, UUID.class), r.getString(2), r.getString(3), r.getString(4), r.getString(5), r.getBoolean(6));
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
