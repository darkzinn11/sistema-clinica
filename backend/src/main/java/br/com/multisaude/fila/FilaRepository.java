package br.com.multisaude.fila;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.fila.FilaModels.*;

/** Sempre chamado dentro de TenantTransactions.inTenant. */
@Repository
public class FilaRepository {
    private static final String TICKET = "SELECT s.id, s.codigo, s.tipo_id, t.nome tipo_nome, t.preferencial, s.status, s.criada_em, s.guiche_id, g.nome guiche_nome, "
        + "s.chamadas, s.ultima_chamada_em, s.paciente_id, s.dia FROM clinica.senhas s "
        + "JOIN clinica.tipos_senha t ON t.tenant_id = s.tenant_id AND t.id = s.tipo_id "
        + "LEFT JOIN clinica.guiches g ON g.tenant_id = s.tenant_id AND g.id = s.guiche_id";
    private final JdbcTemplate jdbc;

    public FilaRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---- tipos de senha ----

    public TicketTypeView createType(UUID tenant, TicketTypeRequest x) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.tipos_senha(id, tenant_id, nome, prefixo, preferencial, ativo) VALUES (?, ?, ?, ?, ?, ?)",
            id, tenant, x.nome().trim(), x.prefixo(), x.preferencial(), x.ativo() == null || x.ativo());
        return type(id).orElseThrow();
    }

    public Optional<TicketTypeView> updateType(UUID id, TicketTypeRequest x) {
        jdbc.update("UPDATE clinica.tipos_senha SET nome = ?, prefixo = ?, preferencial = ?, ativo = COALESCE(?, ativo) WHERE id = ?",
            x.nome().trim(), x.prefixo(), x.preferencial(), x.ativo(), id);
        return type(id);
    }

    public Optional<TicketTypeView> type(UUID id) {
        return jdbc.query("SELECT id, nome, prefixo, preferencial, ativo FROM clinica.tipos_senha WHERE id = ?", (r, n) -> typeView(r), id).stream().findFirst();
    }

    public List<TicketTypeView> types() {
        return jdbc.query("SELECT id, nome, prefixo, preferencial, ativo FROM clinica.tipos_senha ORDER BY preferencial, nome", (r, n) -> typeView(r));
    }

    public int existingTypes(List<UUID> ids) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.tipos_senha WHERE id = ANY(?)", Integer.class, (Object) ids.toArray(new UUID[0]));
    }

    // ---- guichês ----

    public UUID createCounter(UUID tenant, UUID unit, String name, boolean active) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.guiches(id, tenant_id, unidade_id, nome, ativo) VALUES (?, ?, ?, ?, ?)", id, tenant, unit, name.trim(), active);
        return id;
    }

    public boolean updateCounter(UUID id, UUID unit, String name, Boolean active) {
        return jdbc.update("UPDATE clinica.guiches SET nome = ?, ativo = COALESCE(?, ativo) WHERE id = ? AND unidade_id = ?", name.trim(), active, id, unit) == 1;
    }

    public void replaceCounterTypes(UUID tenant, UUID counter, List<CounterTypeRef> types) {
        jdbc.update("DELETE FROM clinica.guiche_tipos WHERE guiche_id = ?", counter);
        for (CounterTypeRef t : types) {
            jdbc.update("INSERT INTO clinica.guiche_tipos(tenant_id, guiche_id, tipo_id, ordem) VALUES (?, ?, ?, ?)", tenant, counter, t.tipoId(), t.ordem() == null ? 1 : t.ordem());
        }
    }

    public List<CounterView> counters(UUID unit) {
        return jdbc.query("SELECT id, nome, ativo FROM clinica.guiches WHERE unidade_id = ? ORDER BY nome",
            (r, n) -> counterView(r.getObject(1, UUID.class), r.getString(2), r.getBoolean(3)), unit);
    }

    public Optional<CounterView> counter(UUID id, UUID unit) {
        return jdbc.query("SELECT id, nome, ativo FROM clinica.guiches WHERE id = ? AND unidade_id = ?",
            (r, n) -> counterView(r.getObject(1, UUID.class), r.getString(2), r.getBoolean(3)), id, unit).stream().findFirst();
    }

    public boolean counterAllows(UUID counter, UUID type) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.guiche_tipos WHERE guiche_id = ? AND tipo_id = ?)", Boolean.class, counter, type));
    }

    // ---- senhas ----

    /** Incremento atômico: duas gerações simultâneas nunca recebem o mesmo número. */
    public int nextNumber(UUID tenant, UUID unit, UUID type, LocalDate day) {
        return jdbc.queryForObject("INSERT INTO clinica.contadores_senha(tenant_id, unidade_id, tipo_id, dia, ultimo) VALUES (?, ?, ?, ?, 1) "
            + "ON CONFLICT (tenant_id, unidade_id, tipo_id, dia) DO UPDATE SET ultimo = clinica.contadores_senha.ultimo + 1 RETURNING ultimo",
            Integer.class, tenant, unit, type, day);
    }

    public UUID insertTicket(UUID tenant, UUID unit, UUID type, LocalDate day, int number, String code, String cpf, String origin, UUID generatedBy) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.senhas(id, tenant_id, unidade_id, tipo_id, dia, numero, codigo, cpf_informado, origem, gerada_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, tenant, unit, type, day, number, code, cpf, origin, generatedBy);
        return id;
    }

    public int generatedSince(UUID device, java.time.Duration window) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.senhas WHERE gerada_por = ? AND criada_em > clock_timestamp() - make_interval(secs => ?)",
            Integer.class, device, (double) window.toSeconds());
    }

    /** O CPF digitado no totem só vale no dia: o que sobrou de senha que nunca virou atendimento é apagado. */
    public void purgeStaleCpf(UUID unit, LocalDate today) {
        jdbc.update("UPDATE clinica.senhas SET cpf_informado = NULL WHERE unidade_id = ? AND dia < ? AND cpf_informado IS NOT NULL AND paciente_id IS NULL", unit, today);
    }

    public Optional<String> cpfInformado(UUID ticket) {
        return jdbc.queryForList("SELECT cpf_informado FROM clinica.senhas WHERE id = ? AND cpf_informado IS NOT NULL", String.class, ticket).stream().findFirst();
    }

    public List<AppointmentToday> appointmentsToday(UUID patient, UUID unit, java.time.OffsetDateTime from, java.time.OffsetDateTime to) {
        return jdbc.query("SELECT a.id, lower(a.periodo) inicio, upper(a.periodo) fim, p.nome profissional, pr.nome procedimento, a.status FROM clinica.agendamentos a "
            + "JOIN clinica.profissionais p ON p.tenant_id = a.tenant_id AND p.id = a.profissional_id "
            + "JOIN clinica.procedimentos pr ON pr.tenant_id = a.tenant_id AND pr.id = a.procedimento_id "
            + "WHERE a.paciente_id = ? AND a.unidade_id = ? AND a.periodo && tstzrange(?, ?, '[)') AND a.status NOT IN ('cancelado', 'nao_compareceu', 'remarcado') ORDER BY lower(a.periodo)",
            (r, n) -> new AppointmentToday(r.getObject("id", UUID.class), r.getObject("inicio", OffsetDateTime.class), r.getObject("fim", OffsetDateTime.class),
                r.getString("profissional"), r.getString("procedimento"), r.getString("status")),
            patient, unit, java.sql.Timestamp.from(from.toInstant()), java.sql.Timestamp.from(to.toInstant()));
    }

    public Optional<TicketView> ticket(UUID id, UUID unit) {
        return jdbc.query(TICKET + " WHERE s.id = ? AND s.unidade_id = ?", (r, n) -> ticketView(r), id, unit).stream().findFirst();
    }

    /** Bloqueia a senha até o fim da transação para duas pessoas não decidirem sobre a mesma. */
    public Optional<TicketView> lockTicket(UUID id, UUID unit) {
        return jdbc.query(TICKET + " WHERE s.id = ? AND s.unidade_id = ? FOR UPDATE OF s", (r, n) -> ticketView(r), id, unit).stream().findFirst();
    }

    public List<TicketView> waiting(UUID unit, LocalDate day, UUID type, UUID counter) {
        return jdbc.query(TICKET + (counter == null ? "" : " JOIN clinica.guiche_tipos gt ON gt.tenant_id = s.tenant_id AND gt.tipo_id = s.tipo_id AND gt.guiche_id = ?")
            + " WHERE s.unidade_id = ? AND s.dia = ? AND s.status = 'aguardando' AND (?::uuid IS NULL OR s.tipo_id = ?) "
            + "ORDER BY " + (counter == null ? "" : "gt.ordem, ") + "s.criada_em, s.id LIMIT 200",
            (r, n) -> ticketView(r), params(counter, unit, day, type, type));
    }

    public List<TicketView> lastCalled(UUID unit, LocalDate day, int limit) {
        return jdbc.query(TICKET + " WHERE s.unidade_id = ? AND s.dia = ? AND s.ultima_chamada_em IS NOT NULL ORDER BY s.ultima_chamada_em DESC, s.id LIMIT ?",
            (r, n) -> ticketView(r), unit, day, limit);
    }

    public int waitingCount(UUID unit, LocalDate day) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.senhas WHERE unidade_id = ? AND dia = ? AND status = 'aguardando'", Integer.class, unit, day);
    }

    public Optional<TicketView> activeAt(UUID counter) {
        return jdbc.query(TICKET + " WHERE s.guiche_id = ? AND s.status IN ('chamada', 'em_atendimento')", (r, n) -> ticketView(r), counter).stream().findFirst();
    }

    /** Próxima senha para o guichê: menor ordem do tipo, depois a mais antiga. SKIP LOCKED evita que dois guichês peguem a mesma. */
    public Optional<UUID> pickNext(UUID counter, UUID unit, LocalDate day) {
        return jdbc.query("SELECT s.id FROM clinica.senhas s JOIN clinica.guiche_tipos gt ON gt.tenant_id = s.tenant_id AND gt.tipo_id = s.tipo_id AND gt.guiche_id = ? "
            + "WHERE s.unidade_id = ? AND s.dia = ? AND s.status = 'aguardando' ORDER BY gt.ordem, s.criada_em, s.id LIMIT 1 FOR UPDATE OF s SKIP LOCKED",
            (r, n) -> r.getObject(1, UUID.class), counter, unit, day).stream().findFirst();
    }

    /** Senha ativa que sobrou de dias anteriores travaria o guichê: chamada vira ausente, em atendimento vira finalizada. */
    public void closeStale(UUID counter, LocalDate today) {
        jdbc.update("UPDATE clinica.senhas SET status = CASE status WHEN 'chamada' THEN 'ausente' ELSE 'finalizada' END, finalizada_em = clock_timestamp() "
            + "WHERE guiche_id = ? AND dia < ? AND status IN ('chamada', 'em_atendimento')", counter, today);
    }

    public void markCalled(UUID id, UUID counter, UUID user) {
        jdbc.update("UPDATE clinica.senhas SET status = 'chamada', guiche_id = ?, chamada_por = ?, primeira_chamada_em = clock_timestamp(), ultima_chamada_em = clock_timestamp(), chamadas = 1 WHERE id = ?", counter, user, id);
    }

    public void recall(UUID id) {
        jdbc.update("UPDATE clinica.senhas SET chamadas = chamadas + 1, ultima_chamada_em = clock_timestamp() WHERE id = ?", id);
    }

    public void attachPatient(UUID id, UUID patient) {
        jdbc.update("UPDATE clinica.senhas SET status = 'em_atendimento', paciente_id = ?, cpf_informado = NULL, identificada_em = clock_timestamp() WHERE id = ?", patient, id);
    }

    public void close(UUID id, String status) {
        jdbc.update("UPDATE clinica.senhas SET status = ?, finalizada_em = clock_timestamp() WHERE id = ?", status, id);
    }

    public void cancel(UUID id, UUID user, String reason) {
        jdbc.update("UPDATE clinica.senhas SET status = 'cancelada', cancelada_por = ?, cancelada_motivo = ?, finalizada_em = clock_timestamp() WHERE id = ?", user, reason.trim(), id);
    }

    private CounterView counterView(UUID id, String name, boolean active) {
        List<CounterTypeView> types = jdbc.query("SELECT gt.tipo_id, t.nome, gt.ordem FROM clinica.guiche_tipos gt JOIN clinica.tipos_senha t ON t.tenant_id = gt.tenant_id AND t.id = gt.tipo_id "
            + "WHERE gt.guiche_id = ? ORDER BY gt.ordem, t.nome", (r, n) -> new CounterTypeView(r.getObject(1, UUID.class), r.getString(2), r.getInt(3)), id);
        return new CounterView(id, name, active, types);
    }

    private static Object[] params(UUID counter, UUID unit, LocalDate day, UUID type1, UUID type2) {
        return counter == null ? new Object[] {unit, day, type1, type2} : new Object[] {counter, unit, day, type1, type2};
    }

    private static TicketTypeView typeView(java.sql.ResultSet r) throws java.sql.SQLException {
        return new TicketTypeView(r.getObject("id", UUID.class), r.getString("nome"), r.getString("prefixo"), r.getBoolean("preferencial"), r.getBoolean("ativo"));
    }

    private static TicketView ticketView(java.sql.ResultSet r) throws java.sql.SQLException {
        return new TicketView(r.getObject("id", UUID.class), r.getString("codigo"), r.getObject("tipo_id", UUID.class), r.getString("tipo_nome"), r.getBoolean("preferencial"),
            r.getString("status"), r.getObject("criada_em", OffsetDateTime.class), r.getObject("guiche_id", UUID.class), r.getString("guiche_nome"), r.getInt("chamadas"),
            r.getObject("ultima_chamada_em", OffsetDateTime.class), r.getObject("paciente_id", UUID.class), r.getObject("dia", LocalDate.class));
    }
}
