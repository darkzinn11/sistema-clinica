package br.com.multisaude.auditoria;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Registro de quem acessou dados de pacientes. Gravado na MESMA transação da leitura: se a gravação falhar,
 * a leitura também falha, e nenhum dado sai sem registro. A tabela é imutável (ver V17).
 */
@Component
public class AccessAudit {
    public record AccessView(long id, UUID usuarioId, String usuarioNome, UUID pacienteId, String acao, int quantidade, OffsetDateTime em) {}

    private final JdbcTemplate jdbc;

    public AccessAudit(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Uma linha por paciente entregue. */
    public void patients(UUID tenant, UUID user, Collection<UUID> patients, String action) {
        jdbc.batchUpdate("INSERT INTO clinica.acessos_prontuario(tenant_id, usuario_id, paciente_id, acao) VALUES (?, ?, ?, ?)",
            patients, 100, (ps, patient) -> {
                ps.setObject(1, tenant);
                ps.setObject(2, user);
                ps.setObject(3, patient);
                ps.setString(4, action);
            });
    }

    public void one(UUID tenant, UUID user, UUID patient, String action, int quantity) {
        jdbc.update("INSERT INTO clinica.acessos_prontuario(tenant_id, usuario_id, paciente_id, acao, quantidade) VALUES (?, ?, ?, ?, ?)",
            tenant, user, patient, action, quantity);
    }

    public List<AccessView> search(UUID patient, UUID user, OffsetDateTime from, OffsetDateTime to, int limit) {
        return jdbc.query("""
            SELECT a.id, a.usuario_id, u.nome, a.paciente_id, a.acao, a.quantidade, a.em
            FROM clinica.acessos_prontuario a JOIN clinica.usuarios u ON u.tenant_id = a.tenant_id AND u.id = a.usuario_id
            WHERE (?::uuid IS NULL OR a.paciente_id = ?) AND (?::uuid IS NULL OR a.usuario_id = ?)
              AND (?::timestamptz IS NULL OR a.em >= ?) AND (?::timestamptz IS NULL OR a.em < ?)
            ORDER BY a.em DESC, a.id DESC LIMIT ?
            """, (r, n) -> new AccessView(r.getLong(1), r.getObject(2, UUID.class), r.getString(3), r.getObject(4, UUID.class),
                r.getString(5), r.getInt(6), r.getObject(7, OffsetDateTime.class)),
            patient, patient, user, user, ts(from), ts(from), ts(to), ts(to), limit);
    }

    private static Timestamp ts(OffsetDateTime t) {
        return t == null ? null : Timestamp.from(t.toInstant());
    }
}
