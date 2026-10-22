# Prompt para o Codex: terminar a Recepção (Sala de espera, Totem e Painel de TV)

Cole o texto abaixo (a partir de "Você vai trabalhar") no Codex, na raiz do repositório.

---

Você vai trabalhar no sistema de clínica MultiSaúde (backend Java/Spring em `backend/`, front React em `Frontend/`), na branch `feature/front-integracao-backend`. Seu trabalho: ligar ao backend real, **sem nenhum dado de exemplo**, as telas **Sala de espera**, **Totem** e **Painel de TV**, mais o cadastro de dispositivos de que o totem e o painel dependem.

## 0. Leia antes de escrever qualquer código
1. `docs/HANDOFF.md` inteiro (regras, como rodar, armadilhas). 2. `backend/README.md`, seções "Fila de senhas e guichês", "Totem com CPF e dispositivos (V27)" e "Telas da recepção sem mock". 3. Telas já reais para copiar o padrão: `Frontend/src/pages/agenda/CheckIn.tsx`, `Frontend/src/lib/api/agenda.ts`, `Frontend/src/lib/api/recepcao.ts`, `Frontend/src/pages/recepcao/ChamarSenha.tsx`, `Frontend/src/lib/agenda/model.ts`. 4. Backend da fila: `fila/FilaController.java`, `TotemController.java`, `FilaModels.java`, `FilaService.java`, `identidade/IdentityController.java` (rotas `/dispositivos`), `config/SecurityConfig.java`, e os testes `FilaIntegrationTest` e `TotemIntegrationTest`.

Estado atual do repositório: `Frontend/src/pages/recepcao/ChamarSenha.tsx`, `Frontend/src/lib/api/recepcao.ts` e `Frontend/src/components/shell/shell-layout.tsx` têm mudanças **não commitadas** (Chamar senha ligado; a "Senha atual" já foi corrigida para usar `useCurrentTicket`). Mantenha. **Não faça commit**: o dono revisa e commita.

## 1. Regras que não podem ser quebradas
- Nenhuma tela que você entregar pode importar de `@/lib/mock/*`. Confira com `grep -n "lib/mock" <arquivo>`.
- Nunca leia, mostre ou envie `backend/.env`. Migração já aplicada é imutável (nova `V<n>` se precisar de banco; provavelmente não precisará).
- Maven nunca em paralelo. Junte classes de teste com **vírgula** (`-Dtest=A,B`), nunca `+`. Os testes de backend precisam do túnel do banco aberto (veja `docs/HANDOFF.md`); erro "I/O error" é o túnel, rode de novo.
- Dado de paciente nunca aparece no totem nem no painel de TV. O **totem nunca revela se um CPF está cadastrado**, nem por mensagem, nem por diferença de tela, nem por tempo.
- Segurança em duas camadas no backend: `SecurityConfig` **e** `@PreAuthorize`. Toda regra nova de segurança exige teste de integração **e** mutação (quebrar o código de propósito, ver o teste falhar, restaurar, conferir com `git diff`).
- `api()` devolve `null` quando a resposta tem corpo vazio (204). Trate.
- Toda tela trata: carregando, erro (com a mensagem do servidor), vazio e resposta vazia.
- Ao ligar uma tela dentro do sistema logado, adicione a rota em `REAL_ROUTES` (`Frontend/src/components/shell/shell-layout.tsx`). `/totem` e `/tv` ficam fora do sistema logado e não usam essa lista.

## 2. Como verificar (vale para TODAS as fases; é aqui que as entregas anteriores falharam)
`npx tsc -b` e `npx oxlint` passando **não provam que a tela funciona**. Antes de dizer que uma fase terminou:
1. Rode o fluxo da tela contra o backend de verdade e cole no relatório as respostas. O backend hospedado é `https://api.multisaude.sitw.tech` (o `Frontend/.env.local` já aponta para ele; sem o seu backend local). Login de demonstração (só desenvolvimento): `POST /api/v1/auth/login` com `{"email":"igor.leonardo@multisaude.test","senha":"demo-multisaude-2026"}`; a resposta 409 lista as unidades, repita com `unidadeId`. Use o `accessToken` como `Authorization: Bearer ...`. Alterações no **backend** só chegam ao endereço hospedado depois de `backend/scripts/deploy_vps.sh` (rode os testes antes).
2. Para cada campo que a tela lê, confirme que existe na resposta real (nome exato).
3. Mostre os estados vazio, erro e 204 funcionando.
4. Rode `npx tsc -b && npx oxlint` (os avisos `only-export-components` são conhecidos).
5. No relatório final, liste separado **"Verifiquei"** e **"Não consegui verificar"**. Não marque como pronto o que não verificou.

## 3. Trabalhe em FASES, uma de cada vez. Ao fim de cada fase, pare e mande o relatório. Só comece a próxima quando eu escrever "segue".

### Fase 1 — Sala de espera (`/espera`, só front)
Arquivos: `Frontend/src/pages/recepcao/SalaEspera.tsx`, `Frontend/src/components/recepcao/WaitCard.tsx`.
- Dados: `useAgendaItems(hoje, hoje)` + `toAppointment` (`lib/agenda/model.ts`), embrulhado em `AgendaCatalogProvider` como as telas da agenda. Atualizar a cada 10 s (adicione parâmetro ao hook; hoje é 30 s).
- Colunas pelo status do backend: **Aguardando** = `check_in`; **Em atendimento** = `em_atendimento`; **Finalizado** = `atendido`. **Não existe coluna "Chamado"**: o backend não tem esse status. Remova também o arrastar/mover cartões: a recepção **não pode** passar para `em_atendimento`/`atendido` (só o médico; o backend recusa). A tela passa a ser acompanhamento, sem mover.
- Cartão: nome do paciente, profissional, procedimento, horário marcado, "chegou às" (`arrivedAt`), minutos de espera (agora menos a chegada; neutro até 10, aviso acima de 10, perigo acima de 20, como no Início). Links: ficha do paciente (`/pacientes/:id`) e o dia na agenda (`/agenda?data=AAAA-MM-DD`).
- Números do topo: aguardando agora, espera média, maior espera, atendidos hoje (calculados dos dados reais). Filtro por profissional. Manter visão quadro e lista.
- Não invente prioridade nem convênio (a agenda não traz).
- Para testar, crie um check-in de verdade pela API: `POST /api/v1/agendamentos/{id}/status` com `{"status":"check_in","versao":N}` num agendamento de hoje (`GET /api/v1/agenda/agendamentos?de=HOJE&ate=HOJE`).

### Fase 2 — Dispositivos e pareamento (base do totem e do painel)
- `Frontend/src/lib/api/client.ts`: aceite `token` opcional em `RequestOptions`. Quando vier, use esse token no lugar da sessão da pessoa e **um 401 não chama o logout da pessoa** (o dispositivo tem credencial própria).
- `Frontend/src/lib/api/dispositivos.ts` (novo): listar `GET /dispositivos`, criar `POST /dispositivos {nome}` (devolve `{dispositivo, token, expiraEm}`; **o token só vem nesta resposta**), revogar `DELETE /dispositivos/{id}`.
- `Frontend/src/lib/device/storage.ts` (novo): guarda o token do dispositivo em `localStorage` (chave `multisaude.dispositivo`), com try/catch em tudo. Componente `PareamentoDispositivo`: campo para colar o código; só salva depois de uma chamada de teste com sucesso (`/totem/tipos` para o totem; `/painel/chamadas` para o painel, Fase 4); erro claro para código inválido ou revogado.
- `Frontend/src/pages/configuracoes/sections/TotemEGuiches.tsx` (rota `/configuracoes/totem-e-guiches`; adicione em `REAL_ROUTES`): reescreva sem mock com 3 seções, só para quem tem `fila:configurar`:
  1. **Dispositivos**: tabela (nome, situação), "Novo dispositivo" (nome), e depois de criar mostre o **código uma única vez** num diálogo com botão copiar e o aviso "não será mostrado de novo"; revogar com confirmação.
  2. **Tipos de senha**: listar, criar, editar, ativar/desativar (`/tipos-senha`; veja `TicketTypeRequest` em `FilaModels.java`: nome, prefixo `[A-Z]` até 8, preferencial, ativo).
  3. **Guichês**: listar, criar, editar, ativar/desativar e escolher quais tipos cada guichê chama e a ordem (`/guiches`; `CounterTypeRef`).
- Aceite: crie um dispositivo pela tela, pareie, revogue, e mostre que a chamada seguinte do dispositivo dá 401 e a tela volta ao pareamento.

### Fase 3 — Totem (`/totem`)
Arquivo: `Frontend/src/pages/recepcao/Totem.tsx`. Use a credencial do **dispositivo** (Fase 2), nunca a sessão da recepcionista. Sem token, mostre o pareamento.
Fluxo (decisão do dono, não mude):
1. **CPF primeiro.** Teclado numérico grande na tela (toque), 11 dígitos com formatação e conferência dos dígitos verificadores no cliente (mensagem amigável "CPF inválido, confira os números"). Texto fixo: "Digite o CPF **do paciente**". Abaixo, botão secundário **"Não tenho / não quero informar o CPF"**. Sempre há uma pessoa ao lado para ajudar quem tem dificuldade.
2. **Tipos de senha.** `GET /totem/tipos` → botões grandes; os preferenciais com destaque. Não suponha nomes ou quantidade: a clínica configura.
3. **Confirmação.** `POST /totem/senhas` com `{tipoId, cpf?}` (cpf só dígitos; omita se pulou). Mostre `codigo` bem grande e `tipoNome`, e "Aguarde ser chamado no painel". Volta sozinho ao início em 8 s. Limpe o CPF do estado assim que enviar.
- **Nunca** mostre se o CPF é de paciente cadastrado, nunca chame endpoint de paciente, nunca mostre estimativa de espera (o backend não tem; remova o valor inventado do mock).
- 429 → "Aguarde um instante e tente de novo". Erro de rede → mensagem amigável com botão para tentar de novo. 60 s sem toque em qualquer etapa → volta ao início e limpa o CPF.
- Aceite: com o token do dispositivo, `POST /totem/senhas` com CPF válido, inválido (400) e sem CPF; confirme que a resposta tem só `codigo`, `tipoNome`, `preferencial`; confirme que o token do dispositivo recebe 403 em `/pacientes` e em `/senhas/fila`.

### Fase 4 — Painel de TV (`/tv`): backend e front
**Backend** (o totem hoje só tem `totem:usar`; o painel precisa de leitura da fila e não pode ter mais que isso):
- `POST /dispositivos` passa a aceitar `tipo` opcional: `"totem"` (padrão, comportamento atual) ou `"painel"`. Para `"painel"`, papel "Painel de TV" criado/atualizado como o `totemRole` faz, com **só** a permissão nova `painel:ver`.
- `GET /painel/chamadas` (`painel:ver`): da unidade do dispositivo, só de hoje: `atual` (a última chamada), `ultimas` (as 8 últimas chamadas, mais recente primeiro: `codigo`, `tipoNome`, `preferencial`, `guicheNome`, `chamadas`, `ultimaChamadaEm`) e `unidadeNome`, `clinicaNome`. **Nenhum dado de paciente nem CPF** (decisão: a TV mostra código e guichê, não nome, por privacidade).
- Dupla camada em `SecurityConfig` e `@PreAuthorize`. Dispositivo "totem" não acessa `/painel/**`; dispositivo "painel" não acessa `/totem/**`, `/senhas/**` nem `/pacientes/**`.
- Testes de integração (nova classe `PainelTvIntegrationTest`, no padrão de `TotemIntegrationTest`): cria dispositivo painel; devolve só chamadas de hoje, da própria unidade e clínica; corpo da resposta não contém `cpf` nem `paciente`; 403 nos dois sentidos; dispositivo revogado → 401; ordem correta. **Mutações**: (1) tirar o filtro de unidade; (2) permitir o totem em `/painel/**`; (3) incluir `pacienteId`; (4) tirar o filtro de hoje. Cada uma tem que derrubar um teste; restaure e mostre `git diff` limpo. Atualize `backend/README.md`.
- Só depois dos testes passarem, `backend/scripts/deploy_vps.sh`. Se não conseguir rodar o deploy (SSH), diga.
**Front** (`Frontend/src/pages/recepcao/PainelTv.tsx`): sem mock; credencial do dispositivo; sem token → pareamento. Atualiza a cada 3 s. Mostra "Chamando agora" (código grande e guichê), as 5 últimas, relógio e data. Ao chegar chamada nova (mudou `ultimaChamadaEm` ou `chamadas`, inclusive rechamada) pisca; botão "Ativar som" (navegador exige um clique) que toca um aviso curto gerado com Web Audio, sem arquivos externos. Sem chamadas ainda: "Aguardando chamadas". Perdeu conexão por 3 tentativas: faixa discreta "Sem conexão", mantendo a última chamada na tela. Deixe `Configurações > Chamada de TV` como está (continua demonstração).

## 4. Formato do relatório de cada fase
1. O que mudou (arquivos). 2. **Verifiquei** (comandos e respostas coladas). 3. **Não consegui verificar**. 4. Decisões que você tomou e eu não pedi. 5. Pendências. Depois pare e aguarde "segue".
