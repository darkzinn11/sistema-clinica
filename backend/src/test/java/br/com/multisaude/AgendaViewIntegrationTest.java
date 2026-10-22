package br.com.multisaude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** GET /agenda/agendamentos: a agenda como a tela a desenha (com nomes), restrita à unidade da sessão e ao que a pessoa pode ver. */
class AgendaViewIntegrationTest extends AgendaTestBase {
    private static final ZoneId ZONE = ZoneId.of("America/Fortaleza");
    private final LocalDate day = LocalDate.now(ZONE).plusDays(3);

    private OffsetDateTime at(LocalDate d, int hour, int minute) {
        return ZonedDateTime.of(d, java.time.LocalTime.of(hour, minute), ZONE).toOffsetDateTime();
    }

    private UUID book(String status, LocalDate d, int hour) {
        return insertAppointmentFor(tenant, unit, professional, patient, procedure, status, at(d, hour, 0), at(d, hour, 30));
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

    private String reception() throws Exception {
        return tokenFor(userWith("Recepção agenda", "agenda:ler", "agenda:ver_valores"));
    }

    private ResultActions list(String token, LocalDate from, LocalDate to, UUID professionalId) throws Exception {
        var request = get("/api/v1/agenda/agendamentos").header("Authorization", "Bearer " + token).param("de", from.toString()).param("ate", to.toString());
        if (professionalId != null) request = request.param("profissionalId", professionalId.toString());
        return mvc.perform(request);
    }

    private void price(long cents) {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.procedimentos SET valor_centavos = ? WHERE id = ?", cents, procedure));
    }

    @Test
    void returnsTheDayWithNamesPriceAndTheClinicsClock() throws Exception {
        price(18000);
        UUID id = book("confirmado", day, 9);
        list(reception(), day, day, null).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(id.toString()))
            .andExpect(jsonPath("$[0].data").value(day.toString())).andExpect(jsonPath("$[0].inicio").value(Matchers.endsWith("09:00:00-03:00")))
            .andExpect(jsonPath("$[0].fim").value(Matchers.endsWith("09:30:00-03:00"))).andExpect(jsonPath("$[0].status").value("confirmado"))
            .andExpect(jsonPath("$[0].pacienteNome").value("Paciente Ficticio")).andExpect(jsonPath("$[0].procedimentoNome").value("Consulta teste"))
            .andExpect(jsonPath("$[0].profissionalId").value(professional.toString())).andExpect(jsonPath("$[0].valorCentavos").value(18000))
            .andExpect(jsonPath("$[0].versao").value(0));
    }

    @Test
    void theRangeIncludesBothEndDaysAndNothingOutside() throws Exception {
        book("agendado", day.minusDays(1), 9);
        book("agendado", day, 9);
        book("agendado", day.plusDays(1), 9);
        book("agendado", day.plusDays(2), 9);
        String token = reception();
        list(token, day, day.plusDays(1), null).andExpect(jsonPath("$.length()").value(2));
        list(token, day, day, null).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void cancelledAndRescheduledStayInTheListSoTheScreenCanShowThem() throws Exception {
        book("cancelado", day, 9);
        book("remarcado", day, 10);
        book("nao_compareceu", day, 11);
        list(reception(), day, day, null).andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void valuesAreHiddenFromWhoMayNotSeeThem() throws Exception {
        price(18000);
        book("agendado", day, 9);
        list(tokenFor(userWith("Sem valores", "agenda:ler")), day, day, null).andExpect(status().isOk()).andExpect(jsonPath("$[0].valorCentavos").doesNotExist());
    }

    @Test
    void filtersByProfessional() throws Exception {
        UUID second = UUID.randomUUID();
        transactions.inTenant(tenant, () -> { insertProfessional(second, tenant, "Dr. Segundo", "4001", unit); return null; });
        book("agendado", day, 9);
        insertAppointmentFor(tenant, unit, second, patient, procedure, "agendado", at(day, 9, 0), at(day, 9, 30));
        String token = reception();
        list(token, day, day, null).andExpect(jsonPath("$.length()").value(2));
        list(token, day, day, second).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].profissionalNome").value("Dr. Segundo"));
    }

    @Test
    void arrivalTimeComesFromTheLastCheckIn() throws Exception {
        UUID id = book("check_in", day, 9);
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.agendamento_historico (tenant_id, agendamento_id, de, para, usuario_id, em) VALUES (?, ?, 'confirmado', 'check_in', ?, now() - interval '7 minutes')", tenant, id, user);
            return null;
        });
        book("agendado", day, 10);
        list(reception(), day, day, null).andExpect(jsonPath("$[0].chegadaEm").exists()).andExpect(jsonPath("$[1].chegadaEm").doesNotExist());
    }

    @Test
    void otherUnitsAndOtherClinicsNeverAppear() throws Exception {
        UUID elsewhere = UUID.randomUUID();
        transactions.inTenant(tenant, () -> { insertProfessional(elsewhere, tenant, "Dr. Outra Unidade", "4002", otherUnit); return null; });
        insertAppointmentFor(tenant, otherUnit, elsewhere, patient, procedure, "agendado", at(day, 9, 0), at(day, 9, 30));
        insertAppointmentFor(otherTenant, otherUnitOfOtherTenant, otherProfessional, otherPatient, otherProcedure, "agendado", at(day, 9, 0), at(day, 9, 30));
        list(reception(), day, day, null).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void aDoctorSeesOnlyTheirOwnAgenda() throws Exception {
        UUID doctor = userWith("Médico agenda", "agenda:ler_proprios");
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctor, professional));
        UUID other = UUID.randomUUID();
        transactions.inTenant(tenant, () -> { insertProfessional(other, tenant, "Dr. Colega", "4003", unit); return null; });
        UUID mine = book("agendado", day, 9);
        insertAppointmentFor(tenant, unit, other, patient, procedure, "agendado", at(day, 9, 0), at(day, 9, 30));
        String token = tokenFor(doctor);
        list(token, day, day, null).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(mine.toString()));
        list(token, day, day, other).andExpect(status().isForbidden());
        // Médico sem profissional ligado não vê nada.
        list(tokenFor(userWith("Médico sem vínculo", "agenda:ler_proprios")), day, day, null).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void invalidRangesAreRefused() throws Exception {
        String token = reception();
        list(token, day, day.minusDays(1), null).andExpect(status().isBadRequest());
        list(token, day, day.plusDays(31), null).andExpect(status().isBadRequest());
        list(token, day, day.plusDays(30), null).andExpect(status().isOk());
    }

    @Test
    void needsAgendaPermissionAndLeavesATrailOfWhoWasShown() throws Exception {
        UUID named = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, 'Paciente auditado')", named, tenant));
        insertAppointmentFor(tenant, unit, professional, named, procedure, "agendado", at(day, 9, 0), at(day, 9, 30));
        list(reception(), day, day, null).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> {
            org.junit.jupiter.api.Assertions.assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE acao = 'listar_pacientes' AND paciente_id = ?", Integer.class, named));
            return null;
        });
        list(tokenFor(userWith("Sem agenda", "pacientes:ler")), day, day, null).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/agenda/agendamentos").param("de", day.toString()).param("ate", day.toString())).andExpect(status().isUnauthorized());
    }
}
