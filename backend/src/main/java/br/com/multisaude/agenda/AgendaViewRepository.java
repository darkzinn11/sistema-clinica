package br.com.multisaude.agenda;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.agenda.AgendaViewModels.*;

@Repository
public class AgendaViewRepository {
    private final JdbcTemplate jdbc;

    public AgendaViewRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /**
     * Agendamentos da unidade entre dois dias (ate inclusive), no fuso da unidade. professional filtra um profissional;
     * restrictTo (médico) limita ao próprio, e um id inexistente aqui significa "não vê nada" (o controlador resolve antes).
     */
    public List<AgendaItem> between(UUID unit, ZoneId zone, LocalDate from, LocalDate to, UUID professional, boolean withValues) {
        StringBuilder sql = new StringBuilder("SELECT a.id, lower(a.periodo), upper(a.periodo), a.status, a.versao, a.canal, a.observacao, a.remarcado_de, "
            + "pr.id, pr.nome, pr.cor_agenda, pa.id, pa.nome, pa.celular, pc.id, pc.nome, pc.tipo, pc.valor_centavos, "
            + "(SELECT max(h.em) FROM clinica.agendamento_historico h WHERE h.agendamento_id = a.id AND h.para = 'check_in') "
            + "FROM clinica.agendamentos a JOIN clinica.profissionais pr ON pr.tenant_id = a.tenant_id AND pr.id = a.profissional_id "
            + "JOIN clinica.pacientes pa ON pa.tenant_id = a.tenant_id AND pa.id = a.paciente_id "
            + "JOIN clinica.procedimentos pc ON pc.tenant_id = a.tenant_id AND pc.id = a.procedimento_id "
            + "WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ?");
        List<Object> args = new java.util.ArrayList<>(List.of(unit, Timestamp.from(from.atStartOfDay(zone).toInstant()), Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant())));
        if (professional != null) {
            sql.append(" AND a.profissional_id = ?");
            args.add(professional);
        }
        sql.append(" ORDER BY lower(a.periodo), pr.nome, a.id LIMIT 2000");
        return jdbc.query(sql.toString(), (rs, n) -> {
            OffsetDateTime start = local(rs.getObject(2, OffsetDateTime.class), zone);
            Long price = rs.getObject(18) == null ? null : rs.getLong(18);
            OffsetDateTime arrival = rs.getObject(19, OffsetDateTime.class);
            return new AgendaItem(rs.getObject(1, UUID.class), start.toLocalDate(), start, local(rs.getObject(3, OffsetDateTime.class), zone), rs.getString(4), rs.getInt(5),
                rs.getString(6), rs.getString(7), rs.getObject(8, UUID.class), rs.getObject(9, UUID.class), rs.getString(10), rs.getString(11),
                rs.getObject(12, UUID.class), rs.getString(13), rs.getString(14), rs.getObject(15, UUID.class), rs.getString(16), rs.getString(17),
                withValues ? price : null, arrival == null ? null : local(arrival, zone));
        }, args.toArray());
    }

    private static OffsetDateTime local(OffsetDateTime value, ZoneId zone) { return value.atZoneSameInstant(zone).toOffsetDateTime(); }
}
