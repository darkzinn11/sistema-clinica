-- Profissionais completos e a lista de procedimentos que cada um realiza ("a lista manda": sem procedimento habilitado, sem agendamento).
-- O limite de idade do profissional NÃO é regra do sistema: o médico o comunica à clínica e fica em mensagem_agenda/observações.

ALTER TABLE clinica.profissionais
    ADD COLUMN nome_social text CHECK (nome_social IS NULL OR length(trim(nome_social)) BETWEEN 1 AND 160),
    ADD COLUMN cpf varchar(11) CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
    ADD COLUMN nascimento date CHECK (nascimento IS NULL OR nascimento <= current_date),
    ADD COLUMN sexo text CHECK (sexo IS NULL OR sexo IN ('feminino', 'masculino', 'outro')),
    ADD COLUMN rqe text CHECK (rqe IS NULL OR length(trim(rqe)) BETWEEN 1 AND 20),
    ADD COLUMN telefone text CHECK (telefone IS NULL OR length(trim(telefone)) BETWEEN 1 AND 20),
    ADD COLUMN celular text CHECK (celular IS NULL OR length(trim(celular)) BETWEEN 1 AND 20),
    ADD COLUMN email text CHECK (email IS NULL OR (email = lower(trim(email)) AND length(email) <= 254)),
    ADD COLUMN cor_agenda text CHECK (cor_agenda IS NULL OR cor_agenda ~ '^#[0-9A-Fa-f]{6}$'),
    ADD COLUMN mensagem_agenda text CHECK (mensagem_agenda IS NULL OR length(mensagem_agenda) <= 1000),
    ADD COLUMN observacoes text CHECK (observacoes IS NULL OR length(observacoes) <= 2000),
    ADD COLUMN oculto_na_agenda boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX profissionais_cpf_uk ON clinica.profissionais (tenant_id, cpf) WHERE cpf IS NOT NULL;

-- Uma especialidade principal por profissional; as demais são subespecialidades.
ALTER TABLE clinica.profissional_especialidades ADD COLUMN principal boolean NOT NULL DEFAULT false;
UPDATE clinica.profissional_especialidades pe SET principal = true
WHERE (pe.tenant_id, pe.profissional_id, pe.especialidade_id) IN (
    SELECT DISTINCT ON (tenant_id, profissional_id) tenant_id, profissional_id, especialidade_id
    FROM clinica.profissional_especialidades ORDER BY tenant_id, profissional_id, especialidade_id);
CREATE UNIQUE INDEX profissional_especialidade_principal_uk ON clinica.profissional_especialidades (tenant_id, profissional_id) WHERE principal;

-- Procedimentos que cada profissional realiza.
CREATE TABLE clinica.profissional_procedimentos (
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    profissional_id uuid NOT NULL,
    procedimento_id uuid NOT NULL,
    PRIMARY KEY (tenant_id, profissional_id, procedimento_id),
    FOREIGN KEY (tenant_id, profissional_id) REFERENCES clinica.profissionais(tenant_id, id),
    FOREIGN KEY (tenant_id, procedimento_id) REFERENCES clinica.procedimentos(tenant_id, id)
);
ALTER TABLE clinica.profissional_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.profissional_procedimentos FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.profissional_procedimentos TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, DELETE ON clinica.profissional_procedimentos TO multisaude_app;

-- Editar um profissional substitui a lista de especialidades e de unidades.
GRANT DELETE ON clinica.profissional_especialidades, clinica.profissional_unidades TO multisaude_app;

UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['profissionais:editar'])) WHERE nome = 'Administrador';
