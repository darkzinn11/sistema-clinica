package br.com.multisaude;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Painel de TV: um dispositivo de leitura, sem nenhum dado de paciente, que vê só as chamadas de hoje da própria unidade
 * (hoje no fuso da unidade). Totem e painel têm cada um a sua permissão e não entram um no outro.
 */
class PainelTvIntegrationTest extends AgendaTestBase {
    private String admin, reception, panel, totem;
    private UUID panelId, consulta, guiche, guiche2;

    @BeforeEach
    void panelFixtures() throws Exception {
        admin = tokenFor(userWith("Admin painel", "fila:ler", "fila:configurar"));
        reception = tokenFor(userWith("Recepção painel", "fila:ler", "fila:gerar", "fila:chamar", "pacientes:ler", "agenda:ler"));
        consulta = id(created(mvc.perform(post("/api/v1/tipos-senha").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Consulta", "prefixo", "CON", "preferencial", false)))).andExpect(status().isCreated())));
        guiche = id(created(mvc.perform(post("/api/v1/guiches").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Guichê 1", "tipos", List.of(Map.of("tipoId", consulta, "ordem", 1)))))).andExpect(status().isCreated())));
        guiche2 = id(created(mvc.perform(post("/api/v1/guiches").header("Authorization", "Bearer " + admin).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Guichê 2", "tipos", List.of(Map.of("tipoId", consulta, "ordem", 1)))))).andExpect(status().isCreated())));
        JsonNode device = created(device("Painel recepção", "painel").andExpect(status().isCreated()));
        panel = device.get("token").asString();
        panelId = id(device.get("dispositivo"));
        totem = created(device("Totem entrada", null).andExpect(status().isCreated())).get("token").asString();
    }

    private ResultActions device(String name, String type) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("nome", name);
        if (type != null) body.put("tipo", type);
        return mvc.perform(post("/api/v1/dispositivos").header("Authorization", "Bearer " + admin).contentType("application/json").content(json.writeValueAsString(body)));
    }

    private ResultActions calls(String token) throws Exception {
        return mvc.perform(get("/api/v1/painel/chamadas").header("Authorization", "Bearer " + token));
    }

    private UUID issue() throws Exception {
        return id(created(mvc.perform(post("/api/v1/senhas").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("tipoId", consulta)))).andExpect(status().isCreated())));
    }

    /** Chama a senha num guichê e a deixa em atendimento (um guichê só tem uma senha ativa por vez). */
    private void callAt(UUID ticket, UUID counter) throws Exception {
        mvc.perform(post("/api/v1/senhas/" + ticket + "/chamar").header("Authorization", "Bearer " + reception).contentType("application/json")
            .content(json.writeValueAsString(Map.of("guicheId", counter)))).andExpect(status().isOk());
    }

    /** Chama e já finaliza: libera o guichê para a próxima, e a chamada continua aparecendo no painel. */
    private void call(UUID ticket) throws Exception {
        callAt(ticket, guiche);
        mvc.perform(post("/api/v1/senhas/" + ticket + "/finalizar").header("Authorization", "Bearer " + reception)).andExpect(status().isOk());
    }

    private UUID userWith(String name, String... permissions) {
        UUID roleId = UUID.randomUUID(), userId = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, ?, ?)", roleId, tenant, name, permissions);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, ?, ?, 'x')", userId, tenant, name, userId + "-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, userId, unit, roleId);
            return null;
        });
        return userId;
    }

    // ---- o dispositivo ----

    @Test
    void aDeviceIsATotemUnlessItAsksForThePanelAndTheListSaysWhich() throws Exception {
        mvc.perform(get("/api/v1/dispositivos").header("Authorization", "Bearer " + admin)).andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[?(@.nome=='Painel recepção')].tipo").value("painel")).andExpect(jsonPath("$[?(@.nome=='Totem entrada')].tipo").value("totem"))
            .andExpect(content().string(Matchers.not(Matchers.containsString(panel))));
        device("Explícito", "totem").andExpect(status().isCreated()).andExpect(jsonPath("dispositivo.tipo").value("totem"));
        device("Tipo inventado", "admin").andExpect(status().isBadRequest());
        assertEquals("painel", jdbc.queryForObject("SELECT dispositivo_tipo FROM clinica.usuarios WHERE id = ?", String.class, panelId));
    }

    @Test
    void thePanelDeviceHasOnlyThePanelPermission() throws Exception {
        List<String> permissions = jdbc.queryForList("SELECT unnest(p.permissoes) FROM clinica.vinculos v JOIN clinica.papeis p ON p.tenant_id = v.tenant_id AND p.id = v.papel_id WHERE v.usuario_id = ?", String.class, panelId);
        assertEquals(List.of("painel:ver"), permissions);
    }

    // ---- o que mostra ----

    @Test
    void withoutCallsItIsEmptyButKnowsTheClinicAndTheUnit() throws Exception {
        calls(panel).andExpect(status().isOk()).andExpect(jsonPath("atual").doesNotExist()).andExpect(jsonPath("ultimas.length()").value(0))
            .andExpect(jsonPath("clinicaNome").value("Teste agenda")).andExpect(jsonPath("unidadeNome").exists());
    }

    @Test
    void itShowsTheCallsNewestFirstAndARecallBringsTheTicketBackToTheTop() throws Exception {
        UUID first = issue(), second = issue();
        callAt(first, guiche);
        callAt(second, guiche2);
        calls(panel).andExpect(jsonPath("atual.codigo").value("CON2")).andExpect(jsonPath("ultimas.length()").value(2)).andExpect(jsonPath("ultimas[0].codigo").value("CON2"))
            .andExpect(jsonPath("ultimas[1].codigo").value("CON1")).andExpect(jsonPath("atual.guicheNome").value("Guichê 2")).andExpect(jsonPath("atual.tipoNome").value("Consulta"))
            .andExpect(jsonPath("atual.preferencial").value(false)).andExpect(jsonPath("atual.chamadas").value(1)).andExpect(jsonPath("atual.ultimaChamadaEm").exists());
        mvc.perform(post("/api/v1/senhas/" + first + "/rechamar").header("Authorization", "Bearer " + reception)).andExpect(status().isOk());
        calls(panel).andExpect(jsonPath("atual.codigo").value("CON1")).andExpect(jsonPath("atual.chamadas").value(2)).andExpect(jsonPath("ultimas[1].codigo").value("CON2"));
    }

    @Test
    void ticketsStillWaitingNeverAppear() throws Exception {
        issue();
        UUID called = issue();
        call(called);
        calls(panel).andExpect(jsonPath("ultimas.length()").value(1)).andExpect(jsonPath("ultimas[0].codigo").value("CON2"));
    }

    @Test
    void itShowsAtMostTheLastEightCalls() throws Exception {
        for (int i = 0; i < 10; i++) call(issue());
        calls(panel).andExpect(jsonPath("ultimas.length()").value(8)).andExpect(jsonPath("ultimas[0].codigo").value("CON10")).andExpect(jsonPath("ultimas[7].codigo").value("CON3"));
    }

    @Test
    void onlyTodaysCallsOfThisUnitCount() throws Exception {
        UUID today = issue();
        call(today);
        // Ontem, chamada: não aparece. Outra unidade da mesma clínica, hoje, chamada: não aparece.
        jdbc.update("INSERT INTO clinica.senhas (tenant_id, unidade_id, tipo_id, dia, numero, codigo, status, guiche_id, ultima_chamada_em, chamadas) VALUES (?, ?, ?, ?, 90, 'ONTEM90', 'finalizada', ?, now(), 1)",
            tenant, unit, consulta, LocalDate.now().minusDays(3), guiche);
        jdbc.update("INSERT INTO clinica.senhas (tenant_id, unidade_id, tipo_id, dia, numero, codigo, ultima_chamada_em, chamadas) VALUES (?, ?, ?, ?, 91, 'OUTRA91', now(), 1)",
            tenant, otherUnit, consulta, LocalDate.now());
        calls(panel).andExpect(jsonPath("ultimas.length()").value(1)).andExpect(jsonPath("ultimas[0].codigo").value("CON1"))
            .andExpect(content().string(Matchers.not(Matchers.containsString("ONTEM90")))).andExpect(content().string(Matchers.not(Matchers.containsString("OUTRA91"))));
    }

    @Test
    void todayIsTodayInTheUnitsTimeZoneNotTheServers() throws Exception {
        // Um fuso cuja data difere da data do servidor: o painel precisa seguir a unidade.
        String zone = LocalDate.now(ZoneId.of("Pacific/Kiritimati")).equals(LocalDate.now()) ? "Pacific/Pago_Pago" : "Pacific/Kiritimati";
        assertNotEquals(LocalDate.now(ZoneId.of(zone)), LocalDate.now());
        jdbc.update("UPDATE clinica.unidades SET fuso = ? WHERE id = ?", zone, unit);
        UUID ticket = issue();     // o dia da senha é calculado no fuso da unidade
        call(ticket);
        calls(panel).andExpect(jsonPath("ultimas.length()").value(1)).andExpect(jsonPath("ultimas[0].codigo").value("CON1"));
    }

    @Test
    void thereIsNothingAboutThePatientInTheResponse() throws Exception {
        UUID patientId = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, cpf) VALUES (?, ?, 'Maria Sigilosa da Silva', '52998224725')", patientId, tenant);
        UUID ticket = issue();
        call(ticket);
        jdbc.update("UPDATE clinica.senhas SET paciente_id = ?, cpf_informado = '52998224725' WHERE id = ?", patientId, ticket);
        String body = calls(panel).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        for (String forbidden : new String[] {"Sigilosa", "52998224725", "cpf", "paciente", patientId.toString()})
            assertFalse(body.toLowerCase().contains(forbidden.toLowerCase()), "a resposta do painel não pode conter: " + forbidden);
    }

    // ---- quem entra onde ----

    @Test
    void thePanelCannotUseAnythingButItsOwnEndpointAndTheTotemCannotUseThePanel() throws Exception {
        for (String path : new String[] {"/api/v1/totem/tipos", "/api/v1/senhas/fila", "/api/v1/tipos-senha", "/api/v1/guiches", "/api/v1/pacientes", "/api/v1/agenda/agendamentos?de=2026-10-22&ate=2026-10-22",
                "/api/v1/dispositivos", "/api/v1/inicio", "/api/v1/profissionais", "/api/v1/auditoria/acessos"})
            mvc.perform(get(path).header("Authorization", "Bearer " + panel)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/totem/senhas").header("Authorization", "Bearer " + panel).contentType("application/json")
            .content(json.writeValueAsString(Map.of("tipoId", consulta)))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/senhas").header("Authorization", "Bearer " + panel).contentType("application/json")
            .content(json.writeValueAsString(Map.of("tipoId", consulta)))).andExpect(status().isForbidden());
        calls(totem).andExpect(status().isForbidden());
    }

    @Test
    void peopleWithoutThePanelPermissionAreRefusedAndNoTokenIsUnauthorized() throws Exception {
        calls(admin).andExpect(status().isForbidden());
        calls(reception).andExpect(status().isForbidden());
        calls(tokenFor(userWith("Tudo menos painel", "fila:ler", "fila:configurar", "fila:chamar", "agenda:ler", "pacientes:ler"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/painel/chamadas")).andExpect(status().isUnauthorized());
    }

    @Test
    void revokingThePanelStopsItAtOnce() throws Exception {
        calls(panel).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/dispositivos/" + panelId).header("Authorization", "Bearer " + admin)).andExpect(status().isNoContent());
        calls(panel).andExpect(status().isUnauthorized());
    }
}
