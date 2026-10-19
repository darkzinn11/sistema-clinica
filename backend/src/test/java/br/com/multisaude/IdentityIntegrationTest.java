package br.com.multisaude;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import br.com.multisaude.shared.TenantTransactions;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class IdentityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired TenantTransactions transactions;
    @Autowired PasswordEncoder passwords;
    private final JsonMapper json = JsonMapper.builder().build();
    private final UUID tenant = UUID.randomUUID();
    private final UUID unit = UUID.randomUUID();
    private final UUID role = UUID.randomUUID();
    private final UUID user = UUID.randomUUID();
    private final UUID otherTenant = UUID.randomUUID();
    private final UUID otherUnit = UUID.randomUUID();
    private final String email = UUID.randomUUID() + "@example.invalid";
    private static final String PASSWORD = "Senha-de-teste-2026!";

    @BeforeEach
    void fixtures() {
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Teste isolado')", tenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade A')", unit, tenant);
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Admin teste', ARRAY['usuarios:ler','usuarios:criar'])", role, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Admin teste', ?, ?)", user, tenant, email, passwords.encode(PASSWORD));
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, user, unit, role);
            return null;
        });
        transactions.inTenant(otherTenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, 'Outra clínica')", otherTenant);
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, 'Unidade B')", otherUnit, otherTenant);
            return null;
        });
    }

    @Test
    void loginMeLogoutAndHashedSession() throws Exception {
        String token = login();
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("tenantId").value(tenant.toString()))
            .andExpect(jsonPath("usuarioId").value(user.toString()))
            .andExpect(jsonPath("senha_hash").doesNotExist());
        transactions.inTenant(tenant, () -> {
            assertEquals(32, jdbc.queryForObject("SELECT octet_length(token_hash) FROM clinica.sessoes WHERE usuario_id = ?", Integer.class, user));
            assertTrue(passwords.matches(PASSWORD, jdbc.queryForObject("SELECT senha_hash FROM clinica.usuarios WHERE id = ?", String.class, user)));
            return null;
        });
        mvc.perform(post("/api/v1/auth/logout").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsWrongPasswordTenantAndMalformedInput() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
            .content(loginBody(tenant, unit, "senha-incorreta"))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
            .content(loginBody(otherTenant, otherUnit, PASSWORD))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer invalido"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsCrossTenantUserCreation() throws Exception {
        String token = login();
        mvc.perform(get("/api/v1/unidades").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(unit.toString()));
        mvc.perform(post("/api/v1/usuarios").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(createUserBody(otherUnit, role)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void canCreateUserButNeverReturnsPasswordAndRejectsDuplicate() throws Exception {
        String token = login();
        mvc.perform(post("/api/v1/usuarios").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(createUserBody(unit, role)))
            .andExpect(status().isCreated()).andExpect(jsonPath("senha").doesNotExist())
            .andExpect(jsonPath("senhaHash").doesNotExist());
        mvc.perform(get("/api/v1/usuarios").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(post("/api/v1/usuarios").header("Authorization", "Bearer " + token)
            .contentType("application/json").content(createUserBody(unit, role))).andExpect(status().isConflict());
    }

    @Test
    void permissionsAndDisabledMembershipTakeEffectImmediately() throws Exception {
        String token = login();
        transactions.inTenant(tenant, () -> {
            jdbc.update("UPDATE clinica.papeis SET permissoes = '{}' WHERE id = ?", role);
            return null;
        });
        mvc.perform(get("/api/v1/usuarios").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        transactions.inTenant(tenant, () -> {
            jdbc.update("UPDATE clinica.vinculos SET ativo = false WHERE usuario_id = ?", user);
            return null;
        });
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredSessionIsRejected() throws Exception {
        String token = login();
        transactions.inTenant(tenant, () -> {
            jdbc.update("UPDATE clinica.sessoes SET criado_em = now() - interval '2 hours', expira_em = now() - interval '1 hour' WHERE usuario_id = ?", user);
            return null;
        });
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test
    void crossTenantForeignKeyIsRejectedEvenWhenIdsAreKnown() {
        transactions.inTenant(tenant, () -> {
            var error = assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)",
                    tenant, user, otherUnit, role));
            assertNotNull(error);
            return null;
        });
    }

    @Test
    void rateLimitRejectsAfterTenAccountAttempts() throws Exception {
        // Instância isolada evita acoplar este teste ao contador HTTP dos outros testes.
        var limiter = new br.com.multisaude.identidade.LoginRateLimiter();
        for (int i = 0; i < 10; i++) limiter.check("127.0.0.1", "teste");
        var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
            () -> limiter.check("127.0.0.1", "teste"));
        assertEquals(429, error.getStatusCode().value());
    }

    private String login() throws Exception {
        String response = mvc.perform(post("/api/v1/auth/login").contentType("application/json")
            .content(loginBody(tenant, unit, PASSWORD))).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("accessToken").asString();
    }

    private String loginBody(UUID selectedTenant, UUID selectedUnit, String password) throws Exception {
        return json.writeValueAsString(java.util.Map.of("tenantId", selectedTenant, "unidadeId", selectedUnit,
            "email", email, "senha", password));
    }

    private String createUserBody(UUID selectedUnit, UUID selectedRole) throws Exception {
        return json.writeValueAsString(java.util.Map.of("nome", "Novo usuário", "email", "novo-" + email,
            "senha", PASSWORD, "unidadeId", selectedUnit, "papelId", selectedRole));
    }
}
