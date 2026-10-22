package br.com.multisaude.agenda;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.agenda.ScheduleModels.*;

/** Acesso a dados de grades e bloqueios. Sempre chamado dentro de TenantTransactions.inTenant. */
@Repository
public class ScheduleRepository {
    private static final String GRADE_COLUMNS = "id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min, lower(vigencia) vig_ini, upper(vigencia) vig_fim, ativo";
    private static final String ACTIVE_STATUS = "status NOT IN ('cancelado','nao_compareceu','remarcado')";
    private final JdbcTemplate jdbc;

    public ScheduleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ZoneId unitZone(UUID unit) {
        return ZoneId.of(jdbc.queryForObject("SELECT fuso FROM clinica.unidades WHERE id = ?", String.class, unit));
    }

    public boolean professionalServesUnit(UUID professional, UUID unit) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM clinica.profissionais p JOIN clinica.profissional_unidades u ON u.tenant_id = p.tenant_id AND u.profissional_id = p.id "
                + "WHERE p.id = ? AND p.ativo AND u.unidade_id = ?)", Boolean.class, professional, unit));
    }

    /** minutes é nulo enquanto a clínica não mediu o tempo do procedimento. */
    public record ProcedureTime(Integer minutes) {}

    public Optional<ProcedureTime> procedureTime(UUID procedure) {
        return jdbc.query("SELECT duracao_min FROM clinica.procedimentos WHERE id = ? AND ativo", (r, n) -> new ProcedureTime(r.getObject(1, Integer.class)), procedure).stream().findFirst();
    }

    // ---- grades ----

    public boolean gradeOverlaps(UUID professional, int weekday, LocalTime start, LocalTime end, LocalDate validFrom, LocalDate validUntilInclusive) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM clinica.grades WHERE profissional_id = ? AND dia_semana = ? AND ativo "
                + "AND janela_min && int4range(?, ?) AND vigencia && daterange(?, ?, '[]'))", Boolean.class,
            professional, weekday, minutes(start), minutes(end), Date.valueOf(validFrom), validUntilInclusive == null ? null : Date.valueOf(validUntilInclusive)));
    }

    public GradeView createGrade(UUID tenant, UUID unit, CreateGradeRequest x, LocalDate validFrom) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.grades(id, tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min, vigencia) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, daterange(?, ?, '[]'))",
            id, tenant, x.profissionalId(), unit, x.diaSemana(), x.inicio(), x.fim(), x.duracaoBlocoMin(),
            Date.valueOf(validFrom), x.vigenciaFim() == null ? null : Date.valueOf(x.vigenciaFim()));
        return jdbc.queryForObject("SELECT " + GRADE_COLUMNS + " FROM clinica.grades WHERE id = ?", (r, n) -> grade(r), id);
    }

    public List<GradeView> grades(UUID unit, UUID professional) {
        return jdbc.query("SELECT " + GRADE_COLUMNS + " FROM clinica.grades WHERE unidade_id = ? AND ativo AND (?::uuid IS NULL OR profissional_id = ?) "
            + "ORDER BY profissional_id, dia_semana, inicio", (r, n) -> grade(r), unit, professional, professional);
    }

    /** Desativa em vez de apagar. Agendamentos já feitos não são tocados. */
    public boolean deactivateGrade(UUID id, UUID unit) {
        return jdbc.update("UPDATE clinica.grades SET ativo = false WHERE id = ? AND unidade_id = ? AND ativo", id, unit) == 1;
    }

    /** Janelas de atendimento do profissional naquele dia, já filtradas por unidade, vigência e dia da semana. */
    public List<GradeView> gradesOn(UUID professional, UUID unit, LocalDate date) {
        return jdbc.query("SELECT " + GRADE_COLUMNS + " FROM clinica.grades WHERE profissional_id = ? AND unidade_id = ? AND ativo "
            + "AND dia_semana = ? AND vigencia @> ?::date ORDER BY inicio", (r, n) -> grade(r),
            professional, unit, date.getDayOfWeek().getValue() % 7, Date.valueOf(date));
    }

    /** A janela de grade do dia local da unidade que contém este horário de início (as janelas do profissional não se sobrepõem). */
    public Optional<GradeView> windowAt(UUID professional, UUID unit, LocalDate date, LocalTime start) {
        return jdbc.query("SELECT " + GRADE_COLUMNS + " FROM clinica.grades WHERE profissional_id = ? AND unidade_id = ? AND ativo AND dia_semana = ? "
            + "AND vigencia @> ?::date AND inicio <= ? AND ? < fim LIMIT 1", (r, n) -> grade(r),
            professional, unit, date.getDayOfWeek().getValue() % 7, Date.valueOf(date), start, start).stream().findFirst();
    }

    // ---- bloqueios ----

    public Optional<String> blockReason(UUID unit, UUID professional, OffsetDateTime from, OffsetDateTime to) {
        return jdbc.query("SELECT motivo FROM clinica.bloqueios WHERE revogado_em IS NULL AND unidade_id = ? "
            + "AND (profissional_id IS NULL OR profissional_id = ?) AND periodo && tstzrange(?, ?, '[)') LIMIT 1",
            (r, n) -> r.getString(1), unit, professional, ts(from), ts(to)).stream().findFirst();
    }

    /** Agendamentos ativos que um bloqueio novo atropelaria; null em profissional significa a unidade inteira. */
    public int activeAppointmentsIn(UUID unit, UUID professional, OffsetDateTime from, OffsetDateTime to) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos WHERE unidade_id = ? AND (?::uuid IS NULL OR profissional_id = ?) "
            + "AND periodo && tstzrange(?, ?, '[)') AND " + ACTIVE_STATUS, Integer.class, unit, professional, professional, ts(from), ts(to));
    }

    public BlockView createBlock(UUID tenant, UUID unit, CreateBlockRequest x, UUID creator) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.bloqueios(id, tenant_id, unidade_id, profissional_id, periodo, motivo, criado_por) VALUES (?, ?, ?, ?, tstzrange(?, ?, '[)'), ?, ?)",
            id, tenant, unit, x.profissionalId(), ts(x.inicio()), ts(x.fim()), x.motivo().trim(), creator);
        return jdbc.queryForObject(BLOCK_SELECT + " AND id = ?", (r, n) -> block(r), unit, id);
    }

    /** restricted: só bloqueios da unidade inteira e os do próprio profissional; os motivos dos colegas podem ser pessoais. */
    public List<BlockView> blocks(UUID unit, OffsetDateTime from, OffsetDateTime to, boolean restricted, UUID professional) {
        return jdbc.query(BLOCK_SELECT + " AND periodo && tstzrange(?, ?, '[)') AND (NOT ? OR profissional_id IS NULL OR profissional_id = ?) ORDER BY lower(periodo)",
            (r, n) -> block(r), unit, ts(from), ts(to), restricted, professional);
    }

    public boolean revokeBlock(UUID id, UUID unit) {
        return jdbc.update("UPDATE clinica.bloqueios SET revogado_em = now() WHERE id = ? AND unidade_id = ? AND revogado_em IS NULL", id, unit) == 1;
    }

    /** Intervalos ocupados do profissional: agendamentos ativos e bloqueios (dele ou da unidade toda). */
    public List<SlotView> busy(UUID unit, UUID professional, OffsetDateTime from, OffsetDateTime to) {
        return jdbc.query("SELECT lower(periodo) inicio, upper(periodo) fim FROM clinica.agendamentos WHERE profissional_id = ? AND periodo && tstzrange(?, ?, '[)') AND " + ACTIVE_STATUS
            + " UNION ALL SELECT lower(periodo), upper(periodo) FROM clinica.bloqueios WHERE revogado_em IS NULL AND unidade_id = ? "
            + "AND (profissional_id IS NULL OR profissional_id = ?) AND periodo && tstzrange(?, ?, '[)')",
            (r, n) -> new SlotView(r.getObject(1, OffsetDateTime.class), r.getObject(2, OffsetDateTime.class)),
            professional, ts(from), ts(to), unit, professional, ts(from), ts(to));
    }

    private static final String BLOCK_SELECT = "SELECT id, unidade_id, profissional_id, lower(periodo) inicio, upper(periodo) fim, motivo FROM clinica.bloqueios WHERE revogado_em IS NULL AND unidade_id = ?";

    private static GradeView grade(java.sql.ResultSet r) throws java.sql.SQLException {
        Date until = r.getDate("vig_fim");
        // daterange guarda o fim exclusivo; a API expõe o último dia incluído.
        return new GradeView(r.getObject("id", UUID.class), r.getObject("profissional_id", UUID.class), r.getObject("unidade_id", UUID.class),
            r.getInt("dia_semana"), r.getObject("inicio", LocalTime.class), r.getObject("fim", LocalTime.class), r.getInt("duracao_bloco_min"),
            r.getObject("vig_ini", LocalDate.class), until == null ? null : until.toLocalDate().minusDays(1), r.getBoolean("ativo"));
    }

    private static BlockView block(java.sql.ResultSet r) throws java.sql.SQLException {
        return new BlockView(r.getObject("id", UUID.class), r.getObject("unidade_id", UUID.class), r.getObject("profissional_id", UUID.class),
            r.getObject("inicio", OffsetDateTime.class), r.getObject("fim", OffsetDateTime.class), r.getString("motivo"));
    }

    private static int minutes(LocalTime t) {
        return t.getHour() * 60 + t.getMinute();
    }

    private static Timestamp ts(OffsetDateTime t) {
        return Timestamp.from(t.toInstant());
    }
}
