package br.com.multisaude.seed;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import br.com.multisaude.agenda.AgendaRepository;
import br.com.multisaude.agenda.ScheduleRepository;
import br.com.multisaude.cadastros.ProcedureRepository;
import br.com.multisaude.cadastros.SpecialtyRepository;
import br.com.multisaude.fila.FilaRepository;
import br.com.multisaude.identidade.IdentityRepository;
import br.com.multisaude.identidade.LoginRateLimiter;
import br.com.multisaude.pacientes.PatientRepository;
import br.com.multisaude.profissionais.ProfessionalRepository;
import br.com.multisaude.seed.DevSeed.Clinic;
import br.com.multisaude.shared.TenantTransactions;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Os seeds rodam dentro da transação do teste (desfeita no fim) com códigos de clínica próprios, então não sujam o banco de
 * desenvolvimento nem dependem de ele já ter sido semeado. O que se confere é o que o front vai usar: entrar, ver agenda, fila e pacientes.
 */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Transactional
class DevSeedIntegrationTest {
    private static final String PASSWORD = "Senha-de-seed-2026!";
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired TenantTransactions tx;
    @Autowired PasswordEncoder passwords;
    @Autowired LoginRateLimiter limiter;
    @Autowired IdentityRepository identity;
    @Autowired SpecialtyRepository specialties;
    @Autowired ProcedureRepository procedures;
    @Autowired ProfessionalRepository professionals;
    @Autowired ScheduleRepository schedule;
    @Autowired AgendaRepository agenda;
    @Autowired FilaRepository fila;
    @Autowired PatientRepository patients;
    private final JsonMapper json = JsonMapper.builder().build();
    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private String first, second;

    @BeforeEach
    void seed() {
        ((Map<?, ?>) ReflectionTestUtils.getField(limiter, "windows")).clear();
        List<Clinic> clinics = SeedData.clinics().stream().map(c -> new Clinic(c.code() + "-" + suffix, c.name(), c.units(), c.accounts(), c.specialties(),
            c.procedures(), c.professionals(), c.saturdayUnit(), c.saturdayProfessionals(), c.patientNames(), c.patientOffset())).toList();
        first = clinics.get(0).code();
        second = clinics.get(1).code();
        seeder().seed(clinics, passwords.encode(PASSWORD));
    }

    private DevSeed seeder() {
        return new DevSeed(tx, jdbc, passwords, new MockEnvironment(), identity, specialties, procedures, professionals, schedule, agenda, fila, patients);
    }

    private UUID tenantOf(String code) {
        return jdbc.queryForObject("SELECT tenant_id FROM clinica.codigos_clinica WHERE codigo = ?", UUID.class, code);
    }

    private <T> T inClinic(String code, java.util.function.Supplier<T> work) {
        return tx.inTenant(tenantOf(code), work);
    }

    private ResultActions login(String code, String email, String password, UUID unit) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("codigoClinica", code, "email", email, "senha", password));
        if (unit != null) body.put("unidadeId", unit);
        return mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(body)));
    }

    private String token(String code, String email) throws Exception {
        ResultActions result = login(code, email, PASSWORD, null);
        if (result.andReturn().getResponse().getStatus() == 409) {
            JsonNode units = json.readTree(result.andReturn().getResponse().getContentAsString()).get("unidades");
            result = login(code, email, PASSWORD, UUID.fromString(units.get(0).get("id").asString()));
        }
        result.andExpect(status().isOk());
        return json.readTree(result.andReturn().getResponse().getContentAsString()).get("accessToken").asString();
    }

    private ResultActions get(String token, String path) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1" + path).header("Authorization", "Bearer " + token));
    }

    @Test
    void theSeededUsersCanLogInAndTheReceptionistChoosesBetweenTwoUnits() throws Exception {
        login(first, "admin@multisaude.test", PASSWORD, null).andExpect(status().isOk()).andExpect(jsonPath("usuario.papel").value("Administrador"))
            .andExpect(jsonPath("usuario.clinicaNome").value("Clínica Popular MultiSaúde"));
        login(first, "igor.leonardo@multisaude.test", PASSWORD, null).andExpect(status().isConflict()).andExpect(jsonPath("unidades.length()").value(2));
        login(first, "admin@multisaude.test", "senha errada 123", null).andExpect(status().isUnauthorized());
        login(second, "admin@bemviver.test", PASSWORD, null).andExpect(status().isOk());
        login(second, "admin@multisaude.test", PASSWORD, null).andExpect(status().isUnauthorized());     // cada clínica tem as suas contas
    }

    @Test
    void eachClinicHasItsOwnCatalogProfessionalsAndPatients() throws Exception {
        String admin = token(first, "admin@multisaude.test");
        get(admin, "/profissionais?limite=50").andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(8));
        get(admin, "/especialidades").andExpect(jsonPath("$.length()").value(8));
        get(admin, "/procedimentos?limite=50").andExpect(jsonPath("$.length()").value(20));
        get(admin, "/pacientes?limite=100").andExpect(jsonPath("$.length()").value(27));          // 28 menos 1 inativo
        get(admin, "/pacientes?situacao=inativos").andExpect(jsonPath("$.length()").value(1));
        String other = token(second, "admin@bemviver.test");
        get(other, "/profissionais?limite=50").andExpect(jsonPath("$.length()").value(3));
        get(other, "/pacientes?limite=100").andExpect(jsonPath("$.length()").value(9));                       // 10 menos 1 inativo
        get(other, "/procedimentos?limite=50").andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void thePatientsHaveTheFeegowFieldsAndTheRulesHold() throws Exception {
        String admin = token(first, "admin@multisaude.test");
        JsonNode all = json.readTree(get(admin, "/pacientes?limite=100&situacao=todos").andReturn().getResponse().getContentAsString());
        assertEquals(28, all.size());
        long withoutCpf = 0, foreign = 0, withPriority = 0;
        java.util.Set<Long> records = new java.util.HashSet<>();
        for (JsonNode p : all) {
            if (p.get("semCpf").asBoolean()) withoutCpf++;
            if (p.get("estrangeiro").asBoolean()) foreign++;
            if (!p.get("prioridadeId").isNull()) withPriority++;
            assertTrue(records.add(p.get("numeroProntuario").asLong()), "prontuário repetido");
            if (!p.get("semCpf").asBoolean() && !p.get("estrangeiro").asBoolean()) assertTrue(br.com.multisaude.shared.CpfValidator.isValid(p.get("cpf").asString()));
        }
        assertTrue(withoutCpf >= 1 && foreign >= 1 && withPriority >= 1, "variedade de casos para as telas");
        assertEquals(28, records.size());
        assertEquals(1L, records.stream().min(Long::compare).get());
        assertEquals(28L, records.stream().max(Long::compare).get());
    }

    @Test
    void todayHasAppointmentsInEveryStatusAndTicketsWaiting() throws Exception {
        UUID tenant = tenantOf(first);
        Map<String, Long> byStatus = inClinic(first, () -> {
            Map<String, Long> m = new HashMap<>();
            jdbc.query("SELECT status, count(*) FROM clinica.agendamentos GROUP BY status", rs -> { m.put(rs.getString(1), rs.getLong(2)); });
            return m;
        });
        for (String status : List.of("agendado", "confirmado", "check_in", "em_atendimento", "atendido", "cancelado", "nao_compareceu"))
            assertTrue(byStatus.getOrDefault(status, 0L) > 0, "sem agendamento " + status);
        Long tickets = inClinic(first, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.senhas", Long.class));
        assertEquals(5L, tickets);
        String reception = token(first, "igor.leonardo@multisaude.test");
        get(reception, "/senhas/fila").andExpect(status().isOk());
        assertNotNull(tenant);
    }

    @Test
    void everyProfessionalCanOnlyBookTheirOwnProceduresAndHasAGrade() {
        inClinic(first, () -> {
            Long withoutProcedures = jdbc.queryForObject("SELECT count(*) FROM clinica.profissionais p WHERE NOT EXISTS (SELECT 1 FROM clinica.profissional_procedimentos x WHERE x.profissional_id = p.id)", Long.class);
            Long withoutGrade = jdbc.queryForObject("SELECT count(*) FROM clinica.profissionais p WHERE NOT EXISTS (SELECT 1 FROM clinica.grades g WHERE g.profissional_id = p.id)", Long.class);
            Long agendaOutsideTheList = jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos a WHERE NOT EXISTS (SELECT 1 FROM clinica.profissional_procedimentos x WHERE x.profissional_id = a.profissional_id AND x.procedimento_id = a.procedimento_id)", Long.class);
            assertEquals(0L, withoutProcedures);
            assertEquals(0L, withoutGrade);
            assertEquals(0L, agendaOutsideTheList);
            return null;
        });
    }

    @Test
    void theDemoDoctorSeesOnlyTheirOwnPatientsWithTheRestrictedRecord() throws Exception {
        String doctor = token(first, "camila.esteves@multisaude.test");
        JsonNode list = json.readTree(get(doctor, "/pacientes").andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertTrue(list.size() > 0 && list.size() < 27, "só os pacientes com vínculo");
        String id = list.get(0).get("id").asString();
        get(doctor, "/pacientes/" + id).andExpect(status().isOk()).andExpect(jsonPath("logradouro").doesNotExist()).andExpect(jsonPath("parentes.length()").value(0));
    }

    @Test
    void runningTheSeedAgainDoesNotDuplicateAnythingAndNeverNeedsAPasswordInTheCode() throws Exception {
        Long before = inClinic(first, () -> jdbc.queryForObject("SELECT (SELECT count(*) FROM clinica.pacientes) + (SELECT count(*) FROM clinica.agendamentos) + (SELECT count(*) FROM clinica.senhas) + (SELECT count(*) FROM clinica.usuarios)", Long.class));
        List<Clinic> same = SeedData.clinics().stream().map(c -> new Clinic(c.code() + "-" + suffix, c.name(), c.units(), c.accounts(), c.specialties(),
            c.procedures(), c.professionals(), c.saturdayUnit(), c.saturdayProfessionals(), c.patientNames(), c.patientOffset())).toList();
        seeder().seed(same, passwords.encode(PASSWORD));
        Long after = inClinic(first, () -> jdbc.queryForObject("SELECT (SELECT count(*) FROM clinica.pacientes) + (SELECT count(*) FROM clinica.agendamentos) + (SELECT count(*) FROM clinica.senhas) + (SELECT count(*) FROM clinica.usuarios)", Long.class));
        assertEquals(before, after);
        // Sem a senha, o runner recusa; com senha curta também.
        assertThrows(IllegalArgumentException.class, () -> seeder().run(new DefaultApplicationArguments()));
        MockEnvironment shortPassword = new MockEnvironment().withProperty("SEED_PASSWORD", "curta");
        assertThrows(IllegalArgumentException.class, () -> new DevSeed(tx, jdbc, passwords, shortPassword, identity, specialties, procedures, professionals, schedule, agenda, fila, patients).run(new DefaultApplicationArguments()));
        MockEnvironment prod = new MockEnvironment().withProperty("SEED_PASSWORD", PASSWORD);
        prod.setActiveProfiles("prod");
        assertThrows(IllegalStateException.class, () -> new DevSeed(tx, jdbc, passwords, prod, identity, specialties, procedures, professionals, schedule, agenda, fila, patients).run(new DefaultApplicationArguments()));
    }

    @Test
    void theAgendaAndTheQueueAreRenewedWhenTheDemoWentStale() throws Exception {
        java.time.LocalDate later = java.time.LocalDate.now().plusDays(20);       // "daqui a 20 dias": nada de agenda ou fila para essa data
        Long appointmentsBefore = inClinic(first, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos", Long.class));
        UUID tenant = tenantOf(first);
        inClinic(first, () -> { seeder().refreshDay(tenant, later); return null; });
        Long appointmentsAfter = inClinic(first, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos", Long.class));
        assertTrue(appointmentsAfter > appointmentsBefore, "agenda renovada");
        assertEquals(5L, inClinic(first, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.senhas WHERE dia = ?", Long.class, later)));
        inClinic(first, () -> { seeder().refreshDay(tenant, later); return null; });          // de novo: nada muda
        assertEquals(appointmentsAfter, inClinic(first, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.agendamentos", Long.class)));
        assertEquals(5L, inClinic(first, () -> jdbc.queryForObject("SELECT count(*) FROM clinica.senhas WHERE dia = ?", Long.class, later)));
    }

    @Test
    void theGeneratedCpfsAreValidAndDistinct() {
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (int i = 0; i < 600; i++) {
            String cpf = SeedData.cpf(i);
            assertTrue(br.com.multisaude.shared.CpfValidator.isValid(cpf), cpf);
            assertTrue(seen.add(cpf), "repetido " + cpf);
        }
    }
}
