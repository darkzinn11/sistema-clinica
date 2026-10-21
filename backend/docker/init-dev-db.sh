#!/bin/sh
# Roda uma única vez, na criação do volume. Reproduz o que scripts/provision_database.rb faz no servidor:
# dono do banco e das migrações (multisaude_migrator) separado do usuário da aplicação (multisaude_app, sem BYPASSRLS).
# As extensões btree_gist e unaccent são criadas pelas migrações (são "trusted": o dono do banco pode criá-las).
set -eu
psql -v ON_ERROR_STOP=1 -v app_pw="$MULTISAUDE_APP_PASSWORD" -v mig_pw="$MULTISAUDE_MIGRATOR_PASSWORD" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
CREATE ROLE multisaude_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'mig_pw';
CREATE ROLE multisaude_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'app_pw';
ALTER DATABASE multisaude_dev OWNER TO multisaude_migrator;
REVOKE ALL ON DATABASE multisaude_dev FROM PUBLIC;
GRANT CONNECT ON DATABASE multisaude_dev TO multisaude_app;
\connect multisaude_dev
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA clinica AUTHORIZATION multisaude_migrator;
GRANT USAGE ON SCHEMA clinica TO multisaude_app;
ALTER ROLE multisaude_app IN DATABASE multisaude_dev SET search_path TO clinica;
ALTER ROLE multisaude_migrator IN DATABASE multisaude_dev SET search_path TO clinica;
SQL
