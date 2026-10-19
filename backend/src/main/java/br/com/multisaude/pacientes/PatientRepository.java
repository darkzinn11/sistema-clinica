package br.com.multisaude.pacientes;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.pacientes.PatientModels.*;

@Repository
public class PatientRepository {
    private final JdbcTemplate jdbc;
    public PatientRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<PatientView> search(String query, int limit) {
        String term = query == null ? "" : query.trim().toLowerCase();
        String digits = term.replaceAll("\\D", "");
        return jdbc.query("""
            SELECT id, nome, nome_social, cpf, nascimento, celular, email, ativo
            FROM clinica.pacientes
            WHERE ativo AND (lower(nome) LIKE ? OR cpf LIKE ? OR celular LIKE ?)
            ORDER BY nome, id LIMIT ?
            """, (rs, row) -> view(rs), "%" + term + "%", "%" + digits + "%", "%" + digits + "%", limit);
    }

    public PatientView create(CreatePatientRequest request, UUID tenant) {
        UUID id = UUID.randomUUID();
        String nome = request.nome().trim();
        String email = request.email() == null ? null : request.email().trim().toLowerCase();
        String cpf = request.cpf() == null ? null : request.cpf().replaceAll("\\D", "");
        jdbc.update("""
            INSERT INTO clinica.pacientes (id, tenant_id, nome, nome_social, cpf, nascimento, celular, email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, id, tenant, nome, blankToNull(request.nomeSocial()), cpf, request.nascimento(),
            blankToNull(request.celular()), email);
        return find(id);
    }

    public PatientView find(UUID id) {
        return jdbc.queryForObject("SELECT id, nome, nome_social, cpf, nascimento, celular, email, ativo FROM clinica.pacientes WHERE id = ?",
            (rs, row) -> view(rs), id);
    }

    public PatientView update(UUID id, UpdatePatientRequest request) {
        jdbc.update("""
            UPDATE clinica.pacientes SET nome=?, nome_social=?, cpf=?, nascimento=?, celular=?, email=?, atualizado_em=now()
            WHERE id=? AND ativo
            """, request.nome().trim(), blankToNull(request.nomeSocial()), normalizedCpf(request.cpf()), request.nascimento(),
            blankToNull(request.celular()), normalizedEmail(request.email()), id);
        return find(id);
    }

    public void deactivate(UUID id) {
        jdbc.update("UPDATE clinica.pacientes SET ativo=false, atualizado_em=now() WHERE id=? AND ativo", id);
    }

    private static PatientView view(ResultSet rs) throws SQLException {
        return new PatientView(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("nome_social"),
            rs.getString("cpf"), rs.getObject("nascimento", java.time.LocalDate.class), rs.getString("celular"),
            rs.getString("email"), rs.getBoolean("ativo"));
    }
    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String normalizedCpf(String value) { return value == null ? null : value.replaceAll("\\D", ""); }
    private static String normalizedEmail(String value) { return value == null ? null : value.trim().toLowerCase(); }
}
