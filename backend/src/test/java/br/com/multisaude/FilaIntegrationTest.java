package br.com.multisaude;

import java.util.HashMap;
import java.util.List;
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
 * Fila de senhas: o paciente pega a senha sem se identificar, a recepção chama no guichê e só então liga a senha ao
 * paciente por CPF (cadastrando antes, se for novo).
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class FilaIntegrationTest extends AgendaTestBase {
    private static final String CPF_A = "52998224725";
    private static final String CPF_B = "11144477735";
    private static final String CPF_C = "12345678909";

    private String admin;
    private String reception;
    private UUID receptionUser;
    private UUID con, conP, lab, exm;          // tipos
    private UUID g1, g2, g3;                   // g1: CON+EXM, g2: só preferencial, g3: só laboratório

    @BeforeEach
    void queueFixtures() throws Exception {
        UUID adminUser = userWith("Admin fila", "fila:ler", "fila:configurar");
        receptionUser = userWith("Recepção fila", "fila:ler", "fila:gerar", "fila:chamar", "pacientes:ler", "pacientes:criar");
        admin = tokenFor(adminUser);
        reception = tokenFor(receptionUser);
        con = type("Consulta", "CON", false);
        conP = type("Consulta Preferencial", "CON P", true);
        lab = type("Laboratório", "LAB", false);
        exm = type("Exames", "EXM", false);
        g1 = counter("Guichê 1", ref(con, 1), ref(exm, 2));
        g2 = counter("Guichê 2", ref(conP, 1));
        g3 = counter("Guichê 3", ref(lab, 1));
    }

    // ---- configuração ----

    @Test
    void administratorConfiguresTypesAndCounters() throws Exception {
        mvc.perform(get("/api/v1/tipos-senha").header("Authorization", "Bearer " + reception)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
        mvc.perform(get("/api/v1/guiches").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("$.length()").value(3))
            .andExpect(jsonPath("$[?(@.nome == 'Guichê 2')].tipos[0].tipoNome").value(Matchers.contains("Consulta Preferencial")));
        mvc.perform(put("/api/v1/tipos-senha/" + exm).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Exames de imagem", "prefixo", "IMG", "preferencial", false, "ativo", true))))
            .andExpect(status().isOk()).andExpect(jsonPath("prefixo").value("IMG"));
        mvc.perform(put("/api/v1/guiches/" + g1).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Guichê 1", "tipos", List.of(ref(conP, 1))))))
            .andExpect(status().isOk()).andExpect(jsonPath("tipos.length()").value(1)).andExpect(jsonPath("tipos[0].tipoNome").value("Consulta Preferencial"));
    }

    @Test
    void rejectsInvalidTypesAndCounters() throws Exception {
        for (String prefix : new String[] {"con", "CON1", "C", " CON", "CON ", "CONSULTAS"}) {
            // "C" é válido (uma letra); os demais não.
            ResultActions result = createType("Teste " + prefix, prefix, false);
            if (prefix.equals("C")) result.andExpect(status().isCreated()); else result.andExpect(status().isBadRequest());
        }
        createType(" ", "XX", false).andExpect(status().isBadRequest());
        createCounter("Guichê X", List.of()).andExpect(status().isBadRequest());
        createCounter("Guichê X", List.of(ref(UUID.randomUUID(), 1))).andExpect(status().isBadRequest());
        createCounter("Guichê X", List.of(ref(con, 1), ref(con, 2))).andExpect(status().isBadRequest());
        createCounter("Guichê X", List.of(ref(con, 0))).andExpect(status().isBadRequest());
    }

    @Test
    void onlyTheAdministratorConfiguresAndEveryoneElseIsRefused() throws Exception {
        createTypeAs(reception, "Novo", "NOV", false).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/guiches").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "X", "tipos", List.of(ref(con, 1)))))).andExpect(status().isForbidden());
        // O administrador configura e consulta, mas não opera a fila.
        mvc.perform(post("/api/v1/senhas").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("tipoId", con)))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/guiches/" + g1 + "/chamar-proxima").header("Authorization", "Bearer " + admin)).andExpect(status().isForbidden());
        // O médico não tem acesso à fila.
        UUID doctor = userWith("Médico sem fila", "agenda:ler_proprios", "pacientes:ler_vinculados");
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + tokenFor(doctor))).andExpect(status().isForbidden());
    }

    @Test
    void duplicateNameOrPrefixIsAConflict() throws Exception {
        createType("Outro nome", "CON", false).andExpect(status().isConflict());
    }

    // ---- gerar senha ----

    @Test
    void numbersAreSequentialPerTypeAndIndependentBetweenTypes() throws Exception {
        generate(con).andExpect(status().isCreated()).andExpect(jsonPath("codigo").value("CON1")).andExpect(jsonPath("status").value("aguardando"))
            .andExpect(jsonPath("pacienteId").value(Matchers.nullValue()));
        generate(con).andExpect(jsonPath("codigo").value("CON2"));
        generate(conP).andExpect(jsonPath("codigo").value("CON P1")).andExpect(jsonPath("preferencial").value(true));
        generate(lab).andExpect(jsonPath("codigo").value("LAB1"));
        generate(con).andExpect(jsonPath("codigo").value("CON3"));
    }

    @Test
    void numberingStartsOverEachDay() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.contadores_senha(tenant_id, unidade_id, tipo_id, dia, ultimo) VALUES (?, ?, ?, current_date - 1, 57)", tenant, unit, con));
        generate(con).andExpect(jsonPath("codigo").value("CON1"));
    }

    @Test
    void rejectsUnknownOrInactiveTypes() throws Exception {
        generate(UUID.randomUUID()).andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/tipos-senha/" + exm).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Exames", "prefixo", "EXM", "preferencial", false, "ativo", false)))).andExpect(status().isOk());
        generate(exm).andExpect(status().isBadRequest());
    }

    // ---- fila e chamada ----

    @Test
    void queueListsWaitingInArrivalOrderWithoutAnyPersonalData() throws Exception {
        generate(con); generate(lab); generate(con); generate(conP);
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception)).andExpect(status().isOk())
            .andExpect(jsonPath("total").value(4)).andExpect(jsonPath("aguardando[*].codigo", Matchers.contains("CON1", "LAB1", "CON2", "CON P1")))
            .andExpect(jsonPath("ultimasChamadas.length()").value(0))
            .andExpect(jsonPath("aguardando[0].pacienteId").value(Matchers.nullValue()));
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception).param("tipoId", con.toString()))
            .andExpect(jsonPath("aguardando.length()").value(2)).andExpect(jsonPath("total").value(4));
    }

    @Test
    void aCounterOnlySeesAndCallsTheTypesItServes() throws Exception {
        generate(con); generate(conP); generate(lab); generate(con);
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception).param("guicheId", g2.toString()))
            .andExpect(jsonPath("aguardando[*].codigo", Matchers.contains("CON P1")));
        callNext(g2).andExpect(status().isOk()).andExpect(jsonPath("codigo").value("CON P1")).andExpect(jsonPath("status").value("chamada"))
            .andExpect(jsonPath("guicheNome").value("Guichê 2")).andExpect(jsonPath("chamadas").value(1));
        // O guichê do laboratório só chama LAB: esgotada a LAB1, as senhas de consulta que seguem esperando não são dele.
        callNext(g3).andExpect(status().isOk()).andExpect(jsonPath("codigo").value("LAB1"));
        finish(currentId(g3));
        callNext(g3).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("total").value(2));
    }

    @Test
    void callsFollowArrivalOrderWithinACounterAndTheConfiguredOrderBetweenTypes() throws Exception {
        generate(con); generate(con);
        callNext(g1).andExpect(jsonPath("codigo").value("CON1"));
        UUID first = currentId(g1);
        finish(first);
        callNext(g1).andExpect(jsonPath("codigo").value("CON2"));
        // Guichê que lista preferencial antes do comum chama o preferencial mesmo que o comum seja mais antigo.
        UUID mixed = counter("Guichê misto", ref(conP, 1), ref(con, 2));
        generate(con); generate(conP);
        callNext(mixed).andExpect(jsonPath("codigo").value("CON P1"));
    }

    @Test
    void aCounterHandlesOneTicketAtATime() throws Exception {
        generate(con); generate(con);
        callNext(g1).andExpect(status().isOk());
        callNext(g1).andExpect(status().isConflict());
        UUID current = currentId(g1);
        finish(current);
        callNext(g1).andExpect(status().isOk()).andExpect(jsonPath("codigo").value("CON2"));
    }

    @Test
    void noWaitingTicketIsNotFoundAndInactiveOrForeignCountersToo() throws Exception {
        callNext(g1).andExpect(status().isNotFound());
        callNext(UUID.randomUUID()).andExpect(status().isNotFound());
        UUID elsewhere = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.guiches(id, tenant_id, unidade_id, nome) VALUES (?, ?, ?, 'Guichê da outra unidade')", elsewhere, tenant, otherUnit));
        callNext(elsewhere).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/guiches/" + g1).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Guichê 1", "ativo", false, "tipos", List.of(ref(con, 1)))))).andExpect(status().isOk());
        generate(con);
        callNext(g1).andExpect(status().isNotFound());
    }

    @Test
    void aSpecificTicketCanBeCalledFromTheListIfTheCounterServesItsType() throws Exception {
        UUID second = ticketId(generate(con), generate(con));
        call(second, g1).andExpect(status().isOk()).andExpect(jsonPath("codigo").value("CON2"));
        // Já chamada: não está mais aguardando. Guichê ocupado: 409.
        call(second, g1).andExpect(status().isConflict());
        UUID labTicket = id(created(generate(lab)));
        call(labTicket, g2).andExpect(status().isBadRequest());
        call(UUID.randomUUID(), g1).andExpect(status().isNotFound());
        call(labTicket, g3).andExpect(status().isOk());
    }

    @Test
    void yesterdaysTicketCannotBeCalledToday() throws Exception {
        UUID stale = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.senhas(id, tenant_id, unidade_id, tipo_id, dia, numero, codigo) VALUES (?, ?, ?, ?, current_date - 1, 9, 'CON9')", stale, tenant, unit, con));
        call(stale, g1).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("total").value(0));
        callNext(g1).andExpect(status().isNotFound());
    }

    @Test
    void leftoverActiveTicketFromAnotherDayDoesNotLockTheCounter() throws Exception {
        UUID stale = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.senhas(id, tenant_id, unidade_id, tipo_id, dia, numero, codigo, status, guiche_id) VALUES (?, ?, ?, ?, current_date - 1, 9, 'CON9', 'chamada', ?)", stale, tenant, unit, con, g1));
        generate(con);
        callNext(g1).andExpect(status().isOk()).andExpect(jsonPath("codigo").value("CON1"));
        transactions.inTenant(tenant, () -> {
            assertEquals("ausente", jdbc.queryForObject("SELECT status FROM clinica.senhas WHERE id = ?", String.class, stale));
            return null;
        });
    }

    @Test
    void recallCountsAndOnlyAppliesToACalledTicket() throws Exception {
        UUID ticket = id(created(generate(con)));
        mvc.perform(post("/api/v1/senhas/" + ticket + "/rechamar").header("Authorization", "Bearer " + reception)).andExpect(status().isConflict());
        callNext(g1).andExpect(status().isOk());
        mvc.perform(post("/api/v1/senhas/" + ticket + "/rechamar").header("Authorization", "Bearer " + reception)).andExpect(status().isOk()).andExpect(jsonPath("chamadas").value(2));
        mvc.perform(post("/api/v1/senhas/" + ticket + "/rechamar").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("chamadas").value(3));
        mvc.perform(get("/api/v1/guiches/" + g1 + "/atual").header("Authorization", "Bearer " + reception)).andExpect(status().isOk()).andExpect(jsonPath("codigo").value("CON1"));
        mvc.perform(get("/api/v1/guiches/" + g2 + "/atual").header("Authorization", "Bearer " + reception)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("ultimasChamadas[0].codigo").value("CON1"));
    }

    // ---- identificar paciente por CPF ----

    @Test
    void identifyingByCpfAttachesAnExistingPatient() throws Exception {
        UUID patientId = patientWithCpf("Maria Ficticia", CPF_A);
        UUID ticket = calledTicket(con);
        mvc.perform(post("/api/v1/senhas/" + ticket + "/identificar").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("cpf", "529.982.247-25")))).andExpect(status().isOk())
            .andExpect(jsonPath("senha.status").value("em_atendimento")).andExpect(jsonPath("senha.pacienteId").value(patientId.toString()))
            .andExpect(jsonPath("paciente.nome").value("Maria Ficticia"));
        transactions.inTenant(tenant, () -> {
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE usuario_id = ? AND paciente_id = ? AND acao = 'ver_paciente'", Integer.class, receptionUser, patientId));
            return null;
        });
    }

    @Test
    void anUnknownCpfLeavesTheTicketCalledSoTheAttendantCanRegister() throws Exception {
        UUID ticket = calledTicket(con);
        identify(ticket, CPF_B).andExpect(status().isNotFound()).andExpect(jsonPath("erro").value("Paciente não cadastrado com este CPF."));
        mvc.perform(get("/api/v1/guiches/" + g1 + "/atual").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("status").value("chamada"));
    }

    @Test
    void aMistypedCpfIsRefusedInsteadOfLookingLikeANewPatient() throws Exception {
        UUID ticket = calledTicket(con);
        identify(ticket, "52998224726").andExpect(status().isBadRequest());
        identify(ticket, "111.111.111-11").andExpect(status().isBadRequest());
        identify(ticket, "123").andExpect(status().isBadRequest());
    }

    @Test
    void cpfLookupOnlyWorksForACalledTicketSoCpfsCannotBeProbed() throws Exception {
        patientWithCpf("Alguem Ficticio", CPF_A);
        UUID waiting = id(created(generate(con)));
        identify(waiting, CPF_A).andExpect(status().isConflict()).andExpect(content().string(Matchers.not(Matchers.containsString("Alguem"))));
        UUID done = calledTicket(exm);
        mvc.perform(post("/api/v1/senhas/" + done + "/finalizar").header("Authorization", "Bearer " + reception)).andExpect(status().isOk());
        identify(done, CPF_A).andExpect(status().isConflict());
    }

    @Test
    void aWrongPatientCanBeCorrectedAndEveryAttemptIsAudited() throws Exception {
        UUID wrong = patientWithCpf("Paciente Errado", CPF_A);
        UUID right = patientWithCpf("Paciente Certo", CPF_B);
        UUID ticket = calledTicket(con);
        identify(ticket, CPF_A).andExpect(status().isOk());
        identify(ticket, CPF_B).andExpect(status().isOk()).andExpect(jsonPath("senha.pacienteId").value(right.toString()));
        transactions.inTenant(tenant, () -> {
            assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE usuario_id = ? AND paciente_id IN (?, ?)", Integer.class, receptionUser, wrong, right));
            return null;
        });
    }

    @Test
    void anInactivePatientIsNotFoundByCpf() throws Exception {
        UUID inactive = patientWithCpf("Inativo Ficticio", CPF_A);
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.pacientes SET ativo = false WHERE id = ?", inactive));
        identify(calledTicket(con), CPF_A).andExpect(status().isNotFound());
    }

    @Test
    void registeringAndAttachingHappenTogether() throws Exception {
        UUID ticket = calledTicket(con);
        JsonNode result = created(register(ticket, Map.of("nome", "Paciente Novo Ficticio", "cpf", CPF_C, "celular", "85999990000")).andExpect(status().isCreated())
            .andExpect(jsonPath("senha.status").value("em_atendimento")).andExpect(jsonPath("paciente.cpf").value(CPF_C)));
        assertEquals(result.get("paciente").get("id").asString(), result.get("senha").get("pacienteId").asString());
        // Agora o CPF existe: identificar outra senha por ele encontra o mesmo paciente.
        UUID next = calledTicketAt(g2, conP);
        identify(next, CPF_C).andExpect(status().isOk()).andExpect(jsonPath("paciente.id").value(result.get("paciente").get("id").asString()));
    }

    @Test
    void registeringRejectsAnInvalidCpfAndATicketThatAlreadyHasAPatient() throws Exception {
        UUID ticket = calledTicket(con);
        register(ticket, Map.of("nome", "Cpf Errado", "cpf", "52998224726")).andExpect(status().isBadRequest());
        register(ticket, Map.of("nome", "Sem CPF Ficticio")).andExpect(status().isCreated());
        register(ticket, Map.of("nome", "Outro", "cpf", CPF_B)).andExpect(status().isConflict());
        UUID waiting = id(created(generate(exm)));
        register(waiting, Map.of("nome", "Sem chamar")).andExpect(status().isConflict());
    }

    @Test
    void registeringAnExistingCpfIsAConflict() throws Exception {
        patientWithCpf("Ja Existe", CPF_A);
        register(calledTicket(con), Map.of("nome", "Duplicado", "cpf", CPF_A)).andExpect(status().isConflict());
    }

    @Test
    void identifyingNeedsPatientPermissionAndRegisteringNeedsCreatePermission() throws Exception {
        UUID onlyCalls = userWith("Só chama", "fila:ler", "fila:chamar");
        UUID ticket = calledTicket(con);
        String token = tokenFor(onlyCalls);
        mvc.perform(post("/api/v1/senhas/" + ticket + "/identificar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("cpf", CPF_A)))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/senhas/" + ticket + "/cadastrar-paciente").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "X")))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/senhas/" + ticket + "/finalizar").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @Test
    void theQueueNeverExposesPatientNamesOrCpfs() throws Exception {
        patientWithCpf("Nome Que Nao Pode Vazar", CPF_A);
        UUID ticket = calledTicket(con);
        identify(ticket, CPF_A).andExpect(status().isOk());
        for (String path : new String[] {"/api/v1/senhas/fila", "/api/v1/guiches/" + g1 + "/atual", "/api/v1/guiches"}) {
            mvc.perform(get(path).header("Authorization", "Bearer " + reception)).andExpect(status().isOk())
                .andExpect(content().string(Matchers.not(Matchers.containsString("Nome Que Nao Pode Vazar")))).andExpect(content().string(Matchers.not(Matchers.containsString(CPF_A))));
        }
    }

    // ---- encerrar ----

    @Test
    void finishingAbsentAndCancellingFreeTheCounterAndAreFinal() throws Exception {
        UUID t1 = calledTicket(con);
        mvc.perform(post("/api/v1/senhas/" + t1 + "/ausente").header("Authorization", "Bearer " + reception)).andExpect(status().isOk()).andExpect(jsonPath("status").value("ausente"));
        UUID t2 = calledTicket(con);
        mvc.perform(post("/api/v1/senhas/" + t2 + "/finalizar").header("Authorization", "Bearer " + reception)).andExpect(status().isOk()).andExpect(jsonPath("status").value("finalizada"));
        UUID t3 = calledTicket(con);
        cancel(t3, "Paciente desistiu").andExpect(status().isOk()).andExpect(jsonPath("status").value("cancelada"));
        for (UUID ended : new UUID[] {t1, t2, t3}) {
            mvc.perform(post("/api/v1/senhas/" + ended + "/finalizar").header("Authorization", "Bearer " + reception)).andExpect(status().isConflict());
            cancel(ended, "De novo").andExpect(status().isConflict());
        }
        callNext(g1).andExpect(status().isNotFound()); // fila vazia, mas o guichê está livre
    }

    @Test
    void absentOnlyAppliesToACalledTicketAndCancelNeedsAReason() throws Exception {
        UUID waiting = id(created(generate(con)));
        mvc.perform(post("/api/v1/senhas/" + waiting + "/ausente").header("Authorization", "Bearer " + reception)).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/senhas/" + waiting + "/finalizar").header("Authorization", "Bearer " + reception)).andExpect(status().isConflict());
        cancel(waiting, " ").andExpect(status().isBadRequest());
        cancel(waiting, "x".repeat(201)).andExpect(status().isBadRequest());
        cancel(waiting, "Gerada por engano").andExpect(status().isOk());
        transactions.inTenant(tenant, () -> {
            assertEquals(receptionUser, jdbc.queryForObject("SELECT cancelada_por FROM clinica.senhas WHERE id = ?", UUID.class, waiting));
            assertEquals("Gerada por engano", jdbc.queryForObject("SELECT cancelada_motivo FROM clinica.senhas WHERE id = ?", String.class, waiting));
            return null;
        });
    }

    // ---- unidade e clínica ----

    @Test
    void ticketsOfAnotherUnitOrClinicAreNeverReachable() throws Exception {
        UUID elsewhereType = UUID.randomUUID();
        UUID inOtherUnit = UUID.randomUUID();
        UUID inOtherTenant = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.senhas(id, tenant_id, unidade_id, tipo_id, dia, numero, codigo) VALUES (?, ?, ?, ?, current_date, 1, 'CON1')", inOtherUnit, tenant, otherUnit, con));
        transactions.inTenant(otherTenant, () -> {
            jdbc.update("INSERT INTO clinica.tipos_senha(id, tenant_id, nome, prefixo) VALUES (?, ?, 'Alheio', 'ALH')", elsewhereType, otherTenant);
            jdbc.update("INSERT INTO clinica.senhas(id, tenant_id, unidade_id, tipo_id, dia, numero, codigo) VALUES (?, ?, ?, ?, current_date, 1, 'ALH1')", inOtherTenant, otherTenant, otherUnitOfOtherTenant, elsewhereType);
            return null;
        });
        for (UUID target : new UUID[] {inOtherUnit, inOtherTenant}) {
            call(target, g1).andExpect(status().isNotFound());
            mvc.perform(post("/api/v1/senhas/" + target + "/rechamar").header("Authorization", "Bearer " + reception)).andExpect(status().isNotFound());
            mvc.perform(post("/api/v1/senhas/" + target + "/finalizar").header("Authorization", "Bearer " + reception)).andExpect(status().isNotFound());
            identify(target, CPF_A).andExpect(status().isNotFound());
            cancel(target, "x").andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/v1/senhas/fila").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("total").value(0))
            .andExpect(content().string(Matchers.not(Matchers.containsString("ALH1"))));
        mvc.perform(get("/api/v1/tipos-senha").header("Authorization", "Bearer " + reception)).andExpect(content().string(Matchers.not(Matchers.containsString("Alheio"))));
    }

    // ---- garantias do banco ----

    @Test
    void theDatabaseRefusesTwoActiveTicketsAtTheSameCounter() {
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.senhas(tenant_id, unidade_id, tipo_id, dia, numero, codigo, status, guiche_id) VALUES (?, ?, ?, current_date, 1, 'CON1', 'chamada', ?)", tenant, unit, con, g1);
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO clinica.senhas(tenant_id, unidade_id, tipo_id, dia, numero, codigo, status, guiche_id) VALUES (?, ?, ?, current_date, 2, 'CON2', 'chamada', ?)", tenant, unit, con, g1));
            return null;
        });
    }

    @Test
    void theDatabaseRefusesAStatusThatDoesNotMatchTheData() {
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO clinica.senhas(tenant_id, unidade_id, tipo_id, dia, numero, codigo, status) VALUES (?, ?, ?, current_date, 1, 'CON1', 'em_atendimento')", tenant, unit, con));
            return null;
        });
    }

    @Test
    void theDatabaseRefusesCancellingWithoutWhoAndWhy() {
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO clinica.senhas(tenant_id, unidade_id, tipo_id, dia, numero, codigo, status) VALUES (?, ?, ?, current_date, 1, 'CON1', 'cancelada')", tenant, unit, con));
            return null;
        });
    }

    @Test
    void patientsRouteAlsoRefusesAnInvalidCpf() throws Exception {
        mvc.perform(post("/api/v1/pacientes").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Cpf Ruim", "cpf", "52998224726")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/pacientes").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Cpf Bom", "cpf", CPF_A)))).andExpect(status().isCreated());
    }

    // ---- helpers ----

    private UUID userWith(String name, String... permissions) {
        UUID roleId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, ?, ?)", roleId, tenant, name, permissions);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, 'x')", userId, tenant, name, userId + "-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, userId, unit, roleId);
            return null;
        });
        return userId;
    }

    private Map<String, Object> ref(UUID typeId, int order) {
        return Map.of("tipoId", typeId, "ordem", order);
    }

    private UUID type(String name, String prefix, boolean preferential) throws Exception {
        return id(created(createType(name, prefix, preferential).andExpect(status().isCreated())));
    }

    private ResultActions createType(String name, String prefix, boolean preferential) throws Exception {
        return createTypeAs(admin, name, prefix, preferential);
    }

    private ResultActions createTypeAs(String token, String name, String prefix, boolean preferential) throws Exception {
        return mvc.perform(post("/api/v1/tipos-senha").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", name, "prefixo", prefix, "preferencial", preferential))));
    }

    private UUID counter(String name, Map<String, Object>... types) throws Exception {
        return id(created(createCounter(name, List.of(types)).andExpect(status().isCreated())));
    }

    private ResultActions createCounter(String name, List<Map<String, Object>> types) throws Exception {
        return mvc.perform(post("/api/v1/guiches").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", name, "tipos", types))));
    }

    private ResultActions generate(UUID typeId) throws Exception {
        return mvc.perform(post("/api/v1/senhas").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("tipoId", typeId))));
    }

    private ResultActions callNext(UUID counterId) throws Exception {
        return mvc.perform(post("/api/v1/guiches/" + counterId + "/chamar-proxima").header("Authorization", "Bearer " + reception));
    }

    private ResultActions call(UUID ticketId, UUID counterId) throws Exception {
        return mvc.perform(post("/api/v1/senhas/" + ticketId + "/chamar").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("guicheId", counterId))));
    }

    private UUID currentId(UUID counterId) throws Exception {
        return id(created(mvc.perform(get("/api/v1/guiches/" + counterId + "/atual").header("Authorization", "Bearer " + reception)).andExpect(status().isOk())));
    }

    private void finish(UUID ticketId) throws Exception {
        mvc.perform(post("/api/v1/senhas/" + ticketId + "/finalizar").header("Authorization", "Bearer " + reception)).andExpect(status().isOk());
    }

    private UUID ticketId(ResultActions... generated) throws Exception {
        return id(created(generated[generated.length - 1]));
    }

    private UUID calledTicket(UUID typeId) throws Exception {
        UUID counterId = typeId.equals(exm) ? g1 : g1;
        return calledTicketAt(counterId, typeId);
    }

    private UUID calledTicketAt(UUID counterId, UUID typeId) throws Exception {
        UUID ticket = id(created(generate(typeId)));
        call(ticket, counterId).andExpect(status().isOk());
        return ticket;
    }

    private ResultActions identify(UUID ticketId, String cpf) throws Exception {
        return mvc.perform(post("/api/v1/senhas/" + ticketId + "/identificar").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("cpf", cpf))));
    }

    private ResultActions register(UUID ticketId, Map<String, Object> patient) throws Exception {
        return mvc.perform(post("/api/v1/senhas/" + ticketId + "/cadastrar-paciente").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(new HashMap<>(patient))));
    }

    private ResultActions cancel(UUID ticketId, String reason) throws Exception {
        return mvc.perform(post("/api/v1/senhas/" + ticketId + "/cancelar").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivo", reason))));
    }

    private UUID patientWithCpf(String name, String cpf) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, cpf) VALUES (?, ?, ?, ?)", id, tenant, name, cpf));
        return id;
    }
}
