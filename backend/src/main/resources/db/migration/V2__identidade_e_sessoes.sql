CREATE TABLE clinica.usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 160),
    email text NOT NULL CHECK (email = lower(trim(email)) AND length(email) <= 254),
    senha_hash text NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, email)
);

CREATE TABLE clinica.papeis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 80),
    permissoes text[] NOT NULL DEFAULT '{}',
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, nome)
);

CREATE TABLE clinica.vinculos (
    tenant_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    unidade_id uuid NOT NULL,
    papel_id uuid NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    PRIMARY KEY (tenant_id, usuario_id, unidade_id),
    FOREIGN KEY (tenant_id, usuario_id) REFERENCES clinica.usuarios(tenant_id, id),
    FOREIGN KEY (tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id),
    FOREIGN KEY (tenant_id, papel_id) REFERENCES clinica.papeis(tenant_id, id)
);
CREATE INDEX vinculos_unidade_idx ON clinica.vinculos(tenant_id, unidade_id);
CREATE INDEX vinculos_papel_idx ON clinica.vinculos(tenant_id, papel_id);

CREATE TABLE clinica.sessoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    unidade_id uuid NOT NULL,
    token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    criado_em timestamptz NOT NULL DEFAULT now(),
    expira_em timestamptz NOT NULL CHECK (expira_em > criado_em),
    revogada_em timestamptz,
    FOREIGN KEY (tenant_id, usuario_id, unidade_id)
        REFERENCES clinica.vinculos(tenant_id, usuario_id, unidade_id)
);
CREATE INDEX sessoes_vinculo_idx ON clinica.sessoes(tenant_id, usuario_id, unidade_id);
CREATE INDEX sessoes_expiracao_idx ON clinica.sessoes(expira_em) WHERE revogada_em IS NULL;

DO $$
DECLARE tabela text;
BEGIN
    FOREACH tabela IN ARRAY ARRAY['usuarios', 'papeis', 'vinculos', 'sessoes'] LOOP
        EXECUTE format('ALTER TABLE clinica.%I ENABLE ROW LEVEL SECURITY', tabela);
        EXECUTE format('ALTER TABLE clinica.%I FORCE ROW LEVEL SECURITY', tabela);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON clinica.%I TO multisaude_app
             USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)
             WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', tabela);
    END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON clinica.usuarios, clinica.papeis, clinica.vinculos, clinica.sessoes TO multisaude_app;
