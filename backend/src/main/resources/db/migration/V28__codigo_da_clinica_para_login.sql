-- Login por código da clínica (SaaS): a pessoa digita o código, não um UUID. A tabela `tenants` tem segurança por linha e só enxerga a clínica
-- já selecionada, então o código precisa de uma tabela de apoio que a aplicação consulte ANTES de existir clínica selecionada.
-- Por isso esta tabela NÃO tem segurança por linha. O que ela expõe é só "código -> id da clínica", e a aplicação só consulta por igualdade:
-- nenhuma rota lista códigos. O código nunca muda (a aplicação não tem UPDATE nem DELETE).
CREATE TABLE clinica.codigos_clinica (
    codigo text PRIMARY KEY CHECK (codigo ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$'),
    tenant_id uuid NOT NULL UNIQUE REFERENCES clinica.tenants(id)
);
GRANT SELECT, INSERT ON clinica.codigos_clinica TO multisaude_app;
-- Clínicas que já existem não são copiadas aqui: a migração não enxerga `tenants` (segurança por linha forçada). Dar um código a uma clínica existente:
--   INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES ('codigo-da-clinica', '<id da clínica>');
