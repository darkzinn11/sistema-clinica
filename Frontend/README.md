# Clínica Vida Plena — protótipo de telas

Protótipo navegável (não funcional) de um sistema de gestão para clínicas:
todas as telas, com dados fictícios e interações locais, pra servir de base
para o desenvolvimento real.

## Rodar

```bash
npm install
npm run dev
```

Abre em http://localhost:5173. Telas públicas (fora do menu): `/login`,
`/totem`, `/tv`, `/design` (guia visual de componentes).

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · ícones
[Iconsax](https://iconsax.io) (`iconsax-reactjs`).

## Onde está cada coisa

| Pasta | O quê |
| --- | --- |
| `src/routes.tsx` | mapa de todas as rotas (telas carregadas sob demanda) |
| `src/lib/nav.ts` | menu lateral, busca ⌘K e breadcrumbs saem daqui |
| `src/pages/<módulo>/` | as telas |
| `src/components/ui/` | design system (botões, campos, tabelas, gráficos, drawer, modal…) |
| `src/components/shell/` | sidebar, barra superior, busca ⌘K, tema e modo compacto |
| `src/lib/mock/` | dados fictícios (determinísticos — nenhum dado real) |
| `src/index.css` | tokens de cor por papel, tema claro/escuro, modo compacto |

## Design

- **Cores só por papel** (`bg-surface-raised`, `text-muted`, `bg-accent`…),
  nunca hex nem paleta do Tailwind — é o que faz tema escuro e futuro
  rebrand funcionarem. Contraste AA validado nos dois temas
  (`../replica/design/tokens.json` e `tokens.dark.json`).
- **Modo compacto** encolhe toda a escala de espaçamento de uma vez
  (`data-density="compact"`), sem tocar em componente.
- **Gráficos** seguem regras de dataviz (barras finas, sem eixo duplo,
  tooltip, legenda, tabela acessível) — use os de `components/ui/charts`.
- **Fonte**: Gilroy é comercial e não vem no projeto. Coloque os `.woff2`
  licenciados em `src/assets/fonts/gilroy/` e ela é ativada sozinha; sem
  eles, a interface usa Plus Jakarta Sans.

## Ligar ao backend

O backend planejado (Postgres/Supabase com RLS, migrations, auth) está em
`../app/` — ver `../replica/backend.md`. Como as policies de RLS filtram
tudo pela clínica do usuário logado, o `supabase-js` pode ser usado direto
deste SPA. Cada tela troca as importações de `src/lib/mock/*` pelas
consultas reais.
