# Integração do frontend com o backend (tirar os mocks), multi-clínica

Data: 2026-10-20. Branch: `feature/front-integracao-backend`. Responsáveis: a equipe do backend (a integração é feita por nós, em branch separada;
o dono do `Frontend/` atual, Jorran, é avisado antes de qualquer PR).

## Intenção

O frontend roda 100% em mocks (13 arquivos em `Frontend/src/lib/mock`, 5.700 linhas; o `core.ts` é importado por 74 arquivos). O objetivo é ligá-lo ao backend
real, tela por tela, **seguindo o fluxo da clínica**, e entregar seeds de desenvolvimento para quem abrir o sistema ter noção dele, como os mocks davam.
O produto é um **SaaS: várias clínicas** no mesmo sistema. Isso muda o login e deixa o isolamento entre clínicas visível já nos seeds.

## Metas

- Login real por **código da clínica**, e-mail e senha; escolha de unidade depois de autenticar.
- Camada de rede única no front (token, erros 401/403/409/422/429, paginação por `X-Total-Count`).
- Troca dos mocks por chamadas ao backend nas áreas que **têm backend**, uma fatia por vez, sem quebrar o resto.
- Seeds de desenvolvimento com duas clínicas fictícias, fora das migrações, repetíveis e apagáveis.
- Um Postgres local em Docker para desenvolver (o banco remoto via túnel SSH cai e atrapalha o front também).

## Não-metas

- **Financeiro, faturamento, estoque, relatórios, funcionários, conta/logs, convênios, salas e equipamentos:** não têm backend e não estão no plano atual. Ficam no mock,
  sinalizados na tela como dados de demonstração. Cada um troca quando o backend dele existir.
- Redesenhar telas. A integração preserva o visual da branch `main` (refino do Jorran). Só se acrescenta o necessário (erro, carregando, selo de demonstração).
- Doctoralia, assinatura digital ICP-Brasil, painel de TV por dispositivo.
- Deploy em produção. Nada é enviado ao remoto sem pedido explícito.

## Anti-metas (falhar mesmo "funcionando")

- Perder ou sobrescrever o trabalho visual do front.
- Seed rodando em produção ou em migração; senha de seed no repositório; dado real de paciente em qualquer lugar.
- Token da sessão em log ou em URL.
- A tela parecer "ligada" mostrando dado de demonstração sem avisar.
- Descobrir se uma clínica ou um e-mail existe pelas respostas do login.

## Decisões tomadas pelo dono do projeto

- Vai atender **várias clínicas** (SaaS).
- A troca dos mocks é **nossa**, em **branch separada**.
- Seguir o fluxo real da clínica, por fatias.

## Desenho

### 0. Backend: clínicas por código, login e seeds (V28)

- `clinica.codigos_clinica(codigo text primary key, tenant_id uuid references tenants)`, **sem** segurança por linha, porque o login precisa traduzir código em clínica
  *antes* de existir clínica selecionada (`tenants` tem RLS e só enxerga a clínica já escolhida). Código: `^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$`. A aplicação só consulta por
  igualdade; nenhuma rota lista códigos. Os tenants existentes recebem um código derivado (`clinica-` + 8 primeiros caracteres do id) para não ficarem sem acesso.
- `POST /auth/login` aceita `codigoClinica` **no lugar de** `tenantId` (um dos dois é obrigatório; `tenantId` continua valendo para não quebrar clientes e testes) e `unidadeId`
  **opcional**:
  - credenciais válidas e **uma** unidade (ou `unidadeId` informado) → sessão, como hoje;
  - credenciais válidas, **várias** unidades e sem `unidadeId` → `409` com `{ "erro": "Escolha a unidade.", "unidades": [{id, nome}] }` (só depois de validar a senha, então
    nada vaza antes); o front reenvia com `unidadeId`;
  - código inexistente, clínica suspensa, e-mail ou senha errados → o **mesmo** `401`, com o mesmo custo de BCrypt (hash fictício) para o tempo de resposta não revelar nada.
- `GET /auth/me` e a resposta do login passam a trazer `clinicaNome`, `unidadeNome` e o `codigoClinica` (o topbar e o seletor de unidade precisam; hoje só vêm ids). Campo novo, o resto do
  contrato não muda.
- **V29, paciente completo no padrão do Feegow** (decisão do dono em 20/10/2026: "os mesmos campos que tem no Feegow", no backend e no front). Ver a seção 4. Vem **antes** dos seeds,
  porque os pacientes de seed já usam esses campos.
- Seeds de desenvolvimento: `ApplicationRunner` com `seed.enabled=true`, no estilo do `BootstrapAdmin`. Cria **duas** clínicas fictícias (a "Clínica Vida Plena", espelho do mock, e uma
  segunda só para mostrar o isolamento), cada uma com unidades, papéis, usuários, especialidades, procedimentos (a partir do catálogo), profissionais com procedimentos habilitados
  e grades, pacientes fictícios (CPFs válidos gerados, de teste), agendamentos, tipos de senha, guichês e um totem. Idempotente por código de clínica; recusa rodar sem a flag;
  a senha dos usuários vem de `SEED_PASSWORD` (variável de ambiente), nunca do repositório. Um modo `seed.reset=true` apaga **só** as clínicas de seed (as que têm o código de seed).
- `docker-compose.dev.yml` com Postgres 16 local (extensões `btree_gist` e `unaccent`) e documentação do comando que sobe banco, migrações e seed.
- Testes: login por código (sucesso, código errado igual a senha errada em corpo e status, clínica suspensa, várias unidades → 409 com lista, unidade que não é do usuário),
  isolamento do mapa de códigos (rota inexistente de listagem), seed idempotente e recusa sem a flag.

### 1. Front: base (rede, sessão, guarda de rota)

- `src/lib/api`: cliente `fetch` fino (URL em `VITE_API_URL`, `Authorization: Bearer`, JSON, erro tipado com status e mensagem do backend, `Retry-After` no 429, `X-Total-Count`).
  Sem biblioteca de requisição nova além da de cache de dados (ver "Decisões do construtor").
- Sessão: token em `localStorage` (decisão do dono em 20/10/2026: fechar a aba não deve deslogar). `Lembrar de mim` guarda também código da clínica e e-mail. Expirada (401) → limpa e volta ao login.
  Compensações: expiração de 12 h no servidor; "Sair" revoga o token no banco; token só no cabeçalho `Authorization`, nunca em URL ou log; CSP restritivo (`script-src 'self'`)
  nos cabeçalhos do front; **saída por inatividade** configurável por clínica (desligada por padrão). Dispositivos (totem, painel) usam o mesmo mecanismo com o token de dispositivo.
- `AuthProvider` + rota protegida; `GET /auth/me` preenche usuário, clínica, unidade e **permissões**; o menu (`lib/nav.ts`) esconde o que a pessoa não pode usar.
- Login com três campos (clínica, e-mail, senha) e passo de unidade quando houver várias. "Esqueci a senha" continua sem backend e fica desabilitado com aviso.

### 2. Recepção (fluxo da clínica começa aqui)

- Totem (`/totem`), Chamar senha (`/senhas`), Sala de espera, Painel de TV: ligados a `tipos-senha`, `guiches`, `senhas`, `totem/*` e `senhas/{id}/identificacao`.
- Configuração de totem e guichês (`configuracoes/TotemEGuiches`) ligada a `tipos-senha`, `guiches` e `dispositivos`.
- Painel de TV usa a leitura da fila por um usuário com `fila:ler` enquanto não existir credencial de painel (limite conhecido, registrado).

### 3. Cadastros

- Especialidades, procedimentos (com sugestões do catálogo ANS e a atribuição da fonte exibida junto), profissionais (cadastro completo, especialidade principal, procedimentos habilitados,
  cópia de grade, grades e bloqueios). Convênios e funcionários continuam no mock.

### 4. Pacientes: os campos do Feegow

**Fonte:** documentação pública da API do Feegow (<https://docs.feegow.com/>, endpoints `POST /patient/create`, `POST /patient/edit`, `GET /patient/list`, `GET /patient/search`,
`GET /patient/list-dependents`, `GET /patient/list-sources`), mais o formulário do front, que replica a tela original. **Limite conhecido:** a ajuda do Feegow só mostra os campos da
tela em imagens e a API não expõe tudo o que a tela tem (por exemplo profissão e estado civil). A lista abaixo é a API **mais** os campos que o front já traz; o dono confirma o
resto olhando a tela *Pacientes > Inserir* do Feegow (pergunta aberta 1).

| Grupo | Campos (nome do Feegow → nosso) | Observação |
|---|---|---|
| Identificação | `nome_completo`→nome (obrigatório), `nome_social`, `cpf` (obrigatório), `sem_cpf`, `data_nascimento`, `genero`→sexo, `documento` (RG ou outro), `nome_mae`, `peso`, `altura` | CPF obrigatório com a saída explícita "sem CPF" (decisão do chefe). Validação de CPF e unicidade por clínica, só entre os que têm CPF. |
| Contato | `celular`, `celular2`, `telefone`, `telefone2`, `email`, `email2` | O front acrescenta "este celular é WhatsApp" e "preferência de contato". |
| Endereço | `cep`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `pais` | Busca de CEP fica no front (serviço público), não no backend. |
| Origem | `origem_id` + `indicado_por` | Origens (como conheceu a clínica) são **cadastro da clínica**, com lista inicial sugerida; `GET /origens-paciente`. |
| Observações | `observacao` | Interna. |
| Responsável | nome, CPF e parentesco do responsável | Obrigatório o nome quando o paciente é menor de 18 anos (regra do front). Vínculo entre pacientes ("dependentes" do Feegow) fica para depois. |
| Prontuário | número sequencial por clínica | O `paciente_id` numérico do Feegow; aqui é `numero_prontuario`, sem buracos, único por clínica. |
| Situação | inativar **com motivo** (sem vínculo, óbito, sem motivo + texto) e reativar | O Feegow pede o motivo; guarda quem e quando. Hoje só existe `ativo`. |
| Do front | profissão, estado civil, escolaridade, alertas clínicos, consentimentos LGPD (com data e hora) | Entram na V29 **se** o dono confirmar que existem no Feegow (pergunta 1). |
| **Fica para o módulo de convênios** | `convenio_id`, `plano_id`, `matricula`, `titular`, `validade`, `tabela_id` | Dependem de um cadastro de convênios e de tabelas de preço que ainda não existe. Até lá, ficam no mock com selo. |

Regras que já valem e continuam: o médico só vê paciente com vínculo; leitura de paciente é auditada e limitada por volume; CPF, nascimento e contato só aparecem a quem tem
`pacientes:ler`.

- Busca: por nome (sem acento), CPF só com números, telefone, número do prontuário e letra inicial, como no Feegow (*Busca rápida* e *Listar* por letra). Aviso de possível duplicado por
  nome ou CPF ao cadastrar (`GET /pacientes/duplicados`).
- O que sobrar do mock (tags, saldo, cidade derivada) sai ou fica sinalizado: **tags** e **saldo** não existem no Feegow como campos de cadastro, então não entram.

### 5. Agenda

- Dia, semana, check-in, novo agendamento, remarcar/cancelar, disponibilidade: ligados a `agendamentos`, `agenda/disponibilidade`, `agendamento-motivos`. Sala e equipamento ficam no mock
  até a "agendamento v2". Mapa de status (front exibe 11, backend tem 8) definido na fatia: `agendado→nao_confirmado`, `check_in→aguardando`, `cancelado` → `desmarcado_pelo_paciente` ou
  `cancelado_pelo_profissional` conforme a **origem do motivo**; `chamando` vem da senha chamada; `aguardando_pagamento` não existe no backend e some do que é ligado.
- Preço só aparece para quem tem `agenda:ver_valores`; o médico não vê valores (regra já decidida).

### Remoção de mock

Cada fatia remove os mocks que **ficaram sem nenhum uso** e move tipos compartilhados do `core.ts` para `src/lib/types`. `core.ts` só some quando a última tela deixar de usá-lo.
O estado em memória da agenda (`components/agenda/store.ts`) é trocado por cache de dados + chamadas de escrita.

## Decisões do construtor (marcadas: confira ao ler)

- **Cache de dados:** adotar `@tanstack/react-query` (versão fixa, com pelo menos duas semanas de lançamento, a confirmar na hora). São dezenas de telas com leitura, escrita e
  invalidação; fazer isso à mão repete bug em cada tela. Se o time do front preferir zero dependência nova, troca-se por hooks próprios, com mais código.
- **Token em `localStorage`** (escolha do dono, contra a minha recomendação de `sessionStorage`). Registrado: não é mais seguro, só mais confortável; o risco é XSS ou computador
  compartilhado com sessão aberta. Mitigações acima. Se uma clínica usar máquina compartilhada, liga a saída por inatividade.
- **Teste no front:** o front não tem nenhum. Adicionar Vitest só para a camada `lib/api`, o mapa de status e a sessão (o que tem regra). Telas se verificam por `tsc -b`, `oxlint`,
  build e um roteiro de fumaça contra o backend local com os seeds.
- **Código da clínica** com `-` e minúsculas, como um subdomínio, para o dia em que cada clínica tiver o seu (`vidaplena.sistema.com.br`). Nesta fatia só vale no campo do login.
- **Reenvio do login com `unidadeId`** repete a senha do formulário em memória; não se guarda senha nem token intermediário.
- **Seed fora das migrações, por flag**: migração roda em todo ambiente, inclusive produção.

## Perguntas ainda abertas (só o dono responde)

1. **Resolvida em 20/10/2026:** o paciente segue os campos do Feegow (seção 4). Falta o dono **olhar a tela *Pacientes > Inserir* do Feegow** (uma captura serve) para confirmar profissão,
   estado civil, escolaridade, alertas e consentimentos, que a API não mostra, e dizer se há algum campo que a tela tem e a lista acima não.
2. Tela de login: o código da clínica fica **visível** num campo, ou o dono quer subdomínio já nesta fase? (Subdomínio exige DNS e decisão de hospedagem; sugiro campo agora.)
3. Quem testa as telas e valida o fluxo com o mock lado a lado (o dono, o chefe, o Jorran)?

## Como fica pronto

Para cada fatia: backend com testes verdes, front sem erro de tipo, lint e build, roteiro de fumaça executado contra o backend local com seeds, mocks sem uso removidos, README e este
documento atualizados, commit pequeno. Fatia 0 pronta = uma pessoa nova sobe banco + seed + backend com **um comando documentado** e entra por código de clínica nas duas clínicas de seed.
