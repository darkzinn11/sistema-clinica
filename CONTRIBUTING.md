# Como trabalhar neste projeto (passo a passo)

A branch `main` é **protegida**: ninguém sobe código direto nela. Todo trabalho
passa por uma **branch** e um **Pull Request (PR)**, que o responsável revisa
antes de entrar. Se você tentar dar push na `main`, o GitHub vai recusar. Isso
é normal, não quebrou nada.

## Regra de ouro

> Nunca trabalhe na `main`. Para cada tarefa, crie uma branch nova.

## Primeira vez (só uma vez)

```bash
git clone https://github.com/darkzinn11/sistema-clinica.git
cd sistema-clinica
```

Para rodar o `app` (Next.js):

```bash
cd app
cp .env.example .env.local   # peça as chaves do Supabase ao responsável
npm install
npm run dev
```

Nunca commite o `.env.local`. Ele já está no `.gitignore`.

## Fluxo de cada tarefa

### 1. Atualize a main

```bash
git checkout main
git pull
```

### 2. Crie uma branch para a tarefa

Use um nome curto que diga o que você vai fazer:

```bash
git checkout -b feature/nome-da-tarefa
```

Exemplos: `feature/tela-agendamento`, `fix/erro-login`.

### 3. Trabalhe e salve (commit)

Faça as alterações. Depois:

```bash
git status                  # veja o que mudou
git add .
git commit -m "Descreva o que você fez"
```

Pode fazer vários commits ao longo do trabalho.

### 4. Envie a branch para o GitHub

```bash
git push -u origin feature/nome-da-tarefa
```

Da segunda vez em diante, na mesma branch, basta `git push`.

### 5. Abra o Pull Request

1. Abra https://github.com/darkzinn11/sistema-clinica
2. Vai aparecer um botão amarelo **"Compare & pull request"**. Clique nele.
3. Escreva um título e uma descrição curta do que mudou.
4. Clique em **"Create pull request"**.
5. Avise o responsável que o PR está pronto para revisão.

### 6. Espere a revisão

- Se pedirem ajustes, faça na **mesma branch**, com `git add .`, `git commit` e `git push`. O PR atualiza sozinho.
- Quando for aprovado, o responsável faz o merge. Você não precisa fazer nada na `main`.

### 7. Depois do merge

```bash
git checkout main
git pull
```

E comece a próxima tarefa criando outra branch (passo 2).

## Boas práticas

- **Uma tarefa por branch.** PRs pequenos são revisados mais rápido.
- **Rode antes de abrir o PR:** `npm run lint` e `npm run build` (dentro de `app/` ou `web/`). Se der erro, corrija antes.
- **Puxe a main com frequência** para não acumular conflitos:
  ```bash
  git checkout main && git pull
  git checkout feature/nome-da-tarefa
  git merge main
  ```
- **Nunca** commite senhas, chaves ou arquivos `.env`. O repositório é **público**.
- **Nunca** use `git push --force`.

## Deu problema?

| Situação | O que fazer |
|----------|-------------|
| `remote: error: GH006: Protected branch update failed` | Você tentou dar push na `main`. Crie uma branch: `git checkout -b feature/minha-tarefa` e faça `git push -u origin feature/minha-tarefa`. Seus commits vão junto. |
| Fiz commits na `main` por engano | Não dê push. Rode `git checkout -b feature/minha-tarefa` (os commits vão para a nova branch) e peça ajuda para limpar a `main` local. |
| Conflito no merge | Pare e peça ajuda. Não apague nada no escuro. |
| Não sei em qual branch estou | `git branch` (a atual tem um `*`). |
| Qualquer outra dúvida | Pergunte antes de tentar comandos que você não conhece. |

## Resumo rápido

```bash
git checkout main && git pull          # 1. atualiza
git checkout -b feature/minha-tarefa   # 2. branch nova
# ... trabalha ...
git add . && git commit -m "mensagem"  # 3. salva
git push -u origin feature/minha-tarefa # 4. envia
# 5. abre o PR no site do GitHub
```
