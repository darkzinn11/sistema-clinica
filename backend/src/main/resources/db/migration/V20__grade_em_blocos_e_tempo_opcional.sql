-- A grade define o tamanho do horário (bloco): "09:00-12:00 de 20 em 20 minutos". O agendamento ocupa blocos.
-- O tempo do procedimento passa a ser opcional: a clínica ainda não mediu uma média, e "0 min" no cadastro dela
-- significa "ainda não medido", não "dura zero". Sem tempo o procedimento ocupa um bloco; com tempo maior que o bloco,
-- ocupa blocos seguidos.

ALTER TABLE clinica.grades ADD COLUMN duracao_bloco_min smallint NOT NULL DEFAULT 30 CHECK (duracao_bloco_min BETWEEN 5 AND 240);
ALTER TABLE clinica.grades ALTER COLUMN duracao_bloco_min DROP DEFAULT;
-- Uma janela precisa caber em blocos inteiros: 09:00-12:00 com 25 min deixaria uma sobra que ninguém consegue agendar.
ALTER TABLE clinica.grades ADD CONSTRAINT grades_janela_em_blocos CHECK ((upper(janela_min) - lower(janela_min)) % duracao_bloco_min = 0);

-- O intervalo (folga entre atendimentos) da V9 foi interpretado errado e nunca teve efeito na reserva.
ALTER TABLE clinica.grades DROP COLUMN intervalo_min;

ALTER TABLE clinica.procedimentos ALTER COLUMN duracao_min DROP NOT NULL;
ALTER TABLE clinica.procedimentos ALTER COLUMN duracao_min DROP DEFAULT;
