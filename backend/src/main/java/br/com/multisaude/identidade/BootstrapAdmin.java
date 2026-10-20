package br.com.multisaude.identidade;

import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.identidade.IdentityModels.*;

@Component
@ConditionalOnProperty(name = "bootstrap.enabled", havingValue = "true")
public class BootstrapAdmin implements ApplicationRunner {
    private final TenantTransactions transactions;
    private final JdbcTemplate jdbc;
    private final IdentityRepository repository;
    private final PasswordEncoder passwords;
    private final Environment env;
    private final ConfigurableApplicationContext context;

    public BootstrapAdmin(TenantTransactions transactions, JdbcTemplate jdbc, IdentityRepository repository,
        PasswordEncoder passwords, Environment env, ConfigurableApplicationContext context) {
        this.transactions = transactions;
        this.jdbc = jdbc;
        this.repository = repository;
        this.passwords = passwords;
        this.env = env;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        UUID tenant = UUID.fromString(required("BOOTSTRAP_TENANT_ID"));
        UUID unit = UUID.fromString(required("BOOTSTRAP_UNIT_ID"));
        String name = required("BOOTSTRAP_ADMIN_NAME");
        String email = required("BOOTSTRAP_ADMIN_EMAIL");
        String password = required("BOOTSTRAP_ADMIN_PASSWORD");
        IdentityService.validatePasswordBytes(password);
        var request = new CreateUserRequest(name, email, password, unit, UUID.randomUUID());
        try (var validator = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            if (!validator.getValidator().validate(request).isEmpty()) {
                throw new IllegalArgumentException("Dados do administrador inválidos; confira nome, email e senha (mínimo 12 caracteres).");
            }
        }
        String hash = passwords.encode(password);
        transactions.inTenant(tenant, () -> {
            // Serializar tentativas do mesmo tenant. Nunca sobrescrever um cadastro existente.
            jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", Object.class, tenant.toString());
            if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM clinica.tenants WHERE id = ?)", Boolean.class, tenant))) {
                throw new IllegalStateException("Clínica já cadastrada; bootstrap não altera dados existentes.");
            }
            jdbc.update("INSERT INTO clinica.tenants (id, nome) VALUES (?, ?)", tenant, required("BOOTSTRAP_CLINIC_NAME"));
            jdbc.update("INSERT INTO clinica.unidades (id, tenant_id, nome) VALUES (?, ?, ?)", unit, tenant, required("BOOTSTRAP_UNIT_NAME"));
            jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Administrador', ARRAY['usuarios:ler','usuarios:criar','pacientes:ler','pacientes:criar','pacientes:editar','pacientes:inativar','profissionais:ler','profissionais:criar','agenda:ler','agenda:criar','agenda:editar','agenda:cancelar','agenda:remarcar','agenda:configurar','agenda:ver_valores','auditoria:ler','prontuario:compartilhar','fila:ler','fila:configurar'])",
                request.papelId(), tenant);
            jdbc.update("INSERT INTO clinica.papeis (tenant_id, nome, permissoes) VALUES (?, 'Recepção', ARRAY['agenda:ler','agenda:criar','agenda:editar','agenda:cancelar','agenda:remarcar','agenda:ver_valores','pacientes:ler','pacientes:criar','pacientes:editar','profissionais:ler','fila:ler','fila:gerar','fila:chamar'])", tenant);
            jdbc.update("INSERT INTO clinica.papeis (tenant_id, nome, permissoes) VALUES (?, 'Médico', ARRAY['agenda:ler_proprios','agenda:atender','pacientes:ler_vinculados','prontuario:ler','prontuario:escrever'])", tenant);
            repository.createUser(tenant, request, hash);
            return null;
        });
        System.out.println("Clínica, unidade e administrador cadastrados. Nenhuma credencial será exibida.");
        context.close();
    }

    private String required(String name) {
        String value = env.getProperty(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Variável obrigatória: " + name);
        return value;
    }
}
