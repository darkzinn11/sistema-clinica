-- Prontuário mínimo (evolução) e auditoria de acesso a dados de pacientes.
-- As duas tabelas são imutáveis: a aplicação só lê e insere, e um gatilho recusa UPDATE/DELETE de qualquer papel.

CREATE FUNCTION clinica.bloquear_alteracao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Registro imutável: % não pode ser alterado nem apagado.', TG_TABLE_NAME
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

-- Corrigir uma evolução cria outra que aponta para a anterior em substitui_id; a original permanece.
-- hash = SHA-256 do conteúdo e dos vínculos, para detectar adulteração direta no banco.
-- (Assinatura digital ICP-Brasil, exigida para documento médico eletrônico, ainda não existe.)
CREATE TABLE clinica.evolucoes (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    paciente_id uuid NOT NULL,
    profissional_id uuid NOT NULL,
    agendamento_id uuid NOT NULL,
    conteudo text NOT NULL CHECK (length(trim(conteudo)) BETWEEN 1 AND 20000),
    substitui_id uuid,
    hash bytea NOT NULL CHECK (octet_length(hash) = 32),
    criado_por uuid NOT NULL,
    criado_em timestamptz NOT NULL,
    UNIQUE (tenant_id, id),
    CHECK (substitui_id IS NULL OR substitui_id <> id),
    FOREIGN KEY (tenant_id, paciente_id) REFERENCES clinica.pacientes(tenant_id, id),
    FOREIGN KEY (tenant_id, profissional_id) REFERENCES clinica.profissionais(tenant_id, id),
    FOREIGN KEY (tenant_id, agendamento_id) REFERENCES clinica.agendamentos(tenant_id, id),
    FOREIGN KEY (tenant_id, substitui_id) REFERENCES clinica.evolucoes(tenant_id, id),
    FOREIGN KEY (tenant_id, criado_por) REFERENCES clinica.usuarios(tenant_id, id)
);
-- Uma evolução só pode ser corrigida uma vez: a próxima correção parte da versão mais recente.
CREATE UNIQUE INDEX evolucoes_uma_correcao_uk ON clinica.evolucoes(tenant_id, substitui_id) WHERE substitui_id IS NOT NULL;
CREATE INDEX evolucoes_paciente_autor_idx ON clinica.evolucoes(tenant_id, paciente_id, profissional_id, criado_em);

CREATE TABLE clinica.acessos_prontuario (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    usuario_id uuid NOT NULL,
    paciente_id uuid NOT NULL,
    acao text NOT NULL CHECK (acao IN ('listar_pacientes', 'ver_paciente', 'ver_evolucoes', 'criar_evolucao', 'corrigir_evolucao')),
    quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
    em timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, usuario_id) REFERENCES clinica.usuarios(tenant_id, id),
    FOREIGN KEY (tenant_id, paciente_id) REFERENCES clinica.pacientes(tenant_id, id)
);
CREATE INDEX acessos_prontuario_paciente_idx ON clinica.acessos_prontuario(tenant_id, paciente_id, em DESC);
CREATE INDEX acessos_prontuario_usuario_idx ON clinica.acessos_prontuario(tenant_id, usuario_id, em DESC);

DO $$ DECLARE tabela text; BEGIN FOREACH tabela IN ARRAY ARRAY['evolucoes', 'acessos_prontuario'] LOOP
    EXECUTE format('ALTER TABLE clinica.%I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE clinica.%I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('CREATE POLICY tenant_isolation ON clinica.%I TO multisaude_app USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', tabela);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON clinica.%I FOR EACH ROW EXECUTE FUNCTION clinica.bloquear_alteracao()', tabela || '_imutavel', tabela);
END LOOP; END $$;
GRANT SELECT, INSERT ON clinica.evolucoes, clinica.acessos_prontuario TO multisaude_app;

-- Médico escreve e lê o PRÓPRIO prontuário; o Administrador consulta a auditoria e não lê prontuário.
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['prontuario:ler', 'prontuario:escrever'])) WHERE nome = 'Médico';
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['auditoria:ler'])) WHERE nome = 'Administrador';
