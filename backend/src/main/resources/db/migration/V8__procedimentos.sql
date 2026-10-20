CREATE TABLE clinica.procedimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK(length(trim(nome)) BETWEEN 1 AND 160), codigo_tuss text,
    tipo text NOT NULL DEFAULT 'consulta', duracao_min smallint NOT NULL DEFAULT 30 CHECK(duracao_min BETWEEN 5 AND 1440),
    valor_centavos bigint CHECK(valor_centavos IS NULL OR valor_centavos >= 0), ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,id), UNIQUE(tenant_id,nome)
);
ALTER TABLE clinica.procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.procedimentos FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.procedimentos TO multisaude_app
    USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
    WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT,UPDATE ON clinica.procedimentos TO multisaude_app;
