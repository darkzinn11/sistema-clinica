package br.com.multisaude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** V32: salas e equipamentos da unidade, procedimentos que ocupam cada aparelho, sala padrão do profissional e o uso do dia. */
class SalasEquipamentosIntegrationTest extends AgendaTestBase {
    private static final ZoneId ZONE = ZoneId.of("America/Fortaleza");
    private final LocalDate day = LocalDate.now(ZONE).plusDays(2);
    private String adminToken;

    private UUID userWith(String name, String... permissions) {
        UUID roleId = UUID.randomUUID(), userId = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, ?, ?)", roleId, tenant, name, permissions);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, 'x')", userId, tenant, name, userId + "-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, userId, unit, roleId);
            return null;
        });
        return userId;
    }

    private String admin() throws Exception {
        if (adminToken == null) adminToken = tokenFor(userWith("Admin salas", "agenda:ler", "agenda:configurar", "profissionais:editar"));
        return adminToken;
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String token, Object body) throws Exception {
        var r = request.header("Authorization", "Bearer " + token);
        return mvc.perform(body == null ? r : r.contentType("application/json").content(json.writeValueAsString(body)));
    }

    private UUID newRoom(String name) throws Exception {
        return UUID.fromString(created(send(post("/api/v1/salas"), admin(), Map.of("nome", name)).andExpect(status().isCreated())).get("id").asString());
    }

    private Map<String, Object> equipment(String name, int quantity, UUID room, List<UUID> procedures) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("nome", name);
        m.put("quantidade", quantity);
        m.put("salaId", room);
        m.put("procedimentoIds", procedures);
        return m;
    }

    private UUID newEquipment(String name, int quantity, UUID room, List<UUID> procedures) throws Exception {
        return UUID.fromString(created(send(post("/api/v1/equipamentos"), admin(), equipment(name, quantity, room, procedures)).andExpect(status().isCreated())).get("id").asString());
    }

    /** O PostgreSQL aborta a transação do teste após um erro: a chamada recusada roda num ponto de salvamento. */
    private void refused(org.springframework.test.web.servlet.ResultMatcher expected, ThrowingCall call) throws Exception {
        jdbc.execute("SAVEPOINT recusa");
        call.run().andExpect(expected);
        jdbc.execute("ROLLBACK TO SAVEPOINT recusa");
    }

    private interface ThrowingCall { ResultActions run() throws Exception; }

    private OffsetDateTime at(LocalDate d, int hour, int minute) {
        return ZonedDateTime.of(d, java.time.LocalTime.of(hour, minute), ZONE).toOffsetDateTime();
    }

    private UUID book(String status, int hour, UUID procedureId) {
        return insertAppointmentFor(tenant, unit, professional, patient, procedureId, status, at(day, hour, 0), at(day, hour, 30));
    }

    // ---- salas ----

    @Test
    void roomsAreCreatedRenamedAndDeactivatedAndStayInTheirUnit() throws Exception {
        UUID room = newRoom("Consultório 1");
        send(get("/api/v1/salas"), admin(), null).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nome").value("Consultório 1")).andExpect(jsonPath("$[0].ativo").value(true));
        send(put("/api/v1/salas/" + room), admin(), Map.of("nome", "Consultório Um", "ativo", false)).andExpect(status().isOk()).andExpect(jsonPath("ativo").value(false));
        send(get("/api/v1/salas"), admin(), null).andExpect(jsonPath("$[0].nome").value("Consultório Um")).andExpect(jsonPath("$[0].ativo").value(false));
        send(put("/api/v1/salas/" + UUID.randomUUID()), admin(), Map.of("nome", "X")).andExpect(status().isNotFound());
        // Sala de outra unidade da mesma clínica e de outra clínica: não aparece nem se altera.
        UUID elsewhere = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.salas (id, tenant_id, unidade_id, nome) VALUES (?, ?, ?, 'Sala da outra unidade')", elsewhere, tenant, otherUnit));
        send(get("/api/v1/salas"), admin(), null).andExpect(jsonPath("$.length()").value(1));
        send(put("/api/v1/salas/" + elsewhere), admin(), Map.of("nome", "Invadida")).andExpect(status().isNotFound());
    }

    @Test
    void roomNamesAreUniquePerUnitIgnoringCaseButFreeInAnotherUnit() throws Exception {
        newRoom("Sala de Exames");
        refused(status().isConflict(), () -> send(post("/api/v1/salas"), admin(), Map.of("nome", "sala de exames")));
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.salas (tenant_id, unidade_id, nome) VALUES (?, ?, 'Sala de Exames')", tenant, otherUnit));
        send(post("/api/v1/salas"), admin(), Map.of("nome", "Outra sala")).andExpect(status().isCreated());
        send(post("/api/v1/salas"), admin(), Map.of("nome", " ")).andExpect(status().isBadRequest());
    }

    // ---- equipamentos ----

    @Test
    void equipmentIsCreatedWithRoomQuantityAndTheProceduresThatUseIt() throws Exception {
        UUID room = newRoom("Sala de Ultrassom");
        UUID id = newEquipment("Aparelho de ultrassom", 1, room, List.of(procedure));
        send(get("/api/v1/equipamentos"), admin(), null).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(id.toString()))
            .andExpect(jsonPath("$[0].salaNome").value("Sala de Ultrassom")).andExpect(jsonPath("$[0].quantidade").value(1))
            .andExpect(jsonPath("$[0].procedimentoIds[0]").value(procedure.toString()));
        UUID other = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, 'Outro exame', 20)", other, tenant));
        send(put("/api/v1/equipamentos/" + id), admin(), equipment("Ultrassom novo", 3, null, List.of(other))).andExpect(status().isOk())
            .andExpect(jsonPath("nome").value("Ultrassom novo")).andExpect(jsonPath("quantidade").value(3)).andExpect(jsonPath("salaId").doesNotExist())
            .andExpect(jsonPath("procedimentoIds.length()").value(1)).andExpect(jsonPath("procedimentoIds[0]").value(other.toString()));
        send(put("/api/v1/equipamentos/" + id), admin(), equipment("Ultrassom novo", 3, null, List.of())).andExpect(jsonPath("procedimentoIds.length()").value(0));
    }

    @Test
    void invalidEquipmentIsRefusedAndNothingChanges() throws Exception {
        UUID roomHere = newRoom("Sala aqui");
        UUID roomElsewhere = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.salas (id, tenant_id, unidade_id, nome) VALUES (?, ?, ?, 'Sala lá')", roomElsewhere, tenant, otherUnit));
        send(post("/api/v1/equipamentos"), admin(), equipment("Zero", 0, roomHere, List.of())).andExpect(status().isBadRequest());
        send(post("/api/v1/equipamentos"), admin(), equipment("Cem", 100, roomHere, List.of())).andExpect(status().isBadRequest());
        send(post("/api/v1/equipamentos"), admin(), equipment(" ", 1, roomHere, List.of())).andExpect(status().isBadRequest());
        send(post("/api/v1/equipamentos"), admin(), equipment("Sala de outra unidade", 1, roomElsewhere, List.of())).andExpect(status().isBadRequest());
        send(post("/api/v1/equipamentos"), admin(), equipment("Sala inexistente", 1, UUID.randomUUID(), List.of())).andExpect(status().isBadRequest());
        send(post("/api/v1/equipamentos"), admin(), equipment("Procedimento de outra clínica", 1, roomHere, List.of(otherProcedure))).andExpect(status().isBadRequest());
        send(post("/api/v1/equipamentos"), admin(), equipment("Procedimento inexistente", 1, roomHere, List.of(UUID.randomUUID()))).andExpect(status().isBadRequest());
        send(put("/api/v1/equipamentos/" + UUID.randomUUID()), admin(), equipment("Não existe", 1, roomHere, List.of())).andExpect(status().isNotFound());
        send(get("/api/v1/equipamentos"), admin(), null).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void equipmentNamesAreUniquePerUnitAndTheDatabaseKeepsTheRoomInTheSameUnit() throws Exception {
        newEquipment("Holter", 3, null, List.of());
        refused(status().isConflict(), () -> send(post("/api/v1/equipamentos"), admin(), equipment("holter", 1, null, List.of())));
        UUID roomElsewhere = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.salas (id, tenant_id, unidade_id, nome) VALUES (?, ?, ?, 'Sala lá')", roomElsewhere, tenant, otherUnit));
        jdbc.execute("SAVEPOINT banco");
        assertThrows(DataIntegrityViolationException.class, () -> transactions.inTenant(tenant, () ->
            jdbc.update("INSERT INTO clinica.equipamentos (tenant_id, unidade_id, sala_id, nome) VALUES (?, ?, ?, 'Direto no banco')", tenant, unit, roomElsewhere)));
        jdbc.execute("ROLLBACK TO SAVEPOINT banco");
    }

    // ---- sala padrão do profissional ----

    @Test
    void aProfessionalGetsADefaultRoomPerUnitAndItCanBeCleared() throws Exception {
        UUID room = newRoom("Consultório 1");
        send(put("/api/v1/profissionais/" + professional + "/sala"), admin(), Map.of("salaId", room)).andExpect(status().isOk());
        send(get("/api/v1/profissionais-salas"), admin(), null).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].profissionalId").value(professional.toString()))
            .andExpect(jsonPath("$[0].salaId").value(room.toString()));
        UUID second = newRoom("Consultório 2");
        send(put("/api/v1/profissionais/" + professional + "/sala"), admin(), Map.of("salaId", second)).andExpect(status().isOk());
        send(get("/api/v1/profissionais-salas"), admin(), null).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].salaId").value(second.toString()));
        send(put("/api/v1/profissionais/" + professional + "/sala"), admin(), new java.util.HashMap<String, Object>()).andExpect(status().isOk());
        send(get("/api/v1/profissionais-salas"), admin(), null).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void theDefaultRoomMustBeOfTheUnitAndTheProfessionalMustServeIt() throws Exception {
        UUID roomElsewhere = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.salas (id, tenant_id, unidade_id, nome) VALUES (?, ?, ?, 'Sala lá')", roomElsewhere, tenant, otherUnit));
        send(put("/api/v1/profissionais/" + professional + "/sala"), admin(), Map.of("salaId", roomElsewhere)).andExpect(status().isBadRequest());
        UUID room = newRoom("Consultório 1");
        send(put("/api/v1/profissionais/" + unlinkedProfessional + "/sala"), admin(), Map.of("salaId", room)).andExpect(status().isNotFound());
        send(put("/api/v1/profissionais/" + otherProfessional + "/sala"), admin(), Map.of("salaId", room)).andExpect(status().isNotFound());
        send(get("/api/v1/profissionais-salas"), admin(), null).andExpect(jsonPath("$.length()").value(0));
    }

    // ---- uso do dia ----

    @Test
    void theDayShowsWhichAppointmentsOccupyEachEquipmentAndLeavesOutTheOnesThatFreedIt() throws Exception {
        UUID unrelated = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, 'Sem aparelho', 30)", unrelated, tenant));
        UUID room = newRoom("Sala de Exames");
        UUID id = newEquipment("Eletrocardiógrafo", 1, room, List.of(procedure));
        UUID inactive = newEquipment("Aparelho desativado", 1, null, List.of(procedure));
        send(put("/api/v1/equipamentos/" + inactive), admin(), Map.of("nome", "Aparelho desativado", "quantidade", 1, "ativo", false, "procedimentoIds", List.of(procedure))).andExpect(status().isOk());
        UUID first = book("agendado", 9, procedure);
        book("confirmado", 10, procedure);
        book("cancelado", 11, procedure);
        book("remarcado", 12, procedure);
        book("nao_compareceu", 13, procedure);
        book("agendado", 14, unrelated);                                                // procedimento que não usa o aparelho
        insertAppointmentFor(tenant, otherUnit, unlinkedProfessional, patient, procedure, "agendado", at(day, 9, 0), at(day, 9, 30)); // outra unidade
        ResultActions result = send(get("/api/v1/agenda/equipamentos").param("data", day.toString()), admin(), null);
        result.andExpect(status().isOk()).andExpect(jsonPath("data").value(day.toString())).andExpect(jsonPath("equipamentos.length()").value(1))
            .andExpect(jsonPath("equipamentos[0].id").value(id.toString())).andExpect(jsonPath("equipamentos[0].salaNome").value("Sala de Exames"))
            .andExpect(jsonPath("equipamentos[0].quantidade").value(1)).andExpect(jsonPath("equipamentos[0].usos.length()").value(2))
            .andExpect(jsonPath("equipamentos[0].usos[0].agendamentoId").value(first.toString()))
            .andExpect(jsonPath("equipamentos[0].usos[0].inicio").value(Matchers.endsWith("09:00:00-03:00")))
            .andExpect(jsonPath("equipamentos[0].usos[0].procedimentoNome").value("Consulta teste"))
            .andExpect(jsonPath("equipamentos[0].usos[0].profissionalNome").exists());
        String body = result.andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("Paciente Ficticio"), "o uso do equipamento não mostra paciente");
        JsonNode tree = json.readTree(body);
        org.junit.jupiter.api.Assertions.assertEquals(2, tree.get("equipamentos").get(0).get("usos").size());
    }

    @Test
    void anotherClinicsEquipmentNeverAppears() throws Exception {
        UUID foreignRoom = UUID.randomUUID(), foreign = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> {
            jdbc.update("INSERT INTO clinica.salas (id, tenant_id, unidade_id, nome) VALUES (?, ?, ?, 'Sala alheia')", foreignRoom, otherTenant, otherUnitOfOtherTenant);
            jdbc.update("INSERT INTO clinica.equipamentos (id, tenant_id, unidade_id, sala_id, nome) VALUES (?, ?, ?, ?, 'Aparelho alheio')", foreign, otherTenant, otherUnitOfOtherTenant, foreignRoom);
            return null;
        });
        send(get("/api/v1/salas"), admin(), null).andExpect(jsonPath("$.length()").value(0));
        send(get("/api/v1/equipamentos"), admin(), null).andExpect(jsonPath("$.length()").value(0));
        send(put("/api/v1/equipamentos/" + foreign), admin(), equipment("Invadido", 1, null, List.of())).andExpect(status().isNotFound());
    }

    // ---- permissões ----

    @Test
    void whoReadsTheAgendaSeesButOnlyWhoConfiguresItChanges() throws Exception {
        UUID room = newRoom("Sala");
        String reader = tokenFor(userWith("Só lê agenda", "agenda:ler"));
        send(get("/api/v1/salas"), reader, null).andExpect(status().isOk());
        send(get("/api/v1/equipamentos"), reader, null).andExpect(status().isOk());
        send(get("/api/v1/profissionais-salas"), reader, null).andExpect(status().isOk());
        send(get("/api/v1/agenda/equipamentos").param("data", day.toString()), reader, null).andExpect(status().isOk());
        send(post("/api/v1/salas"), reader, Map.of("nome", "Nova")).andExpect(status().isForbidden());
        send(put("/api/v1/salas/" + room), reader, Map.of("nome", "Nova")).andExpect(status().isForbidden());
        send(post("/api/v1/equipamentos"), reader, equipment("Novo", 1, null, List.of())).andExpect(status().isForbidden());
        send(put("/api/v1/profissionais/" + professional + "/sala"), reader, Map.of("salaId", room)).andExpect(status().isForbidden());
        String nobody = tokenFor(userWith("Sem agenda", "pacientes:ler"));
        send(get("/api/v1/salas"), nobody, null).andExpect(status().isForbidden());
        send(get("/api/v1/equipamentos"), nobody, null).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/salas")).andExpect(status().isUnauthorized());
    }
}
