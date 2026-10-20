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
 * Procedimentos: a clínica cadastra à mão ou adiciona das sugestões oficiais da ANS (TUSS); preço só para quem pode ver;
 * mudanças de preço, tempo, tipo e situação ficam no histórico; tudo isolado por clínica.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class ProcedimentoIntegrationTest extends AgendaTestBase {
    private static final String CONSULTA_TUSS = "10101012";
    private static final String CONSULTA_DESCRICAO = "Consulta em consultório (no horário normal ou preestabelecido)";
    private String admin;       // cadastra, edita e vê preço
    private String editorNoPrice;   // edita, mas não vê nem altera preço
    private String reception;   // só lê, com preço

    @BeforeEach
    void users() throws Exception {
        admin = tokenFor(userWith("Admin proc", "procedimentos:ler", "procedimentos:criar", "procedimentos:editar", "agenda:ver_valores"));
        editorNoPrice = tokenFor(userWith("Editor sem preço", "procedimentos:ler", "procedimentos:criar", "procedimentos:editar"));
        reception = tokenFor(userWith("Recepção proc", "procedimentos:ler", "agenda:ver_valores"));
    }

    // ---- cadastro manual ----

    @Test
    void administratorCreatesAProcedureByHandWithEveryFieldAndReadsItBack() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "US obstétrica com doppler", "tipo", "exame", "codigoTuss", "40901807", "sigla", "USOBD",
            "duracaoMin", 20, "valorCentavos", 18000, "diasRetorno", 30, "avisoAgendamento", "Trazer pedido médico", "preparo", "Bexiga cheia",
            "observacoes", "Só com a ultrassonografista")).andExpect(status().isCreated()).andExpect(jsonPath("ativo").value(true))
            .andExpect(jsonPath("catalogoId").value(Matchers.nullValue())).andExpect(jsonPath("valorCentavos").value(18000)));
        mvc.perform(get("/api/v1/procedimentos/" + id(created)).header("Authorization", "Bearer " + admin)).andExpect(status().isOk())
            .andExpect(jsonPath("sigla").value("USOBD")).andExpect(jsonPath("diasRetorno").value(30)).andExpect(jsonPath("duracaoMin").value(20))
            .andExpect(jsonPath("avisoAgendamento").value("Trazer pedido médico")).andExpect(jsonPath("preparo").value("Bexiga cheia"))
            .andExpect(jsonPath("observacoes").value("Só com a ultrassonografista")).andExpect(jsonPath("tipo").value("exame"));
    }

    @Test
    void rejectsInvalidInput() throws Exception {
        create(admin, Map.of("nome", " ", "tipo", "consulta")).andExpect(status().isBadRequest());
        create(admin, Map.of("tipo", "consulta")).andExpect(status().isBadRequest());                   // sem nome e sem catálogo
        create(admin, Map.of("nome", "Sem tipo")).andExpect(status().isBadRequest());
        create(admin, Map.of("nome", "Tipo ruim", "tipo", "cirurgia")).andExpect(status().isBadRequest());
        create(admin, Map.of("nome", "Tempo 3", "tipo", "exame", "duracaoMin", 3)).andExpect(status().isBadRequest());
        create(admin, Map.of("nome", "Valor negativo", "tipo", "exame", "valorCentavos", -1)).andExpect(status().isBadRequest());
        create(admin, Map.of("nome", "Sigla longa", "tipo", "exame", "sigla", "S".repeat(21))).andExpect(status().isBadRequest());
        create(admin, Map.of("nome", "Retorno longo", "tipo", "consulta", "diasRetorno", 366)).andExpect(status().isBadRequest());
        create(admin, Map.of("nome", "Aviso longo", "tipo", "consulta", "avisoAgendamento", "a".repeat(1001))).andExpect(status().isBadRequest());
        create(admin, Map.of("nome", "N".repeat(161), "tipo", "consulta")).andExpect(status().isBadRequest());
    }

    @Test
    void anUnmeasuredTimeIsStoredAsNullWhetherOmittedOrZero() throws Exception {
        create(admin, Map.of("nome", "Sem tempo A", "tipo", "consulta")).andExpect(status().isCreated()).andExpect(jsonPath("duracaoMin").value(Matchers.nullValue()));
        create(admin, Map.of("nome", "Sem tempo B", "tipo", "consulta", "duracaoMin", 0)).andExpect(status().isCreated()).andExpect(jsonPath("duracaoMin").value(Matchers.nullValue()));
        create(admin, Map.of("nome", "Com tempo", "tipo", "consulta", "duracaoMin", 5)).andExpect(status().isCreated()).andExpect(jsonPath("duracaoMin").value(5));
    }

    @Test
    void nameMustBeUniqueInTheClinicIgnoringCase() throws Exception {
        create(admin, Map.of("nome", "Eletrocardiograma", "tipo", "exame")).andExpect(status().isCreated());
        create(admin, Map.of("nome", "ELETROCARDIOGRAMA", "tipo", "exame")).andExpect(status().isConflict());
        JsonNode other = created(create(admin, Map.of("nome", "Holter", "tipo", "exame")));
        update(admin, id(other), Map.of("nome", "eletrocardiograma", "tipo", "exame")).andExpect(status().isConflict());
        update(admin, id(other), Map.of("nome", "HOLTER", "tipo", "exame")).andExpect(status().isOk()); // mesmo procedimento, outra caixa
    }

    // ---- listar, filtrar, paginar ----

    @Test
    void filtersBySeveralWordsTypeStatusLetterAndPaginatesWithTheTotal() throws Exception {
        for (String[] p : new String[][] {{"US abdome total", "exame"}, {"US mamas", "exame"}, {"Consulta cardiologia", "consulta"}, {"Biópsia incisional", "procedimento"}}) {
            create(admin, Map.of("nome", p[0], "tipo", p[1], "sigla", p[0].substring(0, 3).toUpperCase())).andExpect(status().isCreated());
        }
        JsonNode mamas = created(create(admin, Map.of("nome", "US mamas com doppler", "tipo", "exame")));
        update(admin, id(mamas), Map.of("nome", "US mamas com doppler", "tipo", "exame", "ativo", false)).andExpect(status().isOk());
        list(admin, "busca", "us mamas").andExpect(jsonPath("$.length()").value(2));                // todas as palavras, qualquer ordem
        list(admin, "busca", "mamas us").andExpect(jsonPath("$.length()").value(2));
        list(admin, "busca", "BIO").andExpect(jsonPath("$.length()").value(1));                     // também pela sigla, sem diferenciar acento
        list(admin, "busca", "biopsia").andExpect(jsonPath("$.length()").value(1));
        list(admin, "busca", "BIÓPSIA INCISIONAL").andExpect(jsonPath("$.length()").value(1));
        list(admin, "tipo", "exame").andExpect(jsonPath("$.length()").value(3));
        list(admin, "ativo", "false").andExpect(jsonPath("$.length()").value(1));
        list(admin, "letra", "u").andExpect(jsonPath("$.length()").value(3));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + admin).param("tamanho", "2").param("pagina", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(header().string("X-Total-Count", String.valueOf(6)));
    }

    // ---- editar e histórico ----

    @Test
    void editingRecordsEveryChangeOfPriceTimeTypeAndStatusAndNothingElse() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "Consulta geral", "tipo", "consulta", "valorCentavos", 10000, "duracaoMin", 30)));
        update(admin, id(created), Map.of("nome", "Consulta geral", "tipo", "exame", "valorCentavos", 12000, "duracaoMin", 20, "ativo", false, "sigla", "CG"))
            .andExpect(status().isOk()).andExpect(jsonPath("tipo").value("exame")).andExpect(jsonPath("valorCentavos").value(12000)).andExpect(jsonPath("ativo").value(false));
        mvc.perform(get("/api/v1/procedimentos/" + id(created) + "/historico").header("Authorization", "Bearer " + admin)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[?(@.campo == 'valor')].de").value(Matchers.contains("10000")))
            .andExpect(jsonPath("$[?(@.campo == 'valor')].para").value(Matchers.contains("12000")))
            .andExpect(jsonPath("$[?(@.campo == 'tempo')].para").value(Matchers.contains("20")))
            .andExpect(jsonPath("$[?(@.campo == 'tipo')].de").value(Matchers.contains("consulta")))
            .andExpect(jsonPath("$[?(@.campo == 'ativo')].para").value(Matchers.contains("false")))
            .andExpect(jsonPath("$[0].usuarioNome").value("Admin proc"));
        // Regravar os mesmos valores (e mexer só em sigla/observações) não gera histórico.
        update(admin, id(created), Map.of("nome", "Consulta geral", "tipo", "exame", "valorCentavos", 12000, "duracaoMin", 20, "sigla", "CG2", "observacoes", "x")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/procedimentos/" + id(created) + "/historico").header("Authorization", "Bearer " + admin)).andExpect(jsonPath("$.length()").value(4));
    }

    @Test
    void clearingTheTimeIsRecordedAsAChangeToUnmeasured() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "Consulta X", "tipo", "consulta", "duracaoMin", 30)));
        update(admin, id(created), Map.of("nome", "Consulta X", "tipo", "consulta", "duracaoMin", 0)).andExpect(status().isOk()).andExpect(jsonPath("duracaoMin").value(Matchers.nullValue()));
        mvc.perform(get("/api/v1/procedimentos/" + id(created) + "/historico").header("Authorization", "Bearer " + admin))
            .andExpect(jsonPath("$[0].campo").value("tempo")).andExpect(jsonPath("$[0].de").value("30")).andExpect(jsonPath("$[0].para").value(Matchers.nullValue()));
    }

    // ---- preço ----

    @Test
    void whoCannotSeePricesNeitherReadsNorChangesThemNorSeesThemInTheHistory() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "Procedimento caro", "tipo", "procedimento", "valorCentavos", 65000)));
        update(admin, id(created), Map.of("nome", "Procedimento caro", "tipo", "procedimento", "valorCentavos", 70000)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/procedimentos/" + id(created)).header("Authorization", "Bearer " + editorNoPrice)).andExpect(jsonPath("valorCentavos").value(Matchers.nullValue()))
            .andExpect(content().string(Matchers.not(Matchers.containsString("65000"))));
        // Editar sem permissão de preço mantém o preço, mesmo que o corpo traga outro valor.
        update(editorNoPrice, id(created), Map.of("nome", "Procedimento caro", "tipo", "procedimento", "valorCentavos", 1, "ativo", false)).andExpect(status().isOk())
            .andExpect(jsonPath("valorCentavos").value(Matchers.nullValue()));
        mvc.perform(get("/api/v1/procedimentos/" + id(created)).header("Authorization", "Bearer " + admin)).andExpect(jsonPath("valorCentavos").value(70000));
        // A linha de "ativo" aparece para quem edita; as de valor só para quem vê preço.
        mvc.perform(get("/api/v1/procedimentos/" + id(created) + "/historico").header("Authorization", "Bearer " + editorNoPrice))
            .andExpect(jsonPath("$[?(@.campo == 'valor')]").isEmpty()).andExpect(jsonPath("$[?(@.campo == 'ativo')].campo", Matchers.hasSize(1)))
            .andExpect(content().string(Matchers.not(Matchers.containsString("70000")))).andExpect(content().string(Matchers.not(Matchers.containsString("65000"))));
        mvc.perform(get("/api/v1/procedimentos/" + id(created) + "/historico").header("Authorization", "Bearer " + admin)).andExpect(jsonPath("$[?(@.campo == 'valor')].campo", Matchers.hasSize(1)));
        create(editorNoPrice, Map.of("nome", "Com preço escondido", "tipo", "exame", "valorCentavos", 500)).andExpect(status().isForbidden());
        create(editorNoPrice, Map.of("nome", "Sem preço informado", "tipo", "exame")).andExpect(status().isCreated());
    }

    // ---- catálogo oficial da ANS ----

    @Test
    void theCatalogIsTheOfficialAnsTussTableAndNothingIsMadeUp() {
        assertTrue(jdbc.queryForObject("SELECT count(*) FROM clinica.catalogo_procedimentos", Integer.class) >= 5000);
        assertEquals(CONSULTA_DESCRICAO, jdbc.queryForObject("SELECT descricao FROM clinica.catalogo_procedimentos WHERE codigo_tuss = ?", String.class, CONSULTA_TUSS));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM clinica.catalogo_procedimentos WHERE codigo_tuss !~ '^[0-9]{8}$'", Integer.class));
    }

    @Test
    void theCatalogSearchIgnoresAccentsAndCase() throws Exception {
        for (String term : new String[] {"consultorio", "CONSULTÓRIO", "Consultório normal"}) {
            mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("busca", term))
                .andExpect(jsonPath("$[?(@.codigoTuss == '" + CONSULTA_TUSS + "')]").exists());
        }
    }

    @Test
    void theCatalogIsSearchableByWordsAndByCodeAndPaginated() throws Exception {
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("busca", "consulta consultório"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.codigoTuss == '" + CONSULTA_TUSS + "')].descricao").value(Matchers.contains(CONSULTA_DESCRICAO)))
            .andExpect(jsonPath("$[0].jaAdicionado").value(false));
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("busca", "1010101")).andExpect(jsonPath("$[0].codigoTuss").value(CONSULTA_TUSS));
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("tamanho", "5"))
            .andExpect(jsonPath("$.length()").value(5)).andExpect(header().string("X-Total-Count", Matchers.not(Matchers.is("5"))));
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("tamanho", "100000")).andExpect(jsonPath("$.length()").value(200));
    }

    @Test
    void addingFromTheCatalogCopiesDescriptionAndCodeAndLeavesPriceAndTimeForTheClinic() throws Exception {
        UUID entry = catalogId(CONSULTA_TUSS);
        created(create(admin, Map.of("catalogoId", entry)).andExpect(status().isCreated()).andExpect(jsonPath("nome").value(CONSULTA_DESCRICAO))
            .andExpect(jsonPath("codigoTuss").value(CONSULTA_TUSS)).andExpect(jsonPath("tipo").value("procedimento")).andExpect(jsonPath("valorCentavos").value(Matchers.nullValue()))
            .andExpect(jsonPath("duracaoMin").value(Matchers.nullValue())).andExpect(jsonPath("catalogoId").value(entry.toString())));
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("busca", "1010101")).andExpect(jsonPath("$[0].jaAdicionado").value(true));
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("busca", "1010101").param("naoAdicionados", "true"))
            .andExpect(jsonPath("$[?(@.codigoTuss == '" + CONSULTA_TUSS + "')]").isEmpty());
        create(admin, Map.of("catalogoId", entry)).andExpect(status().isConflict());
    }

    @Test
    void addingFromTheCatalogCanOverrideTheNameAndTypeAndRefusesUnknownEntries() throws Exception {
        create(admin, Map.of("catalogoId", catalogId("10101020"), "nome", "Consulta domiciliar da clínica", "tipo", "consulta", "valorCentavos", 25000))
            .andExpect(status().isCreated()).andExpect(jsonPath("nome").value("Consulta domiciliar da clínica")).andExpect(jsonPath("tipo").value("consulta"))
            .andExpect(jsonPath("codigoTuss").value("10101020")).andExpect(jsonPath("valorCentavos").value(25000));
        create(admin, Map.of("catalogoId", UUID.randomUUID())).andExpect(status().isBadRequest());
    }

    @Test
    void theLongestOfficialDescriptionStillFitsInTheName() throws Exception {
        UUID longest = UUID.fromString(jdbc.queryForObject("SELECT id::text FROM clinica.catalogo_procedimentos ORDER BY length(descricao) DESC LIMIT 1", String.class));
        create(admin, Map.of("catalogoId", longest)).andExpect(status().isCreated()).andExpect(jsonPath("nome").value(Matchers.hasLength(Matchers.lessThanOrEqualTo(160))));
    }

    // ---- permissões ----

    @Test
    void receptionReadsWithPriceButNeverChangesOrBrowsesTheCatalogOrHistory() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "Consulta pediatria", "tipo", "consulta", "valorCentavos", 15000)));
        mvc.perform(get("/api/v1/procedimentos/" + id(created)).header("Authorization", "Bearer " + reception)).andExpect(status().isOk()).andExpect(jsonPath("valorCentavos").value(15000));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + reception)).andExpect(status().isOk());
        create(reception, Map.of("nome", "Novo", "tipo", "exame")).andExpect(status().isForbidden());
        update(reception, id(created), Map.of("nome", "Alterado", "tipo", "consulta")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/procedimentos/" + id(created) + "/historico").header("Authorization", "Bearer " + reception)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + reception)).andExpect(status().isForbidden());
    }

    @Test
    void doctorsReadTheCatalogOfProceduresWithoutPricesAndCannotChangeAnything() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "Ecocardiograma", "tipo", "exame", "valorCentavos", 30000)));
        String doctor = tokenFor(userWith("Médico proc", "agenda:ler_proprios", "pacientes:ler_vinculados"));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + doctor)).andExpect(status().isOk()).andExpect(jsonPath("$[?(@.nome == 'Ecocardiograma')]").exists())
            .andExpect(jsonPath("$[*].valorCentavos", Matchers.everyItem(Matchers.nullValue()))).andExpect(content().string(Matchers.not(Matchers.containsString("30000"))));
        mvc.perform(get("/api/v1/procedimentos/" + id(created)).header("Authorization", "Bearer " + doctor)).andExpect(jsonPath("valorCentavos").value(Matchers.nullValue()));
        create(doctor, Map.of("nome", "Do médico", "tipo", "exame")).andExpect(status().isForbidden());
        update(doctor, id(created), Map.of("nome", "Do médico", "tipo", "exame")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + doctor)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/procedimentos/" + id(created) + "/historico").header("Authorization", "Bearer " + doctor)).andExpect(status().isForbidden());
    }

    @Test
    void usersWithoutAnyPermissionSeeNothing() throws Exception {
        String nobody = tokenFor(userWith("Ninguém", "usuarios:ler"));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + nobody)).andExpect(status().isForbidden());
        create(nobody, Map.of("nome", "X", "tipo", "exame")).andExpect(status().isForbidden());
    }

    // ---- isolamento entre clínicas ----

    @Test
    void anotherClinicsProceduresAreInvisibleUntouchableAndDoNotBlockNames() throws Exception {
        UUID foreign = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.procedimentos(id, tenant_id, nome, tipo) VALUES (?, ?, 'Procedimento alheio', 'exame')", foreign, otherTenant));
        mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + admin)).andExpect(content().string(Matchers.not(Matchers.containsString("alheio"))));
        mvc.perform(get("/api/v1/procedimentos/" + foreign).header("Authorization", "Bearer " + admin)).andExpect(status().isNotFound());
        update(admin, foreign, Map.of("nome", "Sequestrado", "tipo", "exame")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/procedimentos/" + foreign + "/historico").header("Authorization", "Bearer " + admin)).andExpect(status().isNotFound());
        assertEquals("Procedimento alheio", transactions.inTenant(otherTenant, () -> jdbc.queryForObject("SELECT nome FROM clinica.procedimentos WHERE id = ?", String.class, foreign)));
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.procedimentos(tenant_id, nome, tipo) VALUES (?, 'Mesmo nome', 'exame')", otherTenant));
        create(admin, Map.of("nome", "Mesmo nome", "tipo", "exame")).andExpect(status().isCreated());
    }

    @Test
    void addingACatalogEntryInAnotherClinicDoesNotMarkItAsAddedHere() throws Exception {
        UUID entry = catalogId(CONSULTA_TUSS);
        transactions.inTenant(otherTenant, () -> jdbc.update("INSERT INTO clinica.procedimentos(tenant_id, nome, tipo, catalogo_id) VALUES (?, 'Copiado pela outra', 'consulta', ?)", otherTenant, entry));
        mvc.perform(get("/api/v1/catalogo/procedimentos").header("Authorization", "Bearer " + admin).param("busca", "1010101")).andExpect(jsonPath("$[0].jaAdicionado").value(false));
        create(admin, Map.of("catalogoId", entry)).andExpect(status().isCreated());
    }

    // ---- agenda ----

    @Test
    void anInactiveProcedureCannotBeBooked() throws Exception {
        String token = login();
        UUID inactive = id(created(create(admin, Map.of("nome", "Desativado depois", "tipo", "consulta"))));
        update(admin, inactive, Map.of("nome", "Desativado depois", "tipo", "consulta", "ativo", false)).andExpect(status().isOk());
        book(token, unit, professional, patient, inactive, start, start.plusMinutes(30)).andExpect(status().isBadRequest());
        book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated());
    }

    // ---- garantias do banco ----

    @Test
    void theDatabaseRefusesATypeOutsideTheClosedList() {
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO clinica.procedimentos(tenant_id, nome, tipo) VALUES (?, 'Tipo inventado', 'cirurgia')", tenant));
            return null;
        });
    }

    @Test
    void theHistoryCannotBeChangedOrErased() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "Com histórico", "tipo", "consulta", "valorCentavos", 100)));
        update(admin, id(created), Map.of("nome", "Com histórico", "tipo", "consulta", "valorCentavos", 200)).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("DELETE FROM clinica.procedimento_historico"));
            return null;
        });
    }

    @Test
    void theHistoryCannotBeRewrittenEither() throws Exception {
        JsonNode created = created(create(admin, Map.of("nome", "Com histórico 2", "tipo", "consulta", "valorCentavos", 100)));
        update(admin, id(created), Map.of("nome", "Com histórico 2", "tipo", "consulta", "valorCentavos", 200)).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("UPDATE clinica.procedimento_historico SET para = '1'"));
            return null;
        });
    }

    @Test
    void theCatalogCannotBeChangedByTheApplication() {
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("INSERT INTO clinica.catalogo_procedimentos(codigo_tuss, descricao) VALUES ('99999999', 'Inventado')"));
            return null;
        });
    }

    @Test
    void theCatalogCannotBeRewrittenByTheApplicationEither() {
        transactions.inTenant(tenant, () -> {
            assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("UPDATE clinica.catalogo_procedimentos SET descricao = 'Adulterado'"));
            return null;
        });
    }

    // ---- helpers ----

    private ResultActions create(String token, Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/v1/procedimentos").header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(new HashMap<>(body))));
    }

    private ResultActions update(String token, UUID id, Map<String, Object> body) throws Exception {
        return mvc.perform(put("/api/v1/procedimentos/" + id).header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(new HashMap<>(body))));
    }

    private ResultActions list(String token, String param, String value) throws Exception {
        return mvc.perform(get("/api/v1/procedimentos").header("Authorization", "Bearer " + token).param(param, value));
    }

    private UUID catalogId(String tussCode) {
        return UUID.fromString(jdbc.queryForObject("SELECT id::text FROM clinica.catalogo_procedimentos WHERE codigo_tuss = ?", String.class, tussCode));
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
