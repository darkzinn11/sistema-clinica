# Component specs

Um bloco por componente da lista do recon (`replica/recon.md` > Components).
Tokens sempre pelo nome do papel (`bg-accent`, `text-muted`), nunca hex cru.
Ícones: Lucide (MIT). Fonte: Inter (troca de uma licenciada, se a Feegow usar
alguma — não confirmamos, mas Inter cobre o mesmo papel).

```
Button
  variants  primary, secondary, ghost, danger
  sizes     sm 32px, md 40px, lg 48px
  states    default, hover, active, focus-visible (2px ring, accent),
            disabled (opacity .5, no pointer), loading (spinner + texto mantido)
  tokens    bg accent / text on-accent (primary); bg transparent / border
            border-input / text text (secondary); bg danger-bg / text danger (danger)
  a11y      <button> real, foco visível, loading não remove o label (leitor de tela)
  used on   todas as telas (Salvar, Repetir, Remarcar, Excluir, Filtrar, CHECKIN...)

StatusBadge
  variants  11 status do agendamento, mapeados em 5 grupos de cor:
            confirmado -> success · não-confirmado/aguardando -> warning ·
            em atendimento/chamando -> info · atendido -> accent-muted+accent ·
            cancelado/desmarcado/não compareceu/remarcado -> danger
  sizes     sm (tabela), md (cabeçalho do painel de agendamento)
  states    default; nenhuma interação (é só leitura)
  tokens    bg {role}-bg, text {role}, radius pill, type xs/500
  a11y      cor nunca é o único sinal — sempre com o texto do status por extenso
  used on   S03 (lista do dia), S06 (dropdown de status), S07, S08

ScheduleRow
  variants  normal, encaixe (borda tracejada ou ícone de encaixe), retorno (ícone)
  states    default, hover (bg surface), selecionado (bg accent-muted)
  tokens    border-bottom border, padding space-3, type base
  a11y      a linha inteira é clicável e focável (role="button" ou <a>, não só o texto)
  used on   S03 (agenda diária), S04 (semanal/múltipla)

RoomHeader (cabeçalho de grupo "Sala X" dentro da agenda)
  variants  1 por sala/equipamento
  states    default
  tokens    bg accent (ou accent-muted, a decidir em build — original usa uma
            cor cheia; nós preferimos accent-muted + texto accent pra não
            competir com os status badges na mesma tela), type sm/600, uppercase
  a11y      é um <h3>/heading, não só uma div estilizada — leitor de tela
            precisa anunciar a troca de grupo
  used on   S03

MiniCalendar (calendário mensal)
  variants  —
  states    dia normal, dia com agendamentos (indicador: ponto ou fundo
            accent-muted), dia selecionado (bg accent, texto on-accent), hoje
            (borda accent), dia fora do mês (texto text-subtle)
  tokens    radius sm por célula, type xs
  a11y      grid navegável por teclado (setas), dia anunciado com contagem de
            agendamentos ("13 de outubro, 8 agendamentos")
  used on   S03

AppointmentPanel (modal/painel de agendamento)
  variants  novo, edição, encaixe (checkbox marcado), com múltiplos procedimentos
  states    vazio, preenchido, erro de validação por campo (borda danger +
            texto danger abaixo do campo), salvando (botão em loading)
  tokens    bg surface-raised, shadow pop, radius lg, abas internas com
            indicador accent na aba ativa
  a11y      foco preso dentro do painel (focus trap), Esc fecha, título do
            painel associado via aria-labelledby
  used on   S06

ProcedureTable (linhas dinâmicas de procedimento)
  variants  1 linha, N linhas
  states    linha vazia (placeholder "Selecione um procedimento"), linha
            preenchida, linha sendo removida
  tokens    border border entre linhas, botão "+" bg accent-muted/text accent
  a11y      adicionar/remover linha anuncia a mudança (aria-live polite)
  used on   S06

PatientCombobox (busca de paciente)
  variants  —
  states    vazio (placeholder), digitando (loading sutil), sem resultado
            (texto text-muted + ação "cadastrar novo paciente"), com resultados
            (lista), paciente selecionado (chip removível)
  tokens    input border-input, lista bg surface-raised shadow card
  a11y      combobox ARIA completo (listbox, aria-activedescendant), resultado
            anunciado por leitor de tela
  used on   S06

SidePanelTabs ("Notas" / "Espera" na lateral da agenda)
  variants  2 abas
  states    aba ativa (indicador accent), vazio ("Nenhum paciente na fila de
            espera deste profissional" + botão "+ Adicionar Paciente")
  tokens    type sm/600 na aba ativa, text-muted na inativa
  a11y      role="tablist"/"tab"/"tabpanel", navegação por setas
  used on   S03

ConfirmationProgressBar
  variants  —
  states    0%–100%, com contagem "X a confirmar / Y confirmados" ao lado
  tokens    trilho bg surface, preenchido bg success, radius pill
  a11y      role="progressbar" com aria-valuenow/min/max, não só visual
  used on   S08

WeekdayAvailabilityToggle (editor de disponibilidade)
  variants  dia desligado, dia com 1 bloco, dia com múltiplos blocos
  states    toggle on/off, bloco em edição, bloco salvo
  tokens    toggle bg accent quando on / surface quando off, blocos em card
            surface-raised com border
  a11y      toggle é um <button role="switch"> ou <input type=checkbox>
            estilizado, nunca uma div com onClick só
  used on   S05

FilterBar (Status, Paciente, Profissional, Especialidade, De/Até)
  variants  multi-select (status), texto (paciente), select (profissional/
            especialidade), date range (de/até)
  states    vazio (nenhum filtro), com filtros ativos (contagem visível,
            ex. "6 selecionado(s)"), aplicado vs pendente (botão "Filtrar")
  tokens    inputs border-input, radius md, label type xs/500 text-muted
  a11y      cada campo com <label> associado; multi-select navegável por teclado
  used on   S07, S08

StatCard (dashboard)
  variants  número simples, número + subtítulo (ex. "12 novos pacientes · 1H 9M")
  states    default
  tokens    bg surface-raised, shadow card, radius lg, número em type xl/700
  a11y      número tem contexto textual, não só o dígito grande
  used on   S02 (poderia virar could-have — não é núcleo de agendamento)

EmptyState
  variants  sala de espera vazia, fila de espera vazia, sem resultado de busca
  states    —
  tokens    ícone text-subtle, texto text-muted, type sm, ação opcional (botão)
  a11y      texto descritivo real, não só um ícone
  used on   S09, S10, PatientCombobox
```

## Decisões de fonte e ícone

- Fonte: **Inter** (variável, open source) — a original não teve a fonte
  identificada com certeza sem inspecionar o CSS; Inter cobre bem o mesmo
  papel de uma sans-serif neutra para UI densa de dados.
- Ícones: **Lucide** (MIT) para check-in, filtro, calendário, WhatsApp
  (usar um ícone genérico de "mensagem", nunca o logo oficial do WhatsApp).
- Paleta: `accent` é um placeholder neutro (azul) — a cor de marca real da
  Feegow (o verde/teal visto nas faixas de sala) nunca é copiada; vira a
  entrada de `/replica-brand`.

## Contraste

`python3 /Users/jorranpetrus/.claude/skills/replica-design/contrast.py replica/design/tokens.json`
→ 16 pares, 0 falhas em AA (ver histórico: `accent` foi escurecido de
`#2f6fed` para `#1d55d6` pra passar `accent` sobre `accent-muted`).

## Addendum 2026-10-13: painel de chamada (totem, guichês, TV)

Contexto visual diferente do resto do app: são telas de sinalização/
quiosque, vistas de longe ou tocadas por quem nunca usou o sistema — tipo
maior, poucos elementos, alto contraste. Usam os mesmos tokens de cor
(nunca hex cru), mas numa escala de tipo própria só pra essas telas:

```
TicketTile (botão grande do totem)
  variants  1 por tipo de senha ativo, cor vem do próprio TicketType (campo
            configurável, não um token fixo — é dado do usuário, não da marca)
  sizes     ocupa 1 célula de uma grade 2xN, mínimo 280px de altura
  states    default, pressed (scale 0.98 + overlay escuro 10%), disabled
            (tipo inativo — não deveria nem aparecer)
  tokens    radius lg, texto on-accent (ou um "on-custom" calculado por
            contraste, já que a cor é dinâmica — ver nota de a11y)
  a11y      cor do texto não pode ser fixa branca se a cor de fundo for
            configurada clara; calcular claro/escuro pelo contraste (mesma
            lógica do contrast.py) antes de decidir a cor do texto
  used on   S18 (totem)

CurrentCallDisplay (senha atual, painel de TV)
  variants  vazio ("-"), com senha chamada
  sizes     type display vezes 3-4 (pensado pra ser lido a uns 5-8 metros)
  states    idle (mostra grade de TicketTile), chamando (senha + guichê em
            destaque, anima entrada)
  tokens    bg vem de `TvBoardConfig.background_color`, cor do texto principal
            de `color_1`
  a11y      é sinalização, não uma tela operada — ainda assim, nunca só cor
            pra indicar o guichê: sempre o número do guichê por extenso
  used on   S18 (idle) / S19 (chamando, espelhado no painel público)

QueueOperatorPanel (chamar senha)
  variants  —
  states    fila vazia ("Nenhuma senha na fila"), com itens, senha sendo
            chamada (loading no botão)
  tokens    layout de duas colunas (fila | senha atual + últimas chamadas),
            como o `AppointmentPanel` mas sem modal — é uma tela própria
  a11y      toda ação (chamar/re-chamar/remover) tem confirmação textual via
            aria-live, não só visual
  used on   S19

TicketTypeForm / CounterForm (telas de configuração)
  variants  novo, edição
  states    igual ao `Input`/`Button` padrão do resto do app — essas telas
            de config usam a linguagem normal do admin, só o totem e o
            painel de TV é que saem do padrão
  used on   S14, S15, S16
```


## Direção visual 2026 — FEEGOW premium

Referência: SaaS de gestão e saúde com superfícies leves, navegação lavanda e painéis brancos sobre tela cinza-lilás. A marca da clínica e os fluxos clínicos permanecem próprios; não reproduzir logotipos de terceiros.

- **Canvas**: #f5f4f8. **Cards**: branco, sem stroke, raio 22px e sombra suave; separadores internos apenas onde houver conteúdo relacionado.
- **Accent**: #7260d5, fundo ativo lavanda #ebe4ff; sidebar ativa com #e5dcff e texto #3c3261. Cor de sucesso, aviso e erro só para estados reais da clínica.
- **Sidebar**: superfície branca independente sobre o canvas (sem stroke), arredondamento 27px; workspace identificável e navegação em pills.
- **Indicadores**: KPIs em faixa única por conjunto, com divisórias verticais 1px e hierarquia label > valor > comparação. Responsivo em duas ou uma coluna.
- **Tipografia**: Plus Jakarta Sans / Gilroy existente no projeto; títulos densos e com tracking reduzido. Iconografia Iconsax linear.
- **Controles**: botões e inputs 12px de raio, foco visível com ring lavanda; tabelas em papel branco e linhas de separação leves.
- **Movimento**: 180–360ms, easing cubic-bezier(.22,1,.36,1), entrada de páginas e menus, microescala no clique, sem efeitos que alterem a estrutura. Sempre respeitar prefers-reduced-motion.
- **Temas**: claro como padrão para a direção visual; preferência do usuário por tema escuro ou do sistema continua disponível.
- **Fonte de verdade**: estilos runtime em web/src/index.css e componentes web/src/components/ui; tokens documentados em replica/design/tokens*.json.


## Identidade visual MultiSaúde — atualização em 14/10/2026

- Verde principal: #35B64B, hover #2FA342, background suave #E8F8EC.
- Texto e ícones em botões primários: branco (#FFFFFF) conforme a identidade; links sobre branco usam #17792D.
- Tema escuro: accent #62D875, muted #203B2A.
- Categorias de agendamento, cores de status e séries de gráficos permanecem distintas.
- Estilos em web/src/index.css e tokens espelhados em replica/design/tokens*.json.


## Grid de conteúdo — 1920px

- Sidebar independente, 260px; espaçamento horizontal de 32px no desktop.
- Container comum da topbar e do conteúdo: largura fluida até 1600px (web/src/index.css).
- Views operacionais com largura max-w-7xl no topo passam a ocupar o grid disponível; formulários de leitura curta preservam limites.
- Textos e ícones sobre o verde principal são brancos, conforme direção visual.
