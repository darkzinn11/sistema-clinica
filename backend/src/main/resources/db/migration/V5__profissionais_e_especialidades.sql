CREATE TABLE clinica.especialidades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL CHECK(length(trim(nome)) > 0), cbo text,
    UNIQUE(nome)
);
CREATE TABLE clinica.profissionais (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK(length(trim(nome)) BETWEEN 1 AND 160), conselho text, conselho_num text,
    conselho_uf char(2), cbo text, ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, id), UNIQUE(tenant_id, conselho, conselho_num, conselho_uf)
);
CREATE TABLE clinica.profissional_especialidades (
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id), profissional_id uuid NOT NULL,
    especialidade_id uuid NOT NULL REFERENCES clinica.especialidades(id),
    PRIMARY KEY(tenant_id, profissional_id, especialidade_id),
    FOREIGN KEY(tenant_id, profissional_id) REFERENCES clinica.profissionais(tenant_id, id)
);
CREATE TABLE clinica.profissional_unidades (
    tenant_id uuid NOT NULL, profissional_id uuid NOT NULL, unidade_id uuid NOT NULL,
    PRIMARY KEY(tenant_id, profissional_id, unidade_id),
    FOREIGN KEY(tenant_id, profissional_id) REFERENCES clinica.profissionais(tenant_id, id),
    FOREIGN KEY(tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id)
);
CREATE INDEX profissionais_tenant_nome_idx ON clinica.profissionais(tenant_id, lower(nome));
DO $$ DECLARE tabela text; BEGIN FOREACH tabela IN ARRAY ARRAY['profissionais','profissional_especialidades','profissional_unidades'] LOOP
    EXECUTE format('ALTER TABLE clinica.%I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE clinica.%I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation ON clinica.%I TO multisaude_app USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', tabela);
END LOOP; END $$;
GRANT SELECT, INSERT, UPDATE ON clinica.especialidades TO multisaude_app;
GRANT SELECT, INSERT, UPDATE ON clinica.profissionais, clinica.profissional_especialidades, clinica.profissional_unidades TO multisaude_app;
