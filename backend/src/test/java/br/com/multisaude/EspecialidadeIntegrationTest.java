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
 * Especialidades: o catálogo do sistema só sugere; cada clínica tem o seu cadastro, isolado das demais, e o vínculo com
 * profissional usa chave composta.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class EspecialidadeIntegrationTest extends AgendaTestBase {
    private String admin;
    private String reception;

    @BeforeEach
    void users() throws Exception {
        admin = tokenFor(userWith("Admin esp", "especialidades:ler", "especialidades:criar", "especialidades:editar", "profissionais:criar", "profissionais:ler"));
        reception = tokenFor(userWith("Recepção esp", "especialidades:ler"));
    }

    // ---- cadastro manual ----

    @Test
    void administratorCreatesEditsAndDeactivatesASpecialty() throws Exception {
        JsonNode created = created(create(Map.of("nome", "Avaliação física", "nomeResumido", "Avaliação", "codigo", "999", "cbos", "225125")).andExpect(status().isCreated())
            .andExpect(jsonPath("ativo").value(true)).andExpect(jsonPath("catalogoId").value(Matchers.nullValue())).andExpect(jsonPath("cbos").value("225125")));
        mvc.perform(put("/api/v1/especialidades/" + id(created)).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Avaliação física e funcional", "ativo", false)))).andExpect(status().isOk())
            .andExpect(jsonPath("nome").value("Avaliação física e funcional")).andExpect(jsonPath("ativo").value(false)).andExpect(jsonPath("cbos").value(Matchers.nullValue()));
        mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + admin).param("ativo", "true")).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + admin).param("ativo", "false")).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/especialidades/" + id(created)).header("Authorization", "Bearer " + admin)).andExpect(status().isOk());
    }

    @Test
    void rejectsInvalidInput() throws Exception {
        create(Map.of("nome", " ")).andExpect(status().isBadRequest());
        create(Map.of("codigo", "10")).andExpect(status().isBadRequest());                       // sem nome e sem catálogo
        create(Map.of("nome", "X".repeat(121))).andExpect(status().isBadRequest());
        create(Map.of("nome", "Cbos curto", "cbos", "12345")).andExpect(status().isBadRequest());
        create(Map.of("nome", "Cbos letras", "cbos", "22512a")).andExpect(status().isBadRequest());
    }

    @Test
    void filtersByTextActiveFlagAndLetter() throws Exception {
        create(Map.of("nome", "Cardiologia")).andExpect(status().isCreated());
        create(Map.of("nome", "Cirurgia geral")).andExpect(status().isCreated());
        JsonNode derm = created(create(Map.of("nome", "Dermatologia")).andExpect(status().isCreated()));
        mvc.perform(put("/api/v1/especialidades/" + id(derm)).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Dermatologia", "ativo", false)))).andExpect(status().isOk());
        list(admin, "busca", "cardio").andExpect(jsonPath("$.length()").value(1));
        list(admin, "letra", "c").andExpect(jsonPath("$.length()").value(2));
        list(admin, "letra", "D").andExpect(jsonPath("$.length()").value(1));
        list(admin, "ativo", "false").andExpect(jsonPath("$[0].nome").value("Dermatologia"));
        mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + admin)).andExpect(jsonPath("$.length()").value(3));
    }

    // ---- catálogo de sugestões ----

    @Test
    void theCatalogSuggestsAndAddingCopiesIntoTheClinicsOwnList() throws Exception {
        JsonNode catalog = json.readTree(mvc.perform(get("/api/v1/catalogo/especialidades").header("Authorization", "Bearer " + admin).param("busca", "cardio"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].jaAdicionada").value(false)).andReturn().getResponse().getContentAsString());
        UUID cardiology = id(catalog.get(0));
        JsonNode added = created(create(Map.of("catalogoId", cardiology)).andExpect(status().isCreated())
            .andExpect(jsonPath("nome").value(catalog.get(0).get("nome").asString())).andExpect(jsonPath("catalogoId").value(cardiology.toString())));
        assertEquals(catalog.get(0).get("nome").asString(), added.get("nome").asString());
        mvc.perform(get("/api/v1/catalogo/especialidades").header("Authorization", "Bearer " + admin).param("busca", "cardio")).andExpect(jsonPath("$[0].jaAdicionada").value(true));
        create(Map.of("catalogoId", cardiology)).andExpect(status().isConflict());
    }

    @Test
    void addingFromTheCatalogCanOverrideTheCopiedFieldsAndRefusesUnknownEntries() throws Exception {
        UUID entry = UUID.fromString(jdbc.queryForObject("SELECT id::text FROM clinica.catalogo_especialidades ORDER BY nome LIMIT 1", String.class));
        create(Map.of("catalogoId", entry, "nome", "Nome da clínica")).andExpect(status().isCreated()).andExpect(jsonPath("nome").value("Nome da clínica"));
        create(Map.of("catalogoId", UUID.randomUUID())).andExpect(status().isBadRequest());
    }

    @Test
    void theCatalogComesFromTheOfficialAnsOccupationTableAndNothingIsMadeUp() {
        // Tabela 24 da TUSS (CBO), versão 202607, carregada pelo script gerar_catalogo_ans.py.
        assertTrue(jdbc.queryForObject("SELECT count(*) FROM clinica.catalogo_especialidades", Integer.class) >= 150);
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM clinica.catalogo_especialidades WHERE cbos IS NULL OR cbos !~ '^[0-9]{6}$'", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) - count(DISTINCT cbos) FROM clinica.catalogo_especialidades", Integer.class));
        for (String[] known : new String[][] {{"225125", "Médico clínico"}, {"225120", "Médico cardiologista"}, {"225124", "Médico pediatra"}, {"225135", "Médico dermatologista"}}) {
            assertEquals(known[1], jdbc.queryForObject("SELECT nome FROM clinica.catalogo_especialidades WHERE cbos = ?", String.class, known[0]));
        }
    }

    @Test
    void theHandTypedSeedsOfTheOldCatalogAreGone() {
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM clinica.catalogo_especialidades WHERE nome IN ('Clínica geral', 'Cardiologia', 'Dermatologia', 'Pediatria')", Integer.class));
    }

    @Test
    void theCatalogCannotBeChangedByTheApplication() {
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("INSERT INTO clinica.catalogo_especialidades(nome) VALUES ('Inventada')"));
            return null;
        });
    }

    @Test
    void theCatalogCannotBeUpdatedByTheApplicationEither() {
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("UPDATE clinica.catalogo_especialidades SET nome = 'Adulterada'"));
            return null;
        });
    }

    // ---- nomes ----

    @Test
    void nameMustBeUniqueInTheClinicIgnoringCase() throws Exception {
        create(Map.of("nome", "Ortopedia")).andExpect(status().isCreated());
        create(Map.of("nome", "ORTOPEDIA")).andExpect(status().isConflict());
        JsonNode other = created(create(Map.of("nome", "Neurologia")).andExpect(status().isCreated()));
        mvc.perform(put("/api/v1/especialidades/" + id(other)).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "ortopedia")))).andExpect(status().isConflict());
        // Renomear para o próprio nome (outra caixa) é permitido.
        mvc.perform(put("/api/v1/especialidades/" + id(other)).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "NEUROLOGIA")))).andExpect(status().isOk());
    }

    // ---- permissões ----

    @Test
    void receptionCanReadButNeverChangeOrBrowseTheCatalog() throws Exception {
        create(Map.of("nome", "Pediatria")).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + reception)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(post("/api/v1/especialidades").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Nova")))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/especialidades/" + UUID.randomUUID()).header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Nova")))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/catalogo/especialidades").header("Authorization", "Bearer " + reception)).andExpect(status().isForbidden());
    }

    @Test
    void doctorsAndUsersWithoutPermissionSeeNothing() throws Exception {
        String doctor = tokenFor(userWith("Médico esp", "agenda:ler_proprios", "pacientes:ler_vinculados"));
        mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + doctor)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/catalogo/especialidades").header("Authorization", "Bearer " + doctor)).andExpect(status().isForbidden());
    }

    @Test
    void whoManagesProfessionalsCanStillListSpecialtiesForTheForm() throws Exception {
        create(Map.of("nome", "Psiquiatria")).andExpect(status().isCreated());
        String onlyProfessionals = tokenFor(userWith("Só profissionais", "profissionais:ler"));
        mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + onlyProfessionals)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    // ---- isolamento entre clínicas ----

    @Test
    void anotherClinicsSpecialtiesAreInvisibleAndUntouchable() throws Exception {
        UUID foreign = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.especialidades(id, tenant_id, nome) VALUES (?, ?, 'Especialidade alheia')", foreign, otherTenant));
        mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + admin)).andExpect(content().string(Matchers.not(Matchers.containsString("alheia"))));
        mvc.perform(get("/api/v1/especialidades/" + foreign).header("Authorization", "Bearer " + admin)).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/especialidades/" + foreign).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Sequestrada")))).andExpect(status().isNotFound());
        assertEquals("Especialidade alheia", transactions.inTenant(otherTenant, () -> jdbc.queryForObject("SELECT nome FROM clinica.especialidades WHERE id = ?", String.class, foreign)));
        // O mesmo nome em outra clínica não conflita.
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.especialidades(tenant_id, nome) VALUES (?, 'Cardiologia')", otherTenant));
        create(Map.of("nome", "Cardiologia")).andExpect(status().isCreated());
    }

    @Test
    void addingACatalogEntryInAnotherClinicDoesNotMarkItAsAddedHere() throws Exception {
        UUID entry = UUID.fromString(jdbc.queryForObject("SELECT id::text FROM clinica.catalogo_especialidades ORDER BY nome LIMIT 1", String.class));
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.especialidades(tenant_id, nome, catalogo_id) VALUES (?, 'Copiada pela outra', ?)", otherTenant, entry));
        mvc.perform(get("/api/v1/catalogo/especialidades").header("Authorization", "Bearer " + admin)).andExpect(jsonPath("$[0].jaAdicionada").value(false));
        create(Map.of("catalogoId", entry)).andExpect(status().isCreated());
    }

    // ---- vínculo com profissionais ----

    @Test
    void aProfessionalCanBeLinkedToTheClinicsOwnActiveSpecialtyAndTheViewShowsIt() throws Exception {
        UUID cardiology = id(created(create(Map.of("nome", "Cardiologia", "cbos", "225120")).andExpect(status().isCreated())));
        createProfessional(List.of(cardiology)).andExpect(status().isCreated()).andExpect(jsonPath("especialidades.length()").value(1))
            .andExpect(jsonPath("especialidades[0].nome").value("Cardiologia")).andExpect(jsonPath("especialidades[0].cbos").value("225120"));
    }

    @Test
    void aProfessionalCannotBeLinkedToAnotherClinicsInactiveOrUnknownSpecialty() throws Exception {
        UUID foreign = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.especialidades(id, tenant_id, nome) VALUES (?, ?, 'Alheia')", foreign, otherTenant));
        UUID inactive = id(created(create(Map.of("nome", "Desativada")).andExpect(status().isCreated())));
        mvc.perform(put("/api/v1/especialidades/" + inactive).header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Desativada", "ativo", false)))).andExpect(status().isOk());
        createProfessional(List.of(foreign)).andExpect(status().isBadRequest());
        createProfessional(List.of(inactive)).andExpect(status().isBadRequest());
        createProfessional(List.of(UUID.randomUUID())).andExpect(status().isBadRequest());
    }

    @Test
    void theDatabaseRefusesLinkingAProfessionalToAnotherClinicsSpecialty() {
        UUID foreign = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.especialidades(id, tenant_id, nome) VALUES (?, ?, 'Alheia')", foreign, otherTenant));
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO clinica.profissional_especialidades(tenant_id, profissional_id, especialidade_id) VALUES (?, ?, ?)", tenant, professional, foreign));
            return null;
        });
    }

    // ---- helpers ----

    private ResultActions create(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/v1/especialidades").header("Authorization", "Bearer " + admin).contentType("application/json").content(json.writeValueAsString(new HashMap<>(body))));
    }

    private ResultActions list(String token, String param, String value) throws Exception {
        return mvc.perform(get("/api/v1/especialidades").header("Authorization", "Bearer " + token).param(param, value));
    }

    private ResultActions createProfessional(List<UUID> specialties) throws Exception {
        return mvc.perform(post("/api/v1/profissionais").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Dra. Teste Vinculo", "conselho", "CRM", "conselhoNum", UUID.randomUUID().toString().substring(0, 8),
                "conselhoUf", "CE", "especialidadeIds", specialties, "unidadeIds", List.of(unit)))));
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
