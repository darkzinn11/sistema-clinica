package br.com.multisaude;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Grades, bloqueios, disponibilidade e a regra de só agendar dentro da grade. */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class ScheduleIntegrationTest extends AgendaTestBase {
    private int weekday() {
        return start.getDayOfWeek().getValue() % 7;
    }

    // ---- regra: só dentro da grade ----

    @Test
    void bookingMustFitInsideTheGradeWindow() throws Exception {
        String token = login();
        book(token, unit, professional, patient, procedure, start.withHour(5).withMinute(30), start.withHour(6).withMinute(30))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("erro").value("Horário fora da grade do profissional."));
        book(token, unit, professional, patient, procedure, start.withHour(19).withMinute(45), start.withHour(20).withMinute(15))
            .andExpect(status().isUnprocessableEntity());
        book(token, unit, professional, patient, procedure, start.withHour(6), start.withHour(6).withMinute(30)).andExpect(status().isCreated());
        book(token, unit, professional, patient, procedure, start.withHour(19).withMinute(30), start.withHour(20)).andExpect(status().isCreated());
    }

    @Test
    void dayWithoutGradeIsRefusedAndWorksAgainWhenGradeReturns() throws Exception {
        String token = login();
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.grades SET ativo = false WHERE profissional_id = ? AND dia_semana = ?", professional, weekday()));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isUnprocessableEntity());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.grades SET ativo = true WHERE profissional_id = ? AND dia_semana = ?", professional, weekday()));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
    }

    @Test
    void gradeVigenciaIsRespected() throws Exception {
        String token = login();
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.grades SET vigencia = daterange(current_date - 10, current_date - 1) WHERE profissional_id = ?", professional));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isUnprocessableEntity());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.grades SET vigencia = daterange(current_date + 30, NULL) WHERE profissional_id = ?", professional));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void gradeIsEvaluatedInTheUnitTimezoneNotInTheOffsetSent() throws Exception {
        String token = login();
        // 10:00-03:00 equivale a 22:00 em Tóquio, fora da grade (06:00-20:00) naquela unidade.
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.unidades SET fuso = 'Asia/Tokyo' WHERE id = ?", unit));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isUnprocessableEntity());
        // O mesmo instante, escrito em UTC, dá o mesmo resultado.
        book(token, unit, professional, patient, procedure, start.withOffsetSameInstant(java.time.ZoneOffset.UTC), start.plusMinutes(30).withOffsetSameInstant(java.time.ZoneOffset.UTC))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void rescheduleAlsoHonorsTheGrade() throws Exception {
        String token = login();
        JsonNode original = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)));
        mvc.perform(post("/api/v1/agendamentos/" + id(original) + "/remarcar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0,
                "inicio", start.withHour(22).toString(), "fim", start.withHour(22).plusMinutes(30).toString()))))
            .andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/v1/agendamentos/" + id(original) + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.length()").value(1));
    }

    // ---- bloqueios ----

    @Test
    void professionalBlockRefusesBookingAndRevokeFreesIt() throws Exception {
        String token = login();
        JsonNode block = created(createBlock(token, professional, start.withHour(9), start.withHour(12), "Congresso").andExpect(status().isCreated())
            .andExpect(jsonPath("motivo").value("Congresso")));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("erro").value("Horário bloqueado: Congresso"));
        book(token, unit, professional, patient, procedure, start.withHour(12), start.withHour(12).plusMinutes(30)).andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/bloqueios/" + id(block)).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/bloqueios/" + id(block)).header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
    }

    @Test
    void unitWideBlockAppliesToEveryProfessionalButAnotherProfessionalBlockDoesNot() throws Exception {
        String token = login();
        UUID other = freshProfessional();
        createBlock(token, other, start.withHour(9), start.withHour(12), "Só do outro").andExpect(status().isCreated());
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
        createBlock(token, null, start.withHour(14), start.withHour(16), "Feriado").andExpect(status().isCreated());
        book(token, unit, professional, patient, procedure, start.withHour(14), start.withHour(14).plusMinutes(30)).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void blockIsRefusedOverActiveAppointmentsButAllowedOverCancelledOnes() throws Exception {
        String token = login();
        insertAppointment("cancelado", start, start.plusMinutes(30));
        createBlock(token, professional, start.minusHours(1), start.plusHours(1), "Manutenção").andExpect(status().isCreated());
        book(token, unit, professional, patient, procedure, start.withHour(15), start.withHour(15).plusMinutes(30)).andExpect(status().isCreated());
        createBlock(token, professional, start.withHour(14), start.withHour(16), "Conflita").andExpect(status().isConflict())
            .andExpect(jsonPath("erro").value(Matchers.containsString("1 agendamento(s) ativos")));
        createBlock(token, null, start.withHour(14), start.withHour(16), "Unidade inteira").andExpect(status().isConflict());
    }

    @Test
    void rejectsInvalidBlocks() throws Exception {
        String token = login();
        createBlock(token, professional, start.withHour(12), start.withHour(9), "Invertido").andExpect(status().isBadRequest());
        createBlock(token, professional, start.withHour(9), start.withHour(12), " ").andExpect(status().isBadRequest());
        createBlock(token, unlinkedProfessional, start.withHour(9), start.withHour(12), "Sem vínculo").andExpect(status().isBadRequest());
        createBlock(token, otherProfessional, start.withHour(9), start.withHour(12), "Outra clínica").andExpect(status().isBadRequest());
    }

    @Test
    void listsOnlyActiveBlocksOfTheSessionUnitInThePeriod() throws Exception {
        String token = login();
        createBlock(token, professional, start.withHour(9), start.withHour(10), "Dentro").andExpect(status().isCreated());
        JsonNode revoked = created(createBlock(token, professional, start.withHour(11), start.withHour(12), "Revogado"));
        mvc.perform(delete("/api/v1/bloqueios/" + id(revoked)).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        createBlock(token, professional, start.plusDays(10).withHour(9), start.plusDays(10).withHour(10), "Fora do período").andExpect(status().isCreated());
        mvc.perform(get("/api/v1/bloqueios").header("Authorization", "Bearer " + token)
            .param("de", start.withHour(0).toString()).param("ate", start.plusDays(1).withHour(0).toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].motivo").value("Dentro"));
    }

    // ---- grades ----

    @Test
    void createsListsAndDeactivatesAGrade() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        JsonNode grade = created(createGrade(token, fresh, 1, "08:00", "12:00", 10, null, null).andExpect(status().isCreated())
            .andExpect(jsonPath("diaSemana").value(1)).andExpect(jsonPath("inicio").value(Matchers.startsWith("08:00")))
            .andExpect(jsonPath("fim").value(Matchers.startsWith("12:00"))).andExpect(jsonPath("duracaoBlocoMin").value(10))
            .andExpect(jsonPath("vigenciaFim").value(Matchers.nullValue())).andExpect(jsonPath("unidadeId").value(unit.toString())));
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token).param("profissionalId", fresh.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(delete("/api/v1/grades/" + id(grade)).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token).param("profissionalId", fresh.toString()))
            .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete("/api/v1/grades/" + id(grade)).header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
    }

    @Test
    void echoesInclusiveVigenciaEndDate() throws Exception {
        String token = login();
        createGrade(token, freshProfessional(), 2, "08:00", "12:00", null, "2030-01-01", "2030-12-31").andExpect(status().isCreated())
            .andExpect(jsonPath("vigenciaInicio").value("2030-01-01")).andExpect(jsonPath("vigenciaFim").value("2030-12-31"))
            .andExpect(jsonPath("duracaoBlocoMin").value(30));
    }

    @Test
    void rejectsInvalidGrades() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        createGrade(token, fresh, 1, "12:00", "08:00", null, null, null).andExpect(status().isBadRequest());
        createGrade(token, fresh, 1, "08:00", "08:00", null, null, null).andExpect(status().isBadRequest());
        createGrade(token, fresh, 1, "08:00:30", "12:00", null, null, null).andExpect(status().isBadRequest());
        createGrade(token, fresh, 7, "08:00", "12:00", null, null, null).andExpect(status().isBadRequest());
        createGrade(token, fresh, 1, "08:00", "12:00", 241, null, null).andExpect(status().isBadRequest());
        createGrade(token, fresh, 1, "08:00", "12:00", 4, null, null).andExpect(status().isBadRequest());
        // 4 horas não cabem em blocos inteiros de 25 minutos: sobraria um horário que ninguém agenda.
        createGrade(token, fresh, 1, "08:00", "12:00", 25, null, null).andExpect(status().isBadRequest());
        createGrade(token, fresh, 1, "08:00", "12:00", null, "2030-06-01", "2030-05-31").andExpect(status().isBadRequest());
        createGrade(token, unlinkedProfessional, 1, "08:00", "12:00", null, null, null).andExpect(status().isBadRequest());
        createGrade(token, otherProfessional, 1, "08:00", "12:00", null, null, null).andExpect(status().isBadRequest());
    }

    @Test
    void overlappingGradesAreRefusedButAdjacentOnesAndOtherDaysAreFine() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        createGrade(token, fresh, 1, "08:00", "12:00", null, null, null).andExpect(status().isCreated());
        createGrade(token, fresh, 1, "11:00", "14:00", null, null, null).andExpect(status().isConflict());
        createGrade(token, fresh, 1, "12:00", "14:00", null, null, null).andExpect(status().isCreated());
        createGrade(token, fresh, 2, "08:00", "12:00", null, null, null).andExpect(status().isCreated());
    }

    @Test
    void gradesWithDisjointVigenciaDoNotOverlap() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        createGrade(token, fresh, 1, "08:00", "12:00", null, "2030-01-01", "2030-06-30").andExpect(status().isCreated());
        createGrade(token, fresh, 1, "08:00", "12:00", null, "2030-07-01", null).andExpect(status().isCreated());
        createGrade(token, fresh, 1, "09:00", "10:00", null, "2030-06-30", "2030-07-15").andExpect(status().isConflict());
    }

    @Test
    void gradeOverlapIsAlsoEnforcedByTheDatabase() {
        UUID fresh = freshProfessional();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.grades (tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) VALUES (?, ?, ?, 3, '08:00', '12:00', 30)", tenant, fresh, unit);
            org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO clinica.grades (tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) VALUES (?, ?, ?, 3, '10:00', '11:00', 30)", tenant, fresh, unit));
            return null;
        });
    }

    @Test
    void gradesAreScopedToTheSessionUnitAndTenant() throws Exception {
        String token = login();
        UUID inOtherUnit = UUID.randomUUID();
        UUID inOtherTenant = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.grades (id, tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) VALUES (?, ?, ?, ?, 1, '08:00', '12:00', 30)",
            inOtherUnit, tenant, unlinkedProfessional, otherUnit));
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.grades (id, tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) VALUES (?, ?, ?, ?, 1, '08:00', '12:00', 30)",
            inOtherTenant, otherTenant, otherProfessional, otherUnitOfOtherTenant));
        // Só as 7 grades da fixture: nem a de outra unidade nem a de outra clínica aparecem.
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(7));
        mvc.perform(delete("/api/v1/grades/" + inOtherUnit).header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/grades/" + inOtherTenant).header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
    }

    @Test
    void configuringTheAgendaRequiresItsOwnPermission() throws Exception {
        String token = login();
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['agenda:ler','agenda:criar','agenda:editar','agenda:cancelar'] WHERE id = ?", role));
        UUID fresh = freshProfessional();
        createGrade(token, fresh, 1, "08:00", "12:00", null, null, null).andExpect(status().isForbidden());
        createBlock(token, professional, start.withHour(9), start.withHour(12), "Não pode").andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/grades/" + UUID.randomUUID()).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
    }

    // ---- disponibilidade ----

    @Test
    void availabilityListsSlotsAndSubtractsAppointmentsAndBlocks() throws Exception {
        String token = login();
        String day = start.toLocalDate().toString();
        // 06:00 às 20:00 em passos de 30 min = 28 horários.
        availability(token, professional, procedure, day, day).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(28))
            .andExpect(jsonPath("$[0].inicio").value(Matchers.containsString("T06:00")));
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
        availability(token, professional, procedure, day, day).andExpect(jsonPath("$.length()").value(27));
        createBlock(token, professional, start.withHour(12), start.withHour(13), "Almoço").andExpect(status().isCreated());
        availability(token, professional, procedure, day, day).andExpect(jsonPath("$.length()").value(25));
    }

    @Test
    void availabilityFollowsTheBlocksOfTheGradeAndGroupsBlocksForLongerProcedures() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        createGrade(token, fresh, weekday(), "08:00", "10:00", 20, null, null).andExpect(status().isCreated());
        String day = start.toLocalDate().toString();
        // Procedimento sem tempo medido (nulo) ocupa um bloco: 6 horários de 20 min entre 08:00 e 10:00.
        UUID unmeasured = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, 'Sem tempo medido', NULL)", unmeasured, tenant));
        enableProcedure(fresh, unmeasured);
        availability(token, fresh, unmeasured, day, day).andExpect(jsonPath("$.length()").value(6))
            .andExpect(jsonPath("$[1].inicio").value(Matchers.containsString("T08:20"))).andExpect(jsonPath("$[5].fim").value(Matchers.containsString("T10:00")));
        // O procedimento padrão da fixture (30 min) num bloco de 20 também ocupa dois blocos: 5 horários.
        enableProcedure(fresh, procedure);
        availability(token, fresh, procedure, day, day).andExpect(jsonPath("$.length()").value(5));
        // Com tempo medido de 40 min são dois blocos seguidos: início de 20 em 20 min, até 09:20 (termina às 10:00).
        UUID measured = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, 'Exame de 40 min', 40)", measured, tenant));
        enableProcedure(fresh, measured);
        availability(token, fresh, measured, day, day).andExpect(jsonPath("$.length()").value(5))
            .andExpect(jsonPath("$[4].inicio").value(Matchers.containsString("T09:20"))).andExpect(jsonPath("$[4].fim").value(Matchers.containsString("T10:00")));
    }

    @Test
    void availabilityIgnoresGradesOfOtherWeekdaysAndInactiveOnes() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        createGrade(token, fresh, (weekday() + 1) % 7, "08:00", "12:00", null, null, null).andExpect(status().isCreated());
        String day = start.toLocalDate().toString();
        enableProcedure(fresh, procedure);
        availability(token, fresh, procedure, day, day).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void availabilityRejectsBadInput() throws Exception {
        String token = login();
        String day = start.toLocalDate().toString();
        availability(token, professional, procedure, start.plusDays(1).toLocalDate().toString(), day).andExpect(status().isBadRequest());
        availability(token, professional, procedure, day, start.plusDays(40).toLocalDate().toString()).andExpect(status().isBadRequest());
        availability(token, professional, UUID.randomUUID(), day, day).andExpect(status().isBadRequest());
        availability(token, unlinkedProfessional, procedure, day, day).andExpect(status().isBadRequest());
        availability(token, otherProfessional, procedure, day, day).andExpect(status().isBadRequest());
    }

    @Test
    void everyOfferedSlotCanActuallyBeBooked() throws Exception {
        String token = login();
        String day = start.toLocalDate().toString();
        JsonNode slots = json.readTree(availability(token, professional, procedure, day, day).andReturn().getResponse().getContentAsString());
        for (int i : new int[] {0, 13, 27}) {
            book(token, unit, professional, patient, procedure, OffsetDateTime.parse(slots.get(i).get("inicio").asString()),
                OffsetDateTime.parse(slots.get(i).get("fim").asString())).andExpect(status().isCreated());
        }
    }

    // ---- helpers ----

    private UUID freshProfessional() {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            insertProfessional(id, tenant, "Dr. Novo", id.toString().substring(0, 8), unit);
            return null;
        });
        return id;
    }

    private ResultActions createGrade(String token, UUID professionalId, int weekday, String from, String to, Integer block,
                                      String validFrom, String validUntil) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("profissionalId", professionalId, "diaSemana", weekday, "inicio", from, "fim", to));
        body.put("duracaoBlocoMin", block == null ? 30 : block);
        if (validFrom != null) body.put("vigenciaInicio", validFrom);
        if (validUntil != null) body.put("vigenciaFim", validUntil);
        return mvc.perform(post("/api/v1/grades").header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(body)));
    }

    private ResultActions createBlock(String token, UUID professionalId, OffsetDateTime from, OffsetDateTime to, String reason) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("inicio", from.toString(), "fim", to.toString(), "motivo", reason));
        if (professionalId != null) body.put("profissionalId", professionalId);
        return mvc.perform(post("/api/v1/bloqueios").header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(body)));
    }

    private ResultActions availability(String token, UUID professionalId, UUID procedureId, String from, String to) throws Exception {
        return mvc.perform(get("/api/v1/agenda/disponibilidade").header("Authorization", "Bearer " + token)
            .param("profissionalId", professionalId.toString()).param("procedimentoId", procedureId.toString()).param("de", from).param("ate", to));
    }
}
