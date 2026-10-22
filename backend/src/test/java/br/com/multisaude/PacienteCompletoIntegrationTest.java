package br.com.multisaude;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** V29: cadastro de paciente no padrão do Feegow (campos, regras, prontuário, histórico, inativação, busca, duplicados, listas). */
class PacienteCompletoIntegrationTest extends AgendaTestBase {
    private static final String CPF_A = "11144477735", CPF_B = "52998224725", CPF_C = "39053344705";

    private String admin() throws Exception {
        return tokenFor(userWith("Admin pacientes", "pacientes:ler", "pacientes:criar", "pacientes:editar", "pacientes:inativar"));
    }

    private String creatorOnly() throws Exception {
        return tokenFor(userWith("Só cadastra", "pacientes:criar"));
    }

    private Map<String, Object> form(String name, String cpf) {
        Map<String, Object> m = new HashMap<>();
        m.put("nome", name);
        m.put("cpf", cpf);
        m.put("celular", "85999990000");
        return m;
    }

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String token, Object body) throws Exception {
        var r = request.header("Authorization", "Bearer " + token);
        return mvc.perform(body == null ? r : r.contentType("application/json").content(json.writeValueAsString(body)));
    }

    private ResultActions create(String token, Map<String, Object> body) throws Exception { return send(post("/api/v1/pacientes"), token, body); }
    private ResultActions update(String token, UUID id, Map<String, Object> body) throws Exception { return send(put("/api/v1/pacientes/" + id), token, body); }
    /** Os parâmetros da consulta vão como valores literais (sem recodificar), para testar acento, "%" e espaço. */
    private ResultActions read(String token, String path) throws Exception {
        String[] parts = path.split("\\?", 2);
        var request = get("/api/v1/pacientes" + parts[0]).header("Authorization", "Bearer " + token);
        if (parts.length == 2) for (String pair : parts[1].split("&")) {
            String[] kv = pair.split("=", 2);
            request = request.param(kv[0], kv.length == 2 ? kv[1] : "");
        }
        return mvc.perform(request);
    }

    private UUID newPatient(String token, Map<String, Object> body) throws Exception {
        return UUID.fromString(created(create(token, body).andExpect(status().isCreated())).get("id").asString());
    }

    /** O PostgreSQL aborta a transação do teste após um erro: a chamada recusada roda num ponto de salvamento. */
    private void refused(String name, org.springframework.test.web.servlet.ResultMatcher expected, ThrowingCall call) throws Exception {
        jdbc.execute("SAVEPOINT " + name);
        call.run().andExpect(expected);
        jdbc.execute("ROLLBACK TO SAVEPOINT " + name);
    }

    private interface ThrowingCall { ResultActions run() throws Exception; }

    // ---- cadastro completo ----

    @Test
    void createsTheCompleteRecordAndReturnsEveryField() throws Exception {
        String token = admin();
        Map<String, Object> body = form("Maria Ficticia da Silva", CPF_A);
        body.putAll(Map.ofEntries(Map.entry("nomeSocial", "Mari"), Map.entry("nascimento", "1985-04-12"), Map.entry("sexo", "Feminino"),
            Map.entry("corIdentificacao", "#FF8800"), Map.entry("alturaCm", 170), Map.entry("pesoKg", 72.3), Map.entry("celular2", "85988880000"),
            Map.entry("telefone", "8532220000"), Map.entry("email", "MARIA@Example.invalid"), Map.entry("email2", "outro@example.invalid"),
            Map.entry("cep", "60000-000"), Map.entry("logradouro", "Rua Ficticia"), Map.entry("numeroEndereco", "100"), Map.entry("bairro", "Centro"),
            Map.entry("cidade", "Fortaleza"), Map.entry("estado", "ce"), Map.entry("profissao", "Professora"), Map.entry("escolaridade", "Superior"),
            Map.entry("naturalidade", "Fortaleza"), Map.entry("estadoCivil", "Casada"), Map.entry("nacionalidade", "Brasileira"), Map.entry("rg", "2005001"),
            Map.entry("indicacao", "Vizinha"), Map.entry("religiao", "Católica"), Map.entry("cns", "123456789012345"), Map.entry("corPele", "Parda"),
            Map.entry("observacoes", "Alergia a dipirona"), Map.entry("avisoAtivo", true), Map.entry("avisoTexto", "Chamar pelo nome social")));
        create(token, body).andExpect(status().isCreated())
            .andExpect(jsonPath("nome").value("Maria Ficticia da Silva")).andExpect(jsonPath("cpf").value(CPF_A)).andExpect(jsonPath("semCpf").value(false))
            .andExpect(jsonPath("email").value("maria@example.invalid")).andExpect(jsonPath("cep").value("60000000")).andExpect(jsonPath("estado").value("CE"))
            .andExpect(jsonPath("pais").value("Brasil")).andExpect(jsonPath("corIdentificacao").value("#FF8800")).andExpect(jsonPath("rg").value("2005001"))
            .andExpect(jsonPath("cns").value("123456789012345")).andExpect(jsonPath("observacoes").value("Alergia a dipirona"))
            .andExpect(jsonPath("avisoAtivo").value(true)).andExpect(jsonPath("avisoTexto").value("Chamar pelo nome social"))
            .andExpect(jsonPath("imc").value(25.0)).andExpect(jsonPath("numeroProntuario").value(1)).andExpect(jsonPath("ativo").value(true));
    }

    @Test
    void theRecordNumberIsSequentialPerClinicAndIgnoresWhatTheClientSends() throws Exception {
        String token = admin();
        Map<String, Object> first = form("Primeira Ficticia", CPF_A);
        first.put("numeroProntuario", 999);
        create(token, first).andExpect(jsonPath("numeroProntuario").value(1));
        create(token, form("Segunda Ficticia", CPF_B)).andExpect(jsonPath("numeroProntuario").value(2));
        // Outra clínica começa do 1.
        transactions.inTenant(otherTenant, () -> {
            jdbc.update("INSERT INTO clinica.prontuario_contador (tenant_id, ultimo) VALUES (?, 41)", otherTenant);
            return null;
        });
        transactions.inTenant(tenant, () -> {
            Long mine = jdbc.queryForObject("SELECT ultimo FROM clinica.prontuario_contador", Long.class);
            org.junit.jupiter.api.Assertions.assertEquals(2L, mine);   // a linha da outra clínica não aparece
            return null;
        });
    }

    @Test
    void aFailedRegistrationDoesNotBurnARecordNumber() throws Exception {
        String token = admin();
        create(token, form("Primeira Ficticia", CPF_A)).andExpect(jsonPath("numeroProntuario").value(1));
        refused("duplicado", status().isConflict(), () -> create(token, form("Mesmo CPF", CPF_A)));
        create(token, form("Terceira Ficticia", CPF_B)).andExpect(jsonPath("numeroProntuario").value(2));
    }

    @Test
    void theCompleteFormNeedsCpfOrNoCpfOrForeignerAndAMobile() throws Exception {
        String token = admin();
        create(token, form("Sem nada", null)).andExpect(status().isBadRequest())
            .andExpect(jsonPath("erro").value("Informe o CPF, marque \"sem CPF\" ou marque estrangeiro."));
        Map<String, Object> both = form("Os dois", CPF_A);
        both.put("semCpf", true);
        create(token, both).andExpect(status().isBadRequest());
        Map<String, Object> noMobile = form("Sem celular", CPF_A);
        noMobile.remove("celular");
        create(token, noMobile).andExpect(status().isBadRequest());
        noMobile.put("celular", "999");
        create(token, noMobile).andExpect(status().isBadRequest());
        Map<String, Object> noWarningText = form("Aviso sem texto", CPF_A);
        noWarningText.put("avisoAtivo", true);
        create(token, noWarningText).andExpect(status().isBadRequest());

        Map<String, Object> noCpf = form("Sem CPF Ficticio", null);
        noCpf.put("semCpf", true);
        create(token, noCpf).andExpect(status().isCreated()).andExpect(jsonPath("semCpf").value(true)).andExpect(jsonPath("cpf").doesNotExist());
        Map<String, Object> foreigner = form("Estrangeiro Ficticio", null);
        foreigner.put("estrangeiro", true);
        create(token, foreigner).andExpect(status().isCreated()).andExpect(jsonPath("estrangeiro").value(true)).andExpect(jsonPath("semCpf").value(false));
    }

    @Test
    void invalidFieldsAreRefusedAndNothingIsCreated() throws Exception {
        String token = admin();
        Map<String, Object> bad = form("Campo ruim", CPF_A);
        for (Map.Entry<String, Object> e : Map.<String, Object>of("cpf", "52998224726", "corIdentificacao", "laranja", "cns", "12345678901234",
            "cep", "123", "estado", "Ceará", "email", "sem-arroba", "alturaCm", -1, "pesoKg", 0).entrySet()) {
            Map<String, Object> m = new HashMap<>(bad);
            m.put(e.getKey(), e.getValue());
            create(token, m).andExpect(status().isBadRequest());
        }
        Map<String, Object> badRelative = form("Parente ruim", CPF_A);
        badRelative.put("parentes", List.of(Map.of("nome", "Fulano", "cpf", "11111111111")));
        create(token, badRelative).andExpect(status().isBadRequest());
        read(token, "?busca=ficticia").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void theSameCpfIsOneRecordPerClinicOnly() throws Exception {
        String token = admin();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, cpf) VALUES (?, ?, 'De outra clínica', ?)", UUID.randomUUID(), otherTenant, CPF_A));
        UUID mine = newPatient(token, form("Meu paciente", CPF_A));
        refused("dup", status().isConflict(), () -> create(token, form("Outro com o mesmo CPF", CPF_A)));
        read(token, "/" + mine).andExpect(status().isOk());
    }

    // ---- parentes ----

    @Test
    void relativesAreSavedAndReplacedAsAWhole() throws Exception {
        String token = admin();
        Map<String, Object> body = form("Com parentes", CPF_A);
        body.put("parentes", List.of(Map.of("nome", "João Ficticio", "parentesco", "Pai", "responsavelFinanceiro", true, "cpf", CPF_B),
            Map.of("nome", "Ana Ficticia", "parentesco", "Mãe")));
        UUID id = newPatient(token, body);
        read(token, "/" + id).andExpect(jsonPath("parentes.length()").value(2)).andExpect(jsonPath("parentes[0].nome").value("João Ficticio"))
            .andExpect(jsonPath("parentes[0].responsavelFinanceiro").value(true)).andExpect(jsonPath("parentes[1].responsavelFinanceiro").value(false));
        body.put("parentes", List.of(Map.of("nome", "Só este")));
        update(token, id, body).andExpect(status().isOk()).andExpect(jsonPath("parentes.length()").value(1)).andExpect(jsonPath("parentes[0].nome").value("Só este"));
        body.put("parentes", List.of());
        update(token, id, body).andExpect(jsonPath("parentes.length()").value(0));
    }

    // ---- editar e histórico ----

    @Test
    void editingRecordsWhichFieldsChangedAndNeverTheirValues() throws Exception {
        String token = admin();
        Map<String, Object> body = form("Para editar", CPF_A);
        body.put("cidade", "Fortaleza");
        UUID id = newPatient(token, body);
        read(token, "/" + id + "/historico").andExpect(jsonPath("$.length()").value(0));

        update(token, id, body).andExpect(status().isOk());                       // nada mudou: nada registrado
        read(token, "/" + id + "/historico").andExpect(jsonPath("$.length()").value(0));

        body.put("cidade", "Caucaia");
        body.put("observacoes", "Nova observação");
        body.put("parentes", List.of(Map.of("nome", "Parente Novo")));
        update(token, id, body).andExpect(status().isOk()).andExpect(jsonPath("cidade").value("Caucaia"));
        ResultActions history = read(token, "/" + id + "/historico");
        history.andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].usuarioId").exists()).andExpect(jsonPath("$[0].usuarioNome").value("Admin pacientes"));
        String text = history.andReturn().getResponse().getContentAsString();
        for (String field : List.of("cidade", "observacoes", "parentes")) org.junit.jupiter.api.Assertions.assertTrue(text.contains("\"" + field + "\""), field);
        org.junit.jupiter.api.Assertions.assertFalse(text.contains("Caucaia") || text.contains("Nova observação"), "o histórico guarda só os nomes dos campos");
    }

    @Test
    void editingNeedsTheFullRulesAndKeepsTheRecordNumber() throws Exception {
        String token = admin();
        UUID id = newPatient(token, form("Para editar", CPF_A));
        Map<String, Object> noCpf = form("Para editar", null);
        update(token, id, noCpf).andExpect(status().isBadRequest());
        update(token, UUID.randomUUID(), form("Não existe", CPF_B)).andExpect(status().isNotFound());
        update(token, id, form("Renomeado", CPF_A)).andExpect(jsonPath("nome").value("Renomeado")).andExpect(jsonPath("numeroProntuario").value(1));
    }

    @Test
    void aPatientFromBeforeTheNumberGetsOneOnTheNextEdit() throws Exception {
        String token = admin();
        UUID legacy = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, 'Antigo Ficticio')", legacy, tenant));
        read(token, "/" + legacy).andExpect(jsonPath("numeroProntuario").doesNotExist());
        Map<String, Object> body = form("Antigo Ficticio", null);
        body.put("semCpf", true);
        update(token, legacy, body).andExpect(status().isOk()).andExpect(jsonPath("numeroProntuario").value(1));
    }

    // ---- inativar e reativar ----

    @Test
    void deactivatingKeepsTheReasonAndWhoAndReactivatingClearsIt() throws Exception {
        String token = admin();
        UUID id = newPatient(token, form("Para inativar", CPF_A));
        send(post("/api/v1/pacientes/" + id + "/inativar"), token, Map.of("motivo", "invalido")).andExpect(status().isBadRequest());
        send(post("/api/v1/pacientes/" + id + "/inativar"), token, Map.of("observacao", "sem motivo informado")).andExpect(status().isBadRequest());
        send(post("/api/v1/pacientes/" + id + "/inativar"), token, Map.of("motivo", "obito", "observacao", "Comunicado pela família")).andExpect(status().isNoContent());
        read(token, "/" + id).andExpect(jsonPath("ativo").value(false)).andExpect(jsonPath("inativadoMotivo").value("obito"))
            .andExpect(jsonPath("inativadoObservacao").value("Comunicado pela família")).andExpect(jsonPath("inativadoEm").exists());
        send(post("/api/v1/pacientes/" + id + "/inativar"), token, Map.of("motivo", "obito")).andExpect(status().isConflict());
        update(token, id, form("Para inativar", CPF_A)).andExpect(status().isConflict());
        read(token, "?busca=inativar").andExpect(jsonPath("$.length()").value(0));
        read(token, "?busca=inativar&situacao=inativos").andExpect(jsonPath("$.length()").value(1));
        read(token, "?busca=inativar&situacao=todos").andExpect(jsonPath("$.length()").value(1));

        send(post("/api/v1/pacientes/" + id + "/reativar"), token, null).andExpect(status().isNoContent());
        read(token, "/" + id).andExpect(jsonPath("ativo").value(true)).andExpect(jsonPath("inativadoMotivo").doesNotExist()).andExpect(jsonPath("inativadoEm").doesNotExist());
        send(post("/api/v1/pacientes/" + id + "/reativar"), token, null).andExpect(status().isConflict());
        read(token, "/" + id + "/historico").andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].campos[0]").value("ativo"));
        send(post("/api/v1/pacientes/" + UUID.randomUUID() + "/inativar"), token, Map.of("motivo", "obito")).andExpect(status().isNotFound());
        send(post("/api/v1/pacientes/" + UUID.randomUUID() + "/reativar"), token, null).andExpect(status().isNotFound());
    }

    @Test
    void theOldDeleteStillDeactivatesWithoutAReason() throws Exception {
        String token = admin();
        UUID id = newPatient(token, form("Delete antigo", CPF_A));
        send(delete("/api/v1/pacientes/" + id), token, null).andExpect(status().isNoContent());
        read(token, "/" + id).andExpect(jsonPath("inativadoMotivo").value("sem_motivo"));
    }

    // ---- busca ----

    @Test
    void searchFindsByNameWithoutAccentSocialNameCpfPhoneAndRecordNumber() throws Exception {
        String token = admin();
        Map<String, Object> jose = form("José Ficticio", CPF_A);
        jose.put("nomeSocial", "Zeca");
        jose.put("celular", "(85) 99999-0000");
        jose.put("telefone2", "(85) 3222-1111");
        UUID joseId = newPatient(token, jose);
        Map<String, Object> ana = form("Ana Ficticia", CPF_B);
        ana.put("celular", "85977770000");
        newPatient(token, ana);
        for (String term : List.of("jose", "JOSÉ", "zeca", CPF_A, "85999990000", "9999-0000", "32221111")) {
            read(token, "?busca=" + term).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(joseId.toString()));
        }
        read(token, "?busca=2").andExpect(jsonPath("$[0].nome").value("Ana Ficticia"));           // prontuário nº 2
        read(token, "?inicial=j").andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nome").value("José Ficticio"));
        read(token, "?inicial=Á").andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nome").value("Ana Ficticia"));   // sem acento
    }

    @Test
    void aWordWithoutDigitsDoesNotMatchEveryPatientThatHasACpfOrPhone() throws Exception {
        String token = admin();
        newPatient(token, form("Carlos Ficticio", CPF_A));
        newPatient(token, form("Beatriz Ficticia", CPF_B));
        read(token, "?busca=zzz").andExpect(jsonPath("$.length()").value(0));
        read(token, "?busca=%").andExpect(jsonPath("$.length()").value(0));                      // "%" não é curinga
        read(token, "?busca=_").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void searchAndRecordAreScopedToTheClinic() throws Exception {
        String token = admin();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, cpf) VALUES (?, ?, 'Zulmira de outra clínica', ?)", UUID.randomUUID(), otherTenant, CPF_C));
        read(token, "?busca=zulmira").andExpect(jsonPath("$.length()").value(0));
        read(token, "?busca=" + CPF_C).andExpect(jsonPath("$.length()").value(0));
    }

    // ---- duplicados ----

    @Test
    void duplicatesAreFoundByCpfPhoneOrNameAndBirthday() throws Exception {
        String token = admin();
        Map<String, Object> original = form("João da Silva Ficticio", CPF_A);
        original.put("nascimento", "1990-01-02");
        original.put("celular", "(85) 98888-7777");
        UUID id = newPatient(token, original);
        read(token, "/duplicados?cpf=" + CPF_A).andExpect(jsonPath("$[0].paciente.id").value(id.toString())).andExpect(jsonPath("$[0].motivos[0]").value("cpf"));
        read(token, "/duplicados?celular=85988887777").andExpect(jsonPath("$[0].motivos[0]").value("telefone"));
        read(token, "/duplicados?celular=" + "558598888-7777").andExpect(jsonPath("$[0].motivos[0]").value("telefone"));
        read(token, "/duplicados?nome=JOAO DA SILVA FICTICIO&nascimento=1990-01-02").andExpect(jsonPath("$[0].motivos[0]").value("nome_nascimento"));
        read(token, "/duplicados?nome=Joao da Silva Ficticio&nascimento=1990-01-03").andExpect(jsonPath("$.length()").value(0));   // outra data: outra pessoa
        read(token, "/duplicados?nome=Joao da Silva Ficticio").andExpect(jsonPath("$.length()").value(0));                          // nome sozinho não basta
        read(token, "/duplicados").andExpect(jsonPath("$.length()").value(0));
        read(token, "/duplicados?cpf=" + CPF_A + "&celular=85988887777").andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].motivos.length()").value(2));
    }

    @Test
    void duplicatesIncludeInactiveRecordsButNeverOtherClinics() throws Exception {
        String token = admin();
        UUID id = newPatient(token, form("Inativo Ficticio", CPF_A));
        send(delete("/api/v1/pacientes/" + id), token, null).andExpect(status().isNoContent());
        read(token, "/duplicados?cpf=" + CPF_A).andExpect(jsonPath("$[0].paciente.ativo").value(false));
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, cpf) VALUES (?, ?, 'Outra', ?)", UUID.randomUUID(), otherTenant, CPF_C));
        read(token, "/duplicados?cpf=" + CPF_C).andExpect(jsonPath("$.length()").value(0));
    }

    // ---- listas da clínica ----

    @Test
    void thePriorityAndOriginListsStartWithTheDefaultsAndAreEditable() throws Exception {
        String token = admin();
        ResultActions list = read(token, "/prioridades");
        list.andExpect(jsonPath("$.length()").value(7));
        String text = list.andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(text.contains("Gestante") && text.contains("Cardíaco"));
        read(token, "/prioridades").andExpect(jsonPath("$.length()").value(7));                    // a lista inicial não se repete
        read(token, "/origens-paciente").andExpect(jsonPath("$.length()").value(6));

        JsonNode novo = created(send(post("/api/v1/pacientes/prioridades"), token, Map.of("nome", "Autista")).andExpect(status().isCreated()));
        refused("lookup", status().isConflict(), () -> send(post("/api/v1/pacientes/prioridades"), token, Map.of("nome", "Autista")));
        read(token, "/prioridades").andExpect(jsonPath("$.length()").value(8));

        UUID priority = UUID.fromString(novo.get("id").asString());
        Map<String, Object> body = form("Com prioridade", CPF_A);
        body.put("prioridadeId", priority);
        newPatient(token, body);
        send(put("/api/v1/pacientes/prioridades/" + priority), token, Map.of("nome", "Autista (TEA)", "ativo", false)).andExpect(status().isOk());
        read(token, "/prioridades").andExpect(jsonPath("$.length()").value(7));                    // inativa some da escolha
        read(token, "/prioridades?todas=true").andExpect(jsonPath("$.length()").value(8));
        read(creatorOnly(), "/prioridades?todas=true").andExpect(jsonPath("$.length()").value(7));   // só quem edita vê as inativas
        send(put("/api/v1/pacientes/prioridades/" + UUID.randomUUID()), token, Map.of("nome", "X")).andExpect(status().isNotFound());
        send(post("/api/v1/pacientes/origens-paciente"), token, Map.of("nome", "Feira de saúde")).andExpect(status().isCreated());
        read(token, "/origens-paciente").andExpect(jsonPath("$.length()").value(7));
    }

    @Test
    void deactivatingEveryItemDoesNotBringTheDefaultsBack() throws Exception {
        String token = admin();
        JsonNode all = created(read(token, "/prioridades?todas=true"));
        for (JsonNode item : all) send(put("/api/v1/pacientes/prioridades/" + item.get("id").asString()), token, Map.of("nome", item.get("nome").asString() + " (antigo)", "ativo", false)).andExpect(status().isOk());
        read(token, "/prioridades").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void aPriorityOrOriginOfAnotherClinicIsRefused() throws Exception {
        String token = admin();
        UUID foreign = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.prioridades (id, tenant_id, nome) VALUES (?, ?, 'De outra clínica')", foreign, otherTenant));
        Map<String, Object> body = form("Prioridade alheia", CPF_A);
        body.put("prioridadeId", foreign);
        refused("alheia", status().isConflict(), () -> create(token, body));
        read(token, "?busca=alheia").andExpect(jsonPath("$.length()").value(0));
    }

    // ---- quem pode o quê ----

    @Test
    void whoOnlyRegistersCanCreateAndConsultListsAndDuplicatesButNothingElse() throws Exception {
        String token = creatorOnly();
        read(token, "/prioridades").andExpect(status().isOk());
        read(token, "/origens-paciente").andExpect(status().isOk());
        read(token, "/duplicados?cpf=" + CPF_A).andExpect(status().isOk());
        UUID id = newPatient(token, form("Cadastrada pela recepção", CPF_A));
        read(token, "").andExpect(status().isForbidden());
        read(token, "/" + id).andExpect(status().isForbidden());
        read(token, "/" + id + "/historico").andExpect(status().isForbidden());
        update(token, id, form("Editada", CPF_A)).andExpect(status().isForbidden());
        send(post("/api/v1/pacientes/prioridades"), token, Map.of("nome", "X")).andExpect(status().isForbidden());
        send(post("/api/v1/pacientes/" + id + "/inativar"), token, Map.of("motivo", "obito")).andExpect(status().isForbidden());
        send(post("/api/v1/pacientes/" + id + "/reativar"), token, null).andExpect(status().isForbidden());
        read(token, "/prioridades?todas=true").andExpect(status().isOk());                       // sem editar, "todas" é ignorado
    }

    @Test
    void whoCannotCreateOrReadGetsNothing() throws Exception {
        String token = tokenFor(userWith("Sem pacientes", "agenda:ler"));
        read(token, "/prioridades").andExpect(status().isForbidden());
        read(token, "/duplicados?cpf=" + CPF_A).andExpect(status().isForbidden());
        create(token, form("X", CPF_A)).andExpect(status().isForbidden());
    }

    @Test
    void aDoctorOnlySeesTheClinicalPartOfAConnectedPatientRecord() throws Exception {
        String admin = admin();
        Map<String, Object> body = form("Paciente do médico", CPF_A);
        body.putAll(Map.of("logradouro", "Rua Ficticia", "rg", "123", "cns", "123456789012345", "observacoes", "Observação interna", "celular2", "85911112222",
            "avisoAtivo", true, "avisoTexto", "Aviso clínico", "indicacao", "Alguém", "alturaCm", 180, "pesoKg", 80));
        body.put("parentes", List.of(Map.of("nome", "Parente Ficticio")));
        UUID id = newPatient(admin, body);
        UUID doctor = userWith("Médico", "agenda:ler_proprios", "pacientes:ler_vinculados");
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctor, professional));
        insertAppointmentFor(tenant, unit, professional, id, procedure, "agendado", start, start.plusMinutes(30));
        ResultActions result = read(tokenFor(doctor), "/" + id);
        result.andExpect(status().isOk()).andExpect(jsonPath("nome").value("Paciente do médico")).andExpect(jsonPath("avisoTexto").value("Aviso clínico"))
            .andExpect(jsonPath("imc").value(24.7)).andExpect(jsonPath("parentes.length()").value(0));
        String text = result.andReturn().getResponse().getContentAsString();
        for (String hidden : List.of("Rua Ficticia", "\"123\"", "123456789012345", "Observação interna", "85911112222", "Alguém", "Parente Ficticio"))
            org.junit.jupiter.api.Assertions.assertFalse(text.contains(hidden), hidden);
        read(tokenFor(doctor), "/" + id + "/historico").andExpect(status().isForbidden());
        read(tokenFor(doctor), "/duplicados?cpf=" + CPF_A).andExpect(status().isForbidden());
    }

    // ---- paginação, números do topo e agendamentos do paciente ----

    @Test
    void theSearchIsPaginatedAndTheTotalFollowsTheFilters() throws Exception {
        String token = admin();
        String[] cpfs = {CPF_A, CPF_B, CPF_C, "45317828791", "11122233396"};
        for (int i = 0; i < 5; i++) newPatient(token, form("Paciente Paginado " + (char) ('A' + i), cpfs[i]));
        // A fixture base já tem o "Paciente Ficticio": são 6 no total, e ele vem antes dos "Paciente Paginado" na ordem alfabética.
        read(token, "?tamanho=2&pagina=0").andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].nome").value("Paciente Ficticio"))
            .andExpect(jsonPath("$[1].nome").value("Paciente Paginado A")).andExpect(header().string("X-Total-Count", "6"));
        read(token, "?tamanho=2&pagina=1").andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].nome").value("Paciente Paginado B"));
        read(token, "?tamanho=2&pagina=2").andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[1].nome").value("Paciente Paginado E"));
        read(token, "?tamanho=2&pagina=3").andExpect(jsonPath("$.length()").value(0)).andExpect(header().string("X-Total-Count", "6"));
        read(token, "?busca=paginado b&tamanho=10").andExpect(jsonPath("$.length()").value(1)).andExpect(header().string("X-Total-Count", "1"));
        read(token, "?limite=3").andExpect(jsonPath("$.length()").value(3)).andExpect(header().string("X-Total-Count", "6"));    // `limite` continua valendo
        read(token, "?tamanho=1000").andExpect(jsonPath("$.length()").value(6));                                               // teto de 100 por página
    }

    @Test
    void theNumbersOnTopOfTheListAreActiveInactiveNewThisMonthAndBirthdays() throws Exception {
        String token = admin();
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("America/Fortaleza"));
        Map<String, Object> birthday = form("Aniversariante da semana", CPF_A);
        birthday.put("nascimento", today.plusDays(2).minusYears(30).toString());
        newPatient(token, birthday);
        Map<String, Object> far = form("Aniversário longe", CPF_B);
        far.put("nascimento", today.plusDays(20).minusYears(30).toString());
        UUID inactive = newPatient(token, far);
        send(post("/api/v1/pacientes/" + inactive + "/inativar"), token, Map.of("motivo", "sem_motivo")).andExpect(status().isNoContent());
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, criado_em) VALUES (?, ?, 'Cadastrado mês passado', now() - interval '40 days')", UUID.randomUUID(), tenant));
        read(token, "/resumo").andExpect(status().isOk()).andExpect(jsonPath("ativos").value(3))   // inclui o "Paciente Ficticio" da fixture
            .andExpect(jsonPath("inativos").value(1))
            .andExpect(jsonPath("novosNoMes").value(Matchers.greaterThanOrEqualTo(1))).andExpect(jsonPath("aniversariantesSemana").value(1));
        read(creatorOnly(), "/resumo").andExpect(status().isForbidden());
    }

    @Test
    void thePatientsAppointmentsComeFromEveryUnitNewestFirstWithThePriceOnlyForWhoMaySeeIt() throws Exception {
        UUID id = newPatient(admin(), form("Com agendamentos", CPF_A));
        UUID inOtherUnit = UUID.randomUUID();
        transactions.inTenant(tenant, () -> { insertProfessional(inOtherUnit, tenant, "Dr. Outra Unidade", "6001", otherUnit); return null; });
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.unidades SET nome = 'Unidade Principal' WHERE id = ?", unit));
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.procedimentos SET valor_centavos = 15000 WHERE id = ?", procedure));
        insertAppointmentFor(tenant, unit, professional, id, procedure, "atendido", start.minusDays(30), start.minusDays(30).plusMinutes(30));
        insertAppointmentFor(tenant, otherUnit, inOtherUnit, id, procedure, "agendado", start.plusDays(5), start.plusDays(5).plusMinutes(30));
        UUID withValues = userWith("Ver valores", "pacientes:ler", "agenda:ler", "agenda:ver_valores");
        String token = tokenFor(withValues);
        read(token, "/" + id + "/agendamentos").andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].status").value("agendado")).andExpect(jsonPath("$[1].status").value("atendido"))
            .andExpect(jsonPath("$[1].unidadeNome").value("Unidade Principal")).andExpect(jsonPath("$[0].valorCentavos").value(15000))
            .andExpect(jsonPath("$[0].inicio").value(Matchers.endsWith("-03:00")));
        read(tokenFor(userWith("Sem valores", "pacientes:ler", "agenda:ler")), "/" + id + "/agendamentos").andExpect(jsonPath("$[0].valorCentavos").doesNotExist());
        read(token, "/" + UUID.randomUUID() + "/agendamentos").andExpect(status().isNotFound());
        read(creatorOnly(), "/" + id + "/agendamentos").andExpect(status().isForbidden());
        read(tokenFor(userWith("Só pacientes", "pacientes:ler")), "/" + id + "/agendamentos").andExpect(status().isForbidden());
        transactions.inTenant(tenant, () -> {
            org.junit.jupiter.api.Assertions.assertTrue(jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE paciente_id = ? AND usuario_id = ? AND acao = 'ver_paciente'", Integer.class, id, withValues) >= 1);
            return null;
        });
    }

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
}
