# Blueprint: estrutura de API do frontend (`apiClient` + services)

> **Proveniência:** lições destiladas de um refactor real (num projeto X, um `lib/api.ts`
> de ~1700 linhas / ~80 funções / ~28 consumidores virou services por domínio).
> Portável de propósito — copie pro template de um projeto novo pra ele **nascer com a
> estrutura final** e nunca precisar deste refactor depois.
>
> **Como ler:** os **princípios** são universais. Tudo marcado com **`(ex.: …)`** é
> ilustração do projeto de origem — **troque pelo equivalente do seu domínio**.
> **Pressupõe o stack** Next.js + React + Supabase (auth) + Jest; onde citar um desses
> por nome, adapte se o seu stack diferir.
>
> Num projeto NOVO você **pula** todo o overhead de migração (seam de compat, testes de
> caracterização, fases incrementais) — isso foi ferramenta de migração de legado, não a
> arquitetura. Comece direto no destino. A seção 6 cobre o caso de migrar um legado.

## 1. A estrutura-alvo (copiar pro template)

```text
frontend/
  lib/
    apiBase.ts          # getApiBaseUrl(): host vence env (localhost SEMPRE fala com local)
    <util>.ts           # utils puros (sem HTTP) ficam em lib/, NÃO em services/ (ex.: slug, formatadores)
  services/
    apiClient.ts        # ÚNICO transporte: baseURL, auth, timeout, upload, erro
    apiErrors.ts        # classe de erro canônica (status+code) + toApiRequestError + helpers de classificação
    index.ts            # barrel: export * de cada service (auth/infra ficam de fora)
    <domínio>Service.ts # 1 por domínio, finos: 1-2 linhas por método, consomem apiClient
  types/
    <área>.ts           # modelo de dados COMPARTILHADO (consumido por vários domínios)
```

**Regra de ouro:** se uma função fala com a rede, ela vive num `<domínio>Service.ts` sobre o `apiClient`. Nunca um `fetch` cru espalhado, nunca um módulo `api.ts` único que cresce sem fim — esse é o anti-padrão que gerou o refactor de origem.

## 2. Onde cada coisa mora (a decisão que mais confunde)

- **Função de rede** → `services/<domínio>Service.ts`.
- **Tipo do modelo compartilhado** (consumido por services + selectors + charts + componentes) → `types/<área>.ts`. **NÃO** dentro de um service (cria dependências cruzadas entre domínios) nem num `api.ts`.
- **Tipo de posse exclusiva de um domínio** → no próprio service do domínio _(ex.: o tipo de retorno de um endpoint que só aquele domínio consome)_.
- **Util puro sem HTTP** → `lib/` _(ex.: gerador de slug, formatador de data)_.
- **Erro** → sempre `services/apiErrors.ts` (classe canônica com `status`+`code`, helpers de classificação, conversor). Separe **desde o dia 1** — ver nota.

> **Erro: a pergunta é _onde_, não _se_.** Quase todo projeto não-trivial classifica erro (status/code → ação na UI). A escolha é **centralizar** (um `code` estável, helpers nomeados tipo `requiresCheckout(err)`, um `toApiRequestError`) ou **espalhar** (`statusCode === 402` e `error.message.includes('...')` repetidos em cada componente — frágil: o segundo quebra no dia que a mensagem do backend mudar). "Não ter `apiErrors`" quase nunca significa "código mais simples" — significa classificação difusa e duplicada. Além disso, manter os erros **dentro do `apiClient`** força quem só quer _classificar_ um erro (um componente que pergunta "é falta de crédito?") a importar o módulo do transporte inteiro. Por isso separar é o default saudável: barato num projeto pequeno, indispensável num grande, e o que evita virar dívida.

## 3. Regras do `apiClient` (as que custaram caro pra descobrir)

1. **baseURL via `getApiBaseUrl` — host vence env.** Em `localhost` o browser SEMPRE fala com o backend local, antes de checar a env var da URL da API. Evita o dev bater na prod sem querer e mascarar mudanças locais.
2. **Auth SEM cache.** `getHeaders()` lê a sessão do auth provider a cada request _(no Supabase: `supabase.auth.getSession()`)_. O client de auth já serve da memória/localStorage e só vai à rede quando o token expira — um cache de token por cima é redundante, diverge do comportamento default e adiciona bug-surface (cooldown, coordenação de concorrência). O refresh em 401 (refresh + retry) fica no `request()`, não num cache.
3. **Timeout configurável por chamada.** Default curto (uns 15s) + um override por chamada (`{ timeoutMs }`) com um `LONG_RUNNING_TIMEOUT_MS` (uns 120s) para endpoints lentos (geração por LLM, sync). O erro clássico são os dois extremos: `fetch` cru sem timeout nenhum (trava pra sempre) ou um default curto que mata a chamada longa.
4. **`upload()` dedicado** pra `FormData` (não force isso pelo `post` JSON).
5. **Erro canônico com `status` E `code`** — **nunca `Error` puro.** A UI frequentemente ramifica em cima do `code`/`status` do backend _(ex.: "sem créditos → abrir checkout", "convite expirado / 410 → tela própria", "token OAuth expirado → reconectar")_. Com `Error` puro essa informação se perde. Um `toApiRequestError(err, fallback)` central recupera `message`/`code` do payload do backend e os consumidores ramificam em cima disso.

## 4. Padronizar o backend desde o dia 1 (evita o cast feio)

O atrito #1 do cliente foi o backend responder **inconsistente** — parte dos endpoints manda o **body cru** e parte manda **wrapped** (`ApiResponse{success,data}`) _(ex.: no projeto de origem, só o módulo de billing era wrapped e o resto cru — bastou pra obrigar `response as unknown as T` em todo service)_. **No template, escolha UM formato de resposta** (cru ou sempre-wrapped) e aplique em todos os controllers. Se for sempre-wrapped, o `apiClient` desembrulha uma vez e os services ficam limpos de cast.

## 5. Armadilhas de tooling

- **Se o seu setup de teste usa SWC / `isolatedModules`** (ex.: `next/jest`, `ts-jest` em transpile-only), **o Jest NÃO faz type-check** — bugs de tipo passam verdes nos testes. **`tsc --noEmit` é a ÚNICA rede de tipos**, rode sempre como gate _(no refactor de origem, foi o `tsc` — não o Jest — que pegou um acesso a campo possivelmente `undefined`)_.
- **Se o `tsconfig` inclui a pasta de testes** (`include: **/*.ts`), o type-check cobre os testes também — relevante na migração (exige stubs tipados pros services ainda não criados).
- **React 19 / `@types/react@19`**: `FormEvent` está `@deprecated` ("doesn't actually exist") — use `SyntheticEvent` (ou o tipo específico do evento) nos handlers. Template React 19 já deve nascer assim.

## 6. Se um dia precisar migrar um legado (não o template)

O método do refactor de origem, em uma linha cada: **(a)** inventário + gap-check do `apiClient`; **(b)** testes de caracterização escritos ANTES, vermelhos, travando método+endpoint+payload+erro; **(c)** migração incremental 1 domínio por vez, com o `api.ts` antigo **re-exportando** do service novo (seam de compat) pros consumidores não quebrarem todos de uma vez; **(d)** remover o `api.ts` e expor o barrel por último. E ao rebasear uma branch derivada sobre a base que andou: **meça o overlap primeiro**, e lembre que **conflito semântico (import de módulo deletado) não aparece no `git merge` — só no `tsc`**.
