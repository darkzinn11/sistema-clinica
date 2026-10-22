-- Histórico de status, motivos de cancelamento/remarcação, canal e remarcação.
-- Remarcar não move o agendamento: o antigo vira 'remarcado' e um novo aponta para ele em remarcado_de.
-- (retorno_de, previsto no diagrama, significa "consulta de retorno" e é outro conceito; fica para depois.)

ALTER TABLE clinica.agendamentos ADD CONSTRAINT agendamentos_tenant_id_uk UNIQUE (tenant_id, id);

ALTER TABLE clinica.agendamentos DROP CONSTRAINT agendamentos_status_check;
ALTER TABLE clinica.agendamentos ADD CONSTRAINT agendamentos_status_check
    CHECK (status IN ('agendado','confirmado','check_in','em_atendimento','atendido','cancelado','nao_compareceu','remarcado'));

-- Um agendamento remarcado libera o horário, como cancelado e não compareceu.
ALTER TABLE clinica.agendamentos DROP CONSTRAINT agendamento_profissional_sem_conflito;
ALTER TABLE clinica.agendamentos ADD CONSTRAINT agendamento_profissional_sem_conflito
    EXCLUDE USING gist (tenant_id WITH =, profissional_id WITH =, periodo WITH &&)
    WHERE (status NOT IN ('cancelado','nao_compareceu','remarcado'));

ALTER TABLE clinica.agendamentos
    ADD COLUMN canal text NOT NULL DEFAULT 'clinica' CHECK (canal IN ('clinica','online','telefone','whatsapp')),
    ADD COLUMN remarcado_de uuid,
    ADD CONSTRAINT agendamentos_remarcado_de_fk FOREIGN KEY (tenant_id, remarcado_de) REFERENCES clinica.agendamentos(tenant_id, id),
    ADD CONSTRAINT agendamentos_remarcado_de_diferente CHECK (remarcado_de IS NULL OR remarcado_de <> id);
-- Um agendamento só pode ser substituído uma vez.
CREATE UNIQUE INDEX agendamentos_remarcado_de_uk ON clinica.agendamentos(tenant_id, remarcado_de) WHERE remarcado_de IS NOT NULL;

-- Catálogo global, como especialidades: a origem diz quem pediu, sem precisar de status separados.
CREATE TABLE clinica.agendamento_motivos (
    id smallint PRIMARY KEY,
    nome text NOT NULL UNIQUE,
    origem text NOT NULL CHECK (origem IN ('paciente','profissional','clinica'))
);
INSERT INTO clinica.agendamento_motivos (id, nome, origem) VALUES
    (1, 'Solicitado pelo paciente', 'paciente'),
    (2, 'Solicitado pelo profissional', 'profissional'),
    (3, 'Solicitado pela clínica', 'clinica');
GRANT SELECT ON clinica.agendamento_motivos TO multisaude_app;

-- Somente inserção: o histórico nunca é alterado nem apagado pela aplicação.
CREATE TABLE clinica.agendamento_historico (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    agendamento_id uuid NOT NULL,
    de text,
    para text NOT NULL,
    motivo_id smallint REFERENCES clinica.agendamento_motivos(id),
    observacao text,
    usuario_id uuid NOT NULL,
    em timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, agendamento_id) REFERENCES clinica.agendamentos(tenant_id, id),
    FOREIGN KEY (tenant_id, usuario_id) REFERENCES clinica.usuarios(tenant_id, id)
);
CREATE INDEX agendamento_historico_idx ON clinica.agendamento_historico(tenant_id, agendamento_id, em);
ALTER TABLE clinica.agendamento_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica.agendamento_historico FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clinica.agendamento_historico TO multisaude_app
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT ON clinica.agendamento_historico TO multisaude_app;

UPDATE clinica.papeis SET permissoes = ARRAY(SELECT DISTINCT unnest(permissoes || ARRAY['agenda:editar','agenda:cancelar'])) WHERE nome = 'Administrador';
