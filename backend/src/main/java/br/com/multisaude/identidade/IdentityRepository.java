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

    /** Todos os vínculos ativos do e-mail na clínica em contexto (uma linha por unidade). */
    public List<Credentials> credentials(String email) {
        return jdbc.query("SELECT " + IDENTITY_FIELDS + ", u.senha_hash " + MEMBERSHIP
            + " WHERE u.ativo AND u.email = ? ORDER BY n.nome, n.id",
            (rs, row) -> new Credentials(identity(rs), rs.getString("senha_hash")), email);
    }

    /** Fora de qualquer clínica: em quais clínicas o e-mail tem conta (índice mantido pelo banco; só consulta por igualdade). */
    public List<UUID> tenantsForEmail(String email) {
        return jdbc.queryForList("SELECT tenant_id FROM clinica.emails_login WHERE email = ? ORDER BY tenant_id LIMIT 20", UUID.class, email);
    }

    public Optional<String> clinicName(UUID tenant) {
        return jdbc.queryForList("SELECT nome FROM clinica.tenants WHERE id = ?", String.class, tenant).stream().findFirst();
    }

    /** Fora de qualquer clínica: `codigos_clinica` não tem segurança por linha. Só consulta por igualdade. */
    public Optional<UUID> tenantByCode(String code) {
        return jdbc.queryForList("SELECT tenant_id FROM clinica.codigos_clinica WHERE codigo = ?", UUID.class, code).stream().findFirst();
    }

    public Optional<String> codeOf(UUID tenant) {
        return jdbc.queryForList("SELECT codigo FROM clinica.codigos_clinica WHERE tenant_id = ?", String.class, tenant).stream().findFirst();
    }

    /** Nomes da clínica e da unidade da sessão. Dentro do contexto da clínica. */
    public Optional<String[]> names(UUID unit) {
        return jdbc.query("SELECT t.nome, n.nome FROM clinica.unidades n JOIN clinica.tenants t ON t.id = n.tenant_id WHERE n.id = ?",
            (rs, row) -> new String[] {rs.getString(1), rs.getString(2)}, unit).stream().findFirst();
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

    // ---- meu perfil (só pessoas: dispositivo não tem perfil, senha nem sessão para gerir) ----

    public boolean isPerson(UUID userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM clinica.usuarios WHERE id = ? AND ativo AND NOT dispositivo)", Boolean.class, userId));
    }

    public Optional<String> personPasswordHash(UUID userId) {
        return jdbc.queryForList("SELECT senha_hash FROM clinica.usuarios WHERE id = ? AND ativo AND NOT dispositivo", String.class, userId).stream().findFirst();
    }

    public boolean updateName(UUID userId, String name) {
        return jdbc.update("UPDATE clinica.usuarios SET nome = ?, atualizado_em = now() WHERE id = ? AND ativo AND NOT dispositivo", name.trim(), userId) == 1;
    }

    public void setPassword(UUID userId, String hash) {
        jdbc.update("UPDATE clinica.usuarios SET senha_hash = ?, atualizado_em = now() WHERE id = ? AND NOT dispositivo", hash, userId);
    }

    /** Encerra todas as sessões da pessoa, menos a indicada. Devolve quantas encerrou. */
    public int revokeOtherSessions(UUID userId, UUID keep) {
        return jdbc.update("UPDATE clinica.sessoes SET revogada_em = now() WHERE usuario_id = ? AND id <> ? AND revogada_em IS NULL", userId, keep);
    }

    public List<SessionView> sessions(UUID userId, UUID current) {
        return jdbc.query("SELECT s.id, s.criada_em, s.expira_em, un.nome FROM clinica.sessoes s JOIN clinica.unidades un ON un.tenant_id = s.tenant_id AND un.id = s.unidade_id "
            + "WHERE s.usuario_id = ? AND s.revogada_em IS NULL AND s.expira_em > now() ORDER BY s.criada_em DESC, s.id",
            (rs, row) -> new SessionView(rs.getObject(1, UUID.class), rs.getObject(2, java.time.OffsetDateTime.class), rs.getObject(3, java.time.OffsetDateTime.class),
                rs.getString(4), rs.getObject(1, UUID.class).equals(current)), userId);
    }

    /** Só sessões da própria pessoa. */
    public boolean revokeSessionOf(UUID userId, UUID sessionId) {
        return jdbc.update("UPDATE clinica.sessoes SET revogada_em = now() WHERE id = ? AND usuario_id = ? AND revogada_em IS NULL", sessionId, userId) == 1;
    }

    public void revoke(UUID sessionId) {
        jdbc.update("UPDATE clinica.sessoes SET revogada_em = now() WHERE id = ? AND revogada_em IS NULL", sessionId);
    }

    public List<UserView> users() {
        return jdbc.query("SELECT id, nome, email, ativo FROM clinica.usuarios WHERE NOT dispositivo ORDER BY nome, id LIMIT 200",
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

    // ---- dispositivos (totem) ----

    /** Papel do totem: uma única permissão. É regravado a cada cadastro para ninguém ampliar o que um totem alcança. */
    public UUID totemRole(UUID tenant) {
        return jdbc.queryForObject("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Totem', ARRAY['totem:usar']) "
            + "ON CONFLICT (tenant_id, nome) DO UPDATE SET permissoes = ARRAY['totem:usar'] RETURNING id", UUID.class, UUID.randomUUID(), tenant);
    }

    /** Papel exclusivo do painel: somente leitura das chamadas públicas da fila. */
    public UUID panelRole(UUID tenant) {
        return jdbc.queryForObject("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Painel de TV', ARRAY['painel:ver']) "
            + "ON CONFLICT (tenant_id, nome) DO UPDATE SET permissoes = ARRAY['painel:ver'] RETURNING id", UUID.class, UUID.randomUUID(), tenant);
    }

    public Identity createDevice(UUID tenant, UUID unit, UUID role, String name, String type) {
        UUID id = UUID.randomUUID();
        // Senha inutilizável: não é um hash válido, então nenhum login com este usuário passa.
        String normalizedType = "painel".equals(type) ? "painel" : "totem";
        jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash, dispositivo, dispositivo_tipo) VALUES (?, ?, ?, ?, '!', true, ?)",
            id, tenant, name.trim(), normalizedType + "-" + id + "@dispositivo.invalid", normalizedType);
        jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, id, unit, role);
        return new Identity(id, tenant, unit, name.trim(), normalizedType + "-" + id + "@dispositivo.invalid",
            "painel".equals(normalizedType) ? "Painel de TV" : "Totem",
            "painel".equals(normalizedType) ? List.of("painel:ver") : List.of("totem:usar"));
    }

    public List<DeviceView> devices(UUID unit) {
        return jdbc.query("SELECT u.id, u.nome, u.ativo, u.dispositivo_tipo FROM clinica.usuarios u JOIN clinica.vinculos v ON v.tenant_id = u.tenant_id AND v.usuario_id = u.id "
            + "WHERE u.dispositivo AND v.unidade_id = ? ORDER BY u.nome, u.id LIMIT 200",
            (rs, row) -> new DeviceView(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getBoolean("ativo"), rs.getString("dispositivo_tipo")), unit);
    }

    /** Desativa o dispositivo e derruba os tokens. Só dispositivos da unidade da sessão. */
    public boolean revokeDevice(UUID id, UUID unit) {
        int changed = jdbc.update("UPDATE clinica.usuarios SET ativo = false WHERE id = ? AND dispositivo AND EXISTS "
            + "(SELECT 1 FROM clinica.vinculos v WHERE v.tenant_id = clinica.usuarios.tenant_id AND v.usuario_id = clinica.usuarios.id AND v.unidade_id = ?)", id, unit);
        if (changed == 1) jdbc.update("UPDATE clinica.sessoes SET revogada_em = now() WHERE usuario_id = ? AND revogada_em IS NULL", id);
        return changed == 1;
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
