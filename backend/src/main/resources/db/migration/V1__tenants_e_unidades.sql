CREATE TABLE clinica.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL CHECK (length(trim(nome)) > 0),
    status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'inativo')),
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clinica.unidades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK (length(trim(nome)) > 0),
    cnes varchar(7) CHECK (cnes ~ '^[0-9]{7}$'),
    fuso text NOT NULL DEFAULT 'America/Fortaleza',
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, nome)
);

-- O tenant será definido pelo backend após autenticar e autorizar o usuário,
-- usando set_config('app.tenant_id', ..., true) dentro da transação.
ALTER TABLE clinica.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.tenants
    TO multisaude_app
    USING (id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE clinica.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.unidades FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.unidades
    TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON clinica.tenants, clinica.unidades TO multisaude_app;
-- atualizado_em deve ser atualizado explicitamente pela aplicação a cada alteração.
