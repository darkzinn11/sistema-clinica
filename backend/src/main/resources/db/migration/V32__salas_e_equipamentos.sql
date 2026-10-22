-- V32: salas e equipamentos da unidade. Equipamento "é usado" por procedimentos (um exame ocupa o aparelho) e tem quantidade (Holter com
-- 3 unidades atende 3 exames ao mesmo tempo). Cada profissional pode ter uma sala padrão por unidade (agenda por sala).

CREATE TABLE clinica.salas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    unidade_id uuid NOT NULL,
    nome varchar(80) NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 80),
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, unidade_id, id),
    FOREIGN KEY (tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id)
);
CREATE UNIQUE INDEX salas_nome_uk ON clinica.salas (tenant_id, unidade_id, lower(nome));

CREATE TABLE clinica.equipamentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    unidade_id uuid NOT NULL,
    sala_id uuid,
    nome varchar(120) NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 120),
    quantidade smallint NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 99),
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id),
    -- A sala precisa ser da mesma unidade do equipamento (sala_id nulo não confere).
    FOREIGN KEY (tenant_id, unidade_id, sala_id) REFERENCES clinica.salas(tenant_id, unidade_id, id)
);
CREATE UNIQUE INDEX equipamentos_nome_uk ON clinica.equipamentos (tenant_id, unidade_id, lower(nome));

CREATE TABLE clinica.equipamento_procedimentos (
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    equipamento_id uuid NOT NULL,
    procedimento_id uuid NOT NULL,
    PRIMARY KEY (tenant_id, equipamento_id, procedimento_id),
    FOREIGN KEY (tenant_id, equipamento_id) REFERENCES clinica.equipamentos(tenant_id, id),
    FOREIGN KEY (tenant_id, procedimento_id) REFERENCES clinica.procedimentos(tenant_id, id)
);

CREATE TABLE clinica.profissional_salas (
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    profissional_id uuid NOT NULL,
    unidade_id uuid NOT NULL,
    sala_id uuid NOT NULL,
    PRIMARY KEY (tenant_id, profissional_id, unidade_id),
    FOREIGN KEY (tenant_id, profissional_id) REFERENCES clinica.profissionais(tenant_id, id),
    FOREIGN KEY (tenant_id, unidade_id, sala_id) REFERENCES clinica.salas(tenant_id, unidade_id, id)
);

DO $$ DECLARE tabela text; BEGIN FOREACH tabela IN ARRAY ARRAY['salas', 'equipamentos', 'equipamento_procedimentos', 'profissional_salas'] LOOP
    EXECUTE format('ALTER TABLE clinica.%I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE clinica.%I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation ON clinica.%I TO multisaude_app USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', tabela);
END LOOP; END $$;

GRANT SELECT, INSERT, UPDATE ON clinica.salas, clinica.equipamentos TO multisaude_app;
GRANT SELECT, INSERT, DELETE ON clinica.equipamento_procedimentos TO multisaude_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON clinica.profissional_salas TO multisaude_app;
