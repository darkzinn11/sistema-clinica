# Handoff: onde estamos e como continuar (atualizado em 2026-10-22)

Branch de trabalho: `feature/front-integracao-backend` (saiu da `main`). Remoto **`origin`** = `darkzinn11/sistema-clinica`. O remoto `jorran` é do Jorran: **não enviar nada para ele sem o dono pedir**.

Leia antes de tudo: `backend/README.md` (cada módulo e endpoint está documentado), `docs/ROADMAP.md` e `docs/superpowers/specs/2026-10-20-integracao-front-backend-design.md` (desenho da integração; parte dele já foi superada pelo que está aqui).

## O que o dono quer (prioridade)
Mostrar aos chefes (Clínica Popular MultiSaúde) o sistema **funcionando de verdade, sem mock**, começando pela **experiência da recepcionista**. Cada tela mock deve virar tela real puxando do banco. Telas ainda de exemplo mostram a faixa "Tela de demonstração" (`Frontend/src/components/shell/shell-layout.tsx`, lista `REAL_ROUTES`); ao ligar uma tela, **adicione a rota em `REAL_ROUTES`**.

## Regras permanentes (não quebrar)
- Nunca ler, mostrar, commitar ou enviar `backend/.env` e `backend/.env.bootstrap`. Migration já aplicada é **imutável**: erro = nova `V<n>` (a V29 já tem a V30 e V31 consertando).
- Sem push para `jorran`, sem deploy, sem dado real de paciente. Commits pequenos, com o trailer `Co-Authored-By` da ferramenta que usar.
- Responder em português. Ser crítico com o dono, não concordar por reflexo.
- **Maven nunca em paralelo** (nem rodar o servidor e um teste ao mesmo tempo: o servidor também é Maven).
- Toda regra de segurança/negócio nova: teste de integração **e** mutação (quebrar o código de propósito, ver o teste falhar, restaurar, conferir com `git diff`). Isto já pegou defeitos reais várias vezes.
- Nenhum dado de paciente sai sem entrar na trilha `acessos_prontuario` (`AccessAudit`) e sem passar pelo `PatientReadGuard` (limite de volume). Siga o padrão de `InicioController` / `AgendaViewController`.
- Banco com segurança por linha (RLS) forçada: tudo roda em `TenantTransactions.inTenant`. Migração não enxerga as linhas (nem o dono da tabela), por isso listas iniciais nascem por código (ver `PatientRepository.seedIfEmpty`) e há tabelas fora de RLS só de consulta por igualdade (`codigos_clinica`, `emails_login`).

## Como rodar (máquina do dono, macOS)
O banco de desenvolvimento é um PostgreSQL no servidor `sitw-tech-vps`, acessado por túnel SSH. **O túnel cai de vez em quando** (erro "I/O error" nos testes = túnel, não bug: rode de novo).
```sh
# 1) túnel (deixe aberto)
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -L 127.0.0.1:15432:127.0.0.1:5432 sitw-tech-vps
# 2) backend com seeds (em backend/; .env é carregado pelo shell, nunca lido por IA)
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
set -a; source .env; set +a
SEED_ENABLED=true SEED_PASSWORD=demo-multisaude-2026 ./mvnw spring-boot:run     # porta 8083
# 3) front (em Frontend/): proxy /api -> 127.0.0.1:8083
npm run dev                                                                       # http://localhost:5173
```
Login de demonstração (só desenvolvimento; senha `demo-multisaude-2026`): `igor.leonardo@multisaude.test` (Recepção, 2 unidades: o login pergunta a unidade), `admin@multisaude.test` (Administrador), `camila.esteves@multisaude.test` (Médica, ainda sem tela própria), `admin@bemviver.test` (outra clínica, para provar o isolamento). A tela de login pede **só e-mail e senha**.

Testes (em `backend/`, com o `.env` carregado como acima; **junte classes com vírgula**, `A,B`, nunca `A+B`):
```sh
./mvnw verify -Dtest=PacienteCompletoIntegrationTest                      # uma classe (1 a 3 min)
./mvnw verify -Dtest='AgendaViewIntegrationTest#occupancyIsBooked*'       # um método
./mvnw verify                                                             # suíte completa: ~1 hora pelo túnel
```
Front: `cd Frontend && npx tsc -b && npx oxlint` (os avisos `only-export-components` do oxlint são conhecidos).
Docker: `backend/docker-compose.dev.yml` (Postgres local) está escrito mas **nunca foi executado** (o Docker Desktop do dono travou). Quando funcionar, elimina a dependência do túnel.

## O que já é REAL (sem mock), com testes
- **Login** por e-mail e senha (`emails_login`, V33), escolha de clínica (se o mesmo e-mail e senha valem em duas) e de unidade; sessão em localStorage (decisão do dono); 401 uniforme; limite de tentativas.
- **Início** (`GET /inicio`), **Agenda** dia/semana (com visão de todos os profissionais)/por sala, **Check-in**, **Confirmações** (WhatsApp por link `wa.me`, sem envio automático), **Mapa de ocupação** (`GET /agenda/ocupacao`), **Equipamentos** (V32: salas, equipamentos, sala padrão do profissional), **Consultar valores**, criar/confirmar/check-in/cancelar com motivo/remarcar/repetir agendamento.
- **Pacientes** completos no padrão Feegow (V29–V31): lista paginada com busca, cadastro e edição com todos os campos, duplicados, parentes, prioridade e origem por clínica, prontuário sequencial, inativar/reativar com motivo, histórico de campos alterados, ficha (resumo, dados, agendamentos, alterações).
- Cadastros reais: **Locais e salas** e **Equipamentos** (`/cadastros/locais`, `/cadastros/equipamentos`).
- Backend pronto **sem tela real ainda**: fila de senhas e guichês, totem e dispositivos (V27), profissionais completos e procedimentos habilitados (V26), especialidades e procedimentos com catálogo, prontuário/evoluções, compartilhamento de prontuário.

## O que AINDA é mock (próximos passos, nesta ordem)
1. **Recepção (a mais importante para a demo):** Sala de espera (`/espera`), Chamar senha (`/senhas`), Totem (`/totem`), Painel de TV (`/tv`) e Configurações > Totem e guichês. Backend pronto: `FilaController` (`/tipos-senha`, `/guiches`, `/senhas/fila`, chamar, identificar, cadastrar paciente), `TotemController`, dispositivos. Ler `backend/README.md` seções "Fila de senhas" e "Totem com CPF e dispositivos". O totem é um **dispositivo** (usuário `dispositivo=true`, sessão de 365 dias criada por `POST /dispositivos`), não um login de pessoa. Regra do dono: **o totem nunca revela se o CPF está cadastrado**; só a recepção vê isso (`GET /senhas/{id}/identificacao`).
2. **Cadastros:** Profissionais (+ procedimentos habilitados, cópia de grade, grades), Procedimentos, Especialidades. Hoje `Frontend/src/pages/cadastros/*` usa mock; os endpoints existem.
3. **Atendimento do médico** (`/atendimento`): prontuário, evolução imutável com correção por nova versão, compartilhamento. O médico (`agenda:ler_proprios`) hoje **não consegue abrir a Agenda** (a tela exige `profissionais:ler`): resolver junto com esta etapa.
4. Depois: Funcionários/usuários e papéis, Convênios (não existe módulo no backend: decidir escopo com o dono), Financeiro, Faturamento TISS, Estoque, Relatórios, Configurações, Conta/Logs, Notificações (o sino mostra "nenhuma notificação").
5. No fim: remover os mocks sem uso de `Frontend/src/lib/mock/*`, mover tipos para `src/lib/types`, rodar a **suíte completa** e avisar o Jorran antes de qualquer PR.

## Pendências e decisões abertas
- **Cor de identificação do paciente:** hoje aparece na lista e na ficha, mas não na agenda. Perguntei ao dono se colore o agendamento na agenda ou se o campo sai. Sem resposta.
- **Lista de prioridades:** a inicial (idoso 60+, idoso 80+, gestante, lactante, pessoa com deficiência, pessoa com criança de colo, cardíaco) é minha, não a do Feegow; falta a lista real da clínica (editável pela própria clínica).
- **Suíte completa de testes não rodou inteira desde a V29** (cada classe nova passou isolada). Rodar antes de qualquer PR; o teste de seeds é o mais lento (~20 min).
- Faltam: reservas avulsas de equipamento (manutenção) e bloqueio de sala; encaixe/retorno/convênio no agendamento; mensagens automáticas (WhatsApp) e registro de tentativas de contato.
- Fora do código: ICP-Brasil e LGPD pendentes; licença TUSS 22 (risco aceito, procedimentos semeados sem código TUSS); revisão jurídica.
- `LoginRateLimiter` é em memória (10 chaves/conta e 40 por IP em 15 min); pode travar logins se alguém variar muitas chaves.

## Armadilhas já pagas (economize o tempo)
- Linhas de uma mesma transação têm o mesmo `criado_em`: **não ordene por `criado_em` para escolher "o primeiro"** (aconteceu com a unidade principal dos seeds).
- O PostgreSQL aborta a transação do teste após um erro: use `SAVEPOINT`/`ROLLBACK TO SAVEPOINT` (ver `refused(...)` nos testes de pacientes e salas).
- Nome de papel é único por clínica: um helper `userWith(...)` chamado duas vezes no mesmo teste dá `DuplicateKey` (guarde o token).
- A fixture `AgendaTestBase` já cria um "Paciente Ficticio" e um procedimento "Consulta teste": conte com eles nas contagens.
- `FilaController`/`Totem`: ver os testes `FilaIntegrationTest` e `TotemIntegrationTest` antes de mexer; tem regras de CPF (nunca consultar cadastro pelo totem, limpar CPF digitado ao vincular).
- No front: `useAuth().can("permissao")` esconde botões, mas **quem manda é o backend** (sempre dupla camada: `SecurityConfig` e `@PreAuthorize`; mutação de segurança precisa quebrar as duas).
- Padrão de tela real: hook em `Frontend/src/lib/api/*.ts` (react-query), estado de carregando/erro/vazio sempre tratado, mutações invalidam as consultas afetadas (ver `lib/api/agenda.ts`). Não reintroduzir dados de `lib/mock` nas telas ligadas.
