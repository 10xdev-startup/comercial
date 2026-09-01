---
name: <NOME_DO_PLANO>
overview: <RESUMO_EM_1_2_LINHAS>
todos: []
isProject: false
---

# `<TITULO_DO_PLANO>`

---

## Problema

`<DOR_OU_LIMITACAO_ATUAL>`

---

## Solucao

`<DIRECAO_ESCOLHIDA_E_O_QUE_MUDA>`

---

## Checklist resumida

```
Fase 0: <acao em 1 linha>
Fase 1: <acao em 1 linha>
Fase 2: <acao em 1 linha>
Fase 3: <acao em 1 linha>
Fase 4: <acao em 1 linha> — opcional
Fase 6: <acao em 1 linha> — separado
```

---

## Passo a passo

### Fase 1 — `<titulo curto>`

**Objetivo:** `<resultado da fase em 1 linha>`.

1. Em `<arquivo>`
2. `<acao concreta>`.

**Validacao parcial:** `<como confirmar>`.

**Commit sugerido:** `<tipo>(<escopo>): <titulo descritivo>`

---

### Fase N — `<titulo curto>`

**Objetivo:** `<resultado da fase em 1 linha>`.

1. `<acao concreta>`.

**Validacao parcial:** `<como confirmar>`.

**Commit sugerido:** `<tipo>(<escopo>): <titulo descritivo>`

---

### Fase final — Validacao (smoke test)

- `npm run typecheck -w backend` → 0 erros.
- `npm run lint -w backend` → 0 erros.
- `npm run typecheck -w frontend` → 0 erros.
- `npm run lint -w frontend` → 0 erros.
- Testes Jest PERTINENTES (NUNCA a suite inteira — o WSL trava): `npm test -w backend -- <arquivo>` / `npm test -w frontend -- <arquivo>`, ou `-- -o` / `-- --findRelatedTests <arquivo>`.
- Reinicia backend (`npm run dev -w backend`).
- Abre `<rota>` no frontend; `<comportamento esperado>`.
- Faz `<acao chave>`; ve no log:
  - `[<servico>] <linha esperada>`
- `<cenario E2E critico>`.
- `<cenario edge case que costuma quebrar>`.

---

## Diagrama: estado atual vs. desejado

> Se for **feature nova** (sem estado atual), mantenha apenas a secao "Desejado".
>
> ## Dicas de uso
>
> 1. **Mantenha o ASCII consistente.** Use sempre os mesmos caracteres (`│`, `├`, `└`, `▼`, `◄──`) — facilita ler em monospace.
> 2. **Anote o status de cada caixa.** Sem `(existente)` / `✨ NOVO` o leitor não sabe o que é trabalho novo vs. estado atual.
> 3. **Comentários inline > legendas separadas.** Coloque `◄── papel` ou `# motivo` na mesma linha do componente; evita o ping-pong de "ver legenda abaixo".
> 4. **Caixas só pra contratos importantes.** Use `┌─┐` para destacar contratos de endpoint ou regras críticas — não abuse, perde força.
> 5. **Mostre fluxos paralelos.** Se um componente alimenta vários outros, use `├──►` repetidamente em vez de transformar tudo em texto.
> 6. **Conte linhas/arquivos só quando relevante.** "(~250 linhas)" ajuda a calibrar tamanho do trabalho; "(1442 linhas)" ajuda a justificar uma quebra. Não ponha em todo lugar.
>
> ## Convenções de notação
>
> Use estas marcações nos diagramas para deixar o estado de cada componente óbvio:
>
> - `(existente)` — arquivo/módulo que já existe e permanece
> - `(existente — ganha X)` — arquivo já existe e ganha responsabilidade nova
> - `(existente — perde X)` — arquivo já existe e tem responsabilidade removida
> - `✨ NOVO` — arquivo/módulo a ser criado
> - `✂ DELETADO` — arquivo/módulo a ser removido
> - `◄──` — anotação inline apontando algo importante na linha anterior
> - `├─` / `└─` — listagem de responsabilidades/métodos do componente acima
> - Caixa com `┌─┐ │ └─┘` — destaque para contratos de API ou fluxos importantes

### Atual

```text
<ENTRADA_OU_GATILHO>
     │
     ▼
<COMPONENTE_1>                 (existente — <observacao_se_relevante>)
     │
     ├─── <responsabilidade_1>                      ┐
     ├─── <responsabilidade_2>                      │ <PADRAO_PROBLEMATICO>
     └─── <responsabilidade_3>                      ┘
     │
     ▼
<COMPONENTE_FINAL>             (existente)
     │ <observacao_sobre_limitacao>
```

### Desejado

```text
Frontend: TagButton.tsx                         (existente — onClick agora chama hook novo)
     │
     │ POST /api/tags/:id/favorite
     ▼
backend/src/routes/tagRoutes.ts                 (existente — registra rotas novas)
     ├─ POST   /tags/:id/favorite → TagController.favorite
     └─ DELETE /tags/:id/favorite → TagController.unfavorite

backend/src/controllers/TagController.ts        (existente — ganha 2 handlers)
     │   └─ favorite(req, res)  ◄── handler novo (~30 linhas)
     │       1. valida tagId existe via TagModel.findById
     │       2. resolve userId via req.user
     │       3. chama TagFavoriteService.add()
     │       4. retorna 200 com { isFavorite: true, count }
     │
     │   └─ unfavorite(req, res)
     │       1. valida tagId
     │       2. chama TagFavoriteService.remove()
     │       3. retorna 200 com { isFavorite: false, count }
     │
     │ chama:
     ▼
backend/src/services/TagFavoriteService.ts      ✨ NOVO — orquestra favorito (~80 linhas)
         ├─ add(userId, tagId)
         │     ├─ se ja existe → retorna idempotente
         │     └─ se nao → insere via TagFavoriteModel + invalida cache
         │
         ├─ remove(userId, tagId)               idempotente
         ├─ listForUser(userId)                 retorna tags favoritas do user
         └─ countForTag(tagId)                  quantos users favoritaram (cacheado)

backend/src/models/TagFavoriteModel.ts          ✨ NOVO — acesso a tabela tag_favorites
         ├─ create({ userId, tagId })
         ├─ delete({ userId, tagId })
         ├─ existsForUser(userId, tagId)
         └─ countByTagId(tagId)
            (so consumido por TagFavoriteService; sem import circular)

backend/src/types/tag.ts                        (existente — ganha tipos)
         ├─ TagFavorite                          ◄── shape da tabela tag_favorites
         ├─ TagFavoriteResponse                  ◄── retorno do POST/DELETE
         └─ Tag (existente — ganha campo isFavorite?: boolean)

supabase/migrations/<timestamp>_tag_favorites.sql  ✨ NOVO
         └─ CREATE TABLE tag_favorites (
              user_id, tag_id, created_at,
              UNIQUE (user_id, tag_id)
            )

     ┌─────────────────────────────────────────────────────────────────┐
     │ Endpoint novo: POST   /api/tags/:id/favorite                    │
     │                DELETE /api/tags/:id/favorite                    │
     │   body: vazio                                                   │
     │   resposta: { isFavorite: boolean, count: number }              │
     │                                                                 │
     │ Endpoint existente: GET /api/tags                               │
     │   contrato novo: cada Tag ganha campo `isFavorite?: boolean`    │
     │   (so quando autenticado; nao quebra clientes anonimos)         │
     └─────────────────────────────────────────────────────────────────┘

     ▼
frontend/components/TagButton.tsx               (existente — perde fetch local)
     │   ─ leitura: usa isFavorite vindo do GET /tags (campo novo)
     │   ─ click: chama useTagFavorite.toggle(tagId)
     │   sem fetch direto, sem re-render do feed inteiro
     │
     ├──► frontend/hooks/useTagFavorite.ts      ✨ NOVO — orquestra toggle no client
     │     ├─ toggle(tagId)                     optimistic update + rollback no erro
     │     ├─ isLoading(tagId)                  loading por-tag
     │     └─ subscribe(tagId, callback)        invalida lista quando muda
     │
     ├──► frontend/components/TagList.tsx       (existente — usa isFavorite)
     │     └─ ordena favoritos no topo
     │
     └──► frontend/components/TagSearch.tsx     (existente — sem mudanca estrutural)
          └─ comportamento de busca permanece
```

> Convencoes de notacao e dicas de uso: [diagrama-arquitetura.template.plan.md](./diagrama-arquitetura.template.plan.md).

