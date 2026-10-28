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
            + "(SELECT max(h.em) FROM clinica.agendamento_historico h WHERE h.agendamento_id = a.id AND h.para = 'check_in'), "
            // Idade no dia da consulta, no fuso da unidade.
            + "date_part('year', age((lower(a.periodo) AT TIME ZONE ?)::date, pa.nascimento))::int, "
            // 1ª vez na especialidade: nenhum comparecimento anterior com um profissional da mesma especialidade principal.
            + "CASE WHEN esp.especialidade_id IS NULL THEN NULL ELSE NOT EXISTS (SELECT 1 FROM clinica.agendamentos o "
            + "  JOIN clinica.profissional_especialidades oe ON oe.tenant_id = o.tenant_id AND oe.profissional_id = o.profissional_id AND oe.principal "
            + "  WHERE o.tenant_id = a.tenant_id AND o.paciente_id = a.paciente_id AND o.id <> a.id AND oe.especialidade_id = esp.especialidade_id "
            + "  AND o.status IN ('check_in', 'em_atendimento', 'atendido') AND lower(o.periodo) < lower(a.periodo)) END, "
            // Encaixe: marcado no próprio dia, ou no horário que outro paciente desmarcou/remarcou antes desta marcação.
            + "((a.criado_em AT TIME ZONE ?)::date = (lower(a.periodo) AT TIME ZONE ?)::date OR EXISTS (SELECT 1 FROM clinica.agendamentos o "
            + "  WHERE o.tenant_id = a.tenant_id AND o.profissional_id = a.profissional_id AND o.id <> a.id AND o.paciente_id <> a.paciente_id "
            + "  AND o.status IN ('cancelado', 'remarcado') AND o.periodo && a.periodo AND o.criado_em < a.criado_em)) "
            + "FROM clinica.agendamentos a JOIN clinica.profissionais pr ON pr.tenant_id = a.tenant_id AND pr.id = a.profissional_id "
            + "JOIN clinica.pacientes pa ON pa.tenant_id = a.tenant_id AND pa.id = a.paciente_id "
            + "JOIN clinica.procedimentos pc ON pc.tenant_id = a.tenant_id AND pc.id = a.procedimento_id "
            + "LEFT JOIN clinica.profissional_especialidades esp ON esp.tenant_id = a.tenant_id AND esp.profissional_id = a.profissional_id AND esp.principal "
            + "WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ?");
        List<Object> args = new java.util.ArrayList<>(List.of(zone.getId(), zone.getId(), zone.getId(),
            unit, Timestamp.from(from.atStartOfDay(zone).toInstant()), Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant())));
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
                withValues ? price : null, arrival == null ? null : local(arrival, zone),
                rs.getObject(20) == null ? null : rs.getInt(20), rs.getObject(21) == null ? null : rs.getBoolean(21), rs.getBoolean(22));
        }, args.toArray());
    }

    private static OffsetDateTime local(OffsetDateTime value, ZoneId zone) { return value.atZoneSameInstant(zone).toOffsetDateTime(); }

    /**
     * Blocos da grade (janela / tamanho do bloco) contra os agendamentos que ainda contam (cancelado, remarcado e falta liberam o horário),
     * por profissional e dia, só de profissionais ativos e visíveis na agenda. professional limita a um profissional.
     */
    public List<OcupacaoDia> occupancy(UUID unit, ZoneId zone, LocalDate from, LocalDate to, UUID professional) {
        List<Object> args = new java.util.ArrayList<>(List.of(java.sql.Date.valueOf(from), java.sql.Date.valueOf(to), unit, zone.getId(), unit));
        String filter = "";
        if (professional != null) {
            filter = " AND cap.profissional_id = ?";
            args.add(professional);
        }
        return jdbc.query("SELECT cap.dia, cap.profissional_id, cap.blocos, COALESCE(used.n, 0) FROM ("
            + "  SELECT d.dia::date dia, g.profissional_id, sum((upper(g.janela_min) - lower(g.janela_min)) / g.duracao_bloco_min)::int blocos "
            + "  FROM generate_series(?::date, ?::date, interval '1 day') d(dia) "
            + "  JOIN clinica.grades g ON g.unidade_id = ? AND g.ativo AND g.dia_semana = extract(dow FROM d.dia)::int AND g.vigencia @> d.dia::date "
            + "  GROUP BY d.dia, g.profissional_id) cap "
            + "JOIN clinica.profissionais pr ON pr.id = cap.profissional_id AND pr.ativo AND NOT pr.oculto_na_agenda "
            + "LEFT JOIN (SELECT a.profissional_id, (lower(a.periodo) AT TIME ZONE ?)::date dia, count(*)::int n FROM clinica.agendamentos a "
            + "  WHERE a.unidade_id = ? AND a.status NOT IN ('cancelado', 'remarcado', 'nao_compareceu') GROUP BY 1, 2) used "
            + "  ON used.profissional_id = cap.profissional_id AND used.dia = cap.dia "
            + "WHERE true" + filter + " ORDER BY cap.dia, pr.nome, pr.id",
            (rs, n) -> new OcupacaoDia(rs.getObject(2, UUID.class), rs.getObject(1, LocalDate.class), rs.getInt(3), rs.getInt(4)), args.toArray());
    }

    /** Todos os agendamentos do paciente na clínica (mais recentes primeiro), cada um no fuso da sua unidade. */
    public List<PatientAppointment> ofPatient(UUID patient, boolean withValues) {
        return jdbc.query("SELECT a.id, lower(a.periodo), upper(a.periodo), a.status, un.nome, un.fuso, pr.id, pr.nome, pc.nome, pc.valor_centavos "
            + "FROM clinica.agendamentos a JOIN clinica.unidades un ON un.tenant_id = a.tenant_id AND un.id = a.unidade_id "
            + "JOIN clinica.profissionais pr ON pr.tenant_id = a.tenant_id AND pr.id = a.profissional_id "
            + "JOIN clinica.procedimentos pc ON pc.tenant_id = a.tenant_id AND pc.id = a.procedimento_id "
            + "WHERE a.paciente_id = ? ORDER BY lower(a.periodo) DESC, a.id LIMIT 300", (rs, n) -> {
                ZoneId zone = ZoneId.of(rs.getString(6));
                OffsetDateTime start = local(rs.getObject(2, OffsetDateTime.class), zone);
                Long price = rs.getObject(10) == null ? null : rs.getLong(10);
                return new PatientAppointment(rs.getObject(1, UUID.class), start.toLocalDate(), start, local(rs.getObject(3, OffsetDateTime.class), zone), rs.getString(4),
                    rs.getString(5), rs.getObject(7, UUID.class), rs.getString(8), rs.getString(9), withValues ? price : null);
            }, patient);
    }
}
