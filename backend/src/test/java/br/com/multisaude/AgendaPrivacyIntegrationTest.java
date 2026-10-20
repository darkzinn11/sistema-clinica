package br.com.multisaude;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Um médico só enxerga e opera a própria agenda. Há rodízio de médicos e quem atende em várias clínicas,
 * então nada da agenda de um colega pode aparecer: nem listagem, nem histórico, nem grade, nem motivo de bloqueio.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class AgendaPrivacyIntegrationTest extends AgendaTestBase {
    private final UUID doctorUser = UUID.randomUUID();
    private final UUID colleague = UUID.randomUUID();
    private UUID ownAppointment;
    private UUID colleagueAppointment;

    @BeforeEach
    void doctorFixtures() {
        transactions.inTenant(tenant, () -> {
            UUID doctorRole = UUID.randomUUID();
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Médico teste', ARRAY['agenda:ler_proprios','agenda:atender','pacientes:ler_vinculados'])", doctorRole, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Médico teste', ?, 'x')", doctorUser, tenant, "medico-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, doctorUser, unit, doctorRole);
            // A fixture base ligou `professional` ao usuário padrão; aqui ele passa a ser o médico testado.
            jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctorUser, professional);
            insertProfessional(colleague, tenant, "Dr. Colega", "7777", unit);
            jdbc.update("INSERT INTO clinica.grades (tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) SELECT ?, ?, ?, d, '08:00', '12:00', 30 FROM generate_series(0, 6) d", tenant, colleague, unit);
            jdbc.update("INSERT INTO clinica.profissional_procedimentos (tenant_id, profissional_id, procedimento_id) VALUES (?, ?, ?)", tenant, colleague, procedure);
            return null;
        });
        ownAppointment = insertAppointmentFor(tenant, unit, professional, patient, procedure, "agendado", start, start.plusMinutes(30));
        colleagueAppointment = insertAppointmentFor(tenant, unit, colleague, patient, procedure, "agendado", start, start.plusMinutes(30));
    }

    // ---- leitura da agenda ----

    @Test
    void listsOnlyTheOwnAppointmentsAndRefusesAColleaguesAgenda() throws Exception {
        String token = tokenFor(doctorUser);
        list(token, professional).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(ownAppointment.toString()));
        list(token, colleague).andExpect(status().isForbidden()).andExpect(content().string(Matchers.not(Matchers.containsString(colleagueAppointment.toString()))));
    }

    @Test
    void historyOfAColleaguesAppointmentIsIndistinguishableFromAnUnknownOne() throws Exception {
        String token = tokenFor(doctorUser);
        mvc.perform(get("/api/v1/agendamentos/" + ownAppointment + "/historico").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        String colleagues = mvc.perform(get("/api/v1/agendamentos/" + colleagueAppointment + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(get("/api/v1/agendamentos/" + UUID.randomUUID() + "/historico").header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        assertEquals(unknown, colleagues);
    }

    @Test
    void gradesAreLimitedToTheOwnProfessional() throws Exception {
        String token = tokenFor(doctorUser);
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(7)).andExpect(jsonPath("$[*].profissionalId", Matchers.everyItem(Matchers.is(professional.toString()))));
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token).param("profissionalId", colleague.toString())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token).param("profissionalId", professional.toString()))
            .andExpect(jsonPath("$.length()").value(7));
    }

    @Test
    void blockReasonsOfColleaguesNeverAppear() throws Exception {
        String admin = login();
        block(admin, colleague, "Consulta pessoal do colega");
        block(admin, professional, "Meu congresso");
        block(admin, null, "Feriado");
        mvc.perform(get("/api/v1/bloqueios").header("Authorization", "Bearer " + tokenFor(doctorUser))
            .param("de", start.withHour(0).toString()).param("ate", start.plusDays(1).withHour(0).toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
            .andExpect(content().string(Matchers.not(Matchers.containsString("pessoal"))));
        // Quem tem agenda:ler continua vendo todos.
        mvc.perform(get("/api/v1/bloqueios").header("Authorization", "Bearer " + admin)
            .param("de", start.withHour(0).toString()).param("ate", start.plusDays(1).withHour(0).toString())).andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void availabilityOfAColleagueIsRefused() throws Exception {
        String token = tokenFor(doctorUser);
        String day = start.toLocalDate().toString();
        availability(token, professional, day).andExpect(status().isOk());
        availability(token, colleague, day).andExpect(status().isForbidden());
    }

    @Test
    void receptionWithFullReadStillSeesEveryAgenda() throws Exception {
        String token = login();
        list(token, colleague).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/agendamentos/" + colleagueAppointment + "/historico").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        availability(token, colleague, start.toLocalDate().toString()).andExpect(status().isOk());
    }

    @Test
    void userWithoutALinkedProfessionalSeesNoAgenda() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.profissionais SET usuario_id = NULL WHERE id = ?", professional));
        String admin = login();
        block(admin, null, "Feriado");
        block(admin, colleague, "Do colega");
        String token = tokenFor(doctorUser);
        list(token, professional).andExpect(status().isForbidden());
        list(token, colleague).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/agendamentos/" + ownAppointment + "/historico").header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/bloqueios").header("Authorization", "Bearer " + token)
            .param("de", start.withHour(0).toString()).param("ate", start.plusDays(1).withHour(0).toString()))
            .andExpect(jsonPath("$.length()").value(1)).andExpect(content().string(Matchers.not(Matchers.containsString("Do colega"))));
    }

    @Test
    void agendaOfAnotherClinicIsNeverReachable() throws Exception {
        UUID foreign = insertAppointmentFor(otherTenant, otherUnitOfOtherTenant, otherProfessional, otherPatient, otherProcedure, "agendado", start, start.plusMinutes(30));
        String token = tokenFor(doctorUser);
        mvc.perform(get("/api/v1/agendamentos/" + foreign + "/historico").header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
        list(token, otherProfessional).andExpect(status().isForbidden());
        setStatus(token, foreign, "em_atendimento", 0).andExpect(status().isNotFound());
    }

    // ---- cada unidade só conhece a própria agenda ----

    @Test
    void anotherUnitsAppointmentsNeverAppearAndRespondLikeUnknownOnes() throws Exception {
        UUID elsewhere = insertAppointmentFor(tenant, otherUnit, professional, patient, procedure, "agendado", start.plusHours(3), start.plusHours(3).plusMinutes(30));
        for (String token : new String[] {tokenFor(doctorUser), login()}) {
            list(token, professional).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(content().string(Matchers.not(Matchers.containsString(elsewhere.toString()))));
            String history = mvc.perform(get("/api/v1/agendamentos/" + elsewhere + "/historico").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
            assertEquals(mvc.perform(get("/api/v1/agendamentos/" + UUID.randomUUID() + "/historico").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString(), history);
        }
        mvc.perform(post("/api/v1/agendamentos/" + elsewhere + "/cancelar").header("Authorization", "Bearer " + login()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0)))).andExpect(status().isNotFound());
    }

    @Test
    void aSessionInTheOtherUnitSeesOnlyThatUnitsAgenda() throws Exception {
        UUID receptionB = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            UUID roleB = UUID.randomUUID();
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Recepção B', ARRAY['agenda:ler'])", roleB, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Recepção B', ?, 'x')", receptionB, tenant, "b-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, receptionB, otherUnit, roleB);
            return null;
        });
        UUID inB = insertAppointmentFor(tenant, otherUnit, professional, patient, procedure, "agendado", start.plusHours(3), start.plusHours(3).plusMinutes(30));
        String token = tokenFor(receptionB, otherUnit);
        list(token, professional).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(inB.toString()));
        mvc.perform(get("/api/v1/agendamentos/" + ownAppointment + "/historico").header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
    }

    @Test
    void availabilityStillTreatsOtherUnitAppointmentsAsBusyBecauseTheDoctorCannotBeInTwoPlaces() throws Exception {
        insertAppointmentFor(tenant, otherUnit, professional, patient, procedure, "agendado", start.plusHours(1), start.plusHours(1).plusMinutes(30));
        // 28 horários na grade, menos o agendamento daqui (10:00) e o da outra unidade (11:00).
        availability(login(), professional, start.toLocalDate().toString()).andExpect(jsonPath("$.length()").value(26));
    }

    // ---- preços ----

    @Test
    void doctorNeverSeesPricesButReceptionDoes() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.procedimentos SET valor_centavos = 15000 WHERE id = ?", procedure));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + tokenFor(doctorUser)))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].nome").value("Consulta teste")).andExpect(jsonPath("$[0].duracaoMin").value(30))
            .andExpect(jsonPath("$[0].valorCentavos").value(Matchers.nullValue())).andExpect(content().string(Matchers.not(Matchers.containsString("15000"))));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + login())).andExpect(jsonPath("$[0].valorCentavos").value(15000));
    }

    // ---- escrita ----

    @Test
    void doctorStartsAndFinishesOnlyOwnAttendance() throws Exception {
        String token = tokenFor(doctorUser);
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.agendamentos SET status = 'check_in' WHERE id = ?", ownAppointment));
        setStatus(token, ownAppointment, "em_atendimento", 0).andExpect(status().isOk()).andExpect(jsonPath("status").value("em_atendimento"));
        setStatus(token, ownAppointment, "atendido", 1).andExpect(status().isOk());
    }

    @Test
    void doctorCannotTouchAColleaguesAppointmentAndCannotLearnItExists() throws Exception {
        String token = tokenFor(doctorUser);
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.agendamentos SET status = 'check_in' WHERE id = ?", colleagueAppointment));
        // Versão certa, versão errada e ID inexistente: a resposta é a mesma, para não servir de oráculo.
        String right = setStatus(token, colleagueAppointment, "em_atendimento", 0).andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String wrong = setStatus(token, colleagueAppointment, "em_atendimento", 99).andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String unknown = setStatus(token, UUID.randomUUID(), "em_atendimento", 0).andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        assertEquals(right, wrong);
        assertEquals(right, unknown);
        assertEquals("check_in", jdbc.queryForObject("SELECT status FROM clinica.agendamentos WHERE id = ?", String.class, colleagueAppointment));
    }

    @Test
    void doctorCannotDoReceptionStatusChanges() throws Exception {
        String token = tokenFor(doctorUser);
        setStatus(token, ownAppointment, "confirmado", 0).andExpect(status().isForbidden());
        setStatus(token, ownAppointment, "check_in", 0).andExpect(status().isForbidden());
        setStatus(token, ownAppointment, "nao_compareceu", 0).andExpect(status().isForbidden());
    }

    @Test
    void receptionCannotStartOrFinishAnAttendance() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['agenda:ler','agenda:editar'] WHERE id = ?", role));
        setStatus(login(), ownAppointment, "em_atendimento", 0).andExpect(status().isForbidden());
    }

    @Test
    void doctorCannotCreateCancelRescheduleOrConfigure() throws Exception {
        String token = tokenFor(doctorUser);
        book(token, unit, professional, patient, procedure, start.plusHours(3), start.plusHours(3).plusMinutes(30)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/agendamentos/" + ownAppointment + "/cancelar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0)))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/agendamentos/" + ownAppointment + "/remarcar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 1, "versao", 0, "inicio", start.plusHours(3).toString(), "fim", start.plusHours(4).toString()))))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/bloqueios").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("inicio", start.plusHours(3).toString(), "fim", start.plusHours(4).toString(), "motivo", "x")))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/grades").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("profissionalId", professional, "diaSemana", 1, "inicio", "08:00", "fim", "12:00")))).andExpect(status().isForbidden());
    }

    @Test
    void doctorCannotReadWhatIsOutsideTheAgendaAtAll() throws Exception {
        String token = tokenFor(doctorUser);
        for (String path : new String[] {"/api/v1/profissionais", "/api/v1/especialidades", "/api/v1/usuarios", "/api/v1/papeis"}) {
            mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        }
    }

    // ---- helpers ----

    private ResultActions list(String token, UUID professionalId) throws Exception {
        return mvc.perform(get("/api/v1/agendamentos").header("Authorization", "Bearer " + token).param("profissionalId", professionalId.toString())
            .param("de", start.minusHours(1).toString()).param("ate", start.plusHours(6).toString()));
    }

    private ResultActions setStatus(String token, UUID appointment, String newStatus, int version) throws Exception {
        return changeStatus(token, "/api/v1/agendamentos/" + appointment + "/status", newStatus, version);
    }

    private ResultActions availability(String token, UUID professionalId, String day) throws Exception {
        return mvc.perform(get("/api/v1/agenda/disponibilidade").header("Authorization", "Bearer " + token)
            .param("profissionalId", professionalId.toString()).param("procedimentoId", procedure.toString()).param("de", day).param("ate", day));
    }

    private void block(String token, UUID professionalId, String reason) throws Exception {
        java.util.Map<String, Object> body = new java.util.HashMap<>(Map.of("inicio", start.withHour(13).toString(), "fim", start.withHour(14).toString(), "motivo", reason));
        if (professionalId != null) body.put("profissionalId", professionalId);
        mvc.perform(post("/api/v1/bloqueios").header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().isCreated());
    }
}
