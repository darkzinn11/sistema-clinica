package br.com.multisaude.identidade;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.identidade.IdentityModels.*;

@Repository
public class IdentityRepository {
    private final JdbcTemplate jdbc;
    public IdentityRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Credentials(Identity identity, String passwordHash) {
        @Override public String toString() { return "Credentials[omitidas]"; }
    }

    private static final String MEMBERSHIP = """
        FROM clinica.usuarios u
        JOIN clinica.tenants t ON t.id = u.tenant_id AND t.status = 'ativo'
        JOIN clinica.vinculos v ON v.tenant_id = u.tenant_id AND v.usuario_id = u.id AND v.ativo
        JOIN clinica.unidades n ON n.tenant_id = v.tenant_id AND n.id = v.unidade_id AND n.ativo
        JOIN clinica.papeis p ON p.tenant_id = v.tenant_id AND p.id = v.papel_id
        """;
    private static final String IDENTITY_FIELDS = "u.id, u.tenant_id, v.unidade_id, u.nome, u.email, p.nome AS papel, p.permissoes";

    public Optional<Credentials> credentials(String email, UUID unit) {
        return jdbc.query("SELECT " + IDENTITY_FIELDS + ", u.senha_hash " + MEMBERSHIP
            + " WHERE u.ativo AND u.email = ? AND v.unidade_id = ?",
            (rs, row) -> new Credentials(identity(rs), rs.getString("senha_hash")), email, unit).stream().findFirst();
    }

    public Optional<Session> session(byte[] hash) {
        return jdbc.query("SELECT " + IDENTITY_FIELDS + ", s.id AS sessao_id " + MEMBERSHIP + """
            JOIN clinica.sessoes s ON s.tenant_id = v.tenant_id AND s.usuario_id = v.usuario_id AND s.unidade_id = v.unidade_id
            WHERE u.ativo AND s.token_hash = ? AND s.revogada_em IS NULL AND s.expira_em > now()
            """, (rs, row) -> new Session(rs.getObject("sessao_id", UUID.class), identity(rs)), hash).stream().findFirst();
    }

    public void createSession(Identity user, byte[] hash, Instant expires) {
        jdbc.update("""
            INSERT INTO clinica.sessoes (tenant_id, usuario_id, unidade_id, token_hash, expira_em)
            VALUES (?, ?, ?, ?, ?)
            """, user.tenantId(), user.usuarioId(), user.unidadeId(), hash, java.sql.Timestamp.from(expires));
    }

    public void revoke(UUID sessionId) {
        jdbc.update("UPDATE clinica.sessoes SET revogada_em = now() WHERE id = ? AND revogada_em IS NULL", sessionId);
    }

    public List<UserView> users() {
        return jdbc.query("SELECT id, nome, email, ativo FROM clinica.usuarios ORDER BY nome, id LIMIT 200",
            (rs, row) -> new UserView(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("email"), rs.getBoolean("ativo")));
    }

    public List<RoleView> roles() {
        return jdbc.query("SELECT id, nome, permissoes FROM clinica.papeis ORDER BY nome",
            (rs, row) -> new RoleView(rs.getObject("id", UUID.class), rs.getString("nome"), permissions(rs)));
    }

    public List<UnitView> units(UUID userId) {
        return jdbc.query("""
            SELECT n.id, n.nome FROM clinica.unidades n JOIN clinica.vinculos v
            ON v.tenant_id = n.tenant_id AND v.unidade_id = n.id
            WHERE v.usuario_id = ? AND v.ativo AND n.ativo ORDER BY n.nome
            """, (rs, row) -> new UnitView(rs.getObject("id", UUID.class), rs.getString("nome")), userId);
    }

    public boolean validDestination(UUID unit, UUID role) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS (SELECT 1 FROM clinica.unidades n JOIN clinica.papeis p ON p.tenant_id = n.tenant_id
            WHERE n.id = ? AND n.ativo AND p.id = ?)
            """, Boolean.class, unit, role));
    }

    public UserView createUser(UUID tenant, CreateUserRequest request, String passwordHash) {
        UUID id = UUID.randomUUID();
        String email = request.email().trim().toLowerCase(java.util.Locale.ROOT);
        jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, ?)",
            id, tenant, request.nome().trim(), email, passwordHash);
        jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)",
            tenant, id, request.unidadeId(), request.papelId());
        return new UserView(id, request.nome().trim(), email, true);
    }

    private static Identity identity(ResultSet rs) throws SQLException {
        return new Identity(rs.getObject("id", UUID.class), rs.getObject("tenant_id", UUID.class),
            rs.getObject("unidade_id", UUID.class), rs.getString("nome"), rs.getString("email"),
            rs.getString("papel"), permissions(rs));
    }

    private static List<String> permissions(ResultSet rs) throws SQLException {
        return List.copyOf(Arrays.asList((String[]) rs.getArray("permissoes").getArray()));
    }
}
