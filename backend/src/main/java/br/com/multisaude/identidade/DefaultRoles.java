package br.com.multisaude.identidade;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/** Papéis que toda clínica nova recebe. Usado pelo cadastro do primeiro administrador e pelos seeds de desenvolvimento. */
public final class DefaultRoles {
    private DefaultRoles() {}

    public record Ids(UUID administrador, UUID recepcao, UUID medico) {}

    public static Ids insert(JdbcTemplate jdbc, UUID tenant) {
        Ids ids = new Ids(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Administrador', ARRAY['usuarios:ler','usuarios:criar','pacientes:ler','pacientes:criar','pacientes:editar','pacientes:inativar','profissionais:ler','profissionais:criar','agenda:ler','agenda:criar','agenda:editar','agenda:cancelar','agenda:remarcar','agenda:configurar','agenda:ver_valores','auditoria:ler','prontuario:compartilhar','fila:ler','fila:configurar','especialidades:ler','especialidades:criar','especialidades:editar','procedimentos:ler','procedimentos:criar','procedimentos:editar','profissionais:editar'])", ids.administrador(), tenant);
        jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Recepção', ARRAY['agenda:ler','agenda:criar','agenda:editar','agenda:cancelar','agenda:remarcar','agenda:ver_valores','pacientes:ler','pacientes:criar','pacientes:editar','profissionais:ler','fila:ler','fila:gerar','fila:chamar','especialidades:ler','procedimentos:ler'])", ids.recepcao(), tenant);
        jdbc.update("INSERT INTO clinica.papeis (id, tenant_id, nome, permissoes) VALUES (?, ?, 'Médico', ARRAY['agenda:ler_proprios','agenda:atender','pacientes:ler_vinculados','prontuario:ler','prontuario:escrever'])", ids.medico(), tenant);
        return ids;
    }
}
