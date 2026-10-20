package br.com.multisaude;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class AgendaIntegrationTest extends AgendaTestBase {
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
        // Com blocos fixos, a sobreposição de procedimentos de um bloco é o mesmo horário.
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isConflict());
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
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
        book(token, unit, professional, patient, procedure, start.plusMinutes(30), start.plusMinutes(60)).andExpect(status().isCreated());
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

    @Test
    void listsMotivesAndRecordsInitialHistory() throws Exception {
        String token = login();
        mvc.perform(get("/api/v1/agendamento-motivos").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3)).andExpect(jsonPath("$[0].origem").value("paciente"));
        JsonNode created = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)));
        mvc.perform(get("/api/v1/agendamentos/" + id(created) + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].de").doesNotExist()).andExpect(jsonPath("$[0].para").value("agendado"));
    }

    @Test
    void storesChannelAndRejectsUnknownChannel() throws Exception {
        String token = login();
        JsonNode created = created(mvc.perform(post("/api/v1/agendamentos").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(bookingBody(unit, start, start.plusMinutes(30), "whatsapp"))));
        org.junit.jupiter.api.Assertions.assertEquals("whatsapp", created.get("canal").asString());
        mvc.perform(post("/api/v1/agendamentos").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(bookingBody(unit, start.plusHours(1), start.plusHours(2), "pombo-correio"))).andExpect(status().isBadRequest());
    }

    @Test
    void cancelRecordsMotiveAndHistoryAndFreesTheSlot() throws Exception {
        String token = login();
        JsonNode created = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)));
        mvc.perform(post("/api/v1/agendamentos/" + id(created) + "/cancelar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0, "observacao", "Paciente avisou"))))
            .andExpect(status().isOk()).andExpect(jsonPath("status").value("cancelado")).andExpect(jsonPath("versao").value(1));
        mvc.perform(get("/api/v1/agendamentos/" + id(created) + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[1].de").value("agendado"))
            .andExpect(jsonPath("$[1].para").value("cancelado")).andExpect(jsonPath("$[1].motivoId").value(1))
            .andExpect(jsonPath("$[1].usuarioId").value(user.toString()));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
    }

    @Test
    void cancelRejectsBadMotiveStaleVersionAndFinalStates() throws Exception {
        String token = login();
        JsonNode created = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)));
        String path = "/api/v1/agendamentos/" + id(created) + "/cancelar";
        mvc.perform(post(path).header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 99, "versao", 0)))).andExpect(status().isBadRequest());
        mvc.perform(post(path).header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 7)))).andExpect(status().isConflict());
        mvc.perform(post(path).header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0)))).andExpect(status().isOk());
        mvc.perform(post(path).header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 1)))).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/agendamentos/" + UUID.randomUUID() + "/cancelar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0)))).andExpect(status().isNotFound());
    }

    @Test
    void rescheduleCreatesLinkedAppointmentKeepsOldOneAndMayOverlapItsOwnSlot() throws Exception {
        String token = login();
        // Procedimento de 60 min = dois blocos de 30: remarcar um bloco adiante sobrepõe o próprio horário.
        UUID longProcedure = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, 'Consulta longa', 60)", longProcedure, tenant));
        enableProcedure(professional, longProcedure);
        JsonNode original = created(book(token, unit, professional, patient, longProcedure, start, start.plusMinutes(60)));
        OffsetDateTime newStart = start.plusMinutes(30);
        JsonNode moved = created(mvc.perform(post("/api/v1/agendamentos/" + id(original) + "/remarcar").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(Map.of("motivoId", 2, "versao", 0,
                "inicio", newStart.toString(), "fim", newStart.plusMinutes(60).toString()))))
            .andExpect(status().isCreated()).andExpect(jsonPath("status").value("agendado"))
            .andExpect(jsonPath("remarcadoDe").value(id(original).toString())));
        org.junit.jupiter.api.Assertions.assertNotEquals(id(original), id(moved));
        mvc.perform(get("/api/v1/agendamentos").header("Authorization", "Bearer " + token).param("profissionalId", professional.toString())
            .param("de", start.minusHours(1).toString()).param("ate", start.plusHours(3).toString()))
            .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].status").value("remarcado"))
            .andExpect(jsonPath("$[1].status").value("agendado"));
        mvc.perform(get("/api/v1/agendamentos/" + id(original) + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$[1].para").value("remarcado")).andExpect(jsonPath("$[1].motivoId").value(2));
        mvc.perform(get("/api/v1/agendamentos/" + id(moved) + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].para").value("agendado"));
        // O novo horário passa a ser ocupado; o antigo, que estava dentro dele, não conta mais.
        book(token, unit, professional, patient, procedure, start.plusMinutes(60), start.plusMinutes(90)).andExpect(status().isConflict());
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
    }

    @Test
    void rescheduleIntoBusySlotIsRefusedAndLeavesOriginalUntouched() throws Exception {
        String token = login();
        JsonNode original = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)));
        book(token, unit, professional, patient, procedure, start.plusHours(2), start.plusHours(2).plusMinutes(30)).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/agendamentos/" + id(original) + "/remarcar").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0,
                "inicio", start.plusHours(2).toString(), "fim", start.plusHours(2).plusMinutes(30).toString()))))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/agendamentos/" + id(original) + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(post("/api/v1/agendamentos/" + id(original) + "/cancelar").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0)))).andExpect(status().isOk());
    }

    @Test
    void rescheduleRejectsCheckedInAndInvalidPeriod() throws Exception {
        String token = login();
        UUID checkedIn = insertAppointment("check_in", start, start.plusMinutes(30));
        mvc.perform(post("/api/v1/agendamentos/" + checkedIn + "/remarcar").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0,
                "inicio", start.plusHours(3).toString(), "fim", start.plusHours(3).plusMinutes(30).toString())))).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/agendamentos/" + checkedIn + "/remarcar").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0,
                "inicio", start.plusHours(4).toString(), "fim", start.plusHours(3).toString())))).andExpect(status().isBadRequest());
    }

    @Test
    void statusFollowsTheAllowedFlowAndRefusesShortcuts() throws Exception {
        String token = login();
        JsonNode created = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)));
        String path = "/api/v1/agendamentos/" + id(created) + "/status";
        changeStatus(token, path, "atendido", 0).andExpect(status().isConflict());
        changeStatus(token, path, "cancelado", 0).andExpect(status().isBadRequest());
        changeStatus(token, path, "inexistente", 0).andExpect(status().isBadRequest());
        changeStatus(token, path, "confirmado", 0).andExpect(status().isOk()).andExpect(jsonPath("versao").value(1));
        changeStatus(token, path, "confirmado", 0).andExpect(status().isConflict());
        changeStatus(token, path, "check_in", 1).andExpect(status().isOk());
        changeStatus(token, path, "em_atendimento", 2).andExpect(status().isOk());
        changeStatus(token, path, "atendido", 3).andExpect(status().isOk()).andExpect(jsonPath("status").value("atendido"));
        changeStatus(token, path, "confirmado", 4).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/agendamentos/" + id(created) + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.length()").value(5));
    }

    @Test
    void lifecycleActionsAreScopedToTheSessionUnitAndTenant() throws Exception {
        String token = login();
        UUID inOtherUnit = insertAppointmentFor(tenant, otherUnit, professional, patient, procedure, "agendado", start, start.plusMinutes(30));
        UUID inOtherTenant = insertAppointmentFor(otherTenant, otherUnitOfOtherTenant, otherProfessional, otherPatient, otherProcedure, "agendado", start, start.plusMinutes(30));
        for (UUID target : java.util.List.of(inOtherUnit, inOtherTenant)) {
            int expected = 404; // outra unidade e outra clínica respondem igual a inexistente
            mvc.perform(post("/api/v1/agendamentos/" + target + "/cancelar").header("Authorization", "Bearer " + token).contentType("application/json")
                .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0)))).andExpect(status().is(expected));
            changeStatus(token, "/api/v1/agendamentos/" + target + "/status", "confirmado", 0).andExpect(status().is(expected));
        }
    }

    @Test
    void lifecycleActionsRequireTheirOwnPermissions() throws Exception {
        String token = login();
        JsonNode created = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)));
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['agenda:ler','agenda:editar'] WHERE id = ?", role));
        mvc.perform(post("/api/v1/agendamentos/" + id(created) + "/cancelar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0)))).andExpect(status().isForbidden());
        // Perfil do médico: muda status, mas não remarca.
        mvc.perform(post("/api/v1/agendamentos/" + id(created) + "/remarcar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0,
                "inicio", start.plusHours(3).toString(), "fim", start.plusHours(3).plusMinutes(30).toString())))).andExpect(status().isForbidden());
        changeStatus(token, "/api/v1/agendamentos/" + id(created) + "/status", "confirmado", 0).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['agenda:ler','agenda:cancelar','agenda:remarcar'] WHERE id = ?", role));
        changeStatus(token, "/api/v1/agendamentos/" + id(created) + "/status", "check_in", 1).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/agendamentos/" + id(created) + "/remarcar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 1,
                "inicio", start.plusHours(3).toString(), "fim", start.plusHours(3).plusMinutes(30).toString())))).andExpect(status().isCreated());
    }
}
