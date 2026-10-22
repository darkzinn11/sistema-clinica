-- Grade passa a ser regra: o agendamento só é aceito dentro dela (ver AppointmentService).
-- Esta migração impede grades sobrepostas, corrige o default de vigência e cria os bloqueios.

-- O default da V9 usava o literal '[\)' (barra invertida), que não é uma flag de intervalo válida.
ALTER TABLE clinica.grades ALTER COLUMN vigencia SET DEFAULT daterange(current_date, NULL, '[)');

-- Horários em minutos inteiros: a janela abaixo é calculada em minutos.
ALTER TABLE clinica.grades ADD CONSTRAINT grades_minutos_inteiros
    CHECK (extract(second FROM inicio) = 0 AND extract(second FROM fim) = 0);
ALTER TABLE clinica.grades ADD COLUMN janela_min int4range GENERATED ALWAYS AS (
    int4range((extract(hour FROM inicio) * 60 + extract(minute FROM inicio))::int,
              (extract(hour FROM fim) * 60 + extract(minute FROM fim))::int)) STORED;

-- Um profissional não pode ter duas grades ativas sobrepostas no mesmo dia da semana,
-- nem em unidades diferentes: ele não está em dois lugares ao mesmo tempo.
ALTER TABLE clinica.grades ADD CONSTRAINT grades_sem_sobreposicao
    EXCLUDE USING gist (tenant_id WITH =, profissional_id WITH =, dia_semana WITH =, janela_min WITH &&, vigencia WITH &&)
    WHERE (ativo);

-- profissional_id nulo bloqueia a unidade inteira (feriado, manutenção). Revogar preserva o registro.
CREATE TABLE clinica.bloqueios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    unidade_id uuid NOT NULL,
    profissional_id uuid,
    periodo tstzrange NOT NULL CHECK (lower(periodo) < upper(periodo)),
    motivo text NOT NULL CHECK (length(trim(motivo)) BETWEEN 1 AND 200),
    criado_por uuid NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    revogado_em timestamptz,
    FOREIGN KEY (tenant_id, unidade_id) REFERENCES clinica.unidades(tenant_id, id),
    FOREIGN KEY (tenant_id, profissional_id) REFERENCES clinica.profissionais(tenant_id, id),
    FOREIGN KEY (tenant_id, criado_por) REFERENCES clinica.usuarios(tenant_id, id)
);
CREATE INDEX bloqueios_consulta_idx ON clinica.bloqueios(tenant_id, unidade_id, profissional_id) WHERE revogado_em IS NULL;
ALTER TABLE clinica.bloqueios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.bloqueios FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.bloqueios TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON clinica.bloqueios TO multisaude_app;

UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['agenda:configurar'])) WHERE nome = 'Administrador';
