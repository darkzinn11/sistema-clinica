-- V29: dados completos do cadastro de pacientes.
-- Migration aditiva: os campos antigos continuam válidos durante a transição do frontend.
ALTER TABLE clinica.pacientes
    ADD COLUMN estrangeiro boolean NOT NULL DEFAULT false,
    ADD COLUMN sem_cpf boolean NOT NULL DEFAULT true,
    ADD COLUMN cor_identificacao varchar(7),
    ADD COLUMN sexo varchar(30),
    ADD COLUMN altura_cm numeric(5,2),
    ADD COLUMN peso_kg numeric(6,2),
    ADD COLUMN numero_prontuario bigint,
    ADD COLUMN prioridade_id uuid,
    ADD COLUMN cep varchar(9),
    ADD COLUMN logradouro varchar(200),
    ADD COLUMN numero_endereco varchar(30),
    ADD COLUMN complemento varchar(120),
    ADD COLUMN bairro varchar(120),
    ADD COLUMN cidade varchar(120),
    ADD COLUMN estado varchar(2),
    ADD COLUMN pais varchar(80) NOT NULL DEFAULT 'Brasil',
    ADD COLUMN celular2 varchar(20),
    ADD COLUMN telefone varchar(20),
    ADD COLUMN telefone2 varchar(20),
    ADD COLUMN email2 text,
    ADD COLUMN profissao varchar(120),
    ADD COLUMN escolaridade varchar(80),
    ADD COLUMN naturalidade varchar(120),
    ADD COLUMN estado_civil varchar(40),
    ADD COLUMN nacionalidade varchar(80),
    ADD COLUMN rg varchar(30),
    ADD COLUMN origem_id uuid,
    ADD COLUMN indicacao varchar(200),
    ADD COLUMN religiao varchar(80),
    ADD COLUMN cns varchar(15),
    ADD COLUMN cor_pele varchar(40),
    ADD COLUMN observacoes text,
    ADD COLUMN aviso_ativo boolean NOT NULL DEFAULT false,
    ADD COLUMN aviso_texto text,
    ADD COLUMN inativado_motivo varchar(40),
    ADD COLUMN inativado_observacao text,
    ADD COLUMN inativado_por uuid,
    ADD COLUMN inativado_em timestamptz;

-- Registros legados sem CPF passam a representar explicitamente "sem CPF".
UPDATE clinica.pacientes SET sem_cpf = true WHERE cpf IS NULL AND NOT sem_cpf;

CREATE TABLE clinica.prioridades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome varchar(100) NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 100),
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, nome)
);

CREATE TABLE clinica.origens_paciente (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome varchar(120) NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 120),
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, nome)
);

CREATE TABLE clinica.paciente_parentes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    paciente_id uuid NOT NULL,
    nome varchar(160) NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 160),
    responsavel_financeiro boolean NOT NULL DEFAULT false,
    parentesco varchar(80),
    cpf varchar(11),
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, paciente_id) REFERENCES clinica.pacientes(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE clinica.paciente_historico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    paciente_id uuid NOT NULL,
    usuario_id uuid,
    campos text[] NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, paciente_id) REFERENCES clinica.pacientes(tenant_id, id)
);

ALTER TABLE clinica.pacientes
    ADD CONSTRAINT pacientes_prioridade_fk FOREIGN KEY (tenant_id, prioridade_id)
        REFERENCES clinica.prioridades(tenant_id, id),
    ADD CONSTRAINT pacientes_origem_fk FOREIGN KEY (tenant_id, origem_id)
        REFERENCES clinica.origens_paciente(tenant_id, id),
    ADD CONSTRAINT pacientes_cor_identificacao_ck CHECK (cor_identificacao IS NULL OR cor_identificacao ~ '^#[0-9A-Fa-f]{6}$'),
    ADD CONSTRAINT pacientes_altura_ck CHECK (altura_cm IS NULL OR altura_cm > 0),
    ADD CONSTRAINT pacientes_peso_ck CHECK (peso_kg IS NULL OR peso_kg > 0),
    ADD CONSTRAINT pacientes_cns_ck CHECK (cns IS NULL OR cns ~ '^[0-9]{15}$'),
    ADD CONSTRAINT pacientes_cpf_regra_ck CHECK (cpf IS NOT NULL OR sem_cpf OR estrangeiro),
    ADD CONSTRAINT pacientes_cpf_sem_cpf_ck CHECK (NOT sem_cpf OR cpf IS NULL);

CREATE UNIQUE INDEX pacientes_prontuario_unq ON clinica.pacientes (tenant_id, numero_prontuario);
CREATE INDEX pacientes_busca_prontuario_idx ON clinica.pacientes (tenant_id, numero_prontuario);
CREATE INDEX pacientes_historico_paciente_idx ON clinica.paciente_historico (tenant_id, paciente_id, criado_em);

ALTER TABLE clinica.prioridades ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.prioridades FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.prioridades TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE clinica.origens_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.origens_paciente FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.origens_paciente TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE clinica.paciente_parentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.paciente_parentes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.paciente_parentes TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE clinica.paciente_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.paciente_historico FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.paciente_historico TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON clinica.prioridades, clinica.origens_paciente TO multisaude_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON clinica.paciente_parentes TO multisaude_app;
GRANT SELECT, INSERT ON clinica.paciente_historico TO multisaude_app;
