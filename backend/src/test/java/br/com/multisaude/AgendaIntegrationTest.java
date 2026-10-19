package br.com.multisaude;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import br.com.multisaude.shared.TenantTransactions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class AgendaIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired TenantTransactions transactions;
    @Autowired PasswordEncoder passwords;
    private final JsonMapper json = JsonMapper.builder().build();
    private static final String PASSWORD = "Senha-de-teste-2026!";

    private final UUID tenant = UUID.randomUUID();
    private final UUID unit = UUID.randomUUID();
    private final UUID otherUnit = UUID.randomUUID();
    private final UUID role = UUID.randomUUID();
    private final UUID user = UUID.randomUUID();
    private final UUID patient = UUID.randomUUID();
    private final UUID professional = UUID.randomUUID();
    private final UUID unlinkedProfessional = UUID.randomUUID();
    private final UUID procedure = UUID.randomUUID();
    private final UUID otherTenant = UUID.randomUUID();
    private final UUID otherUnitOfOtherTenant = UUID.randomUUID();
    private final UUID otherPatient = UUID.randomUUID();
    private final UUID otherProfessional = UUID.randomUUID();
    private final UUID otherProcedure = UUID.randomUUID();
    private final String email = UUID.randomUUID() + "@example.invalid";
    private final OffsetDateTime start = OffsetDateTime.now().plusDays(2).withHour(10).withMinute(0).withSecond(0).withNano(0);

    @BeforeEach
    void fixtures() {
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Teste agenda')", tenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade A')", unit, tenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade B')", otherUnit, tenant);
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Agenda teste', ARRAY['agenda:ler','agenda:criar'])", role, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Usuário teste', ?, ?)", user, tenant, email, passwords.encode(PASSWORD));
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, user, unit, role);
            jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, 'Paciente Ficticio')", patient, tenant);
            insertProfessional(professional, tenant, "Dra. Ficticia", "1001", unit);
            insertProfessional(unlinkedProfessional, tenant, "Dr. Sem Unidade", "1002", null);
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

    private void insertProfessional(UUID id, UUID owner, String name, String councilNumber, UUID linkedUnit) {
        jdbc.update("INSERT INTO clinica.profissionais (id, tenant_id, nome, conselho, conselho_num, conselho_uf) VALUES (?, ?, ?, 'CRM', ?, 'CE')", id, owner, name, councilNumber);
        if (linkedUnit != null) jdbc.update("INSERT INTO clinica.profissional_unidades (tenant_id, profissional_id, unidade_id) VALUES (?, ?, ?)", owner, id, linkedUnit);
    }

    @Test
    void createsProcedureAndListsIt() throws Exception {
        String token = login();
        mvc.perform(post("/api/v1/procedimentos").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Ultrassom teste", "tipo", "exame", "duracaoMin", 20, "valorCentavos", 15000))))
            .andExpect(status().isCreated()).andExpect(jsonPath("duracaoMin").value(20)).andExpect(jsonPath("valorCentavos").value(15000));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void rejectsInvalidProcedure() throws Exception {
        String token = login();
        for (Map<String, Object> body : java.util.List.of(
                Map.<String, Object>of("nome", " ", "tipo", "consulta", "duracaoMin", 30),
                Map.<String, Object>of("nome", "Curto", "tipo", "consulta", "duracaoMin", 4),
                Map.<String, Object>of("nome", "Negativo", "tipo", "consulta", "duracaoMin", 30, "valorCentavos", -1))) {
            mvc.perform(post("/api/v1/procedimentos").header("Authorization", "Bearer " + token).contentType("application/json")
                .content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        }
    }

    @Test
    void procedureListIsIsolatedByTenant() throws Exception {
        String token = login();
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(procedure.toString()));
    }

    @Test
    void createsAppointmentAndListsItByProfessionalAndPeriod() throws Exception {
        String token = login();
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated())
            .andExpect(jsonPath("status").value("agendado")).andExpect(jsonPath("versao").value(0));
        mvc.perform(get("/api/v1/agendamentos").header("Authorization", "Bearer " + token)
            .param("profissionalId", professional.toString()).param("de", start.minusHours(1).toString()).param("ate", start.plusHours(1).toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/agendamentos").header("Authorization", "Bearer " + token)
            .param("profissionalId", professional.toString()).param("de", start.plusHours(1).toString()).param("ate", start.plusHours(2).toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void overlappingAppointmentForSameProfessionalIsConflict() throws Exception {
        String token = login();
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
        book(token, unit, professional, patient, procedure, start.plusMinutes(15), start.plusMinutes(45)).andExpect(status().isConflict());
    }

    @Test
    void adjacentAppointmentsDoNotConflict() throws Exception {
        String token = login();
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
        book(token, unit, professional, patient, procedure, start.plusMinutes(30), start.plusMinutes(60)).andExpect(status().isCreated());
    }

    @Test
    void cancelledAndNoShowAppointmentsFreeTheSlot() throws Exception {
        String token = login();
        insertAppointment("cancelado", start, start.plusMinutes(30));
        insertAppointment("nao_compareceu", start.plusMinutes(30), start.plusMinutes(60));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(60)).andExpect(status().isCreated());
    }

    @Test
    void rejectsReferencesFromAnotherTenantWithBadRequest() throws Exception {
        String token = login();
        book(token, unit, professional, otherPatient, procedure, start, start.plusMinutes(30)).andExpect(status().isBadRequest());
        book(token, unit, otherProfessional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isBadRequest());
        book(token, unit, professional, patient, otherProcedure, start, start.plusMinutes(30)).andExpect(status().isBadRequest());
        book(token, otherUnitOfOtherTenant, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isForbidden());
    }

    @Test
    void rejectsProfessionalNotLinkedToUnitAndInactivePatient() throws Exception {
        String token = login();
        book(token, unit, unlinkedProfessional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isBadRequest());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.pacientes SET ativo = false WHERE id = ?", patient));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsUnitDifferentFromSessionUnit() throws Exception {
        String token = login();
        book(token, otherUnit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isForbidden());
    }

    @Test
    void rejectsInvalidPeriodsAndPastStart() throws Exception {
        String token = login();
        book(token, unit, professional, patient, procedure, start.plusMinutes(30), start).andExpect(status().isBadRequest());
        book(token, unit, professional, patient, procedure, start, start).andExpect(status().isBadRequest());
        OffsetDateTime past = OffsetDateTime.now().minusDays(1);
        book(token, unit, professional, patient, procedure, past, OffsetDateTime.now().plusHours(1)).andExpect(status().isBadRequest());
    }

    @Test
    void requiresAgendaPermissions() throws Exception {
        String token = login();
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['agenda:ler'] WHERE id = ?", role));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = '{}' WHERE id = ?", role));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }

    private void insertAppointment(String status, OffsetDateTime from, OffsetDateTime to) {
        transactions.inTenant(tenant, () -> jdbc.update(
            "INSERT INTO clinica.agendamentos (tenant_id, unidade_id, profissional_id, paciente_id, procedimento_id, periodo, status) VALUES (?, ?, ?, ?, ?, tstzrange(?, ?, '[)'), ?)",
            tenant, unit, professional, patient, procedure, Timestamp.from(from.toInstant()), Timestamp.from(to.toInstant()), status));
    }

    private ResultActions book(String token, UUID unitId, UUID professionalId, UUID patientId, UUID procedureId,
                               OffsetDateTime from, OffsetDateTime to) throws Exception {
        return mvc.perform(post("/api/v1/agendamentos").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("unidadeId", unitId, "profissionalId", professionalId, "pacienteId", patientId,
                "procedimentoId", procedureId, "inicio", from.toString(), "fim", to.toString()))));
    }

    private String login() throws Exception {
        String response = mvc.perform(post("/api/v1/auth/login").contentType("application/json")
            .content(json.writeValueAsString(Map.of("tenantId", tenant, "unidadeId", unit, "email", email, "senha", PASSWORD))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("accessToken").asString();
    }
}
