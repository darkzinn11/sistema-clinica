package br.com.multisaude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Totem com CPF na entrada: o totem é um dispositivo com uma única permissão, só confere os dígitos do CPF, nunca revela cadastro,
 * e o CPF só chega à recepção depois que ela chama a senha.
 */
class TotemIntegrationTest extends AgendaTestBase {
    private static final String CPF_A = "52998224725";
    private static final String CPF_B = "11144477735";
    private static final String CPF_C = "12345678909";

    private String admin, reception, totem;
    private UUID receptionUser, deviceId, consulta, guiche;

    @BeforeEach
    void totemFixtures() throws Exception {
        admin = tokenFor(userWith("Admin totem", "fila:ler", "fila:configurar"));
        receptionUser = userWith("Recepção totem", "fila:ler", "fila:gerar", "fila:chamar", "pacientes:ler", "pacientes:criar", "agenda:ler");
        reception = tokenFor(receptionUser);
        consulta = id(created(mvc.perform(post("/api/v1/tipos-senha").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Consulta", "prefixo", "CON", "preferencial", false)))).andExpect(status().isCreated())));
        guiche = id(created(mvc.perform(post("/api/v1/guiches").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Guichê 1", "tipos", List.of(Map.of("tipoId", consulta, "ordem", 1)))))).andExpect(status().isCreated())));
        JsonNode device = created(mvc.perform(post("/api/v1/dispositivos").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Totem entrada")))).andExpect(status().isCreated()));
        totem = device.get("token").asString();
        deviceId = id(device.get("dispositivo"));
    }

    // ---- dispositivo ----

    @Test
    void theTokenIsShownOnceAndTheListNeverRepeatsIt() throws Exception {
        mvc.perform(get("/api/v1/dispositivos").header("Authorization", "Bearer " + admin)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nome").value("Totem entrada")).andExpect(jsonPath("$[0].ativo").value(true))
            .andExpect(content().string(Matchers.not(Matchers.containsString(totem)))).andExpect(content().string(Matchers.not(Matchers.containsString("token"))));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM clinica.sessoes WHERE usuario_id = ?", Integer.class, deviceId));
    }

    @Test
    void onlyWhoConfiguresTheQueueManagesDevices() throws Exception {
        mvc.perform(post("/api/v1/dispositivos").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "X")))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/dispositivos").header("Authorization", "Bearer " + reception)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/dispositivos/" + deviceId).header("Authorization", "Bearer " + reception)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/dispositivos").header("Authorization", "Bearer " + totem)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/dispositivos").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", " ")))).andExpect(status().isBadRequest());
    }

    @Test
    void revokingStopsTheTokenAtOnceAndNotFoundForOtherUnitsOrPeople() throws Exception {
        mvc.perform(get("/api/v1/totem/tipos").header("Authorization", "Bearer " + totem)).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/dispositivos/" + deviceId).header("Authorization", "Bearer " + admin)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/totem/tipos").header("Authorization", "Bearer " + totem)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/dispositivos").header("Authorization", "Bearer " + admin)).andExpect(jsonPath("$[0].ativo").value(false));
        mvc.perform(delete("/api/v1/dispositivos/" + UUID.randomUUID()).header("Authorization", "Bearer " + admin)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/dispositivos/" + user).header("Authorization", "Bearer " + admin)).andExpect(status().isNotFound());   // pessoa, não dispositivo
        assertTrue(jdbc.queryForObject("SELECT ativo FROM clinica.usuarios WHERE id = ?", Boolean.class, user));
    }

    @Test
    void aDeviceIsNotAPersonAndCannotLogIn() throws Exception {
        mvc.perform(get("/api/v1/usuarios").header("Authorization", "Bearer " + tokenFor(userWith("Quem lista usuários", "usuarios:ler"))))
            .andExpect(status().isOk()).andExpect(content().string(Matchers.not(Matchers.containsString("dispositivo.invalid"))));
        String email = jdbc.queryForObject("SELECT email FROM clinica.usuarios WHERE id = ?", String.class, deviceId);
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
            .content(json.writeValueAsString(Map.of("tenantId", tenant, "unidadeId", unit, "email", email, "senha", "qualquer-senha-12345")))).andExpect(status().isUnauthorized());
    }

    // ---- o que o totem alcança ----

    @Test
    void theTotemReachesOnlyItsTwoEndpoints() throws Exception {
        mvc.perform(get("/api/v1/totem/tipos").header("Authorization", "Bearer " + totem)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nome").value("Consulta")).andExpect(jsonPath("$[0].prefixo").doesNotExist());
        for (String path : new String[] {"/api/v1/senhas/fila", "/api/v1/tipos-senha", "/api/v1/guiches", "/api/v1/pacientes", "/api/v1/agendamentos", "/api/v1/profissionais",
            "/api/v1/auditoria/acessos", "/api/v1/usuarios"}) {
            mvc.perform(get(path).header("Authorization", "Bearer " + totem)).andExpect(status().isForbidden());
        }
        mvc.perform(post("/api/v1/senhas").header("Authorization", "Bearer " + totem).contentType("application/json")
            .content(json.writeValueAsString(Map.of("tipoId", consulta)))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/guiches/" + guiche + "/chamar-proxima").header("Authorization", "Bearer " + totem)).andExpect(status().isForbidden());
    }

    @Test
    void receptionAndAdministratorCannotUseTheTotemEndpoints() throws Exception {
        mvc.perform(get("/api/v1/totem/tipos").header("Authorization", "Bearer " + reception)).andExpect(status().isForbidden());
        totemTicket(reception, consulta, CPF_A).andExpect(status().isForbidden());
        totemTicket(admin, consulta, CPF_A).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/totem/tipos")).andExpect(status().isUnauthorized());
    }

    // ---- gerar senha ----

    @Test
    void theTicketResponseHasNothingButWhatThePatientSees() throws Exception {
        totemTicket(totem, consulta, "529.982.247-25").andExpect(status().isCreated()).andExpect(jsonPath("codigo").value("CON1")).andExpect(jsonPath("tipoNome").value("Consulta"))
            .andExpect(jsonPath("preferencial").value(false)).andExpect(jsonPath("$.length()").value(3))
            .andExpect(content().string(Matchers.not(Matchers.containsString(CPF_A))));
        assertEquals(CPF_A, jdbc.queryForObject("SELECT cpf_informado FROM clinica.senhas WHERE codigo = 'CON1' AND tenant_id = ?", String.class, tenant));
        assertEquals("totem", jdbc.queryForObject("SELECT origem FROM clinica.senhas WHERE codigo = 'CON1' AND tenant_id = ?", String.class, tenant));
    }

    @Test
    void theTotemNeverRevealsWhetherTheCpfIsRegistered() throws Exception {
        patientWithCpf("Paciente Cadastrado", CPF_B);
        String registered = totemTicket(totem, consulta, CPF_B).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String unknown = totemTicket(totem, consulta, CPF_C).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertEquals(registered.replace("CON1", "X"), unknown.replace("CON2", "X"));
        assertFalse(registered.contains("Paciente"));
    }

    @Test
    void withoutCpfTheTicketIsStillIssued() throws Exception {
        totemTicket(totem, consulta, null).andExpect(status().isCreated());
        totemTicket(totem, consulta, "").andExpect(status().isCreated());
        totemTicket(totem, consulta, "   ").andExpect(status().isCreated());
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM clinica.senhas WHERE tenant_id = ? AND cpf_informado IS NULL AND origem = 'totem'", Integer.class, tenant));
    }

    @Test
    void invalidCpfOrTypeIsRefusedAndNothingIsCreated() throws Exception {
        totemTicket(totem, consulta, "52998224726").andExpect(status().isBadRequest());     // dígito verificador
        totemTicket(totem, consulta, "111.111.111-11").andExpect(status().isBadRequest());  // todos iguais
        totemTicket(totem, consulta, "1234").andExpect(status().isBadRequest());
        totemTicket(totem, UUID.randomUUID(), CPF_A).andExpect(status().isBadRequest());
        UUID inactive = id(created(mvc.perform(post("/api/v1/tipos-senha").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Antigo", "prefixo", "ANT", "preferencial", false, "ativo", false)))).andExpect(status().isCreated())));
        totemTicket(totem, inactive, CPF_A).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/totem/tipos").header("Authorization", "Bearer " + totem)).andExpect(jsonPath("$.length()").value(1));   // inativo não aparece
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM clinica.senhas WHERE tenant_id = ?", Integer.class, tenant));
    }

    @Test
    void aTotemIsLimitedToThirtyTicketsPerMinute() throws Exception {
        for (int i = 0; i < 30; i++) totemTicket(totem, consulta, null).andExpect(status().isCreated());
        totemTicket(totem, consulta, null).andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
    }

    // ---- recepção ----

    @Test
    void identificationOnlyAfterTheTicketIsCalled() throws Exception {
        UUID ticket = ticketFromTotem(CPF_A);
        identification(reception, ticket).andExpect(status().isConflict());
        call(ticket);
        identification(reception, ticket).andExpect(status().isOk());
        identification(reception, UUID.randomUUID()).andExpect(status().isNotFound());
    }

    @Test
    void reportsNotRegisteredWithTheTypedCpf() throws Exception {
        UUID ticket = ticketFromTotem(CPF_A);
        call(ticket);
        identification(reception, ticket).andExpect(jsonPath("situacao").value("nao_cadastrado")).andExpect(jsonPath("cpfInformado").value(CPF_A))
            .andExpect(jsonPath("paciente").value(Matchers.nullValue())).andExpect(jsonPath("agendamentosHoje.length()").value(0));
    }

    @Test
    void reportsWithoutCpf() throws Exception {
        UUID ticket = ticketFromTotem(null);
        call(ticket);
        identification(reception, ticket).andExpect(jsonPath("situacao").value("sem_cpf")).andExpect(jsonPath("cpfInformado").value(Matchers.nullValue()));
    }

    @Test
    void reportsRegisteredWithTodaysAppointmentsOfThisUnitOnly() throws Exception {
        UUID registered = patientWithCpf("Paciente Cadastrado", CPF_B);
        ZoneId zone = ZoneId.of("America/Fortaleza");
        OffsetDateTime noon = LocalDate.now(zone).atTime(12, 0).atZone(zone).toOffsetDateTime();
        insertAppointmentFor(tenant, unit, professional, registered, procedure, "agendado", noon, noon.plusMinutes(30));
        insertAppointmentFor(tenant, unit, professional, registered, procedure, "cancelado", noon.plusHours(1), noon.plusHours(1).plusMinutes(30));
        insertAppointmentFor(tenant, otherUnit, professional, registered, procedure, "agendado", noon.plusHours(2), noon.plusHours(2).plusMinutes(30));
        insertAppointmentFor(tenant, unit, professional, registered, procedure, "agendado", noon.plusDays(1), noon.plusDays(1).plusMinutes(30));
        UUID ticket = ticketFromTotem(CPF_B);
        call(ticket);
        identification(reception, ticket).andExpect(jsonPath("situacao").value("cadastrado")).andExpect(jsonPath("paciente.nome").value("Paciente Cadastrado"))
            .andExpect(jsonPath("agendamentosHoje.length()").value(1)).andExpect(jsonPath("agendamentosHoje[0].profissional").value("Dra. Ficticia"))
            .andExpect(jsonPath("agendamentosHoje[0].procedimento").value("Consulta teste")).andExpect(jsonPath("agendamentosHoje[0].status").value("agendado"))
            .andExpect(content().string(Matchers.not(Matchers.containsString("valor"))));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE usuario_id = ? AND paciente_id = ? AND acao = 'ver_paciente'", Integer.class, receptionUser, registered));
    }

    @Test
    void anotherClinicsPatientWithTheSameCpfIsNotFound() throws Exception {
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, cpf) VALUES (?, ?, 'Paciente de outra clínica', ?)", UUID.randomUUID(), otherTenant, CPF_C));
        UUID ticket = ticketFromTotem(CPF_C);
        call(ticket);
        identification(reception, ticket).andExpect(jsonPath("situacao").value("nao_cadastrado")).andExpect(content().string(Matchers.not(Matchers.containsString("outra clínica"))));
    }

    @Test
    void appointmentsNeedAgendaReadAndPatientsNeedPatientRead() throws Exception {
        UUID registered = patientWithCpf("Paciente Cadastrado", CPF_B);
        ZoneId zone = ZoneId.of("America/Fortaleza");
        OffsetDateTime noon = LocalDate.now(zone).atTime(12, 0).atZone(zone).toOffsetDateTime();
        insertAppointmentFor(tenant, unit, professional, registered, procedure, "agendado", noon, noon.plusMinutes(30));
        UUID ticket = ticketFromTotem(CPF_B);
        call(ticket);
        String noAgenda = tokenFor(userWith("Sem agenda", "fila:ler", "fila:chamar", "pacientes:ler"));
        identification(noAgenda, ticket).andExpect(status().isOk()).andExpect(jsonPath("situacao").value("cadastrado")).andExpect(jsonPath("agendamentosHoje.length()").value(0));
        String noPatients = tokenFor(userWith("Sem pacientes", "fila:ler", "fila:chamar"));
        identification(noPatients, ticket).andExpect(status().isForbidden());
        identification(admin, ticket).andExpect(status().isForbidden());
        identification(totem, ticket).andExpect(status().isForbidden());
    }

    @Test
    void anotherUnitsTicketIsNotFound() throws Exception {
        UUID ticket = ticketFromTotem(CPF_A);
        call(ticket);
        String otherUnitReception = tokenFor(receptionUser, otherUnit);
        identification(otherUnitReception, ticket).andExpect(status().isNotFound());
    }

    // ---- o CPF não vaza e não fica à toa ----

    @Test
    void theCpfNeverAppearsInTheQueueOrTheTicketViews() throws Exception {
        UUID ticket = ticketFromTotem(CPF_A);
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception)).andExpect(content().string(Matchers.not(Matchers.containsString(CPF_A))))
            .andExpect(content().string(Matchers.not(Matchers.containsString("cpf"))));
        String called = call(ticket).andReturn().getResponse().getContentAsString();
        assertFalse(called.contains(CPF_A));
        mvc.perform(get("/api/v1/guiches/" + guiche + "/atual").header("Authorization", "Bearer " + reception)).andExpect(content().string(Matchers.not(Matchers.containsString(CPF_A))));
    }

    @Test
    void linkingThePatientErasesTheTypedCpfFromTheTicket() throws Exception {
        patientWithCpf("Paciente Cadastrado", CPF_B);
        UUID ticket = ticketFromTotem(CPF_B);
        call(ticket);
        mvc.perform(post("/api/v1/senhas/" + ticket + "/identificar").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("cpf", CPF_B)))).andExpect(status().isOk());
        assertNull(jdbc.queryForObject("SELECT cpf_informado FROM clinica.senhas WHERE id = ?", String.class, ticket));
    }

    @Test
    void staleTypedCpfsAreErasedOnTheNextTicketButLinkedOnesAreKept() throws Exception {
        UUID stale = ticketFromTotem(CPF_A);
        UUID linked = ticketFromTotem(CPF_B);
        UUID patient = patientWithCpf("Paciente Cadastrado", CPF_C);
        transactions.inTenant(tenant, () -> {
            jdbc.update("UPDATE clinica.senhas SET dia = dia - 1 WHERE id IN (?, ?)", stale, linked);
            jdbc.update("UPDATE clinica.senhas SET status = 'em_atendimento', guiche_id = ?, paciente_id = ? WHERE id = ?", guiche, patient, linked);
            return null;
        });
        assertEquals(CPF_A, jdbc.queryForObject("SELECT cpf_informado FROM clinica.senhas WHERE id = ?", String.class, stale));
        ticketFromTotem(null);
        assertNull(jdbc.queryForObject("SELECT cpf_informado FROM clinica.senhas WHERE id = ?", String.class, stale));
        assertEquals(CPF_B, jdbc.queryForObject("SELECT cpf_informado FROM clinica.senhas WHERE id = ?", String.class, linked));
    }

    @Test
    void theDatabaseRefusesAMalformedCpfOnTheTicket() throws Exception {
        UUID ticket = ticketFromTotem(null);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> transactions.inTenant(tenant,
            () -> jdbc.update("UPDATE clinica.senhas SET cpf_informado = '123' WHERE id = ?", ticket)));
    }

    // ---- helpers ----

    private ResultActions totemTicket(String token, UUID typeId, String cpf) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("tipoId", typeId);
        if (cpf != null) body.put("cpf", cpf);
        return mvc.perform(post("/api/v1/totem/senhas").header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(body)));
    }

    private UUID ticketFromTotem(String cpf) throws Exception {
        totemTicket(totem, consulta, cpf).andExpect(status().isCreated());
        return UUID.fromString(jdbc.queryForObject("SELECT id::text FROM clinica.senhas WHERE tenant_id = ? ORDER BY criada_em DESC LIMIT 1", String.class, tenant));
    }

    private ResultActions call(UUID ticket) throws Exception {
        return mvc.perform(post("/api/v1/senhas/" + ticket + "/chamar").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("guicheId", guiche)))).andExpect(status().isOk());
    }

    private ResultActions identification(String token, UUID ticket) throws Exception {
        return mvc.perform(get("/api/v1/senhas/" + ticket + "/identificacao").header("Authorization", "Bearer " + token));
    }

    private UUID patientWithCpf(String name, String cpf) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, cpf) VALUES (?, ?, ?, ?)", id, tenant, name, cpf));
        return id;
    }

    private UUID userWith(String name, String... permissions) {
        UUID roleId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, ?, ?)", roleId, tenant, name, permissions);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, 'x')", userId, tenant, name, userId + "-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, userId, unit, roleId);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, userId, otherUnit, roleId);
            return null;
        });
        return userId;
    }
}
