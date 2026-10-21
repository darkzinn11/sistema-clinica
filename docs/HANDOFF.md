# Handoff: onde estamos e para onde vamos (2026-10-21)

Branch de trabalho: `feature/front-integracao-backend` (saiu da `main` já atualizada). **Nada foi enviado ao remoto.** Último commit: `b5c3baa` (V28).

Leia antes de tudo: `docs/superpowers/specs/2026-10-20-integracao-front-backend-design.md` (desenho completo da integração), `backend/README.md` e `docs/ROADMAP.md`.

## Objetivo atual
Tirar os mocks do frontend (`Frontend/src/lib/mock/*`, 13 arquivos, ~5.700 linhas; `core.ts` importado por 74 arquivos) e ligá-lo ao backend, com **seeds de desenvolvimento** que deem a mesma noção do sistema que os mocks davam. Sistema **SaaS multi-clínica** (login por código da clínica).

## Regras permanentes (não quebrar)
- Nunca ler, mostrar, commitar ou enviar `backend/.env` e `backend/.env.bootstrap`.
- Migrations já aplicadas são **imutáveis**: mudança = nova `V<n>`.
- Sem push, sem deploy em produção, sem dado real de paciente (só fictício, CPFs válidos de teste).
- Maven **nunca em paralelo**. Suíte completa leva ~12 min.
- Commits pequenos. Responder em português. Ser crítico, não concordar por reflexo.
- Token do front em **localStorage** (decisão do dono, contra a recomendação; mitigar com CSP, sem `innerHTML`, expiração e logout no servidor). Não alegar que é "mais seguro".

## Feito no backend (Java 17, Spring Boot 4.1.1, Postgres 16 com RLS forçado, Flyway V1–V28)
- Agenda, fila/senhas, profissionais completos (V26), procedimentos habilitados por profissional ("a lista manda"), cópia de grade (`POST /grades/copiar`).
- Totem como dispositivo (V27): usuário `dispositivo=true`, papel `Totem` só com `totem:usar`, sessão de 365 dias; CPF digitado no totem, apagado ao vincular o paciente ou após prazo; o totem **nunca** revela se o CPF está cadastrado; limite de 30 senhas/min.
- **V28 login por código da clínica**: `POST /auth/login` com `codigoClinica` (ou `tenantId`, exatamente um dos dois), 401 uniforme para qualquer erro, 409 com lista de unidades só depois de validar a senha, `/auth/me` com `clinicaNome`, `unidadeNome`, `codigoClinica`. Tabela `codigos_clinica` fora de RLS (app só SELECT/INSERT).
- Testes: `ProfissionalIntegrationTest`, `ProcedimentosHabilitadosIntegrationTest`, `TotemIntegrationTest`, `LoginPorCodigoIntegrationTest` e demais, todos verdes isoladamente. **A suíte completa NÃO foi rodada depois da V28.**

## Próximos passos, em ordem

### 0. Backend (fatia 0)
1. **V29, paciente completo no padrão Feegow** (tela Pacientes > Inserir; tabela de campos na seção 4 do design). Resumo:
   - Colunas novas em `pacientes`: estrangeiro, sem_cpf, cor_identificacao (#RRGGBB), sexo, altura_cm, peso_kg, `numero_prontuario` (sequencial por clínica, sem buracos), `prioridade_id`, endereço completo (CEP, logradouro, número, complemento, bairro, cidade, estado, país), celular2, telefone, telefone2, email2, profissão, escolaridade, naturalidade, estado civil, nacionalidade, RG, `origem_id`, indicação, religião, CNS (15 dígitos), cor da pele, observações, aviso_ativo + aviso_texto.
   - Tabelas: `origens_paciente` e `prioridades` (cadastro da clínica; `GET /origens-paciente`, `GET /prioridades`; lista inicial da Lei 10.048 + "Cardíaco"), `paciente_parentes` (nome, responsável financeiro, parentesco, CPF), histórico somente-inserção de campos alterados.
   - Regras: CPF obrigatório **ou** "sem CPF" **ou** estrangeiro (único por clínica entre os que têm); celular obrigatório; inativação com motivo (sem vínculo / óbito / sem motivo + texto, quem/quando) e reativação; busca por nome sem acento, CPF só números, telefone, prontuário e letra; `GET /pacientes/duplicados`; IMC só calculado na resposta; ficha completa só com `pacientes:ler`.
   - Antes de começar: ler `PatientRepository/PatientController/PatientModels` e `PatientAccessIntegrationTest`, `PatientVolumeLimitIntegrationTest` para estender sem quebrar. Testes novos + mutações (quebrar o código de propósito, ver o teste falhar, restaurar) + README.
   - **Pergunta aberta ao dono:** lista completa do campo Prioridade do Feegow e se mantém "Cardíaco". Sem resposta, usar a lista da lei + "Cardíaco", editável pela clínica.
2. **Seeds de desenvolvimento**: `ApplicationRunner` ligado por `seed.enabled` (recusa sem a flag), 2 clínicas fictícias ("Vida Plena" espelhando o mock + uma segunda), unidades, papéis, usuários, especialidades/procedimentos, profissionais com procedimentos habilitados e grades, pacientes fictícios, agendamentos, tipos de senha, guichês, totem. Idempotente por código da clínica; senha vinda de `SEED_PASSWORD` (env); modo reset só das clínicas de seed. Seed fora de migração.
3. **`docker-compose.dev.yml`**: Postgres 16 local, roles `multisaude_migrator` e `multisaude_app`, schema `clinica`, search_path. As extensões `btree_gist` e `unaccent` são criadas pelas migrações. Docker 29.5.3 está instalado, mas **não confirmei que o motor está rodando**.
4. **Rodar a suíte completa** (~12 min), corrigir o que quebrar, commitar.

### 1–5. Frontend (React 19, react-router 8, Vite 8, Tailwind 4, TS, oxlint)
1. **Base**: cliente de API, `AuthProvider`, rota protegida, Login (clínica / e-mail / senha + passo de unidade), menu por permissão, CSP, inatividade configurável. Decisões do construtor no design: `@tanstack/react-query` (versão fixa com ≥2 semanas), Vitest só para api/mapa de status/sessão.
2. **Recepção**: Totem, ChamarSenha, SalaEspera, PainelTv, config TotemEGuiches.
3. **Cadastros**: especialidades, procedimentos, profissionais, grades.
4. **Pacientes**: campos do Feegow, igual ao backend.
5. **Agenda**: mapa de status front (11) → backend (8). O tipo de procedimento `sessao` do front não existe no backend.
- Financeiro, faturamento, estoque, relatórios, convênios, funcionários, salas/equipamentos, conta/logs **ficam em mock com selo "demonstração"**.
- No fim: remover mocks sem uso, mover tipos para `src/lib/types`, **avisar o Jorran antes de qualquer PR**.

## Pontos de atenção
- Banco de teste é um Postgres dev remoto via túnel SSH (`127.0.0.1:15432`, checar com `nc -z`); é instável. O banco local do item 3 resolve isso.
- `LoginRateLimiter` é em memória e compartilhado entre classes de teste; os testes de login o zeram por reflexão. Com muitas chaves distintas ele pode travar logins (risco registrado).
- Clínica já existente não recebe código na migração (RLS na `tenants`): precisa de `INSERT` documentado no README.
- Dois níveis de proteção em rotas (`SecurityConfig` + `@PreAuthorize`): mutação de segurança precisa quebrar os dois para o teste falhar.
- Postgres aborta a transação do teste após erro: usar SAVEPOINT.
- Pendentes de fora do código: ICP-Brasil, LGPD, revisão jurídica da licença TUSS 22 (risco aceito), quem valida as telas, perfil Lacmar na fila, painel de TV por dispositivo.
