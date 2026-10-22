-- V30: corrige a V29 (já aplicada no banco de desenvolvimento, portanto imutável) e completa o cadastro de pacientes.
--
-- 1) sem_cpf nascia como true para todo paciente existente (DEFAULT true), o que contradizia pacientes_cpf_sem_cpf_ck
--    em qualquer banco com paciente que tivesse CPF. O padrão passa a ser false. Não há backfill: a migração não enxerga
--    as linhas (RLS forçado). Paciente antigo sem CPF fica com sem_cpf = false até a próxima edição.
-- 2) "CPF, sem CPF ou estrangeiro" é regra do cadastro completo (API), não do banco: o cadastro rápido da fila grava só o nome.
ALTER TABLE clinica.pacientes ALTER COLUMN sem_cpf SET DEFAULT false;
ALTER TABLE clinica.pacientes DROP CONSTRAINT pacientes_cpf_regra_ck;

-- 3) Formato guardado: CEP com 8 dígitos, UF em maiúsculas, motivo de inativação conhecido, quem inativou existe na clínica.
ALTER TABLE clinica.pacientes
    ADD CONSTRAINT pacientes_cep_ck CHECK (cep IS NULL OR cep ~ '^[0-9]{8}$') NOT VALID,
    ADD CONSTRAINT pacientes_estado_ck CHECK (estado IS NULL OR estado ~ '^[A-Z]{2}$') NOT VALID,
    ADD CONSTRAINT pacientes_inativado_motivo_ck CHECK (inativado_motivo IS NULL OR inativado_motivo IN ('sem_vinculo', 'obito', 'sem_motivo')) NOT VALID,
    ADD CONSTRAINT pacientes_inativado_por_fk FOREIGN KEY (tenant_id, inativado_por) REFERENCES clinica.usuarios(tenant_id, id) NOT VALID;

ALTER TABLE clinica.paciente_parentes ADD CONSTRAINT paciente_parentes_cpf_ck CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$') NOT VALID;
ALTER TABLE clinica.paciente_historico
    ADD CONSTRAINT paciente_historico_campos_ck CHECK (cardinality(campos) > 0) NOT VALID,
    ADD CONSTRAINT paciente_historico_usuario_fk FOREIGN KEY (tenant_id, usuario_id) REFERENCES clinica.usuarios(tenant_id, id) NOT VALID;

-- 4) A busca por prontuário já usa o índice único da V29; o segundo era redundante.
DROP INDEX clinica.pacientes_busca_prontuario_idx;

-- 5) Número do prontuário sequencial por clínica, gerado na mesma transação do cadastro (cadastro que falha não deixa buraco).
CREATE TABLE clinica.prontuario_contador (
    tenant_id uuid PRIMARY KEY REFERENCES clinica.tenants(id),
    ultimo bigint NOT NULL CHECK (ultimo >= 0)
);
ALTER TABLE clinica.prontuario_contador ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.prontuario_contador FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.prontuario_contador TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON clinica.prontuario_contador TO multisaude_app;
