package br.com.multisaude;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import br.com.multisaude.shared.TenantTransactions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Fixture compartilhada dos testes de agenda: duas clínicas, profissional com grade diária das 06:00 às 20:00
 * na unidade principal (fuso America/Fortaleza) e um usuário com todas as permissões de agenda.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
abstract class AgendaTestBase {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired TenantTransactions transactions;
    @Autowired PasswordEncoder passwords;
    protected final JsonMapper json = JsonMapper.builder().build();
    protected static final String PASSWORD = "Senha-de-teste-2026!";

    protected final UUID tenant = UUID.randomUUID();
    protected final UUID unit = UUID.randomUUID();
    protected final UUID otherUnit = UUID.randomUUID();
    protected final UUID role = UUID.randomUUID();
    protected final UUID user = UUID.randomUUID();
    protected final UUID patient = UUID.randomUUID();
    protected final UUID professional = UUID.randomUUID();
    protected final UUID unlinkedProfessional = UUID.randomUUID();
    protected final UUID procedure = UUID.randomUUID();
    protected final UUID otherTenant = UUID.randomUUID();
    protected final UUID otherUnitOfOtherTenant = UUID.randomUUID();
    protected final UUID otherPatient = UUID.randomUUID();
    protected final UUID otherProfessional = UUID.randomUUID();
    protected final UUID otherProcedure = UUID.randomUUID();
    protected final String email = UUID.randomUUID() + "@example.invalid";
    protected final OffsetDateTime start = ZonedDateTime.now(ZoneId.of("America/Fortaleza")).plusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0).toOffsetDateTime();

    @BeforeEach
    void fixtures() {
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Teste agenda')", tenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade A')", unit, tenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade B')", otherUnit, tenant);
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Agenda teste', ARRAY['agenda:ler','agenda:criar','agenda:editar','agenda:cancelar','agenda:remarcar','agenda:configurar'])", role, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Usuário teste', ?, ?)", user, tenant, email, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, user, unit, role);
            jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, 'Paciente Ficticio')", patient, tenant);
            insertProfessional(professional, tenant, "Dra. Ficticia", "1001", unit);
            insertProfessional(unlinkedProfessional, tenant, "Dr. Sem Unidade", "1002", null);
            // Sem vigencia: usa o DEFAULT da coluna, que a V12 corrigiu.
            jdbc.update("INSERT INTO clinica.grades (tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim) SELECT ?, ?, ?, d, '06:00', '20:00' FROM generate_series(0, 6) d", tenant, professional, unit);
            jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, 'Consulta teste', 30)", procedure, tenant);
            return null;
        });
        transactions.inTenant(otherTenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Outra clínica')", otherTenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade X')", otherUnitOfOtherTenant, otherTenant);
            jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, 'Paciente Outra Clinica')", otherPatient, otherTenant);
            insertProfessional(otherProfessional, otherTenant, "Dr. Outra Clinica", "2001", otherUnitOfOtherTenant);
            jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, 'Consulta outra', 30)", otherProcedure, otherTenant);
            return null;
        });
    }

    protected void insertProfessional(UUID id, UUID owner, String name, String councilNumber, UUID linkedUnit) {
        jdbc.update("INSERT INTO clinica.profissionais (id, tenant_id, nome, conselho, conselho_num, conselho_uf) VALUES (?, ?, ?, 'CRM', ?, 'CE')", id, owner, name, councilNumber);
        if (linkedUnit != null) jdbc.update("INSERT INTO clinica.profissional_unidades (tenant_id, profissional_id, unidade_id) VALUES (?, ?, ?)", owner, id, linkedUnit);
    }

    protected UUID insertAppointment(String status, OffsetDateTime from, OffsetDateTime to) {
        return insertAppointmentFor(tenant, unit, professional, patient, procedure, status, from, to);
    }

    protected UUID insertAppointmentFor(UUID owner, UUID unitId, UUID professionalId, UUID patientId, UUID procedureId,
                                      String status, OffsetDateTime from, OffsetDateTime to) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(owner, () -> jdbc.update(
            "INSERT INTO clinica.agendamentos (id, tenant_id, unidade_id, profissional_id, paciente_id, procedimento_id, periodo, status) VALUES (?, ?, ?, ?, ?, ?, tstzrange(?, ?, '[)'), ?)",
            id, owner, unitId, professionalId, patientId, procedureId, Timestamp.from(from.toInstant()), Timestamp.from(to.toInstant()), status));
        return id;
    }

    protected JsonNode created(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    protected UUID id(JsonNode appointment) {
        return UUID.fromString(appointment.get("id").asString());
    }

    protected ResultActions changeStatus(String token, String path, String newStatus, int version) throws Exception {
        return mvc.perform(post(path).header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("status", newStatus, "versao", version))));
    }

    protected String bookingBody(UUID unitId, OffsetDateTime from, OffsetDateTime to, String channel) throws Exception {
        return json.writeValueAsString(Map.of("unidadeId", unitId, "profissionalId", professional, "pacienteId", patient,
            "procedimentoId", procedure, "inicio", from.toString(), "fim", to.toString(), "canal", channel));
    }

    protected ResultActions book(String token, UUID unitId, UUID professionalId, UUID patientId, UUID procedureId,
                               OffsetDateTime from, OffsetDateTime to) throws Exception {
        return mvc.perform(post("/api/v1/agendamentos").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("unidadeId", unitId, "profissionalId", professionalId, "pacienteId", patientId,
                "procedimentoId", procedureId, "inicio", from.toString(), "fim", to.toString()))));
    }

    /**
     * Cria a sessão direto no banco, com o mesmo formato e hash que o login produz, e devolve o token.
     * Ele passa pelo filtro de autenticação real; só pula o endpoint de login (coberto em IdentityIntegrationTest),
     * que custa um BCrypt por teste e esgotaria o limite de tentativas por IP compartilhado entre as classes.
     */
    protected String login() throws Exception {
        return tokenFor(user);
    }

    protected String tokenFor(UUID userId) throws Exception {
        byte[] random = new byte[32];
        new java.security.SecureRandom().nextBytes(random);
        String token = tenant + "." + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        byte[] hash = java.security.MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        transactions.inTenant(tenant, () -> jdbc.update(
            "INSERT INTO clinica.sessoes (tenant_id, usuario_id, unidade_id, token_hash, expira_em) VALUES (?, ?, ?, ?, now() + interval '1 hour')",
            tenant, userId, unit, hash));
        return token;
    }
}
