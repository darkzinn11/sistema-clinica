package br.com.multisaude;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import br.com.multisaude.identidade.LoginRateLimiter;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Meu perfil: a pessoa muda o próprio nome e a própria senha e gerencia as próprias sessões. Dispositivo não tem nada disso. */
class MeuPerfilIntegrationTest extends AgendaTestBase {
    private static final String NEW_PASSWORD = "Nova-senha-de-teste-2027!";
    @Autowired LoginRateLimiter limiter;
    private UUID person;
    private String personEmail, current, other;

    @BeforeEach
    void profileFixtures() throws Exception {
        ((Map<?, ?>) ReflectionTestUtils.getField(limiter, "windows")).clear();
        person = UUID.randomUUID();
        personEmail = "perfil-" + person + "@example.invalid";
        UUID role = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Perfil teste', ARRAY['agenda:ler'])", role, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Pessoa Teste', ?, ?)", person, tenant, personEmail, passwords.encode(PASSWORD));
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, person, unit, role);
            return null;
        });
        current = tokenFor(person);
        other = tokenFor(person);
    }

    private ResultActions sendPut(String path, String token, Object body) throws Exception {
        return mvc.perform(put("/api/v1" + path).header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(body)));
    }

    private ResultActions sendPost(String path, String token, Object body) throws Exception {
        var r = post("/api/v1" + path).header("Authorization", "Bearer " + token);
        return mvc.perform(body == null ? r : r.contentType("application/json").content(json.writeValueAsString(body)));
    }

    private ResultActions sendGet(String path, String token) throws Exception {
        return mvc.perform(get("/api/v1" + path).header("Authorization", "Bearer " + token));
    }

    private ResultActions changePassword(String token, String currentPassword, String next) throws Exception {
        return sendPost("/auth/senha", token, Map.of("senhaAtual", currentPassword, "novaSenha", next));
    }

    private ResultActions login(String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("email", personEmail, "senha", password))));
    }

    // ---- nome ----

    @Test
    void thePersonChangesOwnNameAndNothingElse() throws Exception {
        sendPut("/auth/me", current, Map.of("nome", "  Nome Novo Completo  ")).andExpect(status().isOk()).andExpect(jsonPath("nome").value("Nome Novo Completo"))
            .andExpect(jsonPath("email").value(personEmail)).andExpect(jsonPath("papel").value("Perfil teste"));
        sendGet("/auth/me", current).andExpect(jsonPath("nome").value("Nome Novo Completo"));
        assertEquals("Nome Novo Completo", jdbc.queryForObject("SELECT nome FROM clinica.usuarios WHERE id = ?", String.class, person));
        sendPut("/auth/me", current, Map.of("nome", "  ")).andExpect(status().isBadRequest());
        sendPut("/auth/me", current, Map.of("nome", "x".repeat(161))).andExpect(status().isBadRequest());
        // Só o nome é aceito: um e-mail ou papel no corpo é ignorado.
        sendPut("/auth/me", current, Map.of("nome", "Outro Nome", "email", "invasor@example.invalid", "papel", "Administrador")).andExpect(status().isOk());
        assertEquals(personEmail, jdbc.queryForObject("SELECT email FROM clinica.usuarios WHERE id = ?", String.class, person));
    }

    @Test
    void oneCannotChangeSomeoneElsesName() throws Exception {
        UUID stranger = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Outra Pessoa', ?, 'x')", stranger, tenant, stranger + "@example.invalid"));
        sendPut("/auth/me", current, Map.of("nome", "Sequestrado")).andExpect(status().isOk());
        assertEquals("Outra Pessoa", jdbc.queryForObject("SELECT nome FROM clinica.usuarios WHERE id = ?", String.class, stranger));
    }

    // ---- senha ----

    @Test
    void changingThePasswordWorksEndsTheOtherSessionsAndKeepsTheCurrentOne() throws Exception {
        changePassword(current, PASSWORD, NEW_PASSWORD).andExpect(status().isNoContent());
        sendGet("/auth/me", current).andExpect(status().isOk());                       // a sessão que trocou continua
        sendGet("/auth/me", other).andExpect(status().isUnauthorized());               // as outras caem
        login(PASSWORD).andExpect(status().isUnauthorized());                      // a senha antiga não vale mais
        login(NEW_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void aWrongCurrentPasswordIsRefusedWithoutBeingA401() throws Exception {
        // 401 faria o front encerrar a sessão da pessoa por engano.
        changePassword(current, "senha-atual-errada-123", NEW_PASSWORD).andExpect(status().isBadRequest()).andExpect(jsonPath("erro").value("A senha atual está incorreta."));
        sendGet("/auth/me", current).andExpect(status().isOk());
        sendGet("/auth/me", other).andExpect(status().isOk());                         // nada foi encerrado
        login(PASSWORD).andExpect(status().isOk());                                // a senha continua a mesma
    }

    @Test
    void theNewPasswordFollowsThePolicy() throws Exception {
        changePassword(current, PASSWORD, "curta").andExpect(status().isBadRequest());
        changePassword(current, PASSWORD, "doze-chars-1").andExpect(status().isNoContent());            // 12 é o mínimo
        changePassword(current, "doze-chars-1", "doze-chars-1").andExpect(status().isBadRequest())
            .andExpect(jsonPath("erro").value("A nova senha precisa ser diferente da atual."));
        changePassword(current, "doze-chars-1", "á".repeat(37)).andExpect(status().isBadRequest());       // 74 bytes em UTF-8
        changePassword(current, "doze-chars-1", " ").andExpect(status().isBadRequest());
        changePassword(current, "", NEW_PASSWORD).andExpect(status().isBadRequest());
    }

    @Test
    void guessingTheCurrentPasswordIsLimitedPerPerson() throws Exception {
        for (int i = 0; i < 10; i++) changePassword(current, "tentativa-errada-" + i + "-xx", NEW_PASSWORD).andExpect(status().isBadRequest());
        changePassword(current, PASSWORD, NEW_PASSWORD).andExpect(status().isTooManyRequests());
        login(PASSWORD).andExpect(status().isOk());                                 // e não mudou nada
    }

    // ---- sessões ----

    @Test
    void theSessionsAreOnlyTheOwnersAndTheCurrentOneIsMarked() throws Exception {
        UUID stranger = UUID.randomUUID();
        UUID role = jdbc.queryForObject("SELECT papel_id FROM clinica.vinculos WHERE usuario_id = ?", UUID.class, person);
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Outra Pessoa', ?, 'x')", stranger, tenant, stranger + "@example.invalid");
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, stranger, unit, role);
            return null;
        });
        tokenFor(stranger);
        String body = sendGet("/auth/sessoes", current).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].unidadeNome").exists())
            .andReturn().getResponse().getContentAsString();
        JsonNode list = json.readTree(body);
        long marked = 0;
        for (JsonNode s : list) if (s.get("atual").asBoolean()) marked++;
        assertEquals(1, marked);
        assertFalse(body.contains("token"), "a lista de sessões nunca mostra token");
    }

    @Test
    void revokingOneSessionEndsItAndOnlyMineAreRevocable() throws Exception {
        JsonNode list = json.readTree(sendGet("/auth/sessoes", current).andReturn().getResponse().getContentAsString());
        String otherId = null;
        for (JsonNode s : list) if (!s.get("atual").asBoolean()) otherId = s.get("id").asString();
        assertNotNull(otherId);
        mvc.perform(delete("/api/v1/auth/sessoes/" + otherId).header("Authorization", "Bearer " + current)).andExpect(status().isNoContent());
        sendGet("/auth/me", other).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/auth/sessoes/" + otherId).header("Authorization", "Bearer " + current)).andExpect(status().isNotFound());   // já encerrada
        mvc.perform(delete("/api/v1/auth/sessoes/" + UUID.randomUUID()).header("Authorization", "Bearer " + current)).andExpect(status().isNotFound());
        // A sessão de outra pessoa não se encerra por aqui.
        UUID stranger = UUID.randomUUID();
        UUID role = jdbc.queryForObject("SELECT papel_id FROM clinica.vinculos WHERE usuario_id = ?", UUID.class, person);
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Outra Pessoa', ?, 'x')", stranger, tenant, stranger + "@example.invalid");
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, stranger, unit, role);
            return null;
        });
        String strangerToken = tokenFor(stranger);
        UUID strangerSession = jdbc.queryForObject("SELECT id FROM clinica.sessoes WHERE usuario_id = ? AND revogada_em IS NULL", UUID.class, stranger);
        mvc.perform(delete("/api/v1/auth/sessoes/" + strangerSession).header("Authorization", "Bearer " + current)).andExpect(status().isNotFound());
        sendGet("/auth/me", strangerToken).andExpect(status().isOk());
    }

    @Test
    void endingTheOtherSessionsKeepsOnlyTheCurrentOne() throws Exception {
        String third = tokenFor(person);
        sendPost("/auth/sessoes/encerrar-outras", current, null).andExpect(status().isNoContent());
        sendGet("/auth/me", current).andExpect(status().isOk());
        sendGet("/auth/me", other).andExpect(status().isUnauthorized());
        sendGet("/auth/me", third).andExpect(status().isUnauthorized());
        sendGet("/auth/sessoes", current).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].atual").value(true));
    }

    // ---- quem não pode ----

    @Test
    void aDeviceHasNoProfileNoPasswordAndNoSessionsToManage() throws Exception {
        String admin = tokenFor(userWithPermissions("Admin perfil", "fila:ler", "fila:configurar"));
        String device = json.readTree(sendPost("/dispositivos", admin, Map.of("nome", "Painel perfil", "tipo", "painel")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("token").asString();
        sendPut("/auth/me", device, Map.of("nome", "Painel renomeado")).andExpect(status().isForbidden());
        changePassword(device, "!", NEW_PASSWORD).andExpect(status().isForbidden());
        sendGet("/auth/sessoes", device).andExpect(status().isForbidden());
        sendPost("/auth/sessoes/encerrar-outras", device, null).andExpect(status().isForbidden());
        assertEquals("Painel perfil", jdbc.queryForObject("SELECT nome FROM clinica.usuarios WHERE nome LIKE 'Painel%' AND dispositivo", String.class));
    }

    @Test
    void everythingNeedsASession() throws Exception {
        mvc.perform(put("/api/v1/auth/me").contentType("application/json").content("{\"nome\":\"X\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/senha").contentType("application/json").content("{\"senhaAtual\":\"a\",\"novaSenha\":\"bbbbbbbbbbbb\"}")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/sessoes")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/auth/sessoes/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/sessoes/encerrar-outras")).andExpect(status().isUnauthorized());
    }

    private UUID userWithPermissions(String name, String... permissions) {
        UUID roleId = UUID.randomUUID(), userId = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, ?, ?)", roleId, tenant, name, permissions);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, 'x')", userId, tenant, name, userId + "-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, userId, unit, roleId);
            return null;
        });
        return userId;
    }
}
