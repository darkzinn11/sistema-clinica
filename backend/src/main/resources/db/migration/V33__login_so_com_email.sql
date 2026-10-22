-- V33: entrar só com e-mail e senha. A aplicação precisa descobrir em quais clínicas o e-mail existe ANTES de saber a clínica, mas
-- `usuarios` tem segurança por linha forçada. Este índice (e-mail -> clínica) fica fora da segurança por linha, como `codigos_clinica`:
-- a aplicação só consulta por igualdade e NÃO escreve nele; quem o mantém é um gatilho do próprio banco. Ele só diz "este e-mail tem conta
-- nesta clínica": quem confere a senha continua sendo o login, dentro da clínica.
CREATE TABLE clinica.emails_login (
    email text NOT NULL CHECK (email = lower(trim(email)) AND length(email) <= 254),
    tenant_id uuid NOT NULL REFERENCES clinica.tenants(id),
    PRIMARY KEY (email, tenant_id)
);
GRANT SELECT ON clinica.emails_login TO multisaude_app;

CREATE FUNCTION clinica.indexar_email_login() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = clinica, pg_temp AS $$
BEGIN
    INSERT INTO clinica.emails_login (email, tenant_id) VALUES (NEW.email, NEW.tenant_id) ON CONFLICT DO NOTHING;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinica.indexar_email_login() FROM PUBLIC;

CREATE TRIGGER usuarios_indexar_email_login AFTER INSERT OR UPDATE OF email ON clinica.usuarios
    FOR EACH ROW EXECUTE FUNCTION clinica.indexar_email_login();

-- Usuários que já existem: o dono da tabela enxerga as linhas só com a segurança por linha desligada, e só durante esta migração.
ALTER TABLE clinica.usuarios NO FORCE ROW LEVEL SECURITY;
INSERT INTO clinica.emails_login (email, tenant_id) SELECT DISTINCT email, tenant_id FROM clinica.usuarios ON CONFLICT DO NOTHING;
ALTER TABLE clinica.usuarios FORCE ROW LEVEL SECURITY;
