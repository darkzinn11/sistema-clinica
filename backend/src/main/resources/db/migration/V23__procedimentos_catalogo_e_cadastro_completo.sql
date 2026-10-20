-- Procedimentos: catálogo de sugestões (global, somente leitura) + cadastro completo da clínica + histórico de alterações.
-- A clínica escolhe quais sugestões adicionar (copia descrição e código TUSS) ou cria manualmente.

CREATE TABLE clinica.catalogo_procedimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_tuss text NOT NULL UNIQUE CHECK (codigo_tuss ~ '^[0-9]{8}$'),
    descricao text NOT NULL CHECK (length(trim(descricao)) BETWEEN 1 AND 600)
);
GRANT SELECT ON clinica.catalogo_procedimentos TO multisaude_app;

-- tipo passa a ser fechado. O texto livre antigo é normalizado: o que não for consulta nem exame vira procedimento.
UPDATE clinica.procedimentos
SET tipo = CASE WHEN lower(trim(tipo)) IN ('consulta', 'exame') THEN lower(trim(tipo)) ELSE 'procedimento' END;
ALTER TABLE clinica.procedimentos ADD CONSTRAINT procedimentos_tipo_check CHECK (tipo IN ('consulta', 'exame', 'procedimento'));

ALTER TABLE clinica.procedimentos
    ADD COLUMN sigla text CHECK (sigla IS NULL OR length(trim(sigla)) BETWEEN 1 AND 20),
    ADD COLUMN dias_retorno smallint CHECK (dias_retorno IS NULL OR dias_retorno BETWEEN 0 AND 365),
    ADD COLUMN aviso_agendamento text CHECK (aviso_agendamento IS NULL OR length(aviso_agendamento) <= 1000),
    ADD COLUMN preparo text CHECK (preparo IS NULL OR length(preparo) <= 4000),
    ADD COLUMN observacoes text CHECK (observacoes IS NULL OR length(observacoes) <= 2000),
    ADD COLUMN catalogo_id uuid REFERENCES clinica.catalogo_procedimentos(id),
    ADD COLUMN atualizado_por uuid,
    ADD CONSTRAINT procedimentos_atualizado_por_fk FOREIGN KEY (tenant_id, atualizado_por) REFERENCES clinica.usuarios(tenant_id, id);
-- Nome único sem diferenciar maiúsculas; uma sugestão do catálogo só pode ser adicionada uma vez por clínica.
CREATE UNIQUE INDEX procedimentos_nome_ci_uk ON clinica.procedimentos (tenant_id, lower(nome));
CREATE UNIQUE INDEX procedimentos_catalogo_uk ON clinica.procedimentos (tenant_id, catalogo_id) WHERE catalogo_id IS NOT NULL;

-- Quem mudou preço, tempo, tipo ou situação, quando, de quê e para quê. Somente inserção.
CREATE TABLE clinica.procedimento_historico (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    procedimento_id uuid NOT NULL,
    campo text NOT NULL CHECK (campo IN ('valor', 'tempo', 'tipo', 'ativo')),
    de text,
    para text,
    usuario_id uuid NOT NULL,
    em timestamptz NOT NULL DEFAULT clock_timestamp(),
    FOREIGN KEY (tenant_id, procedimento_id) REFERENCES clinica.procedimentos(tenant_id, id),
    FOREIGN KEY (tenant_id, usuario_id) REFERENCES clinica.usuarios(tenant_id, id)
);
CREATE INDEX procedimento_historico_idx ON clinica.procedimento_historico(tenant_id, procedimento_id, em DESC);
ALTER TABLE clinica.procedimento_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.procedimento_historico FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.procedimento_historico TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
CREATE TRIGGER procedimento_historico_imutavel BEFORE UPDATE OR DELETE ON clinica.procedimento_historico
    FOR EACH ROW EXECUTE FUNCTION clinica.bloquear_alteracao();
GRANT SELECT, INSERT ON clinica.procedimento_historico TO multisaude_app;

-- Administrador cadastra e edita; a recepção consulta. Criar procedimento (com preço) deixa de depender de agenda:criar.
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['procedimentos:ler', 'procedimentos:criar', 'procedimentos:editar'])) WHERE nome = 'Administrador';
UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['procedimentos:ler'])) WHERE nome = 'Recepção';
