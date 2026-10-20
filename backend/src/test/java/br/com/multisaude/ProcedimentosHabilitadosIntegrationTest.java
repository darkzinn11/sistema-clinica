package br.com.multisaude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * "A lista manda": o profissional só recebe agendamento (e só mostra horário livre) do que está habilitado para ele.
 * Também cobre a cópia de grade entre profissionais, que anda junto na configuração da agenda.
 */
class ProcedimentosHabilitadosIntegrationTest extends AgendaTestBase {
    private static final String NOT_PERFORMED = "Este profissional não realiza este procedimento.";
    private UUID second, extraProcedure;

    private String admin() throws Exception {
        return tokenFor(userWith("Admin habilitados", "profissionais:ler", "profissionais:editar", "agenda:ler", "agenda:criar", "agenda:remarcar", "agenda:configurar"));
    }

    private UUID newProcedure(String name, boolean active) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.procedimentos (id, tenant_id, nome, duracao_min, ativo) VALUES (?, ?, ?, 30, ?)", id, tenant, name, active));
        return id;
    }

    private ResultActions put(String token, UUID professionalId, List<UUID> ids) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/profissionais/" + professionalId + "/procedimentos")
            .header("Authorization", "Bearer " + token).contentType("application/json").content(json.writeValueAsString(Map.of("procedimentoIds", ids))));
    }

    // ---- a lista ----

    @Test
    void putReplacesTheListAndGetReturnsIt() throws Exception {
        String token = admin();
        UUID other = newProcedure("Ultrassom", true);
        mvc.perform(get("/api/v1/profissionais/" + professional + "/procedimentos").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nome").value("Consulta teste"));
        put(token, professional, List.of(other)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nome").value("Ultrassom"));
        put(token, professional, List.of(procedure, other, other)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        put(token, professional, List.of()).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void newItemsMustExistBeActiveAndBelongToTheClinic() throws Exception {
        String token = admin();
        put(token, professional, List.of(newProcedure("Desativado", false))).andExpect(status().isBadRequest());
        put(token, professional, List.of(UUID.randomUUID())).andExpect(status().isBadRequest());
        put(token, professional, List.of(otherProcedure)).andExpect(status().isBadRequest());
        put(token, UUID.randomUUID(), List.of(procedure)).andExpect(status().isNotFound());
        put(token, otherProfessional, List.of(procedure)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/profissionais/" + professional + "/procedimentos").header("Authorization", "Bearer " + token))
            .andExpect(jsonPath("$.length()").value(1));                       // nenhuma tentativa recusada alterou a lista
    }

    @Test
    void anAlreadyEnabledProcedureThatWasDeactivatedStaysAndIsFlagged() throws Exception {
        String token = admin();
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.procedimentos SET ativo = false WHERE id = ?", procedure));
        put(token, professional, List.of(procedure)).andExpect(status().isOk()).andExpect(jsonPath("$[0].ativo").value(false));
    }

    @Test
    void onlyWhoEditsProfessionalsChangesTheList() throws Exception {
        String reader = tokenFor(userWith("Só lê", "profissionais:ler"));
        put(reader, professional, List.of(procedure)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/profissionais/" + professional + "/procedimentos").header("Authorization", "Bearer " + reader)).andExpect(status().isOk());
        String nobody = tokenFor(userWith("Sem permissão", "agenda:ler"));
        mvc.perform(get("/api/v1/profissionais/" + professional + "/procedimentos").header("Authorization", "Bearer " + nobody)).andExpect(status().isForbidden());
    }

    // ---- a lista manda ----

    @Test
    void bookingAProcedureTheProfessionalDoesNotPerformIsRefused() throws Exception {
        String token = admin();
        UUID notEnabled = newProcedure("Não habilitado", true);
        book(token, unit, professional, patient, notEnabled, start, start.plusMinutes(30)).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("erro").value(NOT_PERFORMED));
        put(token, professional, List.of(procedure, notEnabled)).andExpect(status().isOk());
        book(token, unit, professional, patient, notEnabled, start, start.plusMinutes(30)).andExpect(status().isCreated());
    }

    @Test
    void disablingStopsNewBookingsButKeepsTheExistingOnes() throws Exception {
        String token = admin();
        JsonNode existing = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated()));
        put(token, professional, List.of()).andExpect(status().isOk());
        book(token, unit, professional, patient, procedure, start.plusMinutes(60), start.plusMinutes(90)).andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/v1/agendamentos/" + id(existing) + "/historico").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @Test
    void rescheduleDoesNotRecheckTheList() throws Exception {
        String token = admin();
        JsonNode original = created(book(token, unit, professional, patient, procedure, start, start.plusMinutes(30)).andExpect(status().isCreated()));
        put(token, professional, List.of()).andExpect(status().isOk());
        OffsetDateTime later = start.plusMinutes(60);
        mvc.perform(post("/api/v1/agendamentos/" + id(original) + "/remarcar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("motivoId", 2, "versao", 0, "inicio", later.toString(), "fim", later.plusMinutes(30).toString())))).andExpect(status().isCreated());
    }

    @Test
    void availabilityIsRefusedForAProcedureTheProfessionalDoesNotPerform() throws Exception {
        String token = admin();
        UUID notEnabled = newProcedure("Outro", true);
        LocalDate day = start.toLocalDate();
        availability(token, professional, notEnabled, day).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("erro").value(NOT_PERFORMED));
        availability(token, professional, procedure, day).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(Matchers.greaterThan(0)));
    }

    private ResultActions availability(String token, UUID professionalId, UUID procedureId, LocalDate day) throws Exception {
        return mvc.perform(get("/api/v1/agenda/disponibilidade").header("Authorization", "Bearer " + token).param("profissionalId", professionalId.toString())
            .param("procedimentoId", procedureId.toString()).param("de", day.toString()).param("ate", day.toString()));
    }

    // ---- copiar grade ----

    private void emptyProfessional() {
        second = UUID.randomUUID();
        transactions.inTenant(tenant, () -> { insertProfessional(second, tenant, "Dr. Segundo", "3001", unit); return null; });
    }

    private ResultActions copy(String token, UUID from, UUID to) throws Exception {
        return mvc.perform(post("/api/v1/grades/copiar").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("origemProfissionalId", from, "destinoProfissionalId", to))));
    }

    @Test
    void copyingDuplicatesEveryGradeToTheDestination() throws Exception {
        String token = admin();
        emptyProfessional();
        copy(token, professional, second).andExpect(status().isCreated()).andExpect(jsonPath("$.length()").value(7))
            .andExpect(jsonPath("$[0].profissionalId").value(second.toString())).andExpect(jsonPath("$[0].duracaoBlocoMin").value(30));
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token).param("profissionalId", second.toString())).andExpect(jsonPath("$.length()").value(7));
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token).param("profissionalId", professional.toString())).andExpect(jsonPath("$.length()").value(7));
    }

    @Test
    void copyingIsAllOrNothingWhenTheDestinationAlreadyHasAGrade() throws Exception {
        String token = admin();
        emptyProfessional();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.grades (tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) VALUES (?, ?, ?, 3, '08:00', '12:00', 30)", tenant, second, unit));
        copy(token, professional, second).andExpect(status().isConflict()).andExpect(jsonPath("erro").value(Matchers.containsString("Nada foi copiado")));
        mvc.perform(get("/api/v1/grades").header("Authorization", "Bearer " + token).param("profissionalId", second.toString())).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void copyingValidatesTheProfessionals() throws Exception {
        String token = admin();
        emptyProfessional();
        copy(token, professional, professional).andExpect(status().isBadRequest());
        copy(token, second, professional).andExpect(status().isBadRequest());                         // origem sem grade
        copy(token, professional, unlinkedProfessional).andExpect(status().isBadRequest());           // destino não atende na unidade
        copy(token, professional, otherProfessional).andExpect(status().isBadRequest());              // de outra clínica
        copy(token, professional, UUID.randomUUID()).andExpect(status().isBadRequest());
    }

    @Test
    void onlyWhoConfiguresTheAgendaCanCopy() throws Exception {
        emptyProfessional();
        String reader = tokenFor(userWith("Só agenda", "agenda:ler", "agenda:criar"));
        copy(reader, professional, second).andExpect(status().isForbidden());
    }

    // ---- fixtures ----

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
