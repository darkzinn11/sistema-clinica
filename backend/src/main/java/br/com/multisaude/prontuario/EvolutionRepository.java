package br.com.multisaude.prontuario;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.prontuario.EvolutionModels.*;

/** Sempre chamado dentro de TenantTransactions.inTenant. A tabela só aceita leitura e inserção. */
@Repository
public class EvolutionRepository {
    public record Stored(UUID id, UUID pacienteId, UUID profissionalId, UUID agendamentoId) {}

    private static final String VIEW = "SELECT e.id, e.paciente_id, e.agendamento_id, e.conteudo, e.criado_em, e.substitui_id, "
        + "NOT EXISTS (SELECT 1 FROM clinica.evolucoes c WHERE c.substitui_id = e.id) vigente FROM clinica.evolucoes e";
    private final JdbcTemplate jdbc;

    public EvolutionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public EvolutionView insert(UUID tenant, UUID patient, UUID professional, UUID appointment, String content, UUID replaces, byte[] hash, UUID user, Instant at) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.evolucoes(id, tenant_id, paciente_id, profissional_id, agendamento_id, conteudo, substitui_id, hash, criado_por, criado_em) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id, tenant, patient, professional, appointment, content, replaces, hash, user, Timestamp.from(at));
        return jdbc.queryForObject(VIEW + " WHERE e.id = ?", (r, n) -> view(r), id);
    }

    public Optional<Stored> find(UUID id) {
        return jdbc.query("SELECT id, paciente_id, profissional_id, agendamento_id FROM clinica.evolucoes WHERE id = ?",
            (r, n) -> new Stored(r.getObject(1, UUID.class), r.getObject(2, UUID.class), r.getObject(3, UUID.class), r.getObject(4, UUID.class)), id)
            .stream().findFirst();
    }

    public boolean hasCorrection(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.evolucoes WHERE substitui_id = ?)", Boolean.class, id));
    }

    public boolean patientExists(UUID patient) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.pacientes WHERE id = ?)", Boolean.class, patient));
    }

    /** Só as evoluções escritas por este profissional: evolução de colega nunca sai daqui. */
    public List<EvolutionView> byAuthor(UUID patient, UUID professional) {
        return jdbc.query(VIEW + " WHERE e.paciente_id = ? AND e.profissional_id = ? ORDER BY e.criado_em, e.id", (r, n) -> view(r), patient, professional);
    }

    private static EvolutionView view(java.sql.ResultSet r) throws java.sql.SQLException {
        return new EvolutionView(r.getObject("id", UUID.class), r.getObject("paciente_id", UUID.class), r.getObject("agendamento_id", UUID.class),
            r.getString("conteudo"), r.getObject("criado_em", OffsetDateTime.class), r.getObject("substitui_id", UUID.class), r.getBoolean("vigente"));
    }
}
