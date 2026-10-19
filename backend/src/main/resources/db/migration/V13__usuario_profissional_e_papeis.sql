-- Liga o profissional ao usuário que faz login. Sem isso não há como saber quais pacientes um médico pode ver.
-- Nulo para profissionais que não têm acesso ao sistema.
ALTER TABLE clinica.profissionais
    ADD COLUMN usuario_id uuid,
    ADD CONSTRAINT profissionais_usuario_fk FOREIGN KEY (tenant_id, usuario_id) REFERENCES clinica.usuarios(tenant_id, id),
    ADD CONSTRAINT profissionais_usuario_uk UNIQUE (tenant_id, usuario_id);

-- Médico enxerga apenas pacientes com vínculo (atendeu ou tem agendamento futuro): pacientes:ler_vinculados.
-- Não recebe pacientes:ler, que libera todos os pacientes da clínica.
INSERT INTO clinica.papeis (tenant_id, nome, permissoes)
SELECT t.id, 'Médico', ARRAY['agenda:ler', 'agenda:editar', 'pacientes:ler_vinculados']
FROM clinica.tenants t
WHERE NOT EXISTS (SELECT 1 FROM clinica.papeis p WHERE p.tenant_id = t.id AND p.nome = 'Médico');

-- Recepção: opera a agenda e o cadastro de pacientes; não configura grades, não inativa paciente, não gerencia usuários.
UPDATE clinica.papeis
SET permissoes = ARRAY['agenda:ler', 'agenda:criar', 'agenda:editar', 'agenda:cancelar',
                       'pacientes:ler', 'pacientes:criar', 'pacientes:editar', 'profissionais:ler']
WHERE nome = 'Recepção' AND permissoes = ARRAY[]::text[];
