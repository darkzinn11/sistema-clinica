package br.com.multisaude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tela de Início da recepção: números do dia da unidade da sessão. Os horários usam o dia de hoje na unidade (America/Fortaleza):
 * "passado" em 00:10 e "futuro" em 23:20, então o teste não serve se for rodado entre 00:00 e 00:40 ou depois das 23:20.
 */
class InicioIntegrationTest extends AgendaTestBase {
    private static final ZoneId ZONE = ZoneId.of("America/Fortaleza");
    private final LocalDate today = LocalDate.now(ZONE);

    private OffsetDateTime at(LocalDate day, int hour, int minute) {
        return ZonedDateTime.of(day, java.time.LocalTime.of(hour, minute), ZONE).toOffsetDateTime();
    }

    private UUID book(UUID professionalId, UUID patientId, String status, OffsetDateTime from) {
        UUID id = insertAppointmentFor(tenant, unit, professionalId, patientId, procedure, status, from, from.plusMinutes(30));
        return id;
    }

    private UUID patientNamed(String name, LocalDate born, boolean active) {
        UUID id = UUID.randomUUID();
        transactions.inTenant(tenant, () -> jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, nome, nascimento, ativo) VALUES (?, ?, ?, ?, ?)", id, tenant, name, born, active));
        return id;
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
        return tokenFor(userWith("Recepção início", "agenda:ler", "pacientes:ler", "agenda:ver_valores"));
    }

    private ResultActions summary(String token) throws Exception {
        return mvc.perform(get("/api/v1/inicio").header("Authorization", "Bearer " + token));
    }

    private void price(long cents) {
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.procedimentos SET valor_centavos = ? WHERE id = ?", cents, procedure));
    }

    @Test
    void countsTodayAndYesterdayAndLeavesOutCancelledAndRescheduled() throws Exception {
        book(professional, patient, "atendido", at(today, 0, 10));
        book(professional, patient, "confirmado", at(today, 23, 20));
        book(professional, patient, "cancelado", at(today, 12, 0));
        book(professional, patient, "remarcado", at(today, 13, 0));
        book(professional, patient, "agendado", at(today.minusDays(1), 9, 0));
        summary(reception()).andExpect(status().isOk()).andExpect(jsonPath("data").value(today.toString()))
            .andExpect(jsonPath("agendamentosHoje").value(2)).andExpect(jsonPath("agendamentosOntem").value(1));
    }

    @Test
    void confirmationRateCountsConfirmedAndBeyondAmongThoseWhoDidNotMiss() throws Exception {
        book(professional, patient, "confirmado", at(today, 8, 0));
        book(professional, patient, "check_in", at(today, 9, 0));
        book(professional, patient, "atendido", at(today, 10, 0));
        book(professional, patient, "agendado", at(today, 11, 0));
        book(professional, patient, "nao_compareceu", at(today, 12, 0));      // faltou: fora da conta
        summary(reception()).andExpect(jsonPath("confirmados").value(3)).andExpect(jsonPath("taxaConfirmacaoPct").value(75))
            .andExpect(jsonPath("agendamentosHoje").value(5));
    }

    @Test
    void emptyDayHasZeroRateNotADivisionError() throws Exception {
        summary(reception()).andExpect(status().isOk()).andExpect(jsonPath("taxaConfirmacaoPct").value(0)).andExpect(jsonPath("proximos.length()").value(0));
    }

    @Test
    void nextAppointmentsAreTheFutureOnesInOrderAndOnlyThoseThatAreStillPending() throws Exception {
        UUID second = UUID.randomUUID();
        transactions.inTenant(tenant, () -> { insertProfessional(second, tenant, "Dr. Segundo", "3002", unit); return null; });
        book(professional, patient, "agendado", at(today, 0, 10));         // já passou
        book(professional, patient, "atendido", at(today, 23, 55));        // futuro, mas já atendido: não é "próximo"
        UUID later = book(second, patient, "agendado", at(today, 23, 30));
        UUID sooner = book(professional, patient, "confirmado", at(today, 23, 20));
        summary(reception()).andExpect(jsonPath("proximos.length()").value(2)).andExpect(jsonPath("proximos[0].id").value(sooner.toString()))
            .andExpect(jsonPath("proximos[1].id").value(later.toString())).andExpect(jsonPath("proximos[0].pacienteNome").value("Paciente Ficticio"))
            .andExpect(jsonPath("proximos[0].procedimentoNome").value("Consulta teste")).andExpect(jsonPath("proximos[0].status").value("confirmado"))
            .andExpect(jsonPath("proximos[0].inicio").value(org.hamcrest.Matchers.endsWith("23:20:00-03:00")));   // hora da unidade, com o deslocamento dela
    }

    @Test
    void theWaitingRoomIsWhoCheckedInTodayWithHowLongTheyWait() throws Exception {
        UUID waiting = book(professional, patient, "check_in", at(today, 8, 0));
        transactions.inTenant(tenant, () -> jdbc.update("UPDATE clinica.agendamentos SET atualizado_em = now() - interval '25 minutes' WHERE id = ?", waiting));
        book(professional, patient, "em_atendimento", at(today, 9, 0));     // já foi chamado
        book(professional, patient, "agendado", at(today, 10, 0));
        summary(reception()).andExpect(jsonPath("naSalaDeEspera").value(1)).andExpect(jsonPath("espera.length()").value(1))
            .andExpect(jsonPath("espera[0].agendamentoId").value(waiting.toString())).andExpect(jsonPath("espera[0].aguardandoMin").value(25));
    }

    @Test
    void waitingTimeUsesTheMomentOfCheckInFromTheHistoryWhenThereIsOne() throws Exception {
        UUID waiting = book(professional, patient, "check_in", at(today, 8, 0));
        transactions.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.agendamento_historico (tenant_id, agendamento_id, de, para, usuario_id, em) VALUES (?, ?, 'confirmado', 'check_in', ?, now() - interval '12 minutes')", tenant, waiting, user);
            return null;
        });
        summary(reception()).andExpect(jsonPath("espera[0].aguardandoMin").value(12));
    }

    @Test
    void revenueIsTodaysProcedurePricesAndOnlyForWhoMaySeeValues() throws Exception {
        price(15000);
        book(professional, patient, "agendado", at(today, 8, 0));
        book(professional, patient, "confirmado", at(today, 9, 0));
        book(professional, patient, "cancelado", at(today, 10, 0));
        book(professional, patient, "agendado", at(today.minusDays(1), 8, 0));
        summary(reception()).andExpect(jsonPath("faturamentoPrevistoCentavos").value(30000)).andExpect(jsonPath("faturamentoOntemCentavos").value(15000));
        String noValues = tokenFor(userWith("Sem valores", "agenda:ler", "pacientes:ler"));
        summary(noValues).andExpect(status().isOk()).andExpect(jsonPath("faturamentoPrevistoCentavos").doesNotExist()).andExpect(jsonPath("faturamentoOntemCentavos").doesNotExist())
            .andExpect(jsonPath("agendamentosHoje").value(2));
    }

    @Test
    void occupancyIsBookedBlocksOverTheBlocksOfTheDaysGrade() throws Exception {
        for (int i = 0; i < 7; i++) book(professional, patient, "agendado", at(today, 8 + i, 0));
        book(professional, patient, "cancelado", at(today, 16, 0));
        // Grade da fixture: 06:00 às 20:00 em blocos de 30 min = 28 blocos.
        summary(reception()).andExpect(jsonPath("ocupacao.length()").value(1)).andExpect(jsonPath("ocupacao[0].profissionalId").value(professional.toString()))
            .andExpect(jsonPath("ocupacao[0].blocos").value(28)).andExpect(jsonPath("ocupacao[0].ocupados").value(7)).andExpect(jsonPath("ocupacao[0].ocupacaoPct").value(25));
    }

    @Test
    void unconfirmedTomorrowCountsOnlyScheduledOnes() throws Exception {
        LocalDate tomorrow = today.plusDays(1);
        book(professional, patient, "agendado", at(tomorrow, 8, 0));
        book(professional, patient, "agendado", at(tomorrow, 9, 0));
        book(professional, patient, "confirmado", at(tomorrow, 10, 0));
        summary(reception()).andExpect(jsonPath("semConfirmacaoAmanha").value(2));
    }

    @Test
    void birthdaysAreTodayToSixDaysAheadOfActivePatientsOnly() throws Exception {
        patientNamed("Faz hoje", today.minusYears(40), true);
        patientNamed("Faz em seis dias", today.plusDays(6).minusYears(30), true);
        patientNamed("Faz em sete dias", today.plusDays(7).minusYears(30), true);
        patientNamed("Fez ontem", today.minusDays(1).minusYears(30), true);
        patientNamed("Inativo faz hoje", today.minusYears(50), false);
        summary(reception()).andExpect(jsonPath("aniversariantes.length()").value(2)).andExpect(jsonPath("aniversariantes[0].nome").value("Faz hoje"))
            .andExpect(jsonPath("aniversariantes[0].idade").value(40)).andExpect(jsonPath("aniversariantes[1].nome").value("Faz em seis dias"))
            .andExpect(jsonPath("aniversariantes[1].idade").value(30));
    }

    @Test
    void otherUnitsAndOtherClinicsNeverCountOrAppear() throws Exception {
        UUID inOtherUnit = UUID.randomUUID();
        transactions.inTenant(tenant, () -> { insertProfessional(inOtherUnit, tenant, "Dr. Outra Unidade", "3003", otherUnit); return null; });
        insertAppointmentFor(tenant, otherUnit, inOtherUnit, patient, procedure, "check_in", at(today, 9, 0), at(today, 9, 30));
        insertAppointmentFor(otherTenant, otherUnitOfOtherTenant, otherProfessional, otherPatient, otherProcedure, "check_in", at(today, 9, 0), at(today, 9, 30));
        summary(reception()).andExpect(jsonPath("agendamentosHoje").value(0)).andExpect(jsonPath("naSalaDeEspera").value(0)).andExpect(jsonPath("espera.length()").value(0));
    }

    @Test
    void seeingPatientNamesLeavesATrailOfWhoWasShown() throws Exception {
        UUID waiting = patientNamed("Na espera auditada", today.minusYears(20), true);
        book(professional, waiting, "check_in", at(today, 8, 0));
        UUID birthday = patientNamed("Aniversariante auditado", today.minusYears(33), true);
        String token = reception();
        summary(token).andExpect(status().isOk());
        transactions.inTenant(tenant, () -> {
            Integer rows = jdbc.queryForObject("SELECT count(*) FROM clinica.acessos_prontuario WHERE acao = 'listar_pacientes' AND paciente_id IN (?, ?)", Integer.class, waiting, birthday);
            org.junit.jupiter.api.Assertions.assertEquals(2, rows);
            return null;
        });
    }

    @Test
    void needsAgendaAndPatientsPermissions() throws Exception {
        summary(tokenFor(userWith("Só agenda", "agenda:ler"))).andExpect(status().isForbidden());
        summary(tokenFor(userWith("Só pacientes", "pacientes:ler"))).andExpect(status().isForbidden());
        summary(tokenFor(userWith("Médico", "agenda:ler_proprios", "pacientes:ler_vinculados"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/inicio")).andExpect(status().isUnauthorized());
    }
}
