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
| POST | `/api/v1/agendamentos/{id}/status` | `agenda:editar` (confirmar, check-in, falta) ou `agenda:atender` (iniciar/finalizar, só o próprio) |
| POST | `/api/v1/agendamentos/{id}/cancelar` | `agenda:cancelar` |
| POST | `/api/v1/agendamentos/{id}/remarcar` | `agenda:remarcar` |

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
  grade. Duas janelas coladas (08–12 e 12–18) não somam: cada agendamento precisa caber em uma delas.
- **Grade em blocos (V20).** Cada janela tem `duracaoBlocoMin` (ex.: 09:00–12:00 de 20 em 20 min; 14:30–17:00 de 15
  em 15), e a janela precisa ser múltipla do bloco (o banco recusa o contrário). O início do agendamento precisa cair
  num bloco, contado a partir do começo **da janela**. O `intervaloMin` antigo foi removido: tinha sido interpretado
  como folga entre atendimentos e nunca valeu para a reserva.
- **Tempo do procedimento é opcional (V20).** Vazio ou `0` = "ainda não medido" (a clínica ainda não tem média) e fica
  guardado como nulo; de 1 a 4 minutos é recusado. Procedimento sem tempo ocupa **um bloco**; com tempo medido maior
  que o bloco ocupa blocos seguidos (45 min num bloco de 30 = 2 blocos = 60 min). Preencher o tempo depois não exige
  migrar nada.
- **`fim` do agendamento é opcional** em criar e remarcar: o sistema calcula pelos blocos. Se vier, precisa bater com
  o cálculo (422 "Duração inválida"). A disponibilidade devolve os mesmos horários que a reserva aceita.
- Respostas de reserva: `422` horário inválido para a agenda (fora da grade, bloqueado); `409` horário válido
  porém ocupado; `400` dados/referências inválidos; `403` unidade diferente da sessão.
- `vigenciaFim` da grade é inclusiva e opcional.
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
| Recepção | `agenda:ler/criar/editar/cancelar/remarcar`, `pacientes:ler/criar/editar`, `profissionais:ler` |
| Médico | `agenda:ler_proprios`, `agenda:atender`, `pacientes:ler_vinculados` (só a própria agenda; **não remarca** nem confirma: isso é da recepção) |

`pacientes:ler` libera todos os pacientes da clínica. `pacientes:ler_vinculados` libera só os pacientes com
**vínculo** com o profissional do usuário logado:
- já atendeu (`em_atendimento` ou `atendido`), ou
- tem agendamento `agendado`/`confirmado`/`check_in` que ainda não terminou.

Cancelado, não compareceu e remarcado não criam vínculo, e um agendamento passado esquecido em `agendado` também
não (senão daria acesso permanente). Sem vínculo a resposta é **404**, igual a paciente inexistente: não se revela
que o paciente é da clínica. Usuário com `pacientes:ler_vinculados` sem profissional ligado não vê ninguém.
Não existe acesso de emergência por exceção: decisão da clínica.
`ApiExceptionHandler` agora responde 404 a registro inexistente (antes `GET` de ID desconhecido dava 500).

## Proteção contra vazamento de dados

A clínica tem rodízio de médicos, e há médicos que atendem em várias clínicas: informação que sai de uma
agenda pode ir parar em outra. Por isso o médico só enxerga e opera **a própria** agenda.

- `agenda:ler` enxerga todos os profissionais (recepção, gestão). `agenda:ler_proprios` só o profissional ligado
  ao usuário (`AgendaAccess`). Vale para listagem de agendamentos, histórico, grades, bloqueios e disponibilidade.
  Pedir a agenda de um colega responde 403; usuário restrito sem profissional ligado não vê nada.
- Bloqueios: o médico vê os da unidade inteira e os próprios; o motivo de um colega pode ser pessoal.
- Mudar status: `agenda:atender` só inicia/finaliza o atendimento do **próprio**; confirmar, check-in e falta
  exigem `agenda:editar` (recepção). Agendamento de colega, inexistente ou de outra clínica respondem o mesmo
  404, inclusive com versão errada, para a resposta não servir de oráculo de existência.
- O médico não cria, cancela, remarca nem configura agenda, e não lê profissionais, usuários nem papéis.

Já estava bem: o banco isola clínicas por RLS; `server.error.include-message: never`; só `/actuator/health` e sem
detalhes; logs só com IDs (sem nome, CPF ou e-mail); login com hash falso para tempo constante.

### Cada unidade vê só a sua agenda

Listar agendamentos e ler o histórico filtram pela unidade ativa da sessão, para todos os papéis. Agendamento de
outra unidade, de outra clínica ou inexistente respondem o mesmo 404. Uma exceção deliberada: a **disponibilidade**
continua tratando agendamentos do profissional em outras unidades como horário ocupado (ele não está em dois lugares
ao mesmo tempo), sem revelar quem nem onde. Pacientes são cadastro da clínica inteira, não da unidade.

### Preços

`agenda:ver_valores` (Administrador e Recepção) libera `valorCentavos` em `/procedimentos`; sem ela o valor sai nulo.
O médico encaminha o paciente à recepção, que informa valores e tira dúvidas.

### Contenção de varredura de dados de pacientes

Quem tem acesso legítimo poderia varrer o cadastro em volume. `PatientReadGuard` aplica, por usuário, em
`GET /pacientes` e `GET /pacientes/{id}`:

| Perfil | Requisições por minuto | Registros entregues por hora |
| --- | --- | --- |
| Completo (`pacientes:ler`, recepção) | 120 | 3000 |
| Restrito (`pacientes:ler_vinculados`, médico) | 30 | 300 |

Os registros são cobrados **antes** de devolver a resposta: o que passaria do orçamento não é entregue (429 com
`Retry-After`). Ajustável por `app.limits.patients.{full,restricted}.{requests-per-minute,records-per-hour}`.
Os contadores ficam em memória (`VolumeLimiter`): reiniciar zera, e com mais de uma instância precisam ir para
armazenamento compartilhado. Os limites são ponto de partida e devem ser calibrados com o uso real da clínica.
Excesso gera log de aviso com tenant e usuário (sem dados do paciente).

## Prontuário (evolução) e auditoria de acesso

A V17 criou `evolucoes` e `acessos_prontuario`. As duas só aceitam leitura e inserção: a aplicação não tem
UPDATE/DELETE e um gatilho (`bloquear_alteracao`) recusa alteração ou exclusão de qualquer papel.

| Método | Rota | Permissão |
| --- | --- | --- |
| POST | `/api/v1/agendamentos/{id}/evolucoes` | `prontuario:escrever` |
| POST | `/api/v1/evolucoes/{id}/corrigir` | `prontuario:escrever` |
| GET | `/api/v1/pacientes/{id}/evolucoes` | `prontuario:ler` |
| GET | `/api/v1/auditoria/acessos?pacienteId=&usuarioId=&de=&ate=&limite=` | `auditoria:ler` (Administrador) |
| GET/POST | `/api/v1/prontuario/compartilhamentos` | `prontuario:compartilhar` (Administrador) |
| DELETE | `/api/v1/prontuario/compartilhamentos/{id}` | `prontuario:compartilhar` (revoga) |

- **Evolução é do autor.** Só o médico que a escreveu a corrige. Ele a lê sempre; um colega só a lê se o administrador
  **habilitou o par leitor → autor** (abaixo). Corrigir, em qualquer caso, é só do autor: para os outros responde 404,
  igual a inexistente. O Administrador e a Recepção não têm `prontuario:ler`.
- **Só se escreve em atendimento iniciado:** o agendamento precisa ser do próprio médico, da unidade da sessão e estar
  `em_atendimento` ou `atendido` (sem prazo para anotar depois de concluído: decisão provisória).
- **Habilitação leitor → autor (decisão do dono da clínica):** João pode ver o histórico de José sem que José veja o
  de Maria. Tem direção (João→José não dá nada a José) e **não é transitiva**. Mesmo habilitado, o leitor só vê
  evolução de colega dos pacientes com os quais **tem vínculo**. Sem prazo de validade: vale até ser revogada.
  Só o Administrador habilita e revoga; o histórico
  de habilitações é imutável (só se revoga) e ler evolução de colega é registrado à parte na auditoria
  (`ver_evolucoes_compartilhadas`). A resposta indica o autor (`profissionalNome`) e se é própria (`propria`).
- **Correção = nova versão.** A original permanece (`vigente` fica falso) e só a versão mais recente pode ser
  corrigida de novo. O `hash` (SHA-256) permite detectar adulteração direta no banco; **não é assinatura digital**.
- **Auditoria gravada na mesma transação da leitura**: se falhar, a leitura falha; se o limite de volume recusar a
  resposta, nada é registrado. Registra listagem e consulta de pacientes (uma linha por paciente entregue), leitura de
  evoluções, criação e correção. Quem consulta a auditoria não é registrado.

## Fila de senhas e guichês

Fluxo: o paciente pega a senha **sem se identificar** e espera; a recepção chama no guichê; o paciente apresenta os
documentos e a recepção liga a senha a ele **por CPF** (cadastrando antes, se for novo). Tipos de senha e guichês são
configuração do Administrador (a MultiSaúde usa Consulta, Exames, Laboratório, Retorno e a versão Preferencial de cada).

| Método | Rota | Permissão |
| --- | --- | --- |
| GET/POST/PUT | `/api/v1/tipos-senha`, `/api/v1/guiches` | ler: `fila:ler`; criar/alterar: `fila:configurar` |
| POST | `/api/v1/senhas` (`{tipoId}`) | `fila:gerar` |
| GET | `/api/v1/senhas/fila?tipoId=&guicheId=` | `fila:ler` (sem dado pessoal) |
| GET | `/api/v1/guiches/{id}/atual` | `fila:ler` (204 se o guichê está livre) |
| POST | `/api/v1/guiches/{id}/chamar-proxima` | `fila:chamar` |
| POST | `/api/v1/senhas/{id}/chamar`, `/rechamar`, `/finalizar`, `/ausente`, `/cancelar` | `fila:chamar` |
| POST | `/api/v1/senhas/{id}/identificar` (`{cpf}`) | `fila:chamar` + `pacientes:ler` |
| POST | `/api/v1/senhas/{id}/cadastrar-paciente` | `fila:chamar` + `pacientes:criar` |

- **Guichê define o que chama:** cada guichê lista os tipos que atende e a ordem entre eles. Guichê só de preferencial
  lista só tipos preferenciais; dentro da ordem, vale a chegada. Ordem entre tipos é configuração, não regra fixa.
- **Numeração** por unidade, tipo e dia (dia no fuso da unidade), incremento atômico. Código = prefixo + número
  (`CON P2`); o prefixo só aceita letras e espaço para o código nunca ser ambíguo.
- **Um guichê, uma senha ativa:** garantido por índice único no banco, mesmo com cliques simultâneos. Dois guichês nunca
  pegam a mesma senha (`FOR UPDATE SKIP LOCKED`). Senha ativa esquecida de um dia anterior é encerrada ao chamar.
- **Identificar por CPF só vale para senha já chamada.** Isso limita a consulta por CPF ao número de senhas atendidas e
  impede testar CPFs para descobrir quem é paciente. Cada identificação é auditada (`ver_paciente`) e conta no limite de
  volume. O CPF é validado pelos dígitos verificadores (também no cadastro de paciente): um erro de digitação vira 400,
  não "paciente novo". Corrigir um CPF errado é permitido e fica registrado.
- **Cadastrar e ligar é uma transação só:** se um falhar, nenhum acontece.
- **Senha nunca é apagada:** cancelar exige motivo e responsável (o Feegow tem lixeira; aqui não). Estados:
  `aguardando` → `chamada` → `em_atendimento` → `finalizada`, ou `ausente`/`cancelada`. O banco recusa status que não
  combina com os dados (ninguém "em atendimento" sem guichê e sem paciente).
- A fila e a TV não carregam nome nem CPF; só o código e o guichê. O médico não tem acesso à fila.
- Cada resposta de erro 404 de `/identificar` significa "paciente não cadastrado com este CPF" (a senha já foi
  validada pela lista); a interface deve oferecer o cadastro.

### Ainda não construído na fila
- **Credencial do totem:** resolvida na V27 (ver "Totem com CPF e dispositivos").
- **Perfil do Laboratório da Lacmar** (chamar só senhas de laboratório, sem ver paciente nenhum da clínica).
- Painel de TV, tempo de espera e relatórios. Senhas `aguardando` de dias anteriores ficam no banco, fora da fila.
- Não há teste de concorrência real (duas requisições simultâneas): a garantia é do índice único e do `SKIP LOCKED`.

## Especialidades: catálogo e cadastro da clínica

O sistema oferece um **catálogo de sugestões** (`catalogo_especialidades`, global, somente leitura para a aplicação) e cada clínica
tem o **seu próprio cadastro** (`especialidades`, por clínica, V21). A clínica adiciona uma sugestão com um clique (copia nome,
código e CBOS) ou cria manualmente, e desativa o que não deve aparecer. Nome único por clínica, sem diferenciar maiúsculas.

| Método | Rota | Permissão |
| --- | --- | --- |
| GET | `/api/v1/especialidades?busca=&ativo=&letra=` e `/{id}` | `especialidades:ler` ou `profissionais:ler` |
| POST | `/api/v1/especialidades` (`catalogoId` ou cadastro manual) | `especialidades:criar` |
| PUT | `/api/v1/especialidades/{id}` (inclui `ativo`) | `especialidades:editar` |
| GET | `/api/v1/catalogo/especialidades?busca=` (com `jaAdicionada`) | `especialidades:criar` |

- O vínculo profissional-especialidade usa **chave composta** `(tenant_id, especialidade_id)`: o banco recusa ligar um profissional
  à especialidade de outra clínica. Só especialidade ativa pode ser vinculada a um profissional novo.
- Desativar nunca apaga e não mexe em vínculos existentes.
- **O catálogo vem do arquivo oficial da ANS (V22).** São as 168 ocupações vigentes da Tabela 24 da TUSS (Código Brasileiro de
  Ocupações, versão 202607), com o nome oficial ("Médico cardiologista") e o CBOS de 6 dígitos. Nada foi digitado à mão: o script
  `scripts/gerar_catalogo_ans.py` lê a planilha oficial (só as planilhas necessárias, por leitura parcial do ZIP de 413 MB),
  valida e gera a migração com fonte, versão e data no cabeçalho. A clínica pode renomear ao adicionar ("Cardiologia").
  Licença: a ANS declara CC0-1.0 para as tabelas do seu guia de terminologia; a CBO é do Ministério do Trabalho e Emprego.
- As 4 linhas antigas do catálogo (V6) eram digitadas à mão, sem código oficial, e foram removidas. As especialidades que as clínicas
  já tinham copiado continuam no cadastro delas, só sem o vínculo com o catálogo.
- **Não há "código" de especialidade no catálogo** (o `06117` que o Feegow mostra): não achei fonte oficial pública para ele, e
  inventar seria pior que deixar vazio. O campo existe e a clínica pode preencher.
- Atualizar o catálogo: rodar o script com a versão nova da ANS e aplicar a migração gerada (ela atualiza por CBOS).
- Descoberto ao testar: `POST /profissionais` **nunca funcionou** (a consulta que validava unidades e especialidades passava a lista
  como argumentos soltos). Corrigido na V21 e agora coberto por teste.
- O Administrador recebe `especialidades:ler/criar/editar`; a Recepção, `especialidades:ler`. O Médico não vê o cadastro.

## Procedimentos: catálogo oficial e cadastro da clínica

Duas formas de cadastrar, como a clínica pediu: **à mão** ou **escolhendo das sugestões**. As sugestões são a Tabela 22 da TUSS da ANS
(5.967 procedimentos vigentes, versão 202607, `catalogo_procedimentos`, somente leitura para a aplicação). Adicionar uma sugestão copia
descrição e código TUSS para o cadastro da própria clínica; preço e tempo ficam em branco para ela preencher. Cada clínica só vê o que é seu.

| Método | Rota | Permissão |
| --- | --- | --- |
| GET | `/api/v1/procedimentos?busca=&tipo=&ativo=&letra=&pagina=&tamanho=` e `/{id}` | `procedimentos:ler`, `agenda:ler` ou `agenda:ler_proprios` |
| POST | `/api/v1/procedimentos` (`catalogoId` ou cadastro manual) | `procedimentos:criar` |
| PUT | `/api/v1/procedimentos/{id}` (inclui `ativo`) | `procedimentos:editar` |
| GET | `/api/v1/procedimentos/{id}/historico` | `procedimentos:editar` |
| GET | `/api/v1/catalogo/procedimentos?busca=&naoAdicionados=&pagina=&tamanho=` | `procedimentos:criar` |

- A lista devolve o total no cabeçalho `X-Total-Count`. Sem `ativo`, vêm todos (ativos e inativos); as telas de agenda devem passar `ativo=true`.
- **Busca sem acento e sem diferenciar maiúsculas (V25):** "biopsia" acha "Biópsia"; todas as palavras precisam aparecer (nome, sigla ou código).
- **Tipo fechado:** `consulta`, `exame` ou `procedimento` (o texto livre antigo foi mapeado; o que não era consulta nem exame virou procedimento).
- **Tempo opcional:** vazio ou `0` = ainda não medido (nulo); de 1 a 4 minutos é recusado (ver grade em blocos).
- **Campos:** nome (único na clínica, sem diferenciar caixa), código TUSS, sigla, tempo, valor, dias para retorno, **aviso ao agendar** (mostrado à
  recepção), **preparo** (instrução ao paciente) e observações internas. Nunca se apaga: desativa-se. Procedimento inativo não é agendável.
- **Preço:** só vê e só altera quem tem `agenda:ver_valores`. Quem edita sem essa permissão mantém o preço atual, mesmo que o corpo traga outro valor.
- **Histórico (somente inserção, o banco recusa alteração e exclusão):** registra valor, tempo, tipo e situação (quem, quando, de, para). As linhas de
  `valor` só aparecem para quem tem `agenda:ver_valores`.
- Permissões: Administrador `procedimentos:ler/criar/editar`; Recepção `procedimentos:ler`. Criar procedimento deixou de depender de `agenda:criar`.
  O Médico continua lendo o catálogo, sem preço.
- **Atribuição da fonte** (o frontend deve exibir junto das sugestões): *Terminologia Unificada da Saúde Suplementar (TUSS), Tabela 22, versão 202607.
  Fonte: Agência Nacional de Saúde Suplementar (ANS).* Copiamos só código e termo, sem alterar. **Não importamos as colunas de CBHPM nem de AMB-92.**
- **Risco de licença aceito pelo dono do projeto (20/10/2026):** o site da ANS publica o conteúdo sob Creative Commons Atribuição-SemDerivações 3.0 (CC BY-ND) e a
  Tabela 22 se baseia na CBHPM (AMB). Não encontramos aviso de direitos específico da TUSS e nenhum jurista revisou. Se for preciso, uma confirmação por
  escrito da ANS resolve; trocar a lista é só gerar outra migração.
- Atualizar a lista: `python3 -I scripts/gerar_catalogo_ans.py procedimentos --saida <migração>` e aplicar (atualiza por código TUSS).

## Profissionais: cadastro completo e procedimentos habilitados (V26)

- **Cadastro:** nome, nome social, CPF (validado, único por clínica), nascimento, sexo, conselho/UF/número (único por clínica), RQE, CBO, telefones,
  e-mail, cor da agenda (`#RRGGBB`), **mensagem da agenda** (aviso à recepção; é onde fica o limite de idade informado pelo médico, **sem validação**),
  observações internas, oculto na agenda, ativo e usuário ligado (um usuário por profissional). Nunca se apaga: desativa-se (não cancela agendamentos futuros).
- **Especialidades:** a lista da clínica, com exatamente uma **principal** (a informada ou a primeira). O banco garante uma principal por profissional.
- **API:** `GET/POST /profissionais`, `GET/PUT /profissionais/{id}`. A lista aceita `busca` (sem acento, todas as palavras), `especialidadeId`, `ativo`, `letra`,
  `naAgenda`, `pagina`/`tamanho` e devolve `X-Total-Count`. `PUT` substitui os campos (campo omitido limpa), exceto `ativo` omitido, que mantém.
- **Dado de RH:** CPF, nascimento e observações só aparecem para quem tem `profissionais:editar`; a recepção lê o resto.
- **A lista manda:** `GET/PUT /profissionais/{id}/procedimentos`. Sem o procedimento habilitado, a reserva e a consulta de horários livres são recusadas (422
  "Este profissional não realiza este procedimento."). O `PUT` substitui a lista; itens novos precisam existir e estar ativos; os já habilitados e depois
  desativados podem ficar (voltam com `ativo=false`). Remarcar **não** reavalia a lista.
- **Copiar grade:** `POST /grades/copiar` (`agenda:configurar`) copia todas as grades ativas da origem para o destino, na unidade da sessão. Tudo ou nada: se o
  destino já tem grade sobreposta, nada é copiado (409 listando os horários). Bloqueios não são copiados.
- Permissões: Administrador ganha `profissionais:editar`. Médico não vê o cadastro de colegas.

## Login por código da clínica (V28)

- **Entrar:** `POST /auth/login` com `codigoClinica` (o que a pessoa digita; minúsculas, números e `-`, até 40 caracteres, sem diferenciar caixa nem espaços nas pontas), `email`, `senha`
  e, opcionalmente, `unidadeId`. Envie **ou** `codigoClinica` **ou** `tenantId` (clientes antigos); os dois juntos, ou nenhum, é 400.
- **Unidade:** com `unidadeId`, entra nela. Sem `unidadeId` e com **uma** unidade, entra direto. Com **várias**, responde `409` com `{ "erro": "Escolha a unidade.", "unidades": [{id, nome}] }`
  e o cliente reenvia com `unidadeId`. A lista só sai **depois** de a senha ser validada.
- **Nada vaza:** código inexistente, clínica suspensa, e-mail errado, senha errada, usuário inativo e unidade que não é da pessoa dão o **mesmo** `401` com o mesmo corpo e o mesmo custo
  (BCrypt contra um hash fictício). O limite de tentativas (10 por clínica+e-mail e 40 por IP, em 15 minutos) usa o código digitado.
- **Resposta e `GET /auth/me`:** além de `usuarioId`, `tenantId`, `unidadeId`, `nome`, `email`, `papel` e `permissoes`, trazem `clinicaNome`, `unidadeNome` e `codigoClinica` (nulo se a clínica
  não tem código).
- **Tabela `codigos_clinica`:** sem segurança por linha, porque o login precisa traduzir código em clínica antes de existir clínica selecionada. Expõe só "código → id da clínica", consultada por
  igualdade; **nenhuma rota lista códigos**. O código nunca muda (a aplicação só tem `SELECT` e `INSERT`). Um mesmo e-mail em duas clínicas são duas contas independentes.
- **Clínica já existente:** a migração não copia (`tenants` tem segurança por linha forçada). Dar um código: `INSERT INTO clinica.codigos_clinica (codigo, tenant_id) VALUES ('codigo-da-clinica', '<id>');`.
  O `BootstrapAdmin` aceita `BOOTSTRAP_CLINIC_CODE`; sem ele, deriva `clinica-` + 8 primeiros caracteres do id.

## Totem com CPF e dispositivos (V27)

- **Fluxo:** o paciente digita o CPF de quem será atendido (ou "Sem CPF"), escolhe o objetivo e o preferencial, e recebe a senha. O totem **não consulta o cadastro**:
  só confere os dígitos do CPF e nunca mostra nome, nem se é cadastrado, nem se há agendamento. A resposta de `POST /totem/senhas` tem só `codigo`, `tipoNome` e `preferencial`.
- **Dispositivo:** o Administrador (`fila:configurar`) cadastra o totem em `POST /dispositivos` (`{nome}`) e recebe o token **uma única vez** (365 dias). `GET /dispositivos`
  lista sem token; `DELETE /dispositivos/{id}` desativa e derruba o token na hora. O dispositivo é um usuário sem login (senha inutilizável, fora de `GET /usuarios`) com o
  papel `Totem` e a única permissão `totem:usar`, regravada a cada cadastro. Alcança só `GET /totem/tipos` (tipos ativos: id, nome, preferencial) e `POST /totem/senhas`.
  Usuários com `fila:gerar` (recepção) não usam os endpoints do totem, e o totem não usa nada da recepção. Limite: 30 senhas por minuto por totem (429 com `Retry-After`).
- **Senha:** guarda `cpf_informado` (11 dígitos, `CHECK` no banco), `origem` (`recepcao`/`totem`) e `gerada_por`. O CPF **nunca** aparece na fila, na chamada nem no painel.
- **Recepção:** depois de chamar a senha, `GET /senhas/{id}/identificacao` (`fila:chamar` + `pacientes:ler`) devolve `situacao` (`cadastrado`, `nao_cadastrado`, `sem_cpf`), o CPF digitado
  e, se cadastrado, o paciente e os agendamentos de hoje **desta unidade** (sem valores; só vêm para quem também tem `agenda:ler`). Antes da chamada é 409. A leitura é auditada
  (`ver_paciente`) e conta no limite de volume. O CPF pode ser do responsável: a recepção confirma "é este paciente?" e liga com `identificar` (ou troca o CPF, ou cadastra).
- **Minimização:** o CPF é apagado da senha ao ligar o paciente; nas senhas nunca ligadas, a limpeza roda ao gerar a primeira senha de um dia posterior (sem tarefa agendada).
  **Limite conhecido:** se ninguém gerar senha depois, o CPF digitado continua guardado.
- **Para o frontend:** o aviso "CPF de quem será atendido" fica na tela do totem; o token do dispositivo vai no `Authorization: Bearer`, como o das pessoas.

### CORS e navegador

O CORS liberava só `GET`, `POST` e `OPTIONS`: qualquer `PUT` ou `DELETE` feito pelo navegador seria bloqueado (editar paciente, desativar grade, editar
guichê, editar procedimento). Agora libera `PUT` e `DELETE` e expõe `X-Total-Count` e `Retry-After` ao JavaScript. Continua só a origem `APP_CORS_ORIGIN`.

### Lacunas conhecidas (ainda não tratadas)

- **Sem assinatura digital.** O CFM exige ICP-Brasil para documento médico eletrônico. O hash só detecta adulteração.
  É requisito legal a resolver antes de usar com pacientes reais.
- **Evolução fica inacessível se o autor sair.** Só o autor lê; se o profissional for desativado, ninguém lê. Falta
  definir quem responde por prontuário de quem saiu (responsável técnico) e o acesso do próprio paciente (LGPD).
- **Papéis padrão definidos em dois lugares** (migrações e `BootstrapAdmin`). Já divergiram uma vez: clínica nova
  nasceria com o Médico antigo, que via todas as agendas. Vale ter uma fonte única.

- **Auditoria sem retenção definida e sem alerta:** o registro existe, mas ninguém é avisado de padrão suspeito.
- **O médico recebe CPF, e-mail e celular completos** dos pacientes com vínculo. Pode-se mascarar.
- **Limite de volume só em pacientes.** Agenda, grades e bloqueios não têm teto por usuário (não expõem dados
  pessoais além de IDs, mas permitem mapear a operação).
- **`LoginRateLimiter` recusa todos os logins com 10 mil chaves distintas:** um ataque distribuído pode travar
  o login da clínica inteira por 15 minutos.
- **`agenda:criar` serve a agendamento e a cadastro de procedimento** (que carrega preço): a recepção cria ambos.
- Um médico que copia dados manualmente não é impedido por software; só a auditoria e o contrato o desencorajam.
