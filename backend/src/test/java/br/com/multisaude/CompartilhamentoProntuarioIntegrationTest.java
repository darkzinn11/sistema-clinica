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
 * Evolução de colega só aparece se o administrador habilitou o par leitor -> autor (com direção, sem transitividade)
 * e se o leitor tem vínculo com o paciente. João pode ver o histórico de José sem que José veja o de Maria.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class CompartilhamentoProntuarioIntegrationTest extends AgendaTestBase {
    private record Doctor(UUID user, UUID professional) {}

    private Doctor joao, jose, maria;
    private UUID sharedPatient;
    private UUID joseEvolution;

    @BeforeEach
    void doctors() throws Exception {
        UUID roleId = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Médico compartilha', "
            + "ARRAY['agenda:ler_proprios','agenda:atender','pacientes:ler_vinculados','prontuario:ler','prontuario:escrever'])", roleId, tenant));
        joao = doctor("João", "9001", roleId);
        jose = doctor("José", "9002", roleId);
        maria = doctor("Maria", "9003", roleId);
        sharedPatient = newPatient("Paciente Em Comum");
        // João tem vínculo (consulta futura); José e Maria já atenderam e anotaram.
        appointment(joao, sharedPatient, "agendado", 10);
        joseEvolution = id(created(write(jose, appointment(jose, sharedPatient, "atendido", -24), "Evolução do José.")));
        write(maria, appointment(maria, sharedPatient, "atendido", -48), "Evolução da Maria.").andExpect(status().isCreated());
        write(joao, appointment(joao, sharedPatient, "em_atendimento", 0), "Evolução do João.").andExpect(status().isCreated());
    }

    @Test
    void byDefaultNobodyReadsAColleaguesEvolution() throws Exception {
        read(joao, sharedPatient).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].propria").value(true))
            .andExpect(content().string(Matchers.not(Matchers.containsString("do José"))))
            .andExpect(content().string(Matchers.not(Matchers.containsString("da Maria"))));
    }

    @Test
    void afterTheAdministratorEnablesIt_joaoSeesJosesButNotMarias() throws Exception {
        grant(joao, jose).andExpect(status().isCreated()).andExpect(jsonPath("leitorNome").value("Dr. João")).andExpect(jsonPath("autorNome").value("Dr. José"));
        read(joao, sharedPatient).andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[?(@.conteudo == 'Evolução do José.')].propria").value(Matchers.contains(false)))
            .andExpect(jsonPath("$[?(@.conteudo == 'Evolução do José.')].profissionalNome").value(Matchers.contains("Dr. José")))
            .andExpect(jsonPath("$[?(@.conteudo == 'Evolução do João.')].propria").value(Matchers.contains(true)))
            .andExpect(content().string(Matchers.not(Matchers.containsString("da Maria"))));
    }

    @Test
    void theGrantHasADirection_joseStillDoesNotSeeJoaos() throws Exception {
        grant(joao, jose).andExpect(status().isCreated());
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.agendamentos (tenant_id, unidade_id, profissional_id, paciente_id, procedimento_id, periodo, status) "
            + "VALUES (?, ?, ?, ?, ?, tstzrange(?, ?, '[)'), 'agendado')", tenant, unit, jose.professional(), sharedPatient, procedure,
            java.sql.Timestamp.from(start.plusHours(20).toInstant()), java.sql.Timestamp.from(start.plusHours(21).toInstant())));
        read(jose, sharedPatient).andExpect(jsonPath("$.length()").value(1)).andExpect(content().string(Matchers.not(Matchers.containsString("do João"))));
    }

    @Test
    void theGrantIsNotTransitive() throws Exception {
        grant(joao, jose).andExpect(status().isCreated());
        grant(jose, maria).andExpect(status().isCreated());
        read(joao, sharedPatient).andExpect(jsonPath("$.length()").value(2)).andExpect(content().string(Matchers.not(Matchers.containsString("da Maria"))));
        read(jose, sharedPatient).andExpect(jsonPath("$.length()").value(2)).andExpect(content().string(Matchers.containsString("da Maria")));
    }

    @Test
    void theGrantNeverOverridesTheNeedForAConnectionWithThePatient() throws Exception {
        UUID stranger = newPatient("Paciente Sem Vínculo Com João");
        write(jose, appointment(jose, stranger, "atendido", -72), "Anotação do José sobre outro paciente.").andExpect(status().isCreated());
        grant(joao, jose).andExpect(status().isCreated());
        read(joao, stranger).andExpect(jsonPath("$.length()").value(0)).andExpect(content().string(Matchers.not(Matchers.containsString("outro paciente"))));
    }

    @Test
    void revokingTakesEffectImmediatelyAndOnlyOnce() throws Exception {
        UUID grantId = id(created(grant(joao, jose).andExpect(status().isCreated())));
        read(joao, sharedPatient).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(delete("/api/v1/prontuario/compartilhamentos/" + grantId).header("Authorization", "Bearer " + login())).andExpect(status().isNoContent());
        read(joao, sharedPatient).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(delete("/api/v1/prontuario/compartilhamentos/" + grantId).header("Authorization", "Bearer " + login())).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/prontuario/compartilhamentos/" + UUID.randomUUID()).header("Authorization", "Bearer " + login())).andExpect(status().isNotFound());
        grant(joao, jose).andExpect(status().isCreated()); // pode ser habilitado de novo depois de revogado
    }

    @Test
    void readingAColleaguesEvolutionIsAuditedSeparately() throws Exception {
        grant(joao, jose).andExpect(status().isCreated());
        read(joao, sharedPatient).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> {
            assertEquals(1, jdbc.queryForObject("SELECT quantidade FROM clinica.acessos_prontuario WHERE usuario_id = ? AND acao = 'ver_evolucoes'", Integer.class, joao.user()));
            assertEquals(1, jdbc.queryForObject("SELECT quantidade FROM clinica.acessos_prontuario WHERE usuario_id = ? AND acao = 'ver_evolucoes_compartilhadas'", Integer.class, joao.user()));
            return null;
        });
    }

    @Test
    void enabledReaderStillCannotCorrectAColleaguesEvolution() throws Exception {
        grant(joao, jose).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/evolucoes/" + joseEvolution + "/corrigir").header("Authorization", "Bearer " + tokenFor(joao.user())).contentType("application/json")
            .content(json.writeValueAsString(Map.of("conteudo", "Adulterada pelo João")))).andExpect(status().isNotFound());
    }

    // ---- gestão das habilitações ----

    @Test
    void onlyTheAdministratorManagesGrants() throws Exception {
        String doctorToken = tokenFor(joao.user());
        mvc.perform(get("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + doctorToken)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + doctorToken).contentType("application/json")
            .content(json.writeValueAsString(Map.of("leitorProfissionalId", joao.professional(), "autorProfissionalId", maria.professional())))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/prontuario/compartilhamentos/" + UUID.randomUUID()).header("Authorization", "Bearer " + doctorToken)).andExpect(status().isForbidden());
    }

    @Test
    void rejectsInvalidDuplicateAndForeignGrants() throws Exception {
        grant(joao, joao).andExpect(status().isBadRequest());
        grant(joao, jose).andExpect(status().isCreated());
        grant(joao, jose).andExpect(status().isConflict());
        UUID noUser = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            insertProfessional(noUser, tenant, "Dr. Sem Usuário", "9999", unit);
            return null;
        });
        mvc.perform(post("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + login()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("leitorProfissionalId", noUser, "autorProfissionalId", jose.professional())))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + login()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("leitorProfissionalId", joao.professional(), "autorProfissionalId", otherProfessional)))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + login()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("leitorProfissionalId", UUID.randomUUID(), "autorProfissionalId", jose.professional())))).andExpect(status().isBadRequest());
    }

    @Test
    void listShowsActiveGrantsWithNamesAndCanIncludeTheHistory() throws Exception {
        UUID first = id(created(grant(joao, jose)));
        grant(maria, jose).andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/prontuario/compartilhamentos/" + first).header("Authorization", "Bearer " + login())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + login())).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].leitorNome").value("Dr. Maria"));
        mvc.perform(get("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + login()).param("incluirRevogados", "true"))
            .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[?(@.leitorNome == 'Dr. João')].revogadoEm").value(Matchers.contains(Matchers.notNullValue())));
    }

    @Test
    void grantsOfAnotherClinicAreNeverListed() throws Exception {
        transactions.inTenant(otherTenant, () -> {
            UUID foreignUser = UUID.randomUUID();
            UUID foreignReader = UUID.randomUUID();
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Alheio', ?, 'x')", foreignUser, otherTenant, "alheio-" + email);
            insertProfessional(foreignReader, otherTenant, "Dr. Leitor Alheio", "7001", otherUnitOfOtherTenant);
            jdbc.update("INSERT INTO clinica.compartilhamentos_prontuario (tenant_id, leitor_id, autor_id, criado_por) VALUES (?, ?, ?, ?)", otherTenant, foreignReader, otherProfessional, foreignUser);
            return null;
        });
        mvc.perform(get("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + login()))
            .andExpect(status().isOk()).andExpect(content().string(Matchers.not(Matchers.containsString("Alheio"))));
    }

    // ---- imutabilidade do histórico de habilitações ----

    @Test
    void aGrantCannotBeRepointedToAnotherDoctor() throws Exception {
        grant(joao, jose).andExpect(status().isCreated());
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("UPDATE clinica.compartilhamentos_prontuario SET autor_id = ?", maria.professional()));
            return null;
        });
    }

    @Test
    void aGrantCannotBeErased() throws Exception {
        grant(joao, jose).andExpect(status().isCreated());
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("DELETE FROM clinica.compartilhamentos_prontuario"));
            return null;
        });
    }

    // ---- helpers ----

    private Doctor doctor(String name, String council, UUID roleId) {
        UUID user = UUID.randomUUID();
        UUID professional = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, 'x')", user, tenant, "Dr. " + name, council + "-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, user, unit, roleId);
            jdbc.update("INSERT INTO clinica.profissionais (id, tenant_id, nome, conselho, conselho_num, conselho_uf, usuario_id) VALUES (?, ?, ?, 'CRM', ?, 'CE', ?)", professional, tenant, "Dr. " + name, council, user);
            jdbc.update("INSERT INTO clinica.profissional_unidades (tenant_id, profissional_id, unidade_id) VALUES (?, ?, ?)", tenant, professional, unit);
            return null;
        });
        return new Doctor(user, professional);
    }

    private ResultActions grant(Doctor reader, Doctor author) throws Exception {
        return mvc.perform(post("/api/v1/prontuario/compartilhamentos").header("Authorization", "Bearer " + login()).contentType("application/json")
            .content(json.writeValueAsString(Map.of("leitorProfissionalId", reader.professional(), "autorProfissionalId", author.professional()))));
    }

    private ResultActions read(Doctor reader, UUID patientId) throws Exception {
        return mvc.perform(get("/api/v1/pacientes/" + patientId + "/evolucoes").header("Authorization", "Bearer " + tokenFor(reader.user()))).andExpect(status().isOk());
    }

    private ResultActions write(Doctor author, UUID appointmentId, String text) throws Exception {
        return mvc.perform(post("/api/v1/agendamentos/" + appointmentId + "/evolucoes").header("Authorization", "Bearer " + tokenFor(author.user()))
            .contentType("application/json").content(json.writeValueAsString(Map.of("conteudo", text))));
    }

    private UUID appointment(Doctor doctor, UUID patientId, String status, int hourOffset) {
        return insertAppointmentFor(tenant, unit, doctor.professional(), patientId, procedure, status, start.plusHours(hourOffset), start.plusHours(hourOffset).plusMinutes(30));
    }

    private UUID newPatient(String name) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, ?)", id, tenant, name));
        return id;
    }
}
