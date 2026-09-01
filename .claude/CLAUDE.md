# CLAUDE.md

## Como trabalhar

### 1. Pense antes de codar
- Nao assuma. Se algo nao estiver claro, pare e pergunte.
- Nao esconda confusao. Nomeie o que esta confuso.
- Traga os tradeoffs antes de decidir.
- Reformule a premissa de volta para confirmar que estamos alinhados.

### 2. Simplicidade primeiro
- Codigo minimo que resolve o problema.
- Sem features especulativas. Sem flexibilidade que ninguem pediu.
- Sem abstracoes para codigo de uso unico. Sem tratamento de erro para cenarios impossiveis.
- Teste: um engenheiro senior chamaria isso de overengineered? Se sim, simplifique.

### 3. Mudancas cirurgicas
- Toque apenas no que for necessario para atender o pedido.
- Nao reformate, refatore ou "melhore" codigo adjacente.
- Mantenha o estilo existente mesmo que voce faria diferente.
- Se notar dead code nao relacionado, mencione. Nao delete.
- Teste: toda linha mudada deve rastrear diretamente para o pedido do usuario.

### 4. Execucao guiada por meta
- Transforme a tarefa em metas verificaveis antes de escrever codigo.
- "Adicionar validacao" → "escrever testes para inputs invalidos, depois fazer passar".
- "Corrigir bug" → "escrever teste que reproduz o bug, depois fazer passar".
- Tarefas nao triviais: escreva o plano primeiro (ver **Planos**) e valide cada fase (ver **Testes**).
- Loop ate a meta ser verificada. Nao declare "feito" ate estar.

### 5. Sugira otimizacoes na fonte
- Achou atrito recorrente ou possibilidade de otimizacao? Comente, sem esperar ser perguntado.
- Algo errado/desatualizado **na fonte** (config, env, doc, default, este CLAUDE.md)? Nao contorne so pra tarefa de agora: **nomeie a fonte e proponha corrigir la**, pra da proxima ja sair certo.
- Sinal claro: errou ou contornou **a mesma coisa 2x** → a fonte esta errada. Pare, aponte, sugira o fix na origem.

## Projeto

**Meu Projeto** — descreva aqui o que o projeto faz.

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui (Radix) — `frontend/`
- **Backend**: Node.js, Express, TypeScript, Supabase (PostgreSQL) — `backend/`
- **Padrao backend**: Controller → Model → Database

## Comandos

### Frontend (`frontend/`)
```bash
npm run dev        # Dev server (porta 3000)
npm run build      # Build de producao
npm run start      # Serve o build de producao (next start)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (rede de tipos — blueprint §5)
```

### Backend (`backend/`)
```bash
npm run dev        # Dev server com ts-node-dev (porta 3001)
npm run build      # Compila TypeScript para dist/
npm run start      # Roda o build de dist/ (node dist/index.js)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (rede de tipos)
```

### Testes (Jest)

Backend: `ts-jest` (env node). Frontend: `next/jest` + jsdom + Testing Library. Testes em pasta dedicada — backend em `backend/src/tests/`, frontend em `frontend/tests/` (nome espelha o arquivo de origem: `src/utils/apiResponse.ts` → `src/tests/apiResponse.test.ts`). Imports via alias `@/`, entao a pasta nao acopla ao caminho do codigo. O frontend tem `jest.setup.ts` (matchers do `@testing-library/jest-dom` via entry `/jest-globals` + polyfills de jsdom que Radix/shadcn exigem: `ResizeObserver`, `matchMedia`, pointer capture, `scrollIntoView`).

- **NUNCA rode a suite inteira sem filtro** (`npm test` puro) — o WSL do dev nao aguenta e trava. Rode SEMPRE so o(s) arquivo(s) pertinente(s):
  - `npm test -w backend -- src/tests/apiResponse.test.ts`
  - `npm test -w frontend -- tests/apiErrors.test.ts`
- **Descobrir o que rodar ao mexer no codigo** (os testes ficam flat, entao use o grafo de imports do Jest em vez de procurar na mao):
  - `npm test -w backend -- -o` → so os testes afetados pelo diff git (uncommitted). Subconjunto pequeno, seguro pro WSL. **Com o worktree limpo (tudo commitado) volta vazio** — nao quer dizer "nada pra testar", quer dizer que o `-o` nao tem diff pra comparar. Nesse caso use `--changedSince=main` (compara contra a base, nao contra o working tree): `npm test -w backend -- --changedSince=main`.
  - `npm test -w backend -- --findRelatedTests src/utils/apiResponse.ts` → os testes que tocam aquele arquivo (transitivo).
- Mocke deps externas (`jest.mock(...)` p/ Supabase etc.); nao mocke o codigo sob teste.
- TDD para bug: escreva o teste que reproduz o bug **primeiro**, depois faca passar.
- **`@jest/globals` e obrigatorio** (`import { describe, it, expect } from '@jest/globals'`) — o projeto nao instala `@types/jest` de proposito: esse pacote injeta `describe`/`it`/`expect` no escopo global do workspace inteiro (no backend, dentro de controllers e models tambem, via `roots: src/`), versiona a parte do `jest` (podendo divergir de versao) e colide com qualquer outro runner que exporte os mesmos nomes (Playwright, Vitest). Sem o import, o Jest roda verde mas o `typecheck` quebra com `Cannot find name 'describe'`.
- Tarefa so esta "feita" quando os testes pertinentes passam + `typecheck` + `lint`.

## Deploy (Azure)

**Deploy automatico ao cair na `main`** — o push dispara o GitHub Actions (`.github/workflows/deploy.yml`), que builda as imagens Docker (backend+frontend), faz push pro **Azure Container Registry** e atualiza/reinicia os **Web Apps**. Disparo manual: "Run workflow" (workflow_dispatch). Setup inicial da infra: skill `/deploy-azure`.

**Configurar uma vez por projeto:**
- Edite o bloco `env:` do workflow (nomes do ACR, resource group, Web Apps, imagens, URL do backend).
- Secrets do repo (Settings → Secrets → Actions): `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (service principal), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- **O frontend escolhe o backend por ambiente** via `getApiBaseUrl()` (`frontend/lib/apiBase.ts`): em `localhost`/`127.0.0.1` **sempre** fala com o backend local (host vence env — blueprint §3.1, evita bater na prod sem querer); fora disso usa `NEXT_PUBLIC_API_URL`.
- A imagem de **producao** builda com `NEXT_PUBLIC_API_URL` (build-arg do `frontend/Dockerfile`) apontando pro backend da Azure.

## Regras de codigo

### TypeScript — escreva codigo que compila sem erros

**Backend e mais estrito que o frontend.** No backend, respeite:
- `noImplicitAny` — nunca deixe tipos implicitos como `any`
- `noImplicitReturns` — toda funcao deve ter return explicito em todos os caminhos
- `noUncheckedIndexedAccess` — acesso por index retorna `T | undefined`, trate antes de usar
- `exactOptionalPropertyTypes` — propriedades opcionais nao aceitam `undefined` explicito, use omissao
- `noFallthroughCasesInSwitch` — todo `case` precisa de `break` ou `return`

**Frontend** usa `strict: true` mas sem as regras extras acima.

### ESLint — regras permissivas, mas nao ignore

- Nao crie variaveis sem uso desnecessariamente
- Prefira `const` sobre `let` quando o valor nao muda
- Use `any` somente quando realmente necessario — prefira tipos concretos

### Imports

- **Cada `import` em uma unica linha** — nunca quebre a lista de named imports em varias linhas, mesmo longa. Ex.: `import { a, b, c, d } from "@/services/x"` (nao o formato multi-linha com um nome por linha).

### Path aliases

- **Frontend**: `@/*` → `./*`
- **Backend**: `@/*` → `./src/*` (tambem `@/models/*`, `@/controllers/*`, `@/routes/*`, `@/middleware/*`, `@/database/*`, `@/utils/*`, `@/types/*`)

### Naming

- **Componentes/tipos**: PascalCase (`UserCard.tsx`, `UserCard`)
- **Utilitarios/hooks**: camelCase (`useAuth.ts`, `formatDate.ts`)
- **Banco**: snake_case (`user_cards`)
- **API**: kebab-case (`/user-cards`)
- **Propriedades de tipo**: camelCase

### Rotas (frontend)

- Quem decide se a pagina tem sidebar e o **grupo**, nao a URL: `(dashboard)` tem `layout.tsx` com sidebar, `(lps)` nao tem layout (os parenteses somem da URL, herda o layout raiz sem sidebar).
- Pagina publica **nunca** entra em `(dashboard)`. Landing em `frontend/app/page.tsx` (`/`), paginas de anuncio em `frontend/app/(lps)/lp/<nome>/page.tsx` (`/lp/<nome>`).
- Item de sidebar (`AppSidebar.tsx` → `NAV_ITEMS`) so existe para rota dentro de `(dashboard)`.

### Erro em ponto-chave vira alerta (`reportError`)

Todo `catch` que hoje so loga local (background job, webhook, sync — qualquer lugar onde o erro nao propaga pra um `AppError`/`errorHandler` porque nao ha request HTTP pra responder) **sempre** chama `reportError` (`backend/src/services/errorReporting.ts`) — grava em `error_logs` (Supabase, RLS travado) e tenta alertar um bot do Telegram dedicado a erro. Sem isso o erro so existe no log do servidor, que ninguem le.

```ts
} catch (err) {
  void reportError({ context: 'Sync: falha ao renovar token (segue com o atual)', error: err, userId })
  return tokens.access_token
}
```

`reportError` nunca lanca — seguro de chamar de dentro de qualquer catch. O alerta via Telegram e **opcional**: sem `TELEGRAM_SUPPORT_BOT_TOKEN`/`TELEGRAM_SUPPORT_CHAT_ID` configurados (skill `/novo-projeto` guia a criacao do bot), so pula o envio e grava `notified: false` — o registro em `error_logs` acontece de qualquer jeito.

Nao chame `reportError` num controller que ja lanca `AppError` pro `errorHandler` central — isso duplicaria o registro. E pra erro que nao propaga: back-fill, poll de status, hook de terceiro.

## API — contrato e estrutura

**Resposta SEMPRE no envelope wrapped** (decisao de contrato — nunca cru, nunca misto):

```ts
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code?: string } }
```

- **Backend**: todo controller responde via `sendOk(res, data)` / `sendError(res, status, message, code?)` de `@/utils/apiResponse` — **nunca** `res.json(...)` cru.
- **Frontend**: o `apiClient` (`services/apiClient.ts`) **desembrulha uma vez** — os services recebem `T` limpo, sem `.data` espalhado nem cast. Erro vira `ApiRequestError` (status + code).
- **Estrutura do frontend**: funcao de rede → `services/<dominio>Service.ts` sobre o `apiClient`; tipo compartilhado → `types/`; util sem HTTP → `lib/`. Nunca `fetch` cru espalhado.

## Planos

Para tarefas nao triviais, escreva o plano **antes** de codar. Template em `.cursor/plans/templates/planos.plan.md`:

- **Problema → Solucao → Checklist** (`Fase 0/1/...`) → **Passo a passo** (cada fase: Objetivo, acoes `Em <arquivo> → <acao>`, Validacao parcial, Commit sugerido) → **Fase final** (smoke test) → **Diagrama atual vs. desejado** com convencoes de notacao (`(existente)`, `✨ NOVO`, `✂ DELETADO`, `◄──`, caixas `┌─┐` p/ contratos).

Convencoes:
- Frontmatter Cursor: `name`, `overview`, `todos: []`, `isProject: false`.
- Planos **em andamento** em `.cursor/plans/fazendo/`; **concluidos** em `.cursor/plans/feitos/`.
- **Smoke test final** de todo plano: `npm run typecheck -w backend` + `npm run lint -w backend` + `npm run typecheck -w frontend` + `npm run lint -w frontend` + testes Jest **pertinentes** (nunca a suite inteira — ver "Testes") + cenario E2E + edge case.
- Tarefa so esta "feita" quando a validacao da fase passa.

## Idioma

- Converse sempre em **portugues**
- Commits, PRs e comentarios em **portugues** (ver skills `/commit` e `/pr`)
- Codigo-fonte em **ingles** (variaveis, funcoes, tipos)

## Autenticacao

- **Provider**: Supabase Auth (email + senha)
- **Tokens**: JWT Bearer tokens em headers `Authorization: Bearer <token>`
- **Backend**: `supabaseMiddleware` (`@/middleware`) valida o JWT via `auth.getUser(token)`, garante a linha em `users` (cria no 1º login) e injeta `req.user` (`AuthUser`, tipado em todo controller).
- **Roles**: `req.user.role` (`UserRole = 'user' | 'admin'`). Proteja rotas com `requireRole(...roles)` / `requireAdmin` (`@/middleware`); para mais papeis, edite a union `UserRole`. Roles por recurso (membership) sao um dominio a construir por cima — nao vem no template.
- **Erros**: lance `AppError(status, message, code?)` (`@/utils/AppError`) nos controllers; o `errorHandler` central serializa no envelope wrapped.
- **Confirmacao de email**: projeto Supabase novo nasce com confirmacao por email ligada e **sem SMTP proprio** — o mailer embutido entrega pouco e o cadastro trava na pratica. Decida explicitamente no setup: **MVP/dev** → ligue `mailer_autoconfirm` (`PATCH /v1/projects/{ref}/config/auth`), o `signUp` ja devolve sessao; **producao com email verificado** → configure SMTP (Resend/SendGrid) **antes** de manter a confirmacao ligada. Deixar como vem de fabrica e escolher a opcao que nao funciona.

### Testar endpoint autenticado (bearer)

O JWT e longo — **nunca re-digite inline** (1 char alterado invalida a assinatura → `signature invalid` falso). Escreva uma vez e reuse:
```bash
cat > /tmp/tok <<'EOF'
<bearer aqui>
EOF
TOKEN=$(tr -d '\n' < /tmp/tok)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/users/me
```

## Banco de dados (Supabase PostgreSQL)

### Acesso ao banco (DDL, queries, migrations)

Use a **Supabase Management API via `curl`** — **NAO crie arquivos `.sql` de migration no repo**. Toda mudanca de schema/DDL (create table, alter, indices, functions, backfill) e aplicada direto pela API. `backend/src/database/` guarda apenas `supabase.ts` (config do client) — nunca apague.

Chaves em `backend/.env`: `SUPABASE_URL` (o project ref e o subdominio) e `SUPABASE_ACCESS_TOKEN` (token de management, `sbp_...`). Padrao (rodar de `backend/`):
```bash
source .env
REF=$(echo "$SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"<SQL aqui>"}'
```
Use dollar-quoting (`$$...$$`) nas strings dentro do SQL pra nao escapar aspas no JSON.

**DDL multi-linha nao cabe em `-d '{"query":"..."}'` inline** (newlines e aspas de `$$...$$` corrompem o JSON se escapadas a mao). Pra DDL real (create table + functions + triggers + policies), monte o payload por codigo em vez de escapar manualmente:
```bash
source .env
S=<scratchpad>   # nunca .sql no repo
python3 -c "import json; print(json.dumps({'query': open('$S/ddl.sql').read()}))" > $S/payload.json
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @$S/payload.json
```
Envolva em `begin; ... rollback;`, valide, troque **so** o `rollback` por `commit` (`sed -i 's/^rollback;$/commit;/'`) e aplique. Confirme pelo estado real (`information_schema`, `pg_policies`, `pg_trigger`) — nunca pelo HTTP 200.

### Tabelas principais

- **`users`** — perfil da aplicacao, espelha `auth.users`. **Passo obrigatorio do setup**: o backend nao funciona (nenhuma rota de usuario, nenhum login completa) ate esta tabela existir — nao e criada automaticamente pelo Supabase. Depois de existir, a linha de cada usuario e criada pelo `supabaseMiddleware` no 1º login (role `user`, status `active`). DDL para aplicar via curl acima:
  ```sql
  create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null, name text, avatar_url text,
    role text not null default 'user', status text not null default 'active',
    onboarded_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  ```
  Sem RLS por padrao (tabela aberta pela anon key). Se habilitar RLS, inclua uma policy de "select da propria linha" — a tela `/seja-bem-vindo` do frontend le `onboarded_at` direto pelo client do Supabase, nao pelo backend.

- **`error_logs`** — grava toda chamada a `reportError` (ver "Erro em ponto-chave vira alerta" abaixo). RLS travado, sem policy publica — so o backend (service-role) escreve; nenhum client de anon-key deve ler ou escrever aqui. DDL para aplicar via curl acima:
  ```sql
  create table if not exists public.error_logs (
    id uuid primary key default gen_random_uuid(),
    context text not null,
    error_message text not null,
    user_id uuid references auth.users(id) on delete set null,
    notified boolean not null default false,
    created_at timestamptz not null default now()
  );
  alter table public.error_logs enable row level security;
  ```

## Arquivos-chave

- `frontend/app/page.tsx` — landing publica em `/` (sem sidebar)
- `frontend/app/(dashboard)/inicio/page.tsx` — primeira pagina da area logada
- `frontend/app/(lps)/lp/` — paginas de anuncio (`/lp/<nome>`), sem sidebar
- `frontend/components/AppSidebar.tsx` — sidebar com navegacao
- `backend/src/index.ts` — entry point do servidor
- `backend/src/database/supabase.ts` — configuracao do client (service-role)
- `backend/src/middleware/` — `supabaseMiddleware` (auth), `requireRole`/`requireAdmin`, `errorHandler`
- `backend/src/{routes,controllers,models}/User*` — dominio de referencia `user` (molde Controller → Model → Database)
- `frontend/services/` — `apiClient` (transporte wrapped) + `userService` (molde de dominio) + `authService` (SDK do Supabase direto — fora do transporte wrapped de proposito)
- `frontend/proxy.ts` — gate de rotas (publica vs autenticada) + refresh de cookie de sessao
- `frontend/lib/supabase/` — `client.ts` (browser) / `server.ts` (SSR, cookies) via `@supabase/ssr`
- `frontend/hooks/useAuth.tsx` — sessao em React (`AuthProvider`/`useAuth`, so leitura)
- `frontend/app/(auth)/` + `frontend/app/seja-bem-vindo/` — telas de entrada e onboarding

## Skill routing

Quando o pedido casa com uma skill, invoque-a com a tool Skill como **primeira acao** (nao responda direto antes). As skills tem workflows especializados melhores que respostas ad-hoc.

- Commitar, subir, push → `/commit`
- Criar PR → `/pr` · ver/analisar comentarios do PR → `/get-pr-comments`, `/pr-comments`
- Conflito de merge → `/fix-merge-conflicts`
- Limpar codigo gerado por IA (AI slop) → `/remove-ai-slop`
- Deploy / Azure → `/deploy-azure`
- Bug, erro, "por que quebrou", 500 → `/investigate`
- QA, testar o site, achar bugs → `/qa`
- Code review, revisar o diff → `/review` ou `/code-review`
- Brainstorm, "vale construir isso" → `/office-hours`
- Revisao de arquitetura/plano → `/plan-eng-review`
- Auditoria visual / polish de design → `/design-review`
- Atualizar docs pos-ship → `/document-release`
- Avaliar link/novidade pra aplicar no projeto → `/executor-novidades`
- Limpar temp/cache do WSL → `/limpar-temp`
