#!/usr/bin/env ruby
# Provisionamento inicial explícito. Não altera bancos existentes.
require 'open3'
require 'securerandom'

env_path = File.expand_path('../.env', __dir__)
abort 'Já existe backend/.env; não sobrescrever credenciais.' if File.exist?(env_path)
ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', 'sitw-tech-vps']
check_sql = "SELECT datname FROM pg_database WHERE datname = 'multisaude_dev'; SELECT rolname FROM pg_roles WHERE rolname IN ('multisaude_app', 'multisaude_migrator');"
out, err, status = Open3.capture3(*ssh, 'sudo -n -u postgres psql -X -At -v ON_ERROR_STOP=1', stdin_data: check_sql)
abort "Falha na inspeção: #{err}" unless status.success?
abort 'Banco ou roles já existem. Revisar manualmente; nenhuma alteração realizada.' unless out.strip.empty?

app_password = SecureRandom.hex(32)
migration_password = SecureRandom.hex(32)
# Guardar antes de provisionar: permite recuperar uma execução interrompida.
File.open(env_path, File::WRONLY | File::CREAT | File::EXCL, 0600) do |file|
  file.puts "DB_URL=jdbc:postgresql://127.0.0.1:15432/multisaude_dev"
  file.puts "DB_USERNAME=multisaude_app"
  file.puts "DB_PASSWORD=#{app_password}"
  file.puts "DB_MIGRATION_USERNAME=multisaude_migrator"
  file.puts "DB_MIGRATION_PASSWORD=#{migration_password}"
  file.puts 'SERVER_PORT=8083'
end
sql = <<~SQL
  CREATE ROLE multisaude_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '#{migration_password}';
  CREATE ROLE multisaude_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '#{app_password}';
  CREATE DATABASE multisaude_dev OWNER multisaude_migrator;
  REVOKE ALL ON DATABASE multisaude_dev FROM PUBLIC;
  GRANT CONNECT ON DATABASE multisaude_dev TO multisaude_app;
  \\connect multisaude_dev
  REVOKE ALL ON SCHEMA public FROM PUBLIC;
  CREATE SCHEMA clinica AUTHORIZATION multisaude_migrator;
  GRANT USAGE ON SCHEMA clinica TO multisaude_app;
  ALTER ROLE multisaude_app IN DATABASE multisaude_dev SET search_path TO clinica;
  ALTER ROLE multisaude_migrator IN DATABASE multisaude_dev SET search_path TO clinica;
SQL
_, _, status = Open3.capture3(*ssh, 'sudo -n -u postgres psql -X -v ON_ERROR_STOP=1', stdin_data: sql)
abort 'Falha no provisionamento; credenciais preservadas em .env. Verificar estado remoto antes de repetir.' unless status.success?
puts 'Banco multisaude_dev e roles criados. Credenciais salvas em backend/.env (0600).'
