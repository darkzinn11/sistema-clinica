-- Totem com CPF na entrada: a senha guarda o CPF digitado (sem ligar a paciente) e quem a gerou. O totem é um "dispositivo":
-- um usuário sem login, com papel próprio e uma única permissão, que a recepção nunca confunde com gente.

ALTER TABLE clinica.usuarios ADD COLUMN dispositivo boolean NOT NULL DEFAULT false;

ALTER TABLE clinica.senhas
    ADD COLUMN cpf_informado text CHECK (cpf_informado ~ '^[0-9]{11}$'),
    ADD COLUMN origem text NOT NULL DEFAULT 'recepcao' CHECK (origem IN ('recepcao', 'totem')),
    ADD COLUMN gerada_por uuid,
    ADD CONSTRAINT senhas_gerada_por_fk FOREIGN KEY (tenant_id, gerada_por) REFERENCES clinica.usuarios(tenant_id, id);

-- Limite de geração por dispositivo (30 por minuto) e limpeza do CPF antigo.
CREATE INDEX senhas_gerada_por_idx ON clinica.senhas(tenant_id, gerada_por, criada_em) WHERE gerada_por IS NOT NULL;
CREATE INDEX senhas_cpf_pendente_idx ON clinica.senhas(tenant_id, unidade_id, dia) WHERE cpf_informado IS NOT NULL;
