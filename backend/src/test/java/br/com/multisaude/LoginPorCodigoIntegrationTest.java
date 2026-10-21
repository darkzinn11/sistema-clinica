package br.com.multisaude;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import br.com.multisaude.identidade.LoginRateLimiter;
import br.com.multisaude.shared.TenantTransactions;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * SaaS: a pessoa entra pelo código da clínica. Nada do que o login responde pode revelar se uma clínica ou um e-mail existe,
 * a lista de unidades só sai depois de validar a senha, e o mesmo e-mail em duas clínicas são duas contas independentes.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class LoginPorCodigoIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired TenantTransactions transactions;
    @Autowired PasswordEncoder passwords;
    @Autowired LoginRateLimiter limiter;
    private final JsonMapper json = JsonMapper.builder().build();
    private static final String PASSWORD = "Senha-de-teste-2026!";
    private static final String OTHER_PASSWORD = "Outra-senha-de-teste-2026!";

    private final UUID tenant = UUID.randomUUID();
    private final UUID otherTenant = UUID.randomUUID();
    private final UUID unitA = UUID.randomUUID();
    private final UUID unitB = UUID.randomUUID();
    private final UUID otherUnit = UUID.randomUUID();
    private final UUID user = UUID.randomUUID();           // duas unidades
    private final UUID singleUser = UUID.randomUUID();     // uma unidade
    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final String code = "vida-plena-" + suffix;
    private final String otherCode = "norte-" + suffix;
    private final String email = "ana-" + suffix + "@example.invalid";
    private final String singleEmail = "bia-" + suffix + "@example.invalid";

    @BeforeEach
    void fixtures() {
        // O limitador é em memória e compartilhado entre as classes de teste: cada teste começa do zero.
        ((Map<?, ?>) ReflectionTestUtils.getField(limiter, "windows")).clear();
        UUID role = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Clínica Vida Plena de Teste')", tenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade Centro')", unitA, tenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade Renascença')", unitB, tenant);
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Recepção teste', ARRAY['fila:ler'])", role, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Ana Teste', ?, ?)", user, tenant, email, passwords.encode(PASSWORD));
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Bia Teste', ?, ?)", singleUser, tenant, singleEmail, passwords.encode(PASSWORD));
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, user, unitA, role);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, user, unitB, role);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, singleUser, unitA, role);
            return null;
        });
        jdbc.update("INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES (?, ?)", code, tenant);
        UUID otherRole = UUID.randomUUID();
        transactions.inTenant(otherTenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Clínica Norte de Teste')", otherTenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade Norte')", otherUnit, otherTenant);
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Recepção norte', ARRAY['fila:ler'])", otherRole, otherTenant);
            // O MESMO e-mail da Ana, com outra senha: em clínicas diferentes são contas diferentes.
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Ana do Norte', ?, ?)", UUID.randomUUID(), otherTenant, email, passwords.encode(OTHER_PASSWORD));
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) SELECT tenant_id, id, ?, ? FROM clinica.usuarios WHERE tenant_id = ?", otherUnit, otherRole, otherTenant);
            return null;
        });
        jdbc.update("INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES (?, ?)", otherCode, otherTenant);
    }

    // ---- entrar pelo código ----

    @Test
    void loginByCodeReturnsTheSessionWithTheNamesTheScreenNeeds() throws Exception {
        String body = login(code, unitA, email, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("tokenType").value("Bearer"))
            .andExpect(jsonPath("usuario.clinicaNome").value("Clínica Vida Plena de Teste")).andExpect(jsonPath("usuario.unidadeNome").value("Unidade Centro"))
            .andExpect(jsonPath("usuario.codigoClinica").value(code)).andExpect(jsonPath("usuario.tenantId").value(tenant.toString()))
            .andExpect(jsonPath("usuario.unidadeId").value(unitA.toString())).andExpect(jsonPath("usuario.permissoes[0]").value("fila:ler"))
            .andReturn().getResponse().getContentAsString();
        String token = json.readTree(body).get("accessToken").asString();
        assertTrue(token.startsWith(tenant.toString() + "."));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk())
            .andExpect(jsonPath("clinicaNome").value("Clínica Vida Plena de Teste")).andExpect(jsonPath("unidadeNome").value("Unidade Centro"))
            .andExpect(jsonPath("codigoClinica").value(code)).andExpect(jsonPath("senha_hash").doesNotExist());
    }

    @Test
    void theCodeIgnoresCaseAndSurroundingSpaces() throws Exception {
        login("  " + code.toUpperCase() + " ", unitA, email, PASSWORD).andExpect(status().isOk());
    }

    @Test
    void aClinicWithoutACodeStillEntersByIdAndTheCodeComesBackNull() throws Exception {
        UUID bareTenant = UUID.randomUUID();
        UUID bareUnit = UUID.randomUUID();
        UUID bareRole = UUID.randomUUID();
        transactions.inTenant(bareTenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Clínica sem código')", bareTenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade única')", bareUnit, bareTenant);
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Recepção', ARRAY['fila:ler'])", bareRole, bareTenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Caio Teste', ?, ?)", UUID.randomUUID(), bareTenant, singleEmail, passwords.encode(PASSWORD));
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) SELECT tenant_id, id, ?, ? FROM clinica.usuarios WHERE tenant_id = ?", bareUnit, bareRole, bareTenant);
            return null;
        });
        Map<String, Object> byId = base(singleEmail, PASSWORD);
        byId.put("tenantId", bareTenant);
        byId.put("unidadeId", bareUnit);
        send(byId).andExpect(status().isOk()).andExpect(jsonPath("usuario.codigoClinica").value(Matchers.nullValue()))
            .andExpect(jsonPath("usuario.clinicaNome").value("Clínica sem código"));
    }

    // ---- nada vaza ----

    @Test
    void everyKindOfWrongInputGivesTheSameAnswer() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.tenants SET status = 'suspenso' WHERE id = ?", tenant));
        String suspendedBody = login(code, unitA, email, PASSWORD).andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.tenants SET status = 'ativo' WHERE id = ?", tenant));
        String unknownCode = login("nao-existe-" + suffix, unitA, email, PASSWORD).andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String wrongPassword = login(code, unitA, email, "senha-errada-123456").andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String wrongEmail = login(code, unitA, "ninguem-" + suffix + "@example.invalid", PASSWORD).andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String foreignUnit = login(code, otherUnit, email, PASSWORD).andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String unlinkedUnit = login(code, unitB, singleEmail, PASSWORD).andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertEquals(unknownCode, wrongPassword);
        assertEquals(unknownCode, wrongEmail);
        assertEquals(unknownCode, foreignUnit);
        assertEquals(unknownCode, unlinkedUnit);
        assertEquals(unknownCode, suspendedBody);
    }

    @Test
    void anInactiveUserCannotEnter() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.usuarios SET ativo = false WHERE id = ?", singleUser));
        login(code, unitA, singleEmail, PASSWORD).andExpect(status().isUnauthorized());
    }

    @Test
    void thePasswordIsCheckedBeforeAnyUnitIsListed() throws Exception {
        login(code, null, email, "senha-errada-123456").andExpect(status().isUnauthorized()).andExpect(content().string(Matchers.not(Matchers.containsString("Unidade"))));
        login("nao-existe-" + suffix, null, email, PASSWORD).andExpect(status().isUnauthorized()).andExpect(content().string(Matchers.not(Matchers.containsString("Unidade"))));
    }

    // ---- unidades ----

    @Test
    void severalUnitsWithoutChoiceAskWhichOneAfterTheCorrectPassword() throws Exception {
        login(code, null, email, PASSWORD).andExpect(status().isConflict()).andExpect(jsonPath("erro").value("Escolha a unidade."))
            .andExpect(jsonPath("unidades.length()").value(2)).andExpect(jsonPath("unidades[0].nome").value("Unidade Centro"))
            .andExpect(jsonPath("unidades[1].nome").value("Unidade Renascença")).andExpect(jsonPath("unidades[0].id").value(unitA.toString()))
            .andExpect(jsonPath("accessToken").doesNotExist());
        assertEquals(0, transactions.inTenant(tenant, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.sessoes WHERE usuario_id = ?", Integer.class, user)));
        login(code, unitB, email, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("usuario.unidadeNome").value("Unidade Renascença"));
    }

    @Test
    void oneUnitNeedsNoChoice() throws Exception {
        login(code, null, singleEmail, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("usuario.unidadeId").value(unitA.toString()));
    }

    @Test
    void aDeactivatedUnitIsNotOfferedAndLeavesTheChoiceAlone() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.unidades SET ativo = false WHERE id = ?", unitB));
        login(code, null, email, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("usuario.unidadeId").value(unitA.toString()));
    }

    // ---- SaaS ----

    @Test
    void theSameEmailInTwoClinicsAreTwoIndependentAccounts() throws Exception {
        login(otherCode, otherUnit, email, OTHER_PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("usuario.clinicaNome").value("Clínica Norte de Teste"))
            .andExpect(jsonPath("usuario.tenantId").value(otherTenant.toString())).andExpect(jsonPath("usuario.nome").value("Ana do Norte"));
        login(otherCode, otherUnit, email, PASSWORD).andExpect(status().isUnauthorized());   // a senha da outra clínica não vale aqui
        login(code, unitA, email, OTHER_PASSWORD).andExpect(status().isUnauthorized());
        login(code, unitA, email, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("usuario.nome").value("Ana Teste"));
    }

    @Test
    void theTokenOfOneClinicNeverOpensAnotherOne() throws Exception {
        String token = json.readTree(login(otherCode, otherUnit, email, OTHER_PASSWORD).andReturn().getResponse().getContentAsString()).get("accessToken").asString();
        String forged = tenant + token.substring(token.indexOf('.'));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + forged)).andExpect(status().isUnauthorized());
    }

    // ---- entrada ----

    @Test
    void exactlyOneOfCodeOrIdIsRequired() throws Exception {
        Map<String, Object> both = base(email, PASSWORD);
        both.put("tenantId", tenant);
        both.put("codigoClinica", code);
        both.put("unidadeId", unitA);
        send(both).andExpect(status().isBadRequest());
        send(base(email, PASSWORD)).andExpect(status().isBadRequest());
        Map<String, Object> blank = base(email, PASSWORD);
        blank.put("codigoClinica", "   ");
        send(blank).andExpect(status().isBadRequest());
        Map<String, Object> legacy = base(email, PASSWORD);
        legacy.put("tenantId", tenant);
        legacy.put("unidadeId", unitA);
        send(legacy).andExpect(status().isOk());                       // clientes antigos seguem funcionando
        Map<String, Object> tooLong = base(email, PASSWORD);
        tooLong.put("codigoClinica", "a".repeat(41));
        send(tooLong).andExpect(status().isBadRequest());
    }

    @Test
    void attemptsAreLimitedPerCodeAndEmail() throws Exception {
        for (int i = 0; i < 10; i++) login(code, unitA, email, "senha-errada-123456").andExpect(status().isUnauthorized());
        login(code, unitA, email, PASSWORD).andExpect(status().isTooManyRequests());
        login(otherCode, otherUnit, email, OTHER_PASSWORD).andExpect(status().isOk());   // outra clínica, outra contagem
    }

    // ---- a tabela de códigos ----

    @Test
    void theCodeTableRefusesBadCodesDuplicatesChangesAndDeletes() throws Exception {
        for (String bad : new String[] {"Maiuscula", "-comeca", "termina-", "a", "com espaco", "com_underline", "x".repeat(41)}) {
            rejected(DataIntegrityViolationException.class, "INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES (?, ?)", bad, UUID.randomUUID());
        }
        rejected(DataIntegrityViolationException.class, "INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES (?, ?)", code, otherTenant);          // código repetido
        rejected(DataIntegrityViolationException.class, "INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES (?, ?)", "outro-" + suffix, tenant);   // clínica com dois códigos
        // O código nunca muda: a aplicação não tem UPDATE nem DELETE na tabela.
        rejected(org.springframework.jdbc.BadSqlGrammarException.class, "UPDATE clinica.codigos_clinica SET codigo = ? WHERE tenant_id = ?", "sequestrado-" + suffix, tenant);
        rejected(org.springframework.jdbc.BadSqlGrammarException.class, "DELETE FROM clinica.codigos_clinica WHERE tenant_id = ?", tenant);
        assertEquals(code, jdbc.queryForObject("SELECT codigo FROM clinica.codigos_clinica WHERE tenant_id = ?", String.class, tenant));
    }

    @Test
    void thereIsNoRouteThatListsClinicsOrCodes() throws Exception {
        for (String path : new String[] {"/api/v1/clinicas", "/api/v1/codigos", "/api/v1/tenants", "/api/v1/auth/clinicas"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }

    // ---- helpers ----

    /** Cada recusa roda num ponto de salvamento: o PostgreSQL aborta a transação do teste depois do primeiro erro. */
    private void rejected(Class<? extends Exception> expected, String sql, Object... args) {
        jdbc.execute("SAVEPOINT recusa");
        assertThrows(expected, () -> jdbc.update(sql, args), sql);
        jdbc.execute("ROLLBACK TO SAVEPOINT recusa");
    }

    private Map<String, Object> base(String mail, String password) {
        Map<String, Object> m = new HashMap<>();
        m.put("email", mail);
        m.put("senha", password);
        return m;
    }

    private ResultActions login(String clinicCode, UUID unit, String mail, String password) throws Exception {
        Map<String, Object> m = base(mail, password);
        m.put("codigoClinica", clinicCode);
        if (unit != null) m.put("unidadeId", unit);
        return send(m);
    }

    private ResultActions send(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(body)));
    }
}
