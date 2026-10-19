#!/usr/bin/env ruby
require 'securerandom'
require 'shellwords'

root = File.expand_path('..', __dir__)
credentials_path = File.join(root, '.env.bootstrap')
jar = File.join(root, 'target/backend-0.0.1-SNAPSHOT.jar')
abort 'Execute ./mvnw verify antes de criar o administrador.' unless File.file?(jar)

def read_env(path)
  File.readlines(path).each_with_object({}) do |line, values|
    line = line.strip
    next if line.empty? || line.start_with?('#')
    key, value = line.split('=', 2)
    abort "Arquivo de ambiente inválido: #{path}" unless key && value
    values[key] = Shellwords.split(value).join(' ')
  end
end

def prompt(label)
  print "#{label}: "
  value = STDIN.gets&.strip
  abort 'Valor obrigatório não informado.' if value.nil? || value.empty?
  value
end

database = read_env(File.join(root, '.env'))
if File.exist?(credentials_path)
  puts 'Reutilizando o cadastro local salvo; nenhum dado existente será sobrescrito no banco.'
  bootstrap = read_env(credentials_path)
else
  bootstrap = {
    'BOOTSTRAP_TENANT_ID' => SecureRandom.uuid,
    'BOOTSTRAP_UNIT_ID' => SecureRandom.uuid,
    'BOOTSTRAP_CLINIC_NAME' => prompt('Nome da clínica'),
    'BOOTSTRAP_UNIT_NAME' => prompt('Nome da unidade'),
    'BOOTSTRAP_ADMIN_NAME' => prompt('Nome do administrador'),
    'BOOTSTRAP_ADMIN_EMAIL' => prompt('E-mail do administrador'),
    'BOOTSTRAP_ADMIN_PASSWORD' => SecureRandom.urlsafe_base64(24)
  }
  File.open(credentials_path, File::WRONLY | File::CREAT | File::EXCL, 0600) do |file|
    bootstrap.each { |key, value| file.puts "#{key}=#{Shellwords.escape(value)}" }
  end
end
java = ENV['JAVA_HOME'] ? File.join(ENV['JAVA_HOME'], 'bin/java') : 'java'
ok = system(database.merge(bootstrap), java, '-jar', jar,
  '--spring.main.web-application-type=none', '--bootstrap.enabled=true', chdir: root)
abort 'Bootstrap falhou. Os dados locais foram preservados; confira o erro antes de tentar novamente.' unless ok
puts 'Credenciais e IDs salvos em backend/.env.bootstrap (fora do Git, permissão 0600).'
