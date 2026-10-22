package br.com.multisaude.prontuario;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.prontuario.EvolutionModels.ShareView;

/** Habilitações "leitor -> autor". Sempre chamado dentro de TenantTransactions.inTenant. */
@Repository
public class ShareRepository {
    private static final String VIEW = "SELECT s.id, s.leitor_id, l.nome leitor_nome, s.autor_id, a.nome autor_nome, s.criado_em, s.revogado_em "
        + "FROM clinica.compartilhamentos_prontuario s "
        + "JOIN clinica.profissionais l ON l.tenant_id = s.tenant_id AND l.id = s.leitor_id "
        + "JOIN clinica.profissionais a ON a.tenant_id = s.tenant_id AND a.id = s.autor_id";
    private final JdbcTemplate jdbc;

    public ShareRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** O leitor precisa ter usuário para que a habilitação sirva de algo; ambos precisam estar ativos. */
    public boolean readerAndAuthorAreUsable(UUID reader, UUID author) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM clinica.profissionais WHERE id = ? AND ativo AND usuario_id IS NOT NULL) "
                + "AND EXISTS(SELECT 1 FROM clinica.profissionais WHERE id = ? AND ativo)", Boolean.class, reader, author));
    }

    public boolean activeExists(UUID reader, UUID author) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM clinica.compartilhamentos_prontuario WHERE leitor_id = ? AND autor_id = ? AND revogado_em IS NULL)", Boolean.class, reader, author));
    }

    public ShareView create(UUID tenant, UUID reader, UUID author, UUID user) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.compartilhamentos_prontuario(id, tenant_id, leitor_id, autor_id, criado_por) VALUES (?, ?, ?, ?, ?)", id, tenant, reader, author, user);
        return jdbc.queryForObject(VIEW + " WHERE s.id = ?", (r, n) -> view(r), id);
    }

    public List<ShareView> list(boolean includeRevoked) {
        return jdbc.query(VIEW + (includeRevoked ? "" : " WHERE s.revogado_em IS NULL") + " ORDER BY l.nome, a.nome, s.criado_em", (r, n) -> view(r));
    }

    public boolean revoke(UUID id, UUID user) {
        return jdbc.update("UPDATE clinica.compartilhamentos_prontuario SET revogado_em = now(), revogado_por = ? WHERE id = ? AND revogado_em IS NULL", user, id) == 1;
    }

    private static ShareView view(java.sql.ResultSet r) throws java.sql.SQLException {
        return new ShareView(r.getObject("id", UUID.class), r.getObject("leitor_id", UUID.class), r.getString("leitor_nome"),
            r.getObject("autor_id", UUID.class), r.getString("autor_nome"), r.getObject("criado_em", OffsetDateTime.class), r.getObject("revogado_em", OffsetDateTime.class));
    }
}
