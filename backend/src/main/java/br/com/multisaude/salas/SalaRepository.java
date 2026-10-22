package br.com.multisaude.salas;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.salas.SalaModels.*;

@Repository
public class SalaRepository {
    private final JdbcTemplate jdbc;

    public SalaRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // ---- salas ----

    public List<RoomView> rooms(UUID unit) {
        return jdbc.query("SELECT id, nome, ativo FROM clinica.salas WHERE unidade_id = ? ORDER BY nome, id",
            (rs, n) -> new RoomView(rs.getObject(1, UUID.class), rs.getString(2), rs.getBoolean(3)), unit);
    }

    public RoomView createRoom(UUID tenant, UUID unit, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.salas (id, tenant_id, unidade_id, nome) VALUES (?, ?, ?, ?)", id, tenant, unit, name.trim());
        return new RoomView(id, name.trim(), true);
    }

    public Optional<RoomView> updateRoom(UUID id, UUID unit, String name, boolean active) {
        int rows = jdbc.update("UPDATE clinica.salas SET nome = ?, ativo = ? WHERE id = ? AND unidade_id = ?", name.trim(), active, id, unit);
        return rows == 0 ? Optional.empty() : Optional.of(new RoomView(id, name.trim(), active));
    }

    public boolean roomInUnit(UUID room, UUID unit) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM clinica.salas WHERE id = ? AND unidade_id = ? AND ativo)", Boolean.class, room, unit));
    }

    // ---- equipamentos ----

    private static final String VIEW = "SELECT e.id, e.nome, e.quantidade, e.sala_id, s.nome, e.ativo, "
        + "COALESCE((SELECT array_agg(ep.procedimento_id ORDER BY ep.procedimento_id) FROM clinica.equipamento_procedimentos ep WHERE ep.equipamento_id = e.id), '{}') "
        + "FROM clinica.equipamentos e LEFT JOIN clinica.salas s ON s.tenant_id = e.tenant_id AND s.id = e.sala_id ";

    private static EquipmentView view(java.sql.ResultSet rs) throws java.sql.SQLException {
        java.sql.Array array = rs.getArray(7);
        List<UUID> procedures = array == null ? List.of() : List.of((UUID[]) array.getArray());
        return new EquipmentView(rs.getObject(1, UUID.class), rs.getString(2), rs.getInt(3), rs.getObject(4, UUID.class), rs.getString(5), rs.getBoolean(6), procedures);
    }

    public List<EquipmentView> equipment(UUID unit) {
        return jdbc.query(VIEW + "WHERE e.unidade_id = ? ORDER BY e.nome, e.id", (rs, n) -> view(rs), unit);
    }

    public Optional<EquipmentView> findEquipment(UUID id, UUID unit) {
        return jdbc.query(VIEW + "WHERE e.id = ? AND e.unidade_id = ?", (rs, n) -> view(rs), id, unit).stream().findFirst();
    }

    public UUID createEquipment(UUID tenant, UUID unit, EquipmentRequest x) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.equipamentos (id, tenant_id, unidade_id, sala_id, nome, quantidade) VALUES (?, ?, ?, ?, ?, ?)",
            id, tenant, unit, x.salaId(), x.nome().trim(), x.quantidade());
        replaceProcedures(tenant, id, x.procedimentoIds());
        return id;
    }

    public boolean updateEquipment(UUID tenant, UUID id, UUID unit, EquipmentRequest x) {
        int rows = jdbc.update("UPDATE clinica.equipamentos SET nome = ?, quantidade = ?, sala_id = ?, ativo = ? WHERE id = ? AND unidade_id = ?",
            x.nome().trim(), x.quantidade(), x.salaId(), !Boolean.FALSE.equals(x.ativo()), id, unit);
        if (rows == 0) return false;
        replaceProcedures(tenant, id, x.procedimentoIds());
        return true;
    }

    private void replaceProcedures(UUID tenant, UUID equipment, List<UUID> procedures) {
        jdbc.update("DELETE FROM clinica.equipamento_procedimentos WHERE equipamento_id = ?", equipment);
        for (UUID procedure : new LinkedHashSet<>(procedures))
            jdbc.update("INSERT INTO clinica.equipamento_procedimentos (tenant_id, equipamento_id, procedimento_id) VALUES (?, ?, ?)", tenant, equipment, procedure);
    }

    public int existingProcedures(Collection<UUID> ids) {
        if (ids.isEmpty()) return 0;
        return jdbc.queryForObject("SELECT count(*) FROM clinica.procedimentos WHERE id = ANY(?)", Integer.class, (Object) ids.toArray(new UUID[0]));
    }

    // ---- sala padrão do profissional ----

    public List<ProfessionalRoomView> professionalRooms(UUID unit) {
        return jdbc.query("SELECT profissional_id, sala_id FROM clinica.profissional_salas WHERE unidade_id = ? ORDER BY profissional_id",
            (rs, n) -> new ProfessionalRoomView(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class)), unit);
    }

    public void setProfessionalRoom(UUID tenant, UUID professional, UUID unit, UUID room) {
        jdbc.update("DELETE FROM clinica.profissional_salas WHERE profissional_id = ? AND unidade_id = ?", professional, unit);
        if (room != null) jdbc.update("INSERT INTO clinica.profissional_salas (tenant_id, profissional_id, unidade_id, sala_id) VALUES (?, ?, ?, ?)", tenant, professional, unit, room);
    }

    public boolean professionalServesUnit(UUID professional, UUID unit) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM clinica.profissional_unidades WHERE profissional_id = ? AND unidade_id = ?)", Boolean.class, professional, unit));
    }

    // ---- usos do dia ----

    /** Equipamentos ativos da unidade com os agendamentos do dia que os ocupam (cancelado, remarcado e falta liberam o aparelho). */
    public List<EquipmentDay> day(UUID unit, LocalDate day, ZoneId zone) {
        List<EquipmentView> equipment = equipment(unit).stream().filter(EquipmentView::ativo).toList();
        Timestamp from = Timestamp.from(day.atStartOfDay(zone).toInstant());
        Timestamp to = Timestamp.from(day.plusDays(1).atStartOfDay(zone).toInstant());
        Map<UUID, List<EquipmentUse>> uses = new HashMap<>();
        jdbc.query("SELECT ep.equipamento_id, a.id, lower(a.periodo), upper(a.periodo), a.status, pc.nome, pr.id, pr.nome "
            + "FROM clinica.agendamentos a JOIN clinica.equipamento_procedimentos ep ON ep.tenant_id = a.tenant_id AND ep.procedimento_id = a.procedimento_id "
            + "JOIN clinica.procedimentos pc ON pc.tenant_id = a.tenant_id AND pc.id = a.procedimento_id "
            + "JOIN clinica.profissionais pr ON pr.tenant_id = a.tenant_id AND pr.id = a.profissional_id "
            + "WHERE a.unidade_id = ? AND lower(a.periodo) >= ? AND lower(a.periodo) < ? AND a.status NOT IN ('cancelado', 'remarcado', 'nao_compareceu') "
            + "ORDER BY lower(a.periodo), a.id",
            rs -> {
                uses.computeIfAbsent(rs.getObject(1, UUID.class), k -> new ArrayList<>()).add(new EquipmentUse(rs.getObject(2, UUID.class),
                    local(rs.getObject(3, OffsetDateTime.class), zone), local(rs.getObject(4, OffsetDateTime.class), zone), rs.getString(5), rs.getString(6),
                    rs.getObject(7, UUID.class), rs.getString(8)));
            }, unit, from, to);
        return equipment.stream().map(e -> new EquipmentDay(e.id(), e.nome(), e.quantidade(), e.salaId(), e.salaNome(), uses.getOrDefault(e.id(), List.of()))).toList();
    }

    private static OffsetDateTime local(OffsetDateTime value, ZoneId zone) { return value.atZoneSameInstant(zone).toOffsetDateTime(); }
}
