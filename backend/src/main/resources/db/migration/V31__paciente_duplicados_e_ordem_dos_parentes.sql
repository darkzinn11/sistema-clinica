-- V31: a conferência de duplicados na recepção entra na trilha de acessos a pacientes (cada paciente mostrado é registrado),
-- e os parentes guardam a ordem em que foram informados (criado_em é igual dentro da mesma transação).
ALTER TABLE clinica.acessos_prontuario DROP CONSTRAINT acessos_prontuario_acao_check;
ALTER TABLE clinica.acessos_prontuario ADD CONSTRAINT acessos_prontuario_acao_check
    CHECK (acao IN ('listar_pacientes', 'ver_paciente', 'ver_evolucoes', 'ver_evolucoes_compartilhadas', 'criar_evolucao', 'corrigir_evolucao', 'conferir_duplicados'));

ALTER TABLE clinica.paciente_parentes ADD COLUMN ordem smallint NOT NULL DEFAULT 0;
