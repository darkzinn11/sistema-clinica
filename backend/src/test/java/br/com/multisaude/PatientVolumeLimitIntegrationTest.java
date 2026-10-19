package br.com.multisaude;

import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Contenção de varredura de pacientes. Limites reduzidos para o teste:
 * restrito (médico) 5 req/min e 3 registros/hora; completo (recepção) 4 req/min e 5 registros/hora.
 */
@SpringBootTest(properties = {
    "app.limits.patients.restricted.requests-per-minute=5", "app.limits.patients.restricted.records-per-hour=3",
    "app.limits.patients.full.requests-per-minute=4", "app.limits.patients.full.records-per-hour=5"})
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class PatientVolumeLimitIntegrationTest extends AgendaTestBase {
    private final UUID doctorUser = UUID.randomUUID();

    @BeforeEach
    void doctorFixtures() {
        transactions.inTenant(tenant, () -> {
            UUID role = UUID.randomUUID();
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Médico limite', ARRAY['agenda:ler_proprios','pacientes:ler_vinculados'])", role, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Médico limite', ?, 'x')", doctorUser, tenant, "limite-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, doctorUser, unit, role);
            jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctorUser, professional);
            return null;
        });
    }

    @Test
    void restrictedUserNeverReceivesMoreRecordsThanTheHourlyBudget() throws Exception {
        for (int i = 0; i < 4; i++) connectedPatient("Vinculado" + i, i);
        String token = tokenFor(doctorUser);
        // 4 registros passariam do orçamento de 3: nada é entregue.
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + token)).andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After")).andExpect(content().string(Matchers.not(Matchers.containsString("Vinculado"))));
        list(token, 2).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));   // usado: 2
        list(token, 2).andExpect(status().isTooManyRequests());                                  // 2 + 2 > 3
        list(token, 1).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));   // usado: 3
        list(token, 1).andExpect(status().isTooManyRequests());
    }

    @Test
    void restrictedUserIsCappedPerMinuteEvenWhenNothingIsFound() throws Exception {
        String token = tokenFor(doctorUser);
        for (int i = 0; i < 5; i++) {
            mvc.perform(get("/api/v1/pacientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/v1/pacientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + token)).andExpect(status().isTooManyRequests());
    }

    @Test
    void fullUserHasAHigherButStillFiniteBudget() throws Exception {
        for (int i = 0; i < 5; i++) newPatient("Extra" + i); // com o da fixture são 6 > 5 por hora
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['pacientes:ler'] WHERE id = ?", role));
        String token = login();
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + token)).andExpect(status().isTooManyRequests())
            .andExpect(content().string(Matchers.not(Matchers.containsString("Extra"))));
        list(token, 3).andExpect(status().isOk());   // usado: 3
        list(token, 3).andExpect(status().isTooManyRequests());
        list(token, 2).andExpect(status().isOk());   // usado: 5
        // Quarta requisição já foi gasta; a quinta cai no limite por minuto (4).
        mvc.perform(get("/api/v1/pacientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + token)).andExpect(status().isTooManyRequests());
    }

    @Test
    void oneUsersBudgetDoesNotAffectAnother() throws Exception {
        for (int i = 0; i < 4; i++) connectedPatient("Vinculado" + i, i);
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + tokenFor(doctorUser))).andExpect(status().isTooManyRequests());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['pacientes:ler'] WHERE id = ?", role));
        list(login(), 3).andExpect(status().isOk());
    }

    private ResultActions list(String token, int limit) throws Exception {
        return mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + token).param("limite", String.valueOf(limit)));
    }

    private void connectedPatient(String name, int slot) {
        UUID id = newPatient(name);
        insertAppointmentFor(tenant, unit, professional, id, procedure, "agendado", start.plusHours(slot), start.plusHours(slot).plusMinutes(30));
    }

    private UUID newPatient(String name) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, ?)", id, tenant, name));
        return id;
    }
}
