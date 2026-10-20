CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE clinica.grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    profissional_id uuid NOT NULL, unidade_id uuid NOT NULL, dia_semana smallint NOT NULL CHECK(dia_semana BETWEEN 0 AND 6),
    inicio time NOT NULL, fim time NOT NULL CHECK(fim > inicio), intervalo_min smallint NOT NULL DEFAULT 0 CHECK(intervalo_min BETWEEN 0 AND 120),
    vigencia daterange NOT NULL DEFAULT daterange(current_date,NULL,'[\)'), ativo boolean NOT NULL DEFAULT true,
    FOREIGN KEY(tenant_id,profissional_id) REFERENCES clinica.profissionais(tenant_id,id),
    FOREIGN KEY(tenant_id,unidade_id) REFERENCES clinica.unidades(tenant_id,id)
);
CREATE INDEX grades_consulta_idx ON clinica.grades(tenant_id,profissional_id,unidade_id,dia_semana);
CREATE TABLE clinica.agendamentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    unidade_id uuid NOT NULL, profissional_id uuid NOT NULL, paciente_id uuid NOT NULL, procedimento_id uuid NOT NULL,
    periodo tstzrange NOT NULL CHECK(lower(periodo)<upper(periodo)), status text NOT NULL DEFAULT 'agendado'
        CHECK(status IN('agendado','confirmado','check_in','em_atendimento','atendido','cancelado','nao_compareceu')),
    observacao text, criado_por uuid, criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(),
    versao integer NOT NULL DEFAULT 0,
    FOREIGN KEY(tenant_id,unidade_id) REFERENCES clinica.unidades(tenant_id,id),
    FOREIGN KEY(tenant_id,profissional_id) REFERENCES clinica.profissionais(tenant_id,id),
    FOREIGN KEY(tenant_id,paciente_id) REFERENCES clinica.pacientes(tenant_id,id),
    FOREIGN KEY(tenant_id,procedimento_id) REFERENCES clinica.procedimentos(tenant_id,id),
    FOREIGN KEY(tenant_id,criado_por) REFERENCES clinica.usuarios(tenant_id,id)
);
CREATE INDEX agendamentos_paciente_idx ON clinica.agendamentos(tenant_id,paciente_id,lower(periodo));
CREATE INDEX agendamentos_unidade_idx ON clinica.agendamentos(tenant_id,unidade_id,lower(periodo));
CREATE INDEX agendamentos_profissional_idx ON clinica.agendamentos(tenant_id,profissional_id,lower(periodo));
ALTER TABLE clinica.agendamentos ADD CONSTRAINT agendamento_profissional_sem_conflito
    EXCLUDE USING gist (tenant_id WITH =, profissional_id WITH =, periodo WITH &&)
    WHERE (status NOT IN ('cancelado','nao_compareceu'));
DO $$ DECLARE tabela text; BEGIN FOREACH tabela IN ARRAY ARRAY['grades','agendamentos'] LOOP
    EXECUTE format('ALTER TABLE clinica.%I ENABLE ROW LEVEL SECURITY',tabela);
    EXECUTE format('ALTER TABLE clinica.%I FORCE ROW LEVEL SECURITY',tabela);
    EXECUTE format('CREATE POLICY tenant_isolation ON clinica.%I TO multisaude_app USING(tenant_id=nullif(current_setting(''app.tenant_id'',true),'''')::uuid) WITH CHECK(tenant_id=nullif(current_setting(''app.tenant_id'',true),'''')::uuid)',tabela);
END LOOP; END $$;
GRANT SELECT,INSERT,UPDATE ON clinica.grades,clinica.agendamentos TO multisaude_app;
