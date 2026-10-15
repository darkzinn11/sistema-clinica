# Backend

Escopo desta rodada, por pedido seu: **só autenticação + banco**. E-mail
(Resend), WhatsApp Business API e qualquer coisa de pagamento ficam pra
depois — o app é de uso interno, sem cobrança online (ver `architecture.md`).

> **Importante — não testado contra um banco de verdade.** Não tenho como
> criar uma conta Supabase nem gerar chaves por você (nem deveria — são suas
> credenciais). Este documento diz exatamente o que fazer pra ligar isso.
> Até lá, `npm run dev` não funciona: a versão em memória que rodava antes
> foi substituída de propósito (era o ponto desta etapa).

## O que foi feito

- **Banco**: schema completo em
  [`app/supabase/migrations/20261013000000_init.sql`](../app/supabase/migrations/20261013000000_init.sql)
  — as 15 tabelas de `architecture.md`, a constraint de não-sobreposição de
  horário (`no_overlap_unless_encaixe`), a função `issue_ticket()` (emite
  senha sem risco de número repetido se dois totens baterem junto), a
  função `search_patients()` (busca ignorando acento — o bug que achei e
  corrigi na versão em memória, agora resolvido no banco com `unaccent` +
  índice trigram) e **Row Level Security em todas as tabelas**.
- **Seed**: [`app/supabase/seed.sql`](../app/supabase/seed.sql) com os
  mesmos dados fictícios que a versão em memória usava (nenhum paciente
  real).
- **Auth**: Supabase Auth com e-mail/senha. Login (`/login`), esqueci minha
  senha (`/esqueci-senha` → e-mail → `/auth/callback` → `/redefinir-senha`),
  sair. Sem cadastro público — igual ao original, que não tem "criar conta",
  só "primeiro acesso" (o convite é administrativo).
- **Middleware**: renova a sessão em toda request e redireciona quem não
  está logado pra `/login` (menos `/totem`, `/tv`, `/login`,
  `/esqueci-senha`, `/redefinir-senha`, `/auth`, `/design`, que são
  públicas de propósito).
- **Camada de dados**: `app/src/lib/data/store.ts` inteiro reescrito pra
  consultar o Postgres de verdade via Supabase, no lugar dos arrays em
  memória. Mesma assinatura de função de antes — nenhuma tela mudou.

## O que fazer pra rodar de verdade

1. Crie um projeto em [supabase.com](https://supabase.com) (grátis).
2. Em **Settings → API**, copie a Project URL, a `anon` key e a
   `service_role` key.
3. `cp app/.env.example app/.env.local` e cole as três ali, mais
   `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
4. Rode a migration e o seed. Duas formas:
   - **CLI** (`npx supabase login`, depois `npx supabase link --project-ref <ref>`,
     depois `npx supabase db push` pra migration; pro seed,
     `npx supabase db execute -f supabase/seed.sql` ou cole o conteúdo no
     SQL Editor do dashboard).
   - **Manual**: cole o conteúdo de `20261013000000_init.sql` no SQL Editor
     do dashboard e rode; depois cole `seed.sql` e rode.
5. O `seed.sql` cria um usuário de teste (`recepcao@suaclinica.com.br` /
   `troque-esta-senha`) **só funciona se você rodar via `supabase db reset`
   local (precisa de Docker) ou se o seu projeto permitir inserir direto em
   `auth.users`** — a maioria dos projetos hospedados não deixa por padrão.
   Caminho que funciona em qualquer projeto: no dashboard, **Authentication
   → Add user**, crie o primeiro usuário manualmente, pegue o UUID gerado e
   rode só este insert (trocando os valores):
   ```sql
   insert into staff_users (clinic_id, auth_user_id, full_name, role)
   values ('00000000-0000-0000-0000-000000000001', '<uuid do usuário criado>', 'Recepção', 'admin');
   ```
6. `npm run dev` e teste o login.

Sem Docker neste computador, então não consegui rodar `supabase start`
(stack local) nem testar isso de ponta a ponta eu mesmo. Depois que você
seguir os passos acima, me avisa — se aparecer algum erro eu ajudo a
debugar.

## Segurança: as duas rotas sem login

`/totem` e `/tv` não têm sessão de staff, igual ao original (que gera um
link público por unidade). As Server Actions que elas chamam
(`issueTicketAction`, `getCurrentCallAction` e as funções `*Public` em
`store.ts`) usam a **service role key**, que ignora RLS — de propósito,
porque não existe usuário logado pra RLS filtrar. Isso é seguro *desde que*:

- a service role key nunca vá pro navegador (ela só é lida em código que
  roda no servidor — `createServiceClient()` em `src/lib/supabase/server.ts`
  — nunca em `"use client"`);
- essas duas rotas continuem só lendo/emitindo senha, nunca expondo dado de
  paciente (confirmei: nenhuma delas toca a tabela `patients`).

**Antes de ter mais de uma clínica ou um deploy público de verdade**: trocar
esse bypass total por um slug/token público por unidade (como o original
faz — reparei que o link real tinha um token tipo `kQyLq` na URL) + uma
policy anon restrita a esse `clinic_id` específico, em vez de service role
irrestrita. Pra uma clínica só, uso próprio, o risco é baixo — mas documento
isso porque "funciona pra mim agora" e "seguro pra produção" não são a
mesma coisa.

## Checklist de segurança

- [x] secrets só em env vars, `.env*` no `.gitignore` (com exceção
      explícita pro `.env.example`, que não tem valor nenhum)
- [x] autorização em toda leitura/escrita via RLS — não testei com um
      segundo usuário/segunda clínica de verdade ainda (preciso de um
      projeto real pra isso)
- [ ] validação de input no servidor (zod ou parecido) em toda rota — as
      Server Actions confiam no formato que o formulário manda; não
      adicionei uma camada de validação dedicada nesta rodada
- [x] rate limit em auth — coberto pelos limites padrão do Supabase Auth
      (não precisa reimplementar)
- [x] uploads: não aplicável ainda (nenhuma tela faz upload de arquivo)
- [x] nenhum dado de usuário em URL ou log
- [~] dependências auditadas: `npm audit` acusa 5 "high" em
      `eslint-config-next → @next/eslint-plugin-next → fast-glob →
      micromatch → braces` — é cadeia de ferramenta de lint (dev, não roda
      em produção); o fix automático rebaixaria o `eslint-config-next` pra
      uma versão mais velha que o Next 16 que estamos usando, então não
      apliquei. Revisar quando o pacote atualizar.
- [ ] política de privacidade listando os processadores (Supabase por
      enquanto) — não escrita nesta rodada, é conteúdo pro `/replica-deploy`

## Próximo passo

`npm install` já rodou (`@supabase/supabase-js`, `@supabase/ssr`). Depois de
criar o projeto e seguir os passos acima, me chama pra testarmos o login e
o fluxo de agendamento juntos. Daí sim faz sentido ir pro `/replica-test`.
