CREATE TABLE clinica.pacientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 160),
    nome_social text CHECK (nome_social IS NULL OR length(trim(nome_social)) BETWEEN 1 AND 160),
    cpf varchar(11) CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
    nascimento date CHECK (nascimento IS NULL OR nascimento <= current_date),
    celular varchar(20),
    email text CHECK (email IS NULL OR (email = lower(trim(email)) AND length(email) <= 254)),
    ativo boolean NOT NULL DEFAULT true,
    extras jsonb NOT NULL DEFAULT '{}'::jsonb,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, cpf)
);
CREATE INDEX pacientes_busca_nome_idx ON clinica.pacientes (tenant_id, lower(nome));
CREATE INDEX pacientes_busca_celular_idx ON clinica.pacientes (tenant_id, celular);
ALTER TABLE clinica.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.pacientes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.pacientes TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON clinica.pacientes TO multisaude_app;
