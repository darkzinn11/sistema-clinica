-- O médico leitor só vê evolução de um colega (autor) se o administrador habilitou o par leitor -> autor.
-- A permissão tem direção e não é transitiva. O histórico de habilitações é imutável: só se pode revogar.
CREATE TABLE clinica.compartilhamentos_prontuario (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    leitor_id uuid NOT NULL,
    autor_id uuid NOT NULL,
    criado_por uuid NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    revogado_por uuid,
    revogado_em timestamptz,
    CHECK (leitor_id <> autor_id),
    CHECK ((revogado_em IS NULL) = (revogado_por IS NULL)),
    FOREIGN KEY (tenant_id, leitor_id) REFERENCES clinica.profissionais(tenant_id, id),
    FOREIGN KEY (tenant_id, autor_id) REFERENCES clinica.profissionais(tenant_id, id),
    FOREIGN KEY (tenant_id, criado_por) REFERENCES clinica.usuarios(tenant_id, id),
    FOREIGN KEY (tenant_id, revogado_por) REFERENCES clinica.usuarios(tenant_id, id)
);
CREATE UNIQUE INDEX compartilhamentos_ativo_uk ON clinica.compartilhamentos_prontuario(tenant_id, leitor_id, autor_id) WHERE revogado_em IS NULL;
CREATE INDEX compartilhamentos_leitor_idx ON clinica.compartilhamentos_prontuario(tenant_id, leitor_id) WHERE revogado_em IS NULL;

CREATE FUNCTION clinica.compartilhamento_so_revoga() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Habilitação de acesso não pode ser apagada; revogue.' USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF OLD.revogado_em IS NOT NULL OR NEW.tenant_id <> OLD.tenant_id OR NEW.leitor_id <> OLD.leitor_id OR NEW.autor_id <> OLD.autor_id
       OR NEW.criado_por <> OLD.criado_por OR NEW.criado_em <> OLD.criado_em THEN
        RAISE EXCEPTION 'Habilitação de acesso só pode ser revogada, uma vez.' USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER compartilhamentos_so_revoga BEFORE UPDATE OR DELETE ON clinica.compartilhamentos_prontuario
    FOR EACH ROW EXECUTE FUNCTION clinica.compartilhamento_so_revoga();

ALTER TABLE clinica.compartilhamentos_prontuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.compartilhamentos_prontuario FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.compartilhamentos_prontuario TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON clinica.compartilhamentos_prontuario TO multisaude_app;

-- Ler evolução de colega fica distinguível na auditoria.
ALTER TABLE clinica.acessos_prontuario DROP CONSTRAINT acessos_prontuario_acao_check;
ALTER TABLE clinica.acessos_prontuario ADD CONSTRAINT acessos_prontuario_acao_check
    CHECK (acao IN ('listar_pacientes', 'ver_paciente', 'ver_evolucoes', 'ver_evolucoes_compartilhadas', 'criar_evolucao', 'corrigir_evolucao'));

UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['prontuario:compartilhar'])) WHERE nome = 'Administrador';
