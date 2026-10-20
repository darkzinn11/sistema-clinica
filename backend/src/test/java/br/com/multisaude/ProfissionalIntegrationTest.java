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
 * Profissionais: cadastro completo, especialidade principal, unicidade de CPF/registro/usuário, CPF e nascimento só para quem edita,
 * e isolamento entre clínicas. O limite de idade do profissional NÃO é regra: fica na mensagem da agenda.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class ProfissionalIntegrationTest extends AgendaTestBase {
    private static final String CPF_A = "52998224725";
    private static final String CPF_B = "11144477735";
    private String admin;       // cria e edita
    private String reception;   // só lê
    private UUID cardiology, pediatrics, inactiveSpecialty;

    @BeforeEach
    void profissionalFixtures() throws Exception {
        admin = tokenFor(userWith("Admin prof", "profissionais:ler", "profissionais:criar", "profissionais:editar"));
        reception = tokenFor(userWith("Recepção prof", "profissionais:ler"));
        cardiology = specialty("Cardiologia", true);
        pediatrics = specialty("Pediatria", true);
        inactiveSpecialty = specialty("Desativada", false);
    }

    // ---- cadastro ----

    @Test
    void administratorCreatesAProfessionalWithEveryFieldAndTheFirstSpecialtyBecomesThePrincipal() throws Exception {
        JsonNode created = created(create(map("nome", "Dra. Ana Cardiologista", "nomeSocial", "Ana", "cpf", CPF_A, "nascimento", "1985-03-10", "sexo", "feminino",
            "conselho", "CRM", "conselhoNum", "12345", "conselhoUf", "ce", "rqe", "9988", "cbo", "225120", "telefone", "8532221111", "celular", "85999990000",
            "email", "ANA@Exemplo.com", "corAgenda", "#1A2B3C", "mensagemAgenda", "Atende a partir de 8 anos", "observacoes", "Só terças", "ocultoNaAgenda", false,
            "especialidadeIds", List.of(cardiology, pediatrics), "unidadeIds", List.of(unit))).andExpect(status().isCreated()));
        assertEquals("CE", created.get("conselhoUf").asString());
        assertEquals("ana@exemplo.com", created.get("email").asString());
        assertEquals(2, created.get("especialidades").size());
        assertEquals("Cardiologia", created.get("especialidades").get(0).get("nome").asString());
        assertTrue(created.get("especialidades").get(0).get("principal").asBoolean());
        assertFalse(created.get("especialidades").get(1).get("principal").asBoolean());
        assertEquals("Atende a partir de 8 anos", created.get("mensagemAgenda").asString());
        assertEquals(unit.toString(), created.get("unidadeIds").get(0).asString());
    }

    @Test
    void anExplicitPrincipalMustBeInTheListAndWins() throws Exception {
        create(Map.of("nome", "Dr. Principal", "especialidadeIds", List.of(cardiology, pediatrics), "especialidadePrincipalId", pediatrics, "unidadeIds", List.of(unit)))
            .andExpect(status().isCreated()).andExpect(jsonPath("especialidades[0].nome").value("Pediatria")).andExpect(jsonPath("especialidades[0].principal").value(true));
        create(Map.of("nome", "Dr. Fora", "especialidadeIds", List.of(cardiology), "especialidadePrincipalId", pediatrics, "unidadeIds", List.of(unit))).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsInvalidInput() throws Exception {
        Map<String, Object> base = Map.of("especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit));
        create(with(base, "nome", " ")).andExpect(status().isBadRequest());
        create(with(base, "nome", "X", "cpf", "52998224726")).andExpect(status().isBadRequest());
        create(with(base, "nome", "X", "sexo", "indefinido")).andExpect(status().isBadRequest());
        create(with(base, "nome", "X", "corAgenda", "azul")).andExpect(status().isBadRequest());
        create(with(base, "nome", "X", "email", "nao-e-email")).andExpect(status().isBadRequest());
        create(with(base, "nome", "X", "conselhoUf", "CEA")).andExpect(status().isBadRequest());
        create(with(base, "nome", "X", "nascimento", "2999-01-01")).andExpect(status().isBadRequest());
        create(with(base, "nome", "X", "mensagemAgenda", "m".repeat(1001))).andExpect(status().isBadRequest());
        create(Map.of("nome", "Sem especialidade", "especialidadeIds", List.of(), "unidadeIds", List.of(unit))).andExpect(status().isBadRequest());
        create(Map.of("nome", "Sem unidade", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of())).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsInactiveForeignOrUnknownSpecialtiesUnitsAndUsers() throws Exception {
        UUID foreignSpecialty = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.especialidades(id, tenant_id, nome) VALUES (?, ?, 'Alheia')", foreignSpecialty, otherTenant));
        create(Map.of("nome", "A", "especialidadeIds", List.of(inactiveSpecialty), "unidadeIds", List.of(unit))).andExpect(status().isBadRequest());
        create(Map.of("nome", "B", "especialidadeIds", List.of(foreignSpecialty), "unidadeIds", List.of(unit))).andExpect(status().isBadRequest());
        create(Map.of("nome", "C", "especialidadeIds", List.of(UUID.randomUUID()), "unidadeIds", List.of(unit))).andExpect(status().isBadRequest());
        create(Map.of("nome", "D", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(otherUnitOfOtherTenant))).andExpect(status().isBadRequest());
        create(Map.of("nome", "E", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit), "usuarioId", UUID.randomUUID())).andExpect(status().isBadRequest());
    }

    // ---- unicidade ----

    @Test
    void cpfCouncilRegistrationAndUserLinkMustBeUnique() throws Exception {
        UUID doctorUser = userWith("Usuário do médico", "agenda:ler_proprios");
        create(Map.of("nome", "Primeiro", "cpf", CPF_A, "conselho", "CRM", "conselhoNum", "777", "conselhoUf", "CE", "usuarioId", doctorUser,
            "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isCreated());
        create(Map.of("nome", "Mesmo CPF", "cpf", CPF_A, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isConflict())
            .andExpect(jsonPath("erro").value("Já existe profissional com este CPF."));
        create(Map.of("nome", "Mesmo registro", "conselho", "CRM", "conselhoNum", "777", "conselhoUf", "CE", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit)))
            .andExpect(status().isConflict()).andExpect(jsonPath("erro").value("Já existe profissional com este registro no conselho."));
        create(Map.of("nome", "Mesmo usuário", "usuarioId", doctorUser, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isConflict());
        create(Map.of("nome", "Registro em outro estado", "conselho", "CRM", "conselhoNum", "777", "conselhoUf", "MA", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit)))
            .andExpect(status().isCreated());
    }

    // ---- editar ----

    @Test
    void editingReplacesFieldsAndListsAndCanDeactivate() throws Exception {
        JsonNode created = created(create(Map.of("nome", "Dr. Antes", "cpf", CPF_A, "telefone", "111", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))));
        JsonNode edited = created(update(id(created), Map.of("nome", "Dr. Depois", "cpf", CPF_B, "especialidadeIds", List.of(cardiology, pediatrics), "especialidadePrincipalId", pediatrics,
            "unidadeIds", List.of(unit), "mensagemAgenda", "Atende a partir de 8 anos", "ativo", false)).andExpect(status().isOk()));
        assertEquals("Dr. Depois", edited.get("nome").asString());
        assertEquals(CPF_B, edited.get("cpf").asString());
        assertTrue(edited.get("telefone").isNull());                     // PUT substitui: campo omitido limpa
        assertFalse(edited.get("ativo").asBoolean());
        assertEquals("Pediatria", edited.get("especialidades").get(0).get("nome").asString());
        update(id(created), Map.of("nome", "Dr. Depois", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isOk())
            .andExpect(jsonPath("ativo").value(false))                   // ativo omitido mantém a situação
            .andExpect(jsonPath("especialidades.length()").value(1)).andExpect(jsonPath("especialidades[0].nome").value("Cardiologia"));
    }

    @Test
    void editingKeepsTheUniquenessRulesButAllowsKeepingYourOwnValues() throws Exception {
        JsonNode first = created(create(Map.of("nome", "Primeiro", "cpf", CPF_A, "conselho", "CRM", "conselhoNum", "1", "conselhoUf", "CE", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))));
        JsonNode second = created(create(Map.of("nome", "Segundo", "cpf", CPF_B, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))));
        update(id(second), Map.of("nome", "Segundo", "cpf", CPF_A, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isConflict());
        update(id(first), Map.of("nome", "Primeiro editado", "cpf", CPF_A, "conselho", "CRM", "conselhoNum", "1", "conselhoUf", "CE", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit)))
            .andExpect(status().isOk());
        UUID user = userWith("Usuário link", "agenda:ler_proprios");
        update(id(first), Map.of("nome", "Primeiro editado", "usuarioId", user, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isOk());
        update(id(second), Map.of("nome", "Segundo", "usuarioId", user, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isConflict());
        update(UUID.randomUUID(), Map.of("nome", "Fantasma", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isNotFound());
    }

    // ---- listar ----

    @Test
    void filtersBySeveralWordsAccentSpecialtyStatusLetterAndAgendaVisibilityAndPaginates() throws Exception {
        create(Map.of("nome", "Dra. Márcia Souza", "nomeSocial", "Marcinha", "conselho", "CRM", "conselhoNum", "5001", "conselhoUf", "CE", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isCreated());
        create(Map.of("nome", "Dr. José Lima", "especialidadeIds", List.of(pediatrics), "unidadeIds", List.of(unit))).andExpect(status().isCreated());
        JsonNode hidden = created(create(Map.of("nome", "Dr. Oculto Silva", "ocultoNaAgenda", true, "especialidadeIds", List.of(pediatrics), "unidadeIds", List.of(unit))));
        JsonNode inactive = created(create(Map.of("nome", "Dr. Inativo Santos", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))));
        update(id(inactive), Map.of("nome", "Dr. Inativo Santos", "ativo", false, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isOk());
        list("busca", "marcia").andExpect(jsonPath("$.length()").value(1));                     // sem acento
        list("busca", "marcinha").andExpect(jsonPath("$.length()").value(1));                   // nome social
        list("busca", "5001").andExpect(jsonPath("$.length()").value(1));                       // número do conselho
        list("busca", "dr jose").andExpect(jsonPath("$.length()").value(1));                    // várias palavras: todas precisam casar, em qualquer ordem
        list("especialidadeId", pediatrics.toString()).andExpect(jsonPath("$.length()").value(2));
        list("ativo", "false").andExpect(jsonPath("$.length()").value(1));
        // Os profissionais fixos da base ("Dra. Ficticia" e "Dr. Sem Unidade") também aparecem: ativos, visíveis e com D.
        list("letra", "d").andExpect(jsonPath("$.length()").value(4 + 2));
        list("naAgenda", "true").andExpect(jsonPath("$.length()").value(2 + 2));                // sem o oculto e sem o inativo
        int total = transactions.inTenant(tenant, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.profissionais WHERE tenant_id = ?", Integer.class, tenant));
        mvc.perform(get("/api/v1/profissionais").header("Authorization", "Bearer " + admin).param("tamanho", "2").param("pagina", "1"))
            .andExpect(jsonPath("$.length()").value(2)).andExpect(header().string("X-Total-Count", String.valueOf(total)));
        assertNotNull(hidden);
    }

    // ---- permissões e dado de RH ----

    @Test
    void receptionReadsButNeverSeesCpfBirthDateOrInternalNotes() throws Exception {
        JsonNode created = created(create(Map.of("nome", "Dr. Reservado", "cpf", CPF_A, "nascimento", "1980-01-01", "observacoes", "Nota interna de RH", "mensagemAgenda", "Aviso à recepção",
            "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))));
        mvc.perform(get("/api/v1/profissionais/" + id(created)).header("Authorization", "Bearer " + reception)).andExpect(status().isOk())
            .andExpect(jsonPath("cpf").value(Matchers.nullValue())).andExpect(jsonPath("nascimento").value(Matchers.nullValue())).andExpect(jsonPath("observacoes").value(Matchers.nullValue()))
            .andExpect(jsonPath("mensagemAgenda").value("Aviso à recepção"))
            .andExpect(content().string(Matchers.not(Matchers.containsString(CPF_A)))).andExpect(content().string(Matchers.not(Matchers.containsString("Nota interna"))));
        mvc.perform(get("/api/v1/profissionais").header("Authorization", "Bearer " + reception)).andExpect(jsonPath("$[0].cpf").value(Matchers.nullValue()));
        mvc.perform(get("/api/v1/profissionais/" + id(created)).header("Authorization", "Bearer " + admin)).andExpect(jsonPath("cpf").value(CPF_A)).andExpect(jsonPath("observacoes").value("Nota interna de RH"));
    }

    @Test
    void receptionCannotCreateOrEditAndDoctorsSeeNothing() throws Exception {
        JsonNode created = created(create(Map.of("nome", "Dr. Alvo", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))));
        mvc.perform(post("/api/v1/profissionais").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "X", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/profissionais/" + id(created)).header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "X", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))))).andExpect(status().isForbidden());
        String doctor = tokenFor(userWith("Médico prof", "agenda:ler_proprios", "pacientes:ler_vinculados"));
        mvc.perform(get("/api/v1/profissionais").header("Authorization", "Bearer " + doctor)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/profissionais/" + id(created)).header("Authorization", "Bearer " + doctor)).andExpect(status().isForbidden());
    }

    // ---- isolamento ----

    @Test
    void anotherClinicsProfessionalsAreInvisibleUntouchableAndDoNotBlockCpf() throws Exception {
        UUID foreign = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.profissionais(id, tenant_id, nome, cpf) VALUES (?, ?, 'Profissional alheio', ?)", foreign, otherTenant, CPF_A));
        mvc.perform(get("/api/v1/profissionais").header("Authorization", "Bearer " + admin)).andExpect(content().string(Matchers.not(Matchers.containsString("alheio"))));
        mvc.perform(get("/api/v1/profissionais/" + foreign).header("Authorization", "Bearer " + admin)).andExpect(status().isNotFound());
        update(foreign, Map.of("nome", "Sequestrado", "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isNotFound());
        create(Map.of("nome", "Mesmo CPF em outra clínica", "cpf", CPF_A, "especialidadeIds", List.of(cardiology), "unidadeIds", List.of(unit))).andExpect(status().isCreated());
    }

    // ---- garantias do banco ----

    @Test
    void theDatabaseAllowsOnlyOnePrincipalSpecialtyPerProfessional() throws Exception {
        JsonNode created = created(create(Map.of("nome", "Dr. Dois", "especialidadeIds", List.of(cardiology, pediatrics), "unidadeIds", List.of(unit))));
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE clinica.profissional_especialidades SET principal = true WHERE profissional_id = ?", id(created)));
            return null;
        });
    }

    // ---- helpers ----

    private ResultActions create(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/v1/profissionais").header("Authorization", "Bearer " + admin).contentType("application/json").content(json.writeValueAsString(new HashMap<>(body))));
    }

    private ResultActions update(UUID id, Map<String, Object> body) throws Exception {
        return mvc.perform(put("/api/v1/profissionais/" + id).header("Authorization", "Bearer " + admin).contentType("application/json").content(json.writeValueAsString(new HashMap<>(body))));
    }

    private ResultActions list(String param, String value) throws Exception {
        return mvc.perform(get("/api/v1/profissionais").header("Authorization", "Bearer " + admin).param(param, value));
    }

    private static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private static Map<String, Object> with(Map<String, Object> base, Object... extra) {
        Map<String, Object> merged = new HashMap<>(base);
        for (int i = 0; i < extra.length; i += 2) merged.put((String) extra[i], extra[i + 1]);
        return merged;
    }

    private UUID specialty(String name, boolean active) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.especialidades(id, tenant_id, nome, ativo) VALUES (?, ?, ?, ?)", id, tenant, name, active));
        return id;
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
