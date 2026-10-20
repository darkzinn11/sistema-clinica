-- Especialidades: o catálogo (sugestões do sistema) fica separado do cadastro de cada clínica.
-- A tabela global da V5 vira o catálogo, somente leitura para a aplicação; cada clínica passa a ter as suas.
-- Sem linha sem tenant_id, o vínculo profissional-especialidade usa chave composta: ligar um profissional à especialidade de
-- outra clínica fica impossível no próprio banco.

ALTER TABLE clinica.especialidades RENAME TO catalogo_especialidades;
ALTER TABLE clinica.catalogo_especialidades RENAME COLUMN cbo TO cbos;
ALTER TABLE clinica.catalogo_especialidades ADD COLUMN nome_resumido text, ADD COLUMN codigo text;
REVOKE INSERT, UPDATE ON clinica.catalogo_especialidades FROM multisaude_app;

CREATE TABLE clinica.especialidades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 120),
    nome_resumido text CHECK (nome_resumido IS NULL OR length(trim(nome_resumido)) BETWEEN 1 AND 60),
    codigo text CHECK (codigo IS NULL OR length(trim(codigo)) BETWEEN 1 AND 20),
    cbos text CHECK (cbos IS NULL OR cbos ~ '^[0-9]{6}$'),
    ativo boolean NOT NULL DEFAULT true,
    catalogo_id uuid REFERENCES clinica.catalogo_especialidades(id),
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, id)
);
CREATE UNIQUE INDEX especialidades_nome_uk ON clinica.especialidades (tenant_id, lower(nome));
-- Uma sugestão do catálogo só pode ser adicionada uma vez por clínica.
CREATE UNIQUE INDEX especialidades_catalogo_uk ON clinica.especialidades (tenant_id, catalogo_id) WHERE catalogo_id IS NOT NULL;
ALTER TABLE clinica.especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.especialidades FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.especialidades TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON clinica.especialidades TO multisaude_app;

-- Cada clínica recebe só as especialidades que já usa; o resto ela adiciona pelo catálogo.
INSERT INTO clinica.especialidades (tenant_id, nome, nome_resumido, codigo, cbos, catalogo_id)
SELECT DISTINCT pe.tenant_id, c.nome, c.nome_resumido, c.codigo, CASE WHEN c.cbos ~ '^[0-9]{6}$' THEN c.cbos END, c.id
FROM clinica.profissional_especialidades pe JOIN clinica.catalogo_especialidades c ON c.id = pe.especialidade_id;

ALTER TABLE clinica.profissional_especialidades ADD COLUMN nova_especialidade_id uuid;
UPDATE clinica.profissional_especialidades pe SET nova_especialidade_id = e.id
FROM clinica.especialidades e WHERE e.tenant_id = pe.tenant_id AND e.catalogo_id = pe.especialidade_id;
ALTER TABLE clinica.profissional_especialidades ALTER COLUMN nova_especialidade_id SET NOT NULL;
ALTER TABLE clinica.profissional_especialidades DROP CONSTRAINT profissional_especialidades_pkey;
ALTER TABLE clinica.profissional_especialidades DROP COLUMN especialidade_id;
ALTER TABLE clinica.profissional_especialidades RENAME COLUMN nova_especialidade_id TO especialidade_id;
ALTER TABLE clinica.profissional_especialidades ADD PRIMARY KEY (tenant_id, profissional_id, especialidade_id);
ALTER TABLE clinica.profissional_especialidades
    ADD FOREIGN KEY (tenant_id, especialidade_id) REFERENCES clinica.especialidades(tenant_id, id);

-- Administrador cadastra e edita; a recepção só consulta.
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['especialidades:ler', 'especialidades:criar', 'especialidades:editar'])) WHERE nome = 'Administrador';
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['especialidades:ler'])) WHERE nome = 'Recepção';
