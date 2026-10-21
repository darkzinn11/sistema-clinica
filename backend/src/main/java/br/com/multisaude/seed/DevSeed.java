package br.com.multisaude.seed;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import br.com.multisaude.agenda.AgendaModels.CreateAppointmentRequest;
import br.com.multisaude.agenda.AgendaRepository;
import br.com.multisaude.agenda.ScheduleModels.CreateGradeRequest;
import br.com.multisaude.agenda.ScheduleRepository;
import br.com.multisaude.cadastros.ProcedureRepository;
import br.com.multisaude.cadastros.SpecialtyRepository;
import br.com.multisaude.fila.FilaModels.CounterTypeRef;
import br.com.multisaude.fila.FilaModels.TicketTypeRequest;
import br.com.multisaude.fila.FilaRepository;
import br.com.multisaude.identidade.DefaultRoles;
import br.com.multisaude.identidade.IdentityModels.CreateUserRequest;
import br.com.multisaude.identidade.IdentityService;
import br.com.multisaude.identidade.IdentityRepository;
import br.com.multisaude.pacientes.PatientModels.PatientForm;
import br.com.multisaude.pacientes.PatientModels.RelativeForm;
import br.com.multisaude.pacientes.PatientRepository;
import br.com.multisaude.profissionais.ProfessionalModels.CreateProfessionalRequest;
import br.com.multisaude.profissionais.ProfessionalRepository;
import br.com.multisaude.shared.TenantTransactions;

/**
 * Dados de demonstração para desenvolvimento: duas clínicas fictícias (o front não precisa de mock para ter o que mostrar).
 * Só roda com {@code seed.enabled=true} e exige SEED_PASSWORD (senha de todos os usuários de demonstração; nunca fica no código).
 * Idempotente: clínica que já tem o código não é recriada. A cada execução, a agenda e a fila do dia são renovadas se estiverem vazias.
 * Não há "reset": as tabelas de histórico e de acesso são somente-inserção, de propósito. Para recomeçar, recrie o banco de desenvolvimento.
 */
@Component
@ConditionalOnProperty(name = "seed.enabled", havingValue = "true")
public class DevSeed implements ApplicationRunner {
    record Specialty(String name) {}
    record Procedure(String name, String type, int minutes, long cents, String specialty) {}
    record Professional(String name, String specialty, String council, String number, int startHour, int endHour, int blockMin) {}
    record Account(String name, String email, String role, List<String> units, String professional) {}
    record Clinic(String code, String name, List<String> units, List<Account> accounts, List<String> specialties,
        List<Procedure> procedures, List<Professional> professionals, String saturdayUnit, List<String> saturdayProfessionals,
        List<String> patientNames, int patientOffset) {}

    private static final String[] COLORS = {"#0F766E", "#B45309", "#7C3AED", "#BE123C", "#1D4ED8", "#4D7C0F", "#C2410C", "#0E7490"};
    private static final String[] CHANNELS = {"clinica", "telefone", "whatsapp", "online"};
    private static final ZoneId ZONE = ZoneId.of("America/Fortaleza");

    private final TenantTransactions tx;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final Environment env;
    private final IdentityRepository identity;
    private final SpecialtyRepository specialties;
    private final ProcedureRepository procedures;
    private final ProfessionalRepository professionals;
    private final ScheduleRepository schedule;
    private final AgendaRepository agenda;
    private final FilaRepository fila;
    private final PatientRepository patients;

    public DevSeed(TenantTransactions tx, JdbcTemplate jdbc, PasswordEncoder passwords, Environment env, IdentityRepository identity,
        SpecialtyRepository specialties, ProcedureRepository procedures, ProfessionalRepository professionals, ScheduleRepository schedule,
        AgendaRepository agenda, FilaRepository fila, PatientRepository patients) {
        this.tx = tx; this.jdbc = jdbc; this.passwords = passwords; this.env = env; this.identity = identity; this.specialties = specialties;
        this.procedures = procedures; this.professionals = professionals; this.schedule = schedule; this.agenda = agenda; this.fila = fila; this.patients = patients;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (Arrays.asList(env.getActiveProfiles()).contains("prod")) throw new IllegalStateException("seed.enabled não pode ser usado com o perfil prod.");
        String password = env.getProperty("SEED_PASSWORD");
        if (password == null || password.length() < 12) throw new IllegalArgumentException("Defina SEED_PASSWORD (mínimo 12 caracteres): é a senha dos usuários de demonstração.");
        IdentityService.validatePasswordBytes(password);
        seed(SeedData.clinics(), passwords.encode(password));
        System.out.println("Seeds de desenvolvimento prontos. Entre com o código da clínica (vida-plena ou bem-viver) e SEED_PASSWORD.");
    }

    void seed(List<Clinic> clinics, String hash) {
        for (Clinic clinic : clinics) {
            Optional<UUID> existing = jdbc.query("SELECT tenant_id FROM clinica.codigos_clinica WHERE codigo = ?", (rs, n) -> rs.getObject(1, UUID.class), clinic.code()).stream().findFirst();
            UUID tenant = existing.orElseGet(() -> create(clinic, hash));
            tx.inTenant(tenant, () -> { refreshDay(tenant); return null; });
        }
    }

    // ---- clínica ----

    private UUID create(Clinic c, String hash) {
        UUID tenant = UUID.randomUUID();
        return tx.inTenant(tenant, () -> {
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, ?)", tenant, c.name());
            jdbc.update("INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES (?, ?)", c.code(), tenant);
            Map<String, UUID> units = new LinkedHashMap<>();
            for (String name : c.units()) {
                UUID id = UUID.randomUUID();
                jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, ?)", id, tenant, name);
                units.put(name, id);
            }
            UUID mainUnit = units.get(c.units().get(0));
            var roles = DefaultRoles.insert(jdbc, tenant);
            Map<String, UUID> users = new LinkedHashMap<>();
            for (Account a : c.accounts()) {
                UUID role = switch (a.role()) { case "Administrador" -> roles.administrador(); case "Médico" -> roles.medico(); default -> roles.recepcao(); };
                UUID id = identity.createUser(tenant, new CreateUserRequest(a.name(), a.email(), "x".repeat(12), units.get(a.units().get(0)), role), hash).id();
                for (String extra : a.units().subList(1, a.units().size()))
                    jdbc.update("INSERT INTO clinica.vinculos (tenant_id, usuario_id, unidade_id, papel_id) VALUES (?, ?, ?, ?)", tenant, id, units.get(extra), role);
                users.put(a.email(), id);
            }
            UUID admin = users.get(c.accounts().get(0).email());

            Map<String, UUID> specialtyIds = new HashMap<>();
            for (String name : c.specialties()) specialtyIds.put(name, specialties.insert(tenant, name, null, null, null, null).id());
            Map<String, UUID> procedureIds = new LinkedHashMap<>();
            for (Procedure p : c.procedures())
                procedureIds.put(p.name(), procedures.insert(tenant, admin, p.name(), p.type(), null, null, p.minutes(), p.cents(), null, null, null, null, null));

            int color = 0;
            for (Professional p : c.professionals()) {
                // O profissional ligado a uma conta de médico permite ver a ficha restrita do paciente.
                UUID linkedUser = c.accounts().stream().filter(a -> p.name().equals(a.professional())).findFirst().map(a -> users.get(a.email())).orElse(null);
                UUID specialty = specialtyIds.get(p.specialty());
                UUID id = professionals.insert(tenant, new CreateProfessionalRequest(p.name(), null, null, null, null, p.council(), p.number(), "MA", null, null, null, null, null,
                    COLORS[color++ % COLORS.length], null, null, false, List.of(specialty), specialty, List.of(units.get(c.units().get(0))), linkedUser));
                professionals.replaceSpecialties(tenant, id, List.of(specialty), specialty);
                List<UUID> allUnits = new ArrayList<>(List.of(mainUnit));
                if (c.saturdayProfessionals().contains(p.name())) allUnits.add(units.get(c.saturdayUnit()));
                professionals.replaceUnits(tenant, id, allUnits);
                professionals.replaceEnabledProcedures(tenant, id, c.procedures().stream().filter(x -> x.specialty().equals(p.specialty())).map(x -> procedureIds.get(x.name())).toList());
                for (int weekday = 1; weekday <= 5; weekday++)
                    schedule.createGrade(tenant, mainUnit, new CreateGradeRequest(id, weekday, LocalTime.of(p.startHour(), 0), LocalTime.of(p.startHour(), 0).plusMinutes(blocks(p) * p.blockMin()),
                        p.blockMin(), null, null), LocalDate.now(ZONE).minusDays(30));   // vigência já iniciada: a agenda dos dias passados também tem grade
                if (c.saturdayProfessionals().contains(p.name()))
                    schedule.createGrade(tenant, units.get(c.saturdayUnit()), new CreateGradeRequest(id, 6, LocalTime.of(8, 0), LocalTime.of(12, 0), 30, null, null), LocalDate.now(ZONE).minusDays(30));
            }

            // Fila: tipos e guichês da unidade principal.
            UUID consulta = fila.createType(tenant, new TicketTypeRequest("Consulta", "C", false, true)).id();
            UUID exames = fila.createType(tenant, new TicketTypeRequest("Exames", "E", false, true)).id();
            UUID retorno = fila.createType(tenant, new TicketTypeRequest("Retorno e resultados", "R", false, true)).id();
            UUID preferencial = fila.createType(tenant, new TicketTypeRequest("Preferencial", "P", true, true)).id();
            UUID g1 = fila.createCounter(tenant, mainUnit, "Guichê 1", true);
            fila.replaceCounterTypes(tenant, g1, List.of(new CounterTypeRef(preferencial, 1), new CounterTypeRef(consulta, 2)));
            UUID g2 = fila.createCounter(tenant, mainUnit, "Guichê 2", true);
            fila.replaceCounterTypes(tenant, g2, List.of(new CounterTypeRef(consulta, 1), new CounterTypeRef(exames, 2), new CounterTypeRef(retorno, 3)));

            seedPatients(tenant, admin, c);
            return tenant;
        });
    }

    private static int blocks(Professional p) { return (p.endHour() - p.startHour()) * 60 / p.blockMin() + ((p.endHour() - p.startHour()) * 60 % p.blockMin() == 0 ? 0 : 1); }

    private void seedPatients(UUID tenant, UUID admin, Clinic c) {
        List<UUID> priorities = patients.lookups("prioridades", true).stream().map(l -> l.id()).toList();
        List<UUID> origins = patients.lookups("origens_paciente", true).stream().map(l -> l.id()).toList();
        String[] cities = {"São Luís", "São José de Ribamar", "Paço do Lumiar", "Raposa"};
        for (int i = 0; i < c.patientNames().size(); i++) {
            String name = c.patientNames().get(i);
            boolean noCpf = i % 11 == 10, foreigner = i % 13 == 12;
            String cpf = noCpf || foreigner ? null : SeedData.cpf(c.patientOffset() + i);
            boolean elderly = i % 6 == 0;
            LocalDate born = elderly ? LocalDate.now(ZONE).minusYears(62 + i % 20).minusDays(i * 9L) : LocalDate.now(ZONE).minusYears(8 + (i * 7) % 55).minusDays(i * 13L);
            String phone = "9899" + String.format("%07d", 1000 + c.patientOffset() + i);
            List<RelativeForm> relatives = i % 5 == 1 ? List.of(new RelativeForm("Responsável de " + name.split(" ")[0], true, "Mãe", null)) : List.of();
            var form = new PatientForm(name, null, cpf, noCpf, foreigner, born, i % 2 == 0 ? "Feminino" : "Masculino", null, null, null,
                elderly ? priorities.get(0) : i % 7 == 3 ? priorities.get(2) : null, phone, null, null, null,
                name.toLowerCase().replace(" ", ".").replaceAll("[^a-z.]", "") + "@exemplo.test", null,
                "65000000", "Rua das Palmeiras", String.valueOf(10 + i), null, "Centro", cities[i % cities.length], "MA", "Brasil", null, null, null,
                null, null, null, origins.get(i % origins.size()), null, null, null, null,
                i == 4 ? "Alérgico a dipirona (dado fictício)" : null, i == 7, i == 7 ? "Confirmar dados do convênio na chegada." : null, relatives);
            var created = patients.create(form, tenant);
            if (i == c.patientNames().size() - 1) patients.deactivate(created.id(), "sem_vinculo", "Cadastro de demonstração inativo.", tenant, admin);
        }
    }

    // ---- o dia (renovado a cada execução) ----

    /** Agenda e fila de hoje. Só cria se não houver nada daqui para a frente, para a demonstração não envelhecer. */
    void refreshDay(UUID tenant) {
        refreshDay(tenant, LocalDate.now(ZONE));
    }

    void refreshDay(UUID tenant, LocalDate today) {
        // As linhas de uma mesma transação têm o mesmo criado_em: a unidade principal é a do administrador, não "a primeira".
        var admin = jdbc.queryForMap("SELECT u.id, v.unidade_id FROM clinica.usuarios u JOIN clinica.vinculos v ON v.tenant_id = u.tenant_id AND v.usuario_id = u.id "
            + "JOIN clinica.papeis p ON p.tenant_id = v.tenant_id AND p.id = v.papel_id WHERE p.nome = 'Administrador' AND NOT u.dispositivo ORDER BY u.id LIMIT 1");
        UUID creator = (UUID) admin.get("id");
        UUID unit = (UUID) admin.get("unidade_id");
        boolean hasAgenda = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM clinica.agendamentos WHERE upper(periodo) >= ?::timestamptz)", Boolean.class,
            java.sql.Timestamp.from(today.atStartOfDay(ZONE).toInstant())));
        if (!hasAgenda) seedAgenda(tenant, unit, creator, today);
        boolean hasTickets = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM clinica.senhas WHERE unidade_id = ? AND dia = ?)", Boolean.class, unit, today));
        if (!hasTickets) seedTickets(tenant, unit, creator, today);
    }

    private void seedAgenda(UUID tenant, UUID unit, UUID creator, LocalDate today) {
        List<UUID> patientIds = jdbc.queryForList("SELECT id FROM clinica.pacientes WHERE ativo ORDER BY numero_prontuario", UUID.class);
        List<UUID> professionalIds = jdbc.queryForList("SELECT id FROM clinica.profissionais ORDER BY criado_em, id", UUID.class);
        int[] dayOffsets = {-2, -1, 0, 1, 2};
        for (int d = 0; d < dayOffsets.length; d++) {
            LocalDate day = businessDay(today, dayOffsets[d]);
            for (int i = 0; i < professionalIds.size(); i++) {
                UUID professional = professionalIds.get(i);
                var grades = schedule.gradesOn(professional, unit, day);
                if (grades.isEmpty()) continue;
                var grade = grades.get(0);
                List<UUID> procs = jdbc.queryForList("SELECT procedimento_id FROM clinica.profissional_procedimentos WHERE profissional_id = ? ORDER BY procedimento_id", UUID.class, professional);
                if (procs.isEmpty() || patientIds.isEmpty()) continue;
                for (int j = 0; j < 3; j++) {
                    ZonedDateTime from = ZonedDateTime.of(day, grade.inicio().plusMinutes((long) j * grade.duracaoBlocoMin()), ZONE);
                    UUID patient = patientIds.get((i * 3 + j + d * 5) % patientIds.size());
                    var created = agenda.createAppointment(new CreateAppointmentRequest(unit, professional, patient, procs.get((i + j) % procs.size()), from.toOffsetDateTime(),
                        from.plusMinutes(grade.duracaoBlocoMin()).toOffsetDateTime(), null, CHANNELS[(i + j) % CHANNELS.length]), tenant, creator, null);
                    String status = statusFor(dayOffsets[d], i, j);
                    if (!status.equals("agendado")) jdbc.update("UPDATE clinica.agendamentos SET status = ? WHERE id = ?", status, created.id());
                }
            }
        }
    }

    static String statusFor(int dayOffset, int professionalIndex, int slot) {
        if (dayOffset < 0) return slot == 2 ? (dayOffset == -1 ? "nao_compareceu" : "cancelado") : "atendido";
        if (dayOffset == 0) return switch (slot) { case 0 -> professionalIndex == 0 ? "em_atendimento" : professionalIndex % 2 == 0 ? "atendido" : "check_in"; case 1 -> "confirmado"; default -> "agendado"; };
        return slot == 0 ? "confirmado" : "agendado";
    }

    private static LocalDate businessDay(LocalDate from, int offset) {
        LocalDate day = from;
        int step = offset < 0 ? -1 : 1;
        for (int moved = 0; moved < Math.abs(offset); ) {
            day = day.plusDays(step);
            if (day.getDayOfWeek() != DayOfWeek.SATURDAY && day.getDayOfWeek() != DayOfWeek.SUNDAY) moved++;
        }
        // Hoje cai no fim de semana: usa a próxima segunda, para a agenda não ficar vazia.
        while (offset == 0 && (day.getDayOfWeek() == DayOfWeek.SATURDAY || day.getDayOfWeek() == DayOfWeek.SUNDAY)) day = day.plusDays(1);
        return day;
    }

    private void seedTickets(UUID tenant, UUID unit, UUID creator, LocalDate today) {
        record Type(UUID id, String prefix) {}
        List<Type> types = jdbc.query("SELECT id, prefixo FROM clinica.tipos_senha ORDER BY prefixo", (rs, n) -> new Type(rs.getObject(1, UUID.class), rs.getString(2)));
        for (String prefix : new String[] {"C", "C", "E", "P", "R"}) {
            Type type = types.stream().filter(t -> t.prefix().equals(prefix)).findFirst().orElseThrow();
            int number = fila.nextNumber(tenant, unit, type.id(), today);
            fila.insertTicket(tenant, unit, type.id(), today, number, prefix + number, null, "recepcao", creator);
        }
    }
}
