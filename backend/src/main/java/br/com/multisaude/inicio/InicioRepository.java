package br.com.multisaude.inicio;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.inicio.InicioModels.*;

@Repository
public class InicioRepository {
    // Agendamento que ainda conta no dia: cancelado e remarcado saem (o horário foi liberado).
    private static final String COUNTS = "a.status NOT IN ('cancelado', 'remarcado')";
    private final JdbcTemplate jdbc;

    public InicioRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public ZoneId zone(UUID unit) {
        return ZoneId.of(jdbc.queryForObject("SELECT fuso FROM clinica.unidades WHERE id = ?", String.class, unit));
    }

    /** O mesmo instante com o deslocamento da unidade: o front lê a hora da clínica direto do texto, sem depender do fuso do navegador. */
    static OffsetDateTime local(OffsetDateTime value, ZoneId zone) {
        return value.atZoneSameInstant(zone).toOffsetDateTime();
    }

    private static Timestamp start(LocalDate day, ZoneId zone) { return Timestamp.from(day.atStartOfDay(zone).toInstant()); }

    public int count(UUID unit, LocalDate day, ZoneId zone) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos a WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ? AND " + COUNTS,
            Integer.class, unit, start(day, zone), start(day.plusDays(1), zone));
    }

    /** Já confirmados (inclui quem já chegou e quem já foi atendido) entre os que ainda contam e não faltaram. */
    public int[] confirmation(UUID unit, LocalDate day, ZoneId zone) {
        return jdbc.queryForObject("SELECT count(*) FILTER (WHERE a.status IN ('confirmado', 'check_in', 'em_atendimento', 'atendido')), count(*) FILTER (WHERE a.status <> 'nao_compareceu') "
            + "FROM clinica.agendamentos a WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ? AND " + COUNTS,
            (rs, n) -> new int[] {rs.getInt(1), rs.getInt(2)}, unit, start(day, zone), start(day.plusDays(1), zone));
    }

    public long revenue(UUID unit, LocalDate day, ZoneId zone) {
        return jdbc.queryForObject("SELECT COALESCE(sum(p.valor_centavos), 0) FROM clinica.agendamentos a JOIN clinica.procedimentos p ON p.tenant_id = a.tenant_id AND p.id = a.procedimento_id "
            + "WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ? AND " + COUNTS + " AND a.status <> 'nao_compareceu'",
            Long.class, unit, start(day, zone), start(day.plusDays(1), zone));
    }

    public int unconfirmed(UUID unit, LocalDate day, ZoneId zone) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos a WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ? AND a.status = 'agendado'",
            Integer.class, unit, start(day, zone), start(day.plusDays(1), zone));
    }

    public List<Proximo> next(UUID unit, OffsetDateTime from, LocalDate day, ZoneId zone, int limit) {
        return jdbc.query("SELECT a.id, lower(a.periodo) inicio, upper(a.periodo) fim, a.status, a.paciente_id, pa.nome paciente, a.profissional_id, pr.nome profissional, pr.cor_agenda, pc.nome procedimento "
            + "FROM clinica.agendamentos a JOIN clinica.pacientes pa ON pa.tenant_id = a.tenant_id AND pa.id = a.paciente_id "
            + "JOIN clinica.profissionais pr ON pr.tenant_id = a.tenant_id AND pr.id = a.profissional_id "
            + "JOIN clinica.procedimentos pc ON pc.tenant_id = a.tenant_id AND pc.id = a.procedimento_id "
            + "WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ? AND a.status IN ('agendado', 'confirmado', 'check_in') "
            + "ORDER BY lower(a.periodo), a.id LIMIT ?",
            (rs, n) -> new Proximo(rs.getObject(1, UUID.class), local(rs.getObject(2, OffsetDateTime.class), zone), local(rs.getObject(3, OffsetDateTime.class), zone), rs.getString(4),
                rs.getObject(5, UUID.class), rs.getString(6), rs.getObject(7, UUID.class), rs.getString(8), rs.getString(9), rs.getString(10)),
            unit, Timestamp.from(from.toInstant()), start(day.plusDays(1), zone), limit);
    }

    /** Quem fez check-in e ainda não foi chamado; espera = desde a última mudança para check_in (ou desde a última atualização, se não houver histórico). */
    public List<Espera> waiting(UUID unit, LocalDate day, ZoneId zone, int limit) {
        return jdbc.query("SELECT a.id, a.paciente_id, pa.nome, pr.nome, "
            + "GREATEST(0, floor(extract(epoch FROM (now() - COALESCE((SELECT max(h.em) FROM clinica.agendamento_historico h WHERE h.agendamento_id = a.id AND h.para = 'check_in'), a.atualizado_em))) / 60))::bigint "
            + "FROM clinica.agendamentos a JOIN clinica.pacientes pa ON pa.tenant_id = a.tenant_id AND pa.id = a.paciente_id "
            + "JOIN clinica.profissionais pr ON pr.tenant_id = a.tenant_id AND pr.id = a.profissional_id "
            + "WHERE a.unidade_id = ? AND a.status = 'check_in' AND lower(a.periodo) >= ? AND lower(a.periodo) < ? "
            + "ORDER BY 5 DESC, a.id LIMIT ?",
            (rs, n) -> new Espera(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getString(4), rs.getLong(5)),
            unit, start(day, zone), start(day.plusDays(1), zone), limit);
    }

    public int waitingCount(UUID unit, LocalDate day, ZoneId zone) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos a WHERE a.unidade_id = ? AND a.status = 'check_in' AND lower(a.periodo) >= ? AND lower(a.periodo) < ?",
            Integer.class, unit, start(day, zone), start(day.plusDays(1), zone));
    }

    /** Blocos da grade do dia (janela / tamanho do bloco) contra os agendamentos que contam. Só quem tem grade hoje nesta unidade. */
    public List<Ocupacao> occupancy(UUID unit, LocalDate day, ZoneId zone) {
        return jdbc.query("SELECT pr.id, pr.nome, pr.cor_agenda, cap.blocos, COALESCE(used.n, 0) FROM ("
            + "  SELECT g.profissional_id, sum((upper(g.janela_min) - lower(g.janela_min)) / g.duracao_bloco_min)::int blocos FROM clinica.grades g "
            + "  WHERE g.unidade_id = ? AND g.ativo AND g.dia_semana = ? AND g.vigencia @> ?::date GROUP BY g.profissional_id) cap "
            + "JOIN clinica.profissionais pr ON pr.id = cap.profissional_id AND pr.ativo AND NOT pr.oculto_na_agenda "
            + "LEFT JOIN (SELECT a.profissional_id, count(*)::int n FROM clinica.agendamentos a WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ? AND "
            + COUNTS + " AND a.status <> 'nao_compareceu' GROUP BY a.profissional_id) used ON used.profissional_id = pr.id "
            + "ORDER BY pr.nome, pr.id",
            (rs, n) -> {
                int blocks = rs.getInt(4), used = rs.getInt(5);
                return new Ocupacao(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), blocks, used, blocks == 0 ? 0 : Math.min(100, used * 100 / blocks));
            },
            unit, day.getDayOfWeek().getValue() % 7, java.sql.Date.valueOf(day), unit, start(day, zone), start(day.plusDays(1), zone));
    }

    /** Pacientes ativos que fazem aniversário de hoje até daqui a 6 dias. */
    public List<Aniversariante> birthdays(LocalDate today, int limit) {
        return jdbc.query("SELECT p.id, p.nome, p.nascimento, d.dia FROM clinica.pacientes p "
            + "JOIN (SELECT (?::date + g) AS dia FROM generate_series(0, 6) g) d ON extract(month FROM p.nascimento) = extract(month FROM d.dia) AND extract(day FROM p.nascimento) = extract(day FROM d.dia) "
            + "WHERE p.ativo AND p.nascimento IS NOT NULL ORDER BY d.dia, p.nome, p.id LIMIT ?",
            (rs, n) -> {
                LocalDate born = rs.getObject(3, LocalDate.class), day = rs.getObject(4, LocalDate.class);
                return new Aniversariante(rs.getObject(1, UUID.class), rs.getString(2), day, day.getYear() - born.getYear());
            }, java.sql.Date.valueOf(today), limit);
    }
}
