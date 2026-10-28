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

    private String receptionToken;

    /** Um só usuário de recepção por teste (o nome do papel é único na clínica). */
    private String reception() throws Exception {
        if (receptionToken == null) receptionToken = tokenFor(userWith("Recepção agenda", "agenda:ler", "agenda:ver_valores"));
        return receptionToken;
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

    // ---- ocupação (Mapa de ocupação) ----

    private ResultActions occupancy(String token, LocalDate from, LocalDate to, UUID professionalId) throws Exception {
        var request = get("/api/v1/agenda/ocupacao").header("Authorization", "Bearer " + token).param("de", from.toString()).param("ate", to.toString());
        if (professionalId != null) request = request.param("profissionalId", professionalId.toString());
        return mvc.perform(request);
    }

    @Test
    void occupancyIsBookedBlocksOverTheGradeBlocksPerDay() throws Exception {
        book("agendado", day, 9);
        book("confirmado", day, 10);
        book("cancelado", day, 11);          // liberou o horário
        book("remarcado", day, 12);
        book("nao_compareceu", day, 13);     // faltou: o horário voltou a ficar livre
        book("atendido", day.plusDays(1), 9);
        // Grade da fixture: 06:00 às 20:00 em blocos de 30 min = 28 blocos, todos os dias.
        occupancy(reception(), day, day.plusDays(1), null).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].profissionalId").value(professional.toString())).andExpect(jsonPath("$[0].data").value(day.toString()))
            .andExpect(jsonPath("$[0].blocos").value(28)).andExpect(jsonPath("$[0].ocupados").value(2))
            .andExpect(jsonPath("$[1].data").value(day.plusDays(1).toString())).andExpect(jsonPath("$[1].ocupados").value(1));
    }

    @Test
    void occupancyIgnoresDaysWithoutGradeInactiveAndHiddenProfessionalsAndOtherUnits() throws Exception {
        UUID hidden = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            insertProfessional(hidden, tenant, "Dr. Oculto", "5001", unit);
            jdbc.update("UPDATE clinica.profissionais SET oculto_na_agenda = true WHERE id = ?", hidden);
            jdbc.update("INSERT INTO clinica.grades (tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) VALUES (?, ?, ?, ?, '08:00', '12:00', 30)", tenant, hidden, unit, day.getDayOfWeek().getValue() % 7);
            return null;
        });
        occupancy(reception(), day, day, null).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].profissionalId").value(professional.toString()));
        occupancy(reception(), day, day, hidden).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void occupancyOfADoctorIsOnlyTheirOwnAndRangesAreLimited() throws Exception {
        UUID doctor = userWith("Médico ocupação", "agenda:ler_proprios");
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.profissionais SET usuario_id = ? WHERE id = ?", doctor, professional));
        UUID other = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            insertProfessional(other, tenant, "Dr. Colega Ocupação", "5002", unit);
            jdbc.update("INSERT INTO clinica.grades (tenant_id, profissional_id, unidade_id, dia_semana, inicio, fim, duracao_bloco_min) VALUES (?, ?, ?, ?, '08:00', '12:00', 30)", tenant, other, unit, day.getDayOfWeek().getValue() % 7);
            return null;
        });
        String token = tokenFor(doctor);
        occupancy(token, day, day, null).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].profissionalId").value(professional.toString()));
        occupancy(token, day, day, other).andExpect(status().isForbidden());
        String reception = reception();
        occupancy(reception, day, day.minusDays(1), null).andExpect(status().isBadRequest());
        occupancy(reception, day, day.plusDays(62), null).andExpect(status().isBadRequest());
        occupancy(reception, day, day.plusDays(61), null).andExpect(status().isOk());
        occupancy(tokenFor(userWith("Sem agenda ocupação", "pacientes:ler")), day, day, null).andExpect(status().isForbidden());
    }

    /** Lê um campo do agendamento `id` na listagem do dia. */
    private ResultActions field(UUID id, String name, org.hamcrest.Matcher<?> matcher) throws Exception {
        return list(reception(), day, day, null).andExpect(jsonPath("$[?(@.id == '" + id + "')]." + name).value(matcher));
    }

    @Test
    void ageIsComputedOnTheAppointmentDayAndTheBirthDateItselfIsNotSent() throws Exception {
        UUID id = book("agendado", day, 9);
        field(id, "pacienteIdade", Matchers.contains(Matchers.nullValue()));
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.pacientes SET nascimento = ? WHERE id = ?", java.sql.Date.valueOf(day.minusYears(65)), patient));
        field(id, "pacienteIdade", Matchers.contains(65));
        // Faz 60 anos um dia depois da consulta: na data da consulta ainda tem 59.
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.pacientes SET nascimento = ? WHERE id = ?", java.sql.Date.valueOf(day.minusYears(60).plusDays(1)), patient));
        field(id, "pacienteIdade", Matchers.contains(59));
        list(reception(), day, day, null).andExpect(jsonPath("$[0].pacienteNascimento").doesNotExist());
    }

    @Test
    void firstVisitIsPerSpecialtyAcrossProfessionalsAndOnlyCountsVisitsThatHappened() throws Exception {
        UUID cardio = UUID.randomUUID(), colleague = UUID.randomUUID();
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.especialidades (id, tenant_id, nome) VALUES (?, ?, 'Cardiologia 1a vez')", cardio, tenant);
            insertProfessional(colleague, tenant, "Dra. Colega Cardio", "5101", unit);
            jdbc.update("INSERT INTO clinica.profissional_especialidades (tenant_id, profissional_id, especialidade_id, principal) VALUES (?, ?, ?, true), (?, ?, ?, true)",
                tenant, professional, cardio, tenant, colleague, cardio);
            return null;
        });
        UUID today = book("agendado", day, 9);
        field(today, "primeiraVez", Matchers.contains(true));
        // Falta e cancelamento antes não contam como ter ido.
        insertAppointmentFor(tenant, unit, colleague, patient, procedure, "nao_compareceu", at(day.minusDays(20), 9, 0), at(day.minusDays(20), 9, 30));
        insertAppointmentFor(tenant, unit, colleague, patient, procedure, "cancelado", at(day.minusDays(15), 9, 0), at(day.minusDays(15), 9, 30));
        field(today, "primeiraVez", Matchers.contains(true));
        // Atendido antes por outro profissional da mesma especialidade: não é mais a 1ª vez.
        insertAppointmentFor(tenant, unit, colleague, patient, procedure, "atendido", at(day.minusDays(10), 9, 0), at(day.minusDays(10), 9, 30));
        field(today, "primeiraVez", Matchers.contains(false));
    }

    @Test
    void firstVisitIsUnknownWhenTheProfessionalHasNoMainSpecialty() throws Exception {
        UUID id = book("agendado", day, 9);
        field(id, "primeiraVez", Matchers.contains(Matchers.nullValue()));
    }

    @Test
    void fitInIsBookedOnTheSameDayOrInASlotAnotherPatientGaveUp() throws Exception {
        UUID planned = book("agendado", day, 9);
        field(planned, "encaixe", Matchers.contains(false));

        // Marcado no próprio dia da consulta.
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.agendamentos SET criado_em = lower(periodo) - interval '2 hours' WHERE id = ?", planned));
        field(planned, "encaixe", Matchers.contains(true));

        // Outro paciente desmarcou o horário das 10h; quem entrou no lugar é encaixe.
        UUID other = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome) VALUES (?, ?, 'Paciente Que Desmarcou')", other, tenant));
        UUID gaveUp = insertAppointmentFor(tenant, unit, professional, other, procedure, "cancelado", at(day, 10, 0), at(day, 10, 30));
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.agendamentos SET criado_em = now() - interval '5 days' WHERE id = ?", gaveUp));
        UUID filled = book("agendado", day, 10);
        field(filled, "encaixe", Matchers.contains(true));
    }

    @Test
    void reschedulingOnesOwnSlotIsNotAFitIn() throws Exception {
        UUID old = book("remarcado", day, 11);
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.agendamentos SET criado_em = now() - interval '5 days' WHERE id = ?", old));
        UUID again = book("agendado", day, 11);
        field(again, "encaixe", Matchers.contains(false));
    }
}
