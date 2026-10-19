# MultiSaúde — Backend

Java 17 · Spring Boot 4.1.1 · Maven Wrapper · PostgreSQL 16 · Flyway.
Monólito modular: os próximos módulos serão identidade, cadastros, pacientes e agenda.

## Banco de desenvolvimento

O banco `multisaude_dev` fica no PostgreSQL existente do servidor `sitw-tech-vps`.
É ambiente de desenvolvimento; ainda não é uma instalação para dados reais.
Não há dados de pacientes nem conta administrativa inicial.

Abra o túnel em um terminal e mantenha-o aberto:

```sh
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -L 127.0.0.1:15432:127.0.0.1:5432 sitw-tech-vps
```

Em outro terminal, dentro de `backend/`:

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
set -a
source .env
set +a
./mvnw spring-boot:run
```

O caminho de JAVA_HOME acima é o deste Mac; em outras máquinas, use o JDK instalado.
O `.env` não é carregado automaticamente pelo Spring: exporte as variáveis como acima.
Credenciais locais estão em `.env`, ignorado pelo Git, com permissão 0600.
Não compartilhe nem comite esse arquivo. `.env.example` documenta as variáveis.

```sh
curl http://127.0.0.1:8083/actuator/health
./mvnw verify
```

`/actuator/health` é público e verifica a conexão com o banco. O login é público;
as rotas de identidade exigem uma sessão e, quando indicado, permissão.
As demais rotas continuam bloqueadas. O frontend ainda usa mocks.

## Como a base funciona

- `pom.xml`: dependências e configuração do build; Maven Wrapper dispensa instalar Maven.
- `MultiSaudeApplication`: entrada da aplicação e descoberta dos componentes Spring.
- `config/SecurityConfig`: regras HTTP; não existe usuário padrão.
- `application.yml`: configuração por variáveis de ambiente; Hibernate apenas valida o schema.
- `db/migration/`: SQL versionado aplicado pelo Flyway ao iniciar. Não editar migrações já aplicadas: criar V2, V3 etc.

`multisaude_migrator` executa migrações; `multisaude_app` acessa apenas as tabelas
explicitamente autorizadas, sem permissão para criar/apagar estruturas.
O histórico do Flyway não é acessível ao usuário da aplicação.

A V1 cria `tenants` e `unidades`, com RLS habilitado e forçado. Sem contexto de
tenant, a aplicação não enxerga linhas. Cada operação futura deverá abrir uma
transação, validar o vínculo do usuário e definir `app.tenant_id` com escopo local.
O RLS é defesa adicional: o backend continuará responsável pela autorização.

`scripts/provision_database.rb` registra o provisionamento inicial. Recusa sobrescrever
credenciais ou reutilizar banco/roles existentes. Não executar novamente num banco provisionado.
Backups e restauração e os módulos de negócio ainda precisam ser implementados
antes de usar o sistema com dados reais. O backend ainda não foi implantado no servidor.

## Identidade e autenticação

A V2 adiciona `usuarios`, `papeis`, `vinculos` e `sessoes`. Todas usam RLS forçado.
As chaves estrangeiras incluem `tenant_id`: um vínculo não pode apontar para
usuário, unidade ou papel de outra clínica. O e-mail é único dentro da clínica.
Há um papel por usuário/unidade; o mesmo usuário pode ter papéis distintos em unidades distintas.

Senhas usam BCrypt com custo 12; novos usuários precisam de pelo menos 12 caracteres
e no máximo 72 bytes UTF-8. O token de sessão tem 256 bits aleatórios e prefixo
com o UUID da clínica. O prefixo apenas direciona a busca; só o hash completo valida
a sessão. O banco armazena SHA-256 do token, nunca o token em texto.
Sessões expiram em 12 horas e podem ser revogadas no logout. Usuário, vínculo,
unidade, clínica e permissões são verificados novamente em cada requisição.

O cliente envia `Authorization: Bearer <accessToken>`. Não há cookies de autenticação,
HTTP Basic ou sessão HTTP. Por isso CSRF está desabilitado nesta API Bearer.
Ao integrar o frontend, manter o token em memória; não colocar em URL ou localStorage.
CORS permite apenas `APP_CORS_ORIGIN` (padrão `http://localhost:5173`).
O login tem limite em memória de 10 tentativas por conta/clínica e 40 por IP em
15 minutos. Reiniciar o processo zera o contador; antes de múltiplas instâncias,
migrar esse contador para armazenamento compartilhado. Não confiar em headers de
proxy até configurar explicitamente o proxy de entrada.

| Método | Rota | Acesso |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Público, com limite de tentativas |
| GET | `/api/v1/auth/me` | Sessão válida |
| POST | `/api/v1/auth/logout` | Sessão válida; revoga a sessão atual |
| GET | `/api/v1/unidades` | Unidades com vínculo ativo do usuário |
| GET | `/api/v1/usuarios` | `usuarios:ler`; até 200 usuários da clínica |
| GET | `/api/v1/papeis` | `usuarios:ler` |
| POST | `/api/v1/usuarios` | `usuarios:criar` |

As permissões administrativas acima valem para a clínica inteira quando concedidas
no papel da unidade ativa. Não existe cadastro público nem endpoint para criar clínicas.
Alteração de senhas, recuperação de acesso, MFA, troca de unidade e edição de papéis
ainda não estão implementadas. O campo `mfa_ativo` foi adiado até existir o fluxo real.
Sem cadastro público, todos os usuários devem ser criados por um administrador.

### Primeiro administrador

Com o túnel SSH aberto e JAVA_HOME configurado, após `./mvnw verify`:

```sh
ruby scripts/bootstrap_admin.rb
```

Informe os nomes da clínica, unidade, administrador e o e-mail. A senha é gerada
automaticamente e fica em `.env.bootstrap`, com permissão 0600 e ignorada pelo Git.
O processo cria clínica, unidade, papéis Administrador/Recepção e o vínculo inicial
numa única transação e termina. O Administrador pode consultar/criar usuários;
Recepção ainda não tem permissões de módulos de negócio.
O comando recusa alterar uma clínica já existente. Em caso de falha, mantém o arquivo
local para diagnóstico e nova tentativa. Não compartilhe esse arquivo: contém uma senha.
A senha inicial não tem troca obrigatória automática nesta etapa.

Inicie a API normalmente e envie para o login um JSON com os valores salvos:

```json
{
  "tenantId": "UUID-DA-CLINICA",
  "unidadeId": "UUID-DA-UNIDADE",
  "email": "administrador@clinica.com.br",
  "senha": "SENHA-GERADA"
}
```

O contrato usa os UUIDs internos nesta etapa de API. A futura tela de login deve
resolver a clínica por domínio/identificador e apresentar as unidades autorizadas,
sem exigir que o operador digite UUIDs.

Para criar um usuário, envie `nome`, `email`, `senha`, `unidadeId` e `papelId` em
`POST /api/v1/usuarios`. Consulte os papéis pela API autenticada; nunca envie tenantId
para escolher o tenant de uma operação administrativa: ele vem da sessão validada.

### Verificação

`./mvnw verify` testa contra o banco configurado em DB_URL. O Flyway aplica migrações
pendentes antes dos testes. Os dados temporários dos testes são revertidos por rollback.
Os testes cobrem login/logout, sessão expirada, alteração de permissões, vínculo
desativado, validação, duplicidade, isolamento de tenant e chaves estrangeiras compostas.

## Agenda: ciclo de vida do agendamento

A V9 criou `agendamentos`; a V11 acrescentou histórico, motivos, canal e remarcação.
Cada mudança de estado grava uma linha em `agendamento_historico` (somente inserção).
Ações de ciclo de vida exigem `versao` (a lida pelo cliente): se outra pessoa alterou o
agendamento antes, a resposta é 409 e o cliente deve recarregar.

| Método | Rota | Permissão |
| --- | --- | --- |
| GET | `/api/v1/agendamento-motivos` | `agenda:ler` |
| GET | `/api/v1/agendamentos/{id}/historico` | `agenda:ler` |
| POST | `/api/v1/agendamentos/{id}/status` | `agenda:editar` |
| POST | `/api/v1/agendamentos/{id}/cancelar` | `agenda:cancelar` |
| POST | `/api/v1/agendamentos/{id}/remarcar` | `agenda:editar` |

Fluxo manual de status: `agendado` → `confirmado` → `check_in` → `em_atendimento` → `atendido`
(de `agendado`/`confirmado` também para `nao_compareceu`). Cancelar vale até `check_in`;
remarcar só em `agendado`/`confirmado`. Estados finais não mudam.
Remarcar **não move** o agendamento: o original vira `remarcado` e a resposta é um novo
agendamento com `remarcadoDe` apontando para ele. `retorno_de` (consulta de retorno)
é outro conceito e ainda não existe. Cancelado, não compareceu e remarcado liberam o horário.
Rotas novas precisam de regra explícita em `SecurityConfig`: o padrão é negar.
O `BootstrapAdmin` já cria o Administrador com todas as permissões atuais.

## Agenda: grades, bloqueios e disponibilidade

Regra da clínica: **só se agenda dentro da grade do profissional**. Não há encaixe fora da grade
nem sobre bloqueio. A V12 criou `bloqueios` e impede grades sobrepostas do mesmo profissional.
Criar e remarcar passam pela mesma validação (`AppointmentService.requireFreeSlot`).

| Método | Rota | Permissão |
| --- | --- | --- |
| GET | `/api/v1/grades?profissionalId=` | `agenda:ler` |
| POST | `/api/v1/grades` | `agenda:configurar` |
| DELETE | `/api/v1/grades/{id}` | `agenda:configurar` (desativa; agendamentos existentes ficam) |
| GET | `/api/v1/bloqueios?de=&ate=` | `agenda:ler` |
| POST | `/api/v1/bloqueios` | `agenda:configurar` (`profissionalId` omitido bloqueia a unidade toda) |
| DELETE | `/api/v1/bloqueios/{id}` | `agenda:configurar` (revoga; o registro permanece) |
| GET | `/api/v1/agenda/disponibilidade?profissionalId=&procedimentoId=&de=&ate=` | `agenda:ler` (datas `AAAA-MM-DD`, até 31 dias) |

- `diaSemana`: 0 = domingo ... 6 = sábado. Horários da grade são **locais da unidade** (`unidades.fuso`);
  o offset enviado pelo cliente não decide nada. O agendamento precisa caber inteiro em uma única janela da
  grade e não pode atravessar a meia-noite. Duas janelas coladas (08–12 e 12–18) não somam: cada
  agendamento precisa caber em uma delas.
- Respostas de reserva: `422` horário inválido para a agenda (fora da grade, bloqueado); `409` horário válido
  porém ocupado; `400` dados/referências inválidos; `403` unidade diferente da sessão.
- `vigenciaFim` da grade é inclusiva e opcional. `intervaloMin` só afeta os horários sugeridos pela
  disponibilidade (passo = duração do procedimento + intervalo); a reserva não o exige.
- Criar bloqueio sobre agendamentos ativos é recusado (409): cancele ou remarque antes.
- Desativar uma grade não cancela agendamentos já feitos nela.
- O default de `grades.vigencia` da V9 tinha o literal `'[\)'` (inválido); a V12 o corrigiu.

### Testes

`AgendaTestBase` cria as sessões direto no banco (mesmo formato e hash do login) porque o limite de
tentativas de login por IP é compartilhado entre as classes de teste. O endpoint de login continua
coberto em `IdentityIntegrationTest`. A suíte leva alguns minutos porque o banco de desenvolvimento
fica na VPS, atrás do túnel SSH: o custo é a latência de cada comando.

## Papéis e acesso do médico a pacientes

A V13 liga `profissionais.usuario_id` ao usuário que faz login (um usuário por profissional) e cria os papéis
**Médico** e **Recepção** com permissões reais. `POST /api/v1/profissionais` aceita `usuarioId` opcional.

| Papel | Permissões |
| --- | --- |
| Administrador | tudo o que existe hoje (inclui `agenda:configurar`); **sem** acesso clínico |
| Recepção | `agenda:ler/criar/editar/cancelar`, `pacientes:ler/criar/editar`, `profissionais:ler` |
| Médico | `agenda:ler/editar`, `pacientes:ler_vinculados` |

`pacientes:ler` libera todos os pacientes da clínica. `pacientes:ler_vinculados` libera só os pacientes com
**vínculo** com o profissional do usuário logado:
- já atendeu (`em_atendimento` ou `atendido`), ou
- tem agendamento `agendado`/`confirmado`/`check_in` que ainda não terminou.

Cancelado, não compareceu e remarcado não criam vínculo, e um agendamento passado esquecido em `agendado` também
não (senão daria acesso permanente). Sem vínculo a resposta é **404**, igual a paciente inexistente: não se revela
que o paciente é da clínica. Usuário com `pacientes:ler_vinculados` sem profissional ligado não vê ninguém.
Não existe acesso de emergência por exceção: decisão da clínica.
`ApiExceptionHandler` agora responde 404 a registro inexistente (antes `GET` de ID desconhecido dava 500).
