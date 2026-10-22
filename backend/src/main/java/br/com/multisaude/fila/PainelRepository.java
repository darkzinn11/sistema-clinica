package br.com.multisaude.fila;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.fila.PainelModels.Call;

@Repository
public class PainelRepository {
    private final JdbcTemplate jdbc;

    public PainelRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Call> latest(UUID unit, LocalDate day, int limit) {
        return jdbc.query("""
            SELECT s.codigo, t.nome AS tipo_nome, t.preferencial, g.nome AS guiche_nome,
                   s.chamadas, s.ultima_chamada_em
            FROM clinica.senhas s
            JOIN clinica.tipos_senha t ON t.tenant_id = s.tenant_id AND t.id = s.tipo_id
            LEFT JOIN clinica.guiches g ON g.tenant_id = s.tenant_id AND g.id = s.guiche_id
            WHERE s.unidade_id = ? AND s.dia = ? AND s.ultima_chamada_em IS NOT NULL
            ORDER BY s.ultima_chamada_em DESC, s.id
            LIMIT ?
            """, (r, n) -> new Call(r.getString("codigo"), r.getString("tipo_nome"),
                r.getBoolean("preferencial"), r.getString("guiche_nome"), r.getInt("chamadas"),
                r.getObject("ultima_chamada_em", java.time.OffsetDateTime.class)), unit, day, limit);
    }
}
