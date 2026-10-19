package br.com.multisaude;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Médico só vê pacientes com vínculo: já atendeu, ou tem agendamento ativo que ainda não terminou. */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class PatientAccessIntegrationTest extends AgendaTestBase {
    private final UUID doctorUser = UUID.randomUUID();
    private final UUID doctorRole = UUID.randomUUID();
    private final UUID colleague = UUID.randomUUID();

    @org.junit.jupiter.api.BeforeEach
    void doctorFixtures() {
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Médico teste', ARRAY['agenda:ler','pacientes:ler_vinculados'])", doctorRole, tenant);
            jdbc.update("INSERT INTO clinica.usuarios (id, tenant_id, nome, email, senha_hash) VALUES (?, ?, 'Médico teste', ?, 'x')", doctorUser, tenant, "medico-" + email);
            jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, doctorUser, unit, doctorRole);
            jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctorUser, professional);
            insertProfessional(colleague, tenant, "Dr. Colega", "7777", unit);
            return null;
        });
    }

    @Test
    void sees_patientWithFutureActiveAppointment() throws Exception {
        UUID p = newPatient("Futuro Ficticio");
        String[] statuses = {"agendado", "confirmado", "check_in"};
        for (int i = 0; i < statuses.length; i++) {
            UUID each = newPatient("Futuro " + statuses[i]);
            // Horários distintos: o mesmo profissional não pode ter dois agendamentos sobrepostos.
            appointment(each, professional, statuses[i], start.plusHours(i), start.plusHours(i).plusMinutes(30));
            visible(each, true);
        }
        appointment(p, professional, "agendado", start.plusHours(5), start.plusHours(6));
        visible(p, true);
    }

    @Test
    void sees_patientAlreadyAttendedOrBeingAttended() throws Exception {
        UUID attended = newPatient("Atendido Ficticio");
        appointment(attended, professional, "atendido", start.minusDays(30), start.minusDays(30).plusMinutes(30));
        visible(attended, true);
        UUID inProgress = newPatient("Em atendimento Ficticio");
        appointment(inProgress, professional, "em_atendimento", start.minusMinutes(10), start.plusMinutes(20));
        visible(inProgress, true);
    }

    @Test
    void doesNotSee_unconnectedPatientsAndThoseWhoseAppointmentsNoLongerCount() throws Exception {
        visible(patient, false);
        for (String status : new String[] {"cancelado", "nao_compareceu", "remarcado"}) {
            UUID each = newPatient("Sem vínculo " + status);
            appointment(each, professional, status, start, start.plusMinutes(30));
            visible(each, false);
        }
        UUID stale = newPatient("Agendado esquecido");
        appointment(stale, professional, "agendado", start.minusDays(30), start.minusDays(30).plusMinutes(30));
        visible(stale, false);
        UUID withColleague = newPatient("Do colega");
        appointment(withColleague, colleague, "atendido", start.minusDays(5), start.minusDays(5).plusMinutes(30));
        visible(withColleague, false);
    }

    @Test
    void connectionIsLostWhenTheOnlyAppointmentIsCancelled() throws Exception {
        UUID p = newPatient("Cancelou depois");
        UUID appointment = appointment(p, professional, "agendado", start, start.plusMinutes(30));
        visible(p, true);
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.agendamentos SET status = 'cancelado' WHERE id = ?", appointment));
        visible(p, false);
    }

    @Test
    void searchIsLimitedToConnectedPatientsAndStillFiltersByName() throws Exception {
        String token = tokenFor(doctorUser);
        UUID mine = newPatient("Maria Vinculada");
        UUID alsoMine = newPatient("Joao Vinculado");
        newPatient("Maria Sem Vinculo");
        appointment(mine, professional, "agendado", start, start.plusMinutes(30));
        appointment(alsoMine, professional, "agendado", start.plusHours(1), start.plusHours(2));
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + token).param("busca", "maria"))
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(mine.toString()));
    }

    @Test
    void userWithoutALinkedProfessionalSeesNothing() throws Exception {
        UUID p = newPatient("Qualquer");
        appointment(p, professional, "atendido", start.minusDays(1), start.minusDays(1).plusMinutes(30));
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.profissionais SET usuario_id = NULL WHERE id = ?", professional));
        visible(p, false);
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + tokenFor(doctorUser))).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void inactiveProfessionalLosesAccess() throws Exception {
        UUID p = newPatient("Qualquer");
        appointment(p, professional, "atendido", start.minusDays(1), start.minusDays(1).plusMinutes(30));
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.profissionais SET ativo = false WHERE id = ?", professional));
        visible(p, false);
    }

    @Test
    void doctorCannotChangePatients() throws Exception {
        String token = tokenFor(doctorUser);
        UUID p = newPatient("Vinculado");
        appointment(p, professional, "agendado", start, start.plusMinutes(30));
        mvc.perform(post("/api/v1/pacientes").header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Novo")))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/pacientes/" + p).header("Authorization", "Bearer " + token).contentType("application/json")
            .content(json.writeValueAsString(Map.of("nome", "Alterado")))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/pacientes/" + p).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }

    @Test
    void userWithFullReadStillSeesEveryPatientAndUnknownIdIsNotFound() throws Exception {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['pacientes:ler'] WHERE id = ?", role));
        String token = login();
        newPatient("Outro");
        mvc.perform(get("/api/v1/pacientes").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/pacientes/" + patient).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/pacientes/" + UUID.randomUUID()).header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
    }

    @Test
    void neverSeesAPatientOfAnotherClinicEvenWithTheirId() throws Exception {
        mvc.perform(get("/api/v1/pacientes/" + otherPatient).header("Authorization", "Bearer " + tokenFor(doctorUser))).andExpect(status().isNotFound());
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.papeis SET permissoes = ARRAY['pacientes:ler'] WHERE id = ?", role));
        mvc.perform(get("/api/v1/pacientes/" + otherPatient).header("Authorization", "Bearer " + login())).andExpect(status().isNotFound());
    }

    @Test
    void professionalCanBeLinkedToOneUserOnly() {
        transactions.inTenant(tenant, () -> {
            org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctorUser, colleague));
            return null;
        });
    }

    private void visible(UUID patientId, boolean expected) throws Exception {
        mvc.perform(get("/api/v1/pacientes/" + patientId).header("Authorization", "Bearer " + tokenFor(doctorUser)))
            .andExpect(expected ? status().isOk() : status().isNotFound());
    }

    private UUID newPatient(String name) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, ?)", id, tenant, name));
        return id;
    }

    private UUID appointment(UUID patientId, UUID professionalId, String status, OffsetDateTime from, OffsetDateTime to) {
        return insertAppointmentFor(tenant, unit, professionalId, patientId, procedure, status, from, to);
    }
}
