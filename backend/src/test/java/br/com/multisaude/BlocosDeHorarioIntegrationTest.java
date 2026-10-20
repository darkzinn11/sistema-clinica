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
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * A grade define o tamanho do horário (bloco). O agendamento ocupa um bloco; procedimento sem tempo medido ocupa um,
 * com tempo medido maior ocupa blocos seguidos. A clínica ainda não mediu os tempos: "0 min" significa "não medido".
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class BlocosDeHorarioIntegrationTest extends AgendaTestBase {

    // ---- o fim é calculado pelos blocos ----

    @Test
    void theEndIsOptionalAndComputedFromTheBlocks() throws Exception {
        String token = login();
        JsonNode booked = created(bookAt(token, professional, procedure, start, null).andExpect(status().isCreated()));
        assertEquals(start.plusMinutes(30).toInstant(), OffsetDateTime.parse(booked.get("fim").asString()).toInstant());
    }

    @Test
    void anEndThatDoesNotMatchTheBlocksIsRefused() throws Exception {
        String token = login();
        bookAt(token, professional, procedure, start, start.plusMinutes(45)).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("erro").value(Matchers.containsString("Duração inválida")));
        bookAt(token, professional, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
    }

    @Test
    void aProcedureWithoutMeasuredTimeOccupiesOneBlock() throws Exception {
        String token = login();
        mvc.perform(post("/api/v1/procedimentos").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Sem tempo medido", "tipo", "consulta", "duracaoMin", 0))))
            .andExpect(status().isCreated()).andExpect(jsonPath("duracaoMin").value(Matchers.nullValue()));
        UUID unmeasured = UUID.fromString(jdbc.queryForObject("SELECT id::text FROM clinica.procedimentos WHERE nome = 'Sem tempo medido'", String.class));
        enableProcedure(professional, unmeasured);
        JsonNode booked = created(bookAt(token, professional, unmeasured, start, null).andExpect(status().isCreated()));
        assertEquals(start.plusMinutes(30).toInstant(), OffsetDateTime.parse(booked.get("fim").asString()).toInstant());
    }

    @Test
    void aProcedureLongerThanTheBlockOccupiesConsecutiveBlocks() throws Exception {
        String token = login();
        UUID long45 = procedureWithMinutes("Exame de 45 min", 45);
        bookAt(token, professional, long45, start, start.plusMinutes(45)).andExpect(status().isUnprocessableEntity());
        JsonNode booked = created(bookAt(token, professional, long45, start, null).andExpect(status().isCreated()));
        assertEquals(start.plusMinutes(60).toInstant(), OffsetDateTime.parse(booked.get("fim").asString()).toInstant()); // 45 min = 2 blocos de 30
        // Os dois blocos ficam ocupados.
        bookAt(token, professional, procedure, start.plusMinutes(30), null).andExpect(status().isConflict());
        bookAt(token, professional, procedure, start.plusMinutes(60), null).andExpect(status().isCreated());
    }

    // ---- o início cai num bloco ----

    @Test
    void theStartMustFallOnABlockBoundary() throws Exception {
        String token = login();
        bookAt(token, professional, procedure, start.plusMinutes(15), null).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("erro").value(Matchers.containsString("blocos da agenda")));
        bookAt(token, professional, procedure, start.plusSeconds(30), null).andExpect(status().isUnprocessableEntity());
        bookAt(token, professional, procedure, start.plusMinutes(30), null).andExpect(status().isCreated());
    }

    @Test
    void blocksAreCountedFromTheStartOfEachWindowNotFromTheClock() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        UUID oneBlock = procedureWithMinutes(null);
        enableProcedure(fresh, oneBlock);
        createGrade(token, fresh, "14:30", "17:00", 15).andExpect(status().isCreated());
        bookAt(token, fresh, oneBlock, at(14, 45), null).andExpect(status().isCreated());
        bookAt(token, fresh, oneBlock, at(14, 40), null).andExpect(status().isUnprocessableEntity());
        bookAt(token, fresh, oneBlock, at(16, 45), null).andExpect(status().isCreated());   // último bloco, termina às 17:00
        bookAt(token, fresh, oneBlock, at(17, 0), null).andExpect(status().isUnprocessableEntity()); // já fora da janela
    }

    @Test
    void aMultiBlockAppointmentCannotRunPastTheEndOfTheWindow() throws Exception {
        String token = login();
        UUID long45 = procedureWithMinutes("Exame de 45 min", 45);
        // Janela até 20:00, blocos de 30: 19:30 + 2 blocos terminaria às 20:30.
        bookAt(token, professional, long45, start.withHour(19).withMinute(30), null).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("erro").value("Horário fora da grade do profissional."));
        bookAt(token, professional, long45, start.withHour(19), null).andExpect(status().isCreated());
    }

    @Test
    void rescheduleAlsoFollowsTheBlocks() throws Exception {
        String token = login();
        JsonNode original = created(bookAt(token, professional, procedure, start, null).andExpect(status().isCreated()));
        mvc.perform(post("/api/v1/agendamentos/" + id(original) + "/remarcar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0, "inicio", start.plusHours(1).plusMinutes(10).toString()))))
            .andExpect(status().isUnprocessableEntity());
        JsonNode moved = created(mvc.perform(post("/api/v1/agendamentos/" + id(original) + "/remarcar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0, "inicio", start.plusHours(1).toString()))))
            .andExpect(status().isCreated()));
        assertEquals(start.plusMinutes(90).toInstant(), OffsetDateTime.parse(moved.get("fim").asString()).toInstant());
    }

    // ---- disponibilidade ----

    @Test
    void twoWindowsWithDifferentBlocksAddUpToTheDaysCapacity() throws Exception {
        String token = login();
        UUID fresh = freshProfessional();
        UUID oneBlock = procedureWithMinutes(null);
        enableProcedure(fresh, oneBlock);
        createGrade(token, fresh, "09:00", "12:00", 20).andExpect(status().isCreated()); // 9 horários
        createGrade(token, fresh, "14:30", "17:00", 15).andExpect(status().isCreated()); // 10 horários
        String day = start.toLocalDate().toString();
        mvc.perform(get("/api/v1/agenda/disponibilidade").header("Authorization", "Bearer " + token)
            .param("profissionalId", fresh.toString()).param("procedimentoId", oneBlock.toString()).param("de", day).param("ate", day))
            .andExpect(jsonPath("$.length()").value(19))
            .andExpect(jsonPath("$[0].inicio").value(Matchers.containsString("T09:00"))).andExpect(jsonPath("$[1].inicio").value(Matchers.containsString("T09:20")))
            .andExpect(jsonPath("$[9].inicio").value(Matchers.containsString("T14:30"))).andExpect(jsonPath("$[10].inicio").value(Matchers.containsString("T14:45")));
    }

    @Test
    void everyOfferedHorizonCanBeBookedWithoutSendingTheEnd() throws Exception {
        String token = login();
        UUID long45 = procedureWithMinutes("Exame de 45 min", 45);
        String day = start.toLocalDate().toString();
        JsonNode slots = json.readTree(mvc.perform(get("/api/v1/agenda/disponibilidade").header("Authorization", "Bearer " + token)
            .param("profissionalId", professional.toString()).param("procedimentoId", long45.toString()).param("de", day).param("ate", day))
            .andReturn().getResponse().getContentAsString());
        assertTrue(slots.size() > 3);
        for (int i : new int[] {0, 7, slots.size() - 1}) {
            bookAt(token, professional, long45, OffsetDateTime.parse(slots.get(i).get("inicio").asString()), null).andExpect(status().isCreated());
        }
    }

    // ---- cadastro de procedimento e de grade ----

    @Test
    void procedureTimeIsOptionalButNeverAMeaninglessSmallNumber() throws Exception {
        String token = login();
        for (Object minutes : new Object[] {null, 0}) {
            Map<String, Object> body = new HashMap<>(Map.of("nome", "Tempo " + minutes, "tipo", "exame"));
            if (minutes != null) body.put("duracaoMin", minutes);
            mvc.perform(post("/api/v1/procedimentos").header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andExpect(jsonPath("duracaoMin").value(Matchers.nullValue()));
        }
        for (int minutes : new int[] {1, 4}) {
            mvc.perform(post("/api/v1/procedimentos").header("Authorization", "Bearer " + token).contentType("application/json")
                .content(json.writeValueAsString(Map.of("nome", "Pequeno " + minutes, "tipo", "exame", "duracaoMin", minutes)))).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/v1/procedimentos").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Cinco", "tipo", "exame", "duracaoMin", 5)))).andExpect(status().isCreated()).andExpect(jsonPath("duracaoMin").value(5));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.nome == 'Tempo 0')].duracaoMin").value(Matchers.contains(Matchers.nullValue())));
    }

    @Test
    void theDatabaseRefusesAWindowThatDoesNotFitWholeBlocks() {
        transactions.inTenant(tenant, () -> {
            // 06:00-20:00 são 840 minutos: não é múltiplo de 25.
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE clinica.grades SET duracao_bloco_min = 25 WHERE profissional_id = ?", professional));
            return null;
        });
    }

    // ---- helpers ----

    private OffsetDateTime at(int hour, int minute) {
        return start.withHour(hour).withMinute(minute);
    }

    private ResultActions bookAt(String token, UUID professionalId, UUID procedureId, OffsetDateTime from, OffsetDateTime to) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("unidadeId", unit, "profissionalId", professionalId, "pacienteId", patient,
            "procedimentoId", procedureId, "inicio", from.toString()));
        if (to != null) body.put("fim", to.toString());
        return mvc.perform(post("/api/v1/agendamentos").header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(body)));
    }

    private ResultActions createGrade(String token, UUID professionalId, String from, String to, int block) throws Exception {
        return mvc.perform(post("/api/v1/grades").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("profissionalId", professionalId, "diaSemana", start.getDayOfWeek().getValue() % 7,
                "inicio", from, "fim", to, "duracaoBlocoMin", block))));
    }

    private UUID freshProfessional() {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            insertProfessional(id, tenant, "Dr. Blocos", id.toString().substring(0, 8), unit);
            return null;
        });
        return id;
    }

    private UUID procedureWithMinutes(Integer minutes) {
        return procedureWithMinutes("Procedimento " + UUID.randomUUID().toString().substring(0, 6), minutes);
    }

    private UUID procedureWithMinutes(String name, Integer minutes) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min) VALUES (?, ?, ?, ?)", id, tenant, name, minutes));
        enableProcedure(professional, id);
        return id;
    }
}
