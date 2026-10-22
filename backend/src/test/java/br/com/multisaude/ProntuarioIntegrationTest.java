package br.com.multisaude;

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
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Evolução é do médico que a escreveu: imutável, só o autor lê e corrige, e todo acesso a pacientes fica registrado.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class ProntuarioIntegrationTest extends AgendaTestBase {
    private final UUID doctorUser = UUID.randomUUID();
    private final UUID colleagueUser = UUID.randomUUID();
    private final UUID colleague = UUID.randomUUID();
    private UUID inProgress;

    @BeforeEach
    void doctors() {
        transactions.inTenant(tenant, () -> {
            UUID doctorRole = UUID.randomUUID();
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Médico prontuário', ARRAY['agenda:ler_proprios','agenda:atender','pacientes:ler_vinculados','prontuario:ler','prontuario:escrever'])", doctorRole, tenant);
            for (UUID u : new UUID[] {doctorUser, colleagueUser}) {
                jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, 'x')", u, tenant, "Médico " + u.toString().substring(0, 4), u + "-" + email);
                jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, u, unit, doctorRole);
            }
            jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctorUser, professional);
            insertProfessional(colleague, tenant, "Dr. Colega", "8888", unit);
            jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", colleagueUser, colleague);
            return null;
        });
        inProgress = appointment(professional, "em_atendimento", 0);
    }

    // ---- escrever ----

    @Test
    void doctorWritesAnEvolutionForAnAttendanceInProgressAndItIsRecorded() throws Exception {
        write(tokenFor(doctorUser), inProgress, "Paciente refere dor de cabeça há 3 dias.").andExpect(status().isCreated())
            .andExpect(jsonPath("conteudo").value("Paciente refere dor de cabeça há 3 dias.")).andExpect(jsonPath("vigente").value(true))
            .andExpect(jsonPath("substituiId").value(Matchers.nullValue())).andExpect(jsonPath("pacienteId").value(patient.toString()));
        transactions.inTenant(tenant, () -> {
            assertEquals(32, jdbc.queryForObject("SELECT octet_length(hash) FROM clinica.evolucoes", Integer.class));
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE acao = 'criar_evolucao' AND usuario_id = ?", Integer.class, doctorUser));
            return null;
        });
    }

    @Test
    void onlyAnAttendanceInProgressOrFinishedAcceptsEvolutions() throws Exception {
        String token = tokenFor(doctorUser);
        for (String status : new String[] {"agendado", "confirmado", "check_in", "cancelado", "nao_compareceu", "remarcado"}) {
            write(token, appointment(professional, status, 1 + Math.abs(status.hashCode() % 20)), "x").andExpect(status().isConflict());
        }
        write(token, appointment(professional, "atendido", 30), "Anotação após o atendimento.").andExpect(status().isCreated());
    }

    @Test
    void cannotWriteOnAColleaguesOrOtherUnitsOrUnknownAppointmentAndTheAnswerIsTheSame() throws Exception {
        String token = tokenFor(doctorUser);
        String own = "{\"conteudo\":\"x\"}";
        String colleagues = write(token, appointment(colleague, "em_atendimento", 0), "x").andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String elsewhere = write(token, insertAppointmentFor(tenant, otherUnit, professional, patient, procedure, "em_atendimento", start.plusHours(9), start.plusHours(9).plusMinutes(30)), "x")
            .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String unknown = write(token, UUID.randomUUID(), "x").andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        assertEquals(unknown, colleagues);
        assertEquals(unknown, elsewhere);
        assertNotNull(own);
    }

    @Test
    void rejectsBlankAndOversizedContent() throws Exception {
        String token = tokenFor(doctorUser);
        write(token, inProgress, "   ").andExpect(status().isBadRequest());
        write(token, inProgress, "a".repeat(20001)).andExpect(status().isBadRequest());
        write(token, inProgress, "a".repeat(20000)).andExpect(status().isCreated());
    }

    // ---- corrigir ----

    @Test
    void correctionCreatesANewVersionAndKeepsTheOriginal() throws Exception {
        String token = tokenFor(doctorUser);
        JsonNode first = created(write(token, inProgress, "Versão com erro."));
        JsonNode second = created(correct(token, id(first), "Versão corrigida.").andExpect(status().isCreated())
            .andExpect(jsonPath("substituiId").value(id(first).toString())).andExpect(jsonPath("vigente").value(true)));
        assertNotEquals(id(first), id(second));
        mvc.perform(get("/api/v1/pacientes/" + patient + "/evolucoes").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].conteudo").value("Versão com erro.")).andExpect(jsonPath("$[0].vigente").value(false))
            .andExpect(jsonPath("$[1].conteudo").value("Versão corrigida.")).andExpect(jsonPath("$[1].vigente").value(true));
        correct(token, id(first), "De novo na antiga.").andExpect(status().isConflict());
        correct(token, id(second), "Terceira versão.").andExpect(status().isCreated());
    }

    @Test
    void onlyTheAuthorCanCorrectAndOthersCannotTellItExists() throws Exception {
        JsonNode mine = created(write(tokenFor(doctorUser), inProgress, "Minha evolução."));
        String colleaguesTry = correct(tokenFor(colleagueUser), id(mine), "Alterada").andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        String unknown = correct(tokenFor(colleagueUser), UUID.randomUUID(), "Alterada").andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        assertEquals(unknown, colleaguesTry);
    }

    // ---- ler ----

    @Test
    void doctorNeverSeesAColleaguesEvolutionOfTheSamePatient() throws Exception {
        write(tokenFor(doctorUser), inProgress, "Anotação do Dr. Principal.").andExpect(status().isCreated());
        write(tokenFor(colleagueUser), appointment(colleague, "atendido", 5), "SEGREDO do colega sobre o mesmo paciente.").andExpect(status().isCreated());
        mvc.perform(get("/api/v1/pacientes/" + patient + "/evolucoes").header("Authorization", "Bearer " + tokenFor(doctorUser)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].conteudo").value("Anotação do Dr. Principal."))
            .andExpect(content().string(Matchers.not(Matchers.containsString("SEGREDO"))));
        mvc.perform(get("/api/v1/pacientes/" + patient + "/evolucoes").header("Authorization", "Bearer " + tokenFor(colleagueUser)))
            .andExpect(jsonPath("$.length()").value(1)).andExpect(content().string(Matchers.not(Matchers.containsString("Principal"))));
    }

    @Test
    void readingIsRecordedAndUnknownPatientsLeaveNoTraceAndNoError() throws Exception {
        String token = tokenFor(doctorUser);
        write(token, inProgress, "Uma evolução.").andExpect(status().isCreated());
        mvc.perform(get("/api/v1/pacientes/" + patient + "/evolucoes").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/pacientes/" + UUID.randomUUID() + "/evolucoes").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        transactions.inTenant(tenant, () -> {
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE acao = 'ver_evolucoes' AND usuario_id = ? AND quantidade = 1", Integer.class, doctorUser));
            return null;
        });
    }

    @Test
    void usersWithoutProntuarioPermissionOrProfessionalAreRefused() throws Exception {
        String admin = login();
        mvc.perform(get("/api/v1/pacientes/" + patient + "/evolucoes").header("Authorization", "Bearer " + admin)).andExpect(status().isForbidden());
        write(admin, inProgress, "x").andExpect(status().isForbidden());
        correct(admin, UUID.randomUUID(), "x").andExpect(status().isForbidden());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.profissionais SET usuario_id = NULL WHERE id = ?", professional));
        write(tokenFor(doctorUser), inProgress, "x").andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/pacientes/" + patient + "/evolucoes").header("Authorization", "Bearer " + tokenFor(doctorUser))).andExpect(status().isForbidden());
    }

    // ---- imutabilidade ----

    @Test
    void evolutionsCannotBeUpdatedByTheApplication() throws Exception {
        write(tokenFor(doctorUser), inProgress, "Original.").andExpect(status().isCreated());
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("UPDATE clinica.evolucoes SET conteudo = 'Adulterado'"));
            return null;
        });
    }

    @Test
    void evolutionsCannotBeDeletedByTheApplication() throws Exception {
        write(tokenFor(doctorUser), inProgress, "Original.").andExpect(status().isCreated());
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("DELETE FROM clinica.evolucoes"));
            return null;
        });
    }

    @Test
    void auditRecordsCannotBeChangedOrErased() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['pacientes:ler'] WHERE id = ?", role));
        mvc.perform(get("/api/v1/pacientes/" + patient).header("Authorization", "Bearer " + login())).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("DELETE FROM clinica.acessos_prontuario"));
            return null;
        });
    }

    @Test
    void immutabilityTriggersExistAsASecondLineOfDefense() {
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM pg_trigger WHERE tgname IN ('evolucoes_imutavel', 'acessos_prontuario_imutavel')", Integer.class));
    }

    // ---- auditoria de acesso a pacientes ----

    @Test
    void everyPatientReadIsAuditedWithWhoWhatAndWhen() throws Exception {
        UUID second = newPatient("Segundo Paciente");
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['pacientes:ler','auditoria:ler'] WHERE id = ?", role));
        String token = login();
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/pacientes/" + patient).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auditoria/acessos").header("Authorization", "Bearer " + token).param("usuarioId", user.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3)).andExpect(jsonPath("$[0].acao").value("ver_paciente"))
            .andExpect(jsonPath("$[0].usuarioNome").value("Usuário teste")).andExpect(jsonPath("$[0].pacienteId").value(patient.toString()));
        mvc.perform(get("/api/v1/auditoria/acessos").header("Authorization", "Bearer " + token).param("pacienteId", second.toString()))
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].acao").value("listar_pacientes"));
    }

    @Test
    void anUnauthorizedOrMissingPatientReadLeavesNoAuditTrailOfDataThatNeverLeft() throws Exception {
        mvc.perform(get("/api/v1/pacientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + tokenFor(doctorUser))).andExpect(status().isNotFound());
        transactions.inTenant(tenant, () -> {
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE usuario_id = ?", Integer.class, doctorUser));
            return null;
        });
    }

    @Test
    void auditIsOnlyForThoseWithPermissionAndNeverCrossesClinics() throws Exception {
        mvc.perform(get("/api/v1/auditoria/acessos").header("Authorization", "Bearer " + tokenFor(doctorUser))).andExpect(status().isForbidden());
        transactions.inTenant(otherTenant, () -> {
            UUID foreignUser = UUID.randomUUID();
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Usuário alheio', ?, 'x')", foreignUser, otherTenant, "alheio-" + email);
            jdbc.update("INSERT INTO clinica.acessos_prontuario (tenant_id, usuario_id, paciente_id, acao) VALUES (?, ?, ?, 'ver_paciente')", otherTenant, foreignUser, otherPatient);
            return null;
        });
        mvc.perform(get("/api/v1/auditoria/acessos").header("Authorization", "Bearer " + login())).andExpect(status().isOk())
            .andExpect(content().string(Matchers.not(Matchers.containsString("Usuário alheio"))));
    }

    // ---- helpers ----

    private ResultActions write(String token, UUID appointmentId, String text) throws Exception {
        return mvc.perform(post("/api/v1/agendamentos/" + appointmentId + "/evolucoes").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(Map.of("conteudo", text))));
    }

    private ResultActions correct(String token, UUID evolutionId, String text) throws Exception {
        return mvc.perform(post("/api/v1/evolucoes/" + evolutionId + "/corrigir").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(json.writeValueAsString(Map.of("conteudo", text))));
    }

    private UUID appointment(UUID professionalId, String status, int hourOffset) {
        return insertAppointmentFor(tenant, unit, professionalId, patient, procedure, status, start.plusHours(hourOffset), start.plusHours(hourOffset).plusMinutes(30));
    }

    private UUID newPatient(String name) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, ?)", id, tenant, name));
        return id;
    }
}
