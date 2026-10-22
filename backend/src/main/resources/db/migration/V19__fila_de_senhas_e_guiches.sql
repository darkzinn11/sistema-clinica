-- Fila de senhas e guichês: o paciente pega a senha sem se identificar, a recepção chama no guichê e só então liga
-- a senha ao paciente (por CPF). Tipos de senha e guichês são configuração da clínica, não código.

CREATE TABLE clinica.tipos_senha (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 60),
    -- Só letras e espaço, começando e terminando em letra: o código é prefixo + número e não pode ser ambíguo
    -- (prefixo "CON" número 11 nunca colide com prefixo "CON1" número 1).
    prefixo text NOT NULL CHECK (prefixo ~ '^[A-Z]([A-Z ]{0,6}[A-Z])?$'),
    preferencial boolean NOT NULL DEFAULT false,
    ativo boolean NOT NULL DEFAULT true,
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, nome),
    UNIQUE (tenant_id, prefixo)
);

CREATE TABLE clinica.guiches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    unidade_id uuid NOT NULL,
    nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 60),
    ativo boolean NOT NULL DEFAULT true,
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, unidade_id, nome),
    FOREIGN KEY (tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id)
);

-- Quais tipos cada guichê chama e em que ordem (menor primeiro). Um guichê só de preferencial lista só tipos
-- preferenciais; um guichê comum que ajude quando o preferencial estiver parado lista os dois, preferencial antes.
CREATE TABLE clinica.guiche_tipos (
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    guiche_id uuid NOT NULL,
    tipo_id uuid NOT NULL,
    ordem smallint NOT NULL DEFAULT 1 CHECK (ordem BETWEEN 1 AND 99),
    PRIMARY KEY (tenant_id, guiche_id, tipo_id),
    FOREIGN KEY (tenant_id, guiche_id) REFERENCES clinica.guiches(tenant_id, id),
    FOREIGN KEY (tenant_id, tipo_id) REFERENCES clinica.tipos_senha(tenant_id, id)
);

-- Numeração por unidade, tipo e dia (o dia é o da unidade, no fuso dela). Incremento atômico por upsert.
CREATE TABLE clinica.contadores_senha (
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    unidade_id uuid NOT NULL,
    tipo_id uuid NOT NULL,
    dia date NOT NULL,
    ultimo integer NOT NULL CHECK (ultimo > 0),
    PRIMARY KEY (tenant_id, unidade_id, tipo_id, dia),
    FOREIGN KEY (tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id),
    FOREIGN KEY (tenant_id, tipo_id) REFERENCES clinica.tipos_senha(tenant_id, id)
);

-- Senha nunca é apagada: cancelar exige motivo e responsável.
CREATE TABLE clinica.senhas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    unidade_id uuid NOT NULL,
    tipo_id uuid NOT NULL,
    dia date NOT NULL,
    numero integer NOT NULL CHECK (numero > 0),
    codigo text NOT NULL,
    status text NOT NULL DEFAULT 'aguardando'
        CHECK (status IN ('aguardando', 'chamada', 'em_atendimento', 'finalizada', 'ausente', 'cancelada')),
    -- clock_timestamp(), não now(): a ordem de chamada é a de chegada, e now() é o início da transação.
    criada_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    guiche_id uuid,
    chamada_por uuid,
    primeira_chamada_em timestamptz,
    ultima_chamada_em timestamptz,
    chamadas integer NOT NULL DEFAULT 0 CHECK (chamadas >= 0),
    paciente_id uuid,
    identificada_em timestamptz,
    finalizada_em timestamptz,
    cancelada_por uuid,
    cancelada_motivo text CHECK (cancelada_motivo IS NULL OR length(trim(cancelada_motivo)) BETWEEN 1 AND 200),
    UNIQUE (tenant_id, id),
    UNIQUE (tenant_id, unidade_id, tipo_id, dia, numero),
    -- O status tem de combinar com os dados: ninguém "em atendimento" sem guichê e sem paciente.
    CHECK (status <> 'aguardando' OR (guiche_id IS NULL AND paciente_id IS NULL)),
    CHECK (status NOT IN ('chamada', 'em_atendimento') OR guiche_id IS NOT NULL),
    CHECK (status <> 'em_atendimento' OR paciente_id IS NOT NULL),
    CHECK (status <> 'cancelada' OR (cancelada_por IS NOT NULL AND cancelada_motivo IS NOT NULL)),
    FOREIGN KEY (tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id),
    FOREIGN KEY (tenant_id, tipo_id) REFERENCES clinica.tipos_senha(tenant_id, id),
    FOREIGN KEY (tenant_id, guiche_id) REFERENCES clinica.guiches(tenant_id, id),
    FOREIGN KEY (tenant_id, chamada_por) REFERENCES clinica.usuarios(tenant_id, id),
    FOREIGN KEY (tenant_id, paciente_id) REFERENCES clinica.pacientes(tenant_id, id),
    FOREIGN KEY (tenant_id, cancelada_por) REFERENCES clinica.usuarios(tenant_id, id)
);
-- No máximo uma senha ativa por guichê, mesmo com duas chamadas simultâneas.
CREATE UNIQUE INDEX senhas_guiche_ativa_uk ON clinica.senhas(tenant_id, guiche_id) WHERE status IN ('chamada', 'em_atendimento');
CREATE INDEX senhas_fila_idx ON clinica.senhas(tenant_id, unidade_id, dia, status, tipo_id, criada_em);

DO $$ DECLARE tabela text; BEGIN FOREACH tabela IN ARRAY ARRAY['tipos_senha', 'guiches', 'guiche_tipos', 'contadores_senha', 'senhas'] LOOP
    EXECUTE format('ALTER TABLE clinica.%I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE clinica.%I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation ON clinica.%I TO multisaude_app USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', tabela);
END LOOP; END $$;
GRANT SELECT, INSERT, UPDATE ON clinica.tipos_senha, clinica.guiches, clinica.contadores_senha, clinica.senhas TO multisaude_app;
GRANT SELECT, INSERT, DELETE ON clinica.guiche_tipos TO multisaude_app;

-- Administrador configura a fila; a recepção gera, chama e atende. O médico não tem acesso à fila.
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['fila:ler', 'fila:configurar'])) WHERE nome = 'Administrador';
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['fila:ler', 'fila:gerar', 'fila:chamar'])) WHERE nome = 'Recepção';
