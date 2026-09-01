---
name: pr-comments
description: "Extrai comentarios de reviews do PR via gh CLI e gera relatorio em Markdown agrupado por area e severidade. Use quando quiser analisar o feedback de um PR."
---

# PR Comments Extractor

Quando o usuario pedir para extrair comentarios do PR (ex: "pega os comentarios do PR", "relatorio do PR", "extrai as sugestoes"), execute o fluxo abaixo.

## 1. Detectar PR e review ID

O usuario pode fornecer:

- **Branch atual** → detectar PR automaticamente:
  ```bash
  branch=$(git branch --show-current)
  prNum=$(gh pr list --head "$branch" --json number --jq '.[0].number')
  ```
- **Numero explicito** (ex: "PR #97") → usar diretamente
- **URL do PR** → extrair numero da URL
- **URL de review especifico** (ex: `.../pull/97#pullrequestreview-123`) → extrair `prNum` e `reviewId` da URL

Se nao encontrar PR, avisar usuario e nao prosseguir.

## 2. Baixar conteudo via gh CLI

```bash
repo=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
prInfo=$(gh pr view $prNum --json title,state,url,headRefName,author --jq '{title, state, url, branch: .headRefName, author: .author.login}')
```

**Se o usuario forneceu URL de review especifico:**
```bash
reviewBody=$(gh api repos/$repo/pulls/$prNum/reviews/$reviewId --jq '.body')
inlineComments=$(gh api repos/$repo/pulls/$prNum/comments \
  --jq "[.[] | select(.pull_request_review_id == $reviewId) | {path: .path, line: (.original_line // .line // .start_line), body: .body, user: .user.login}]")
```

**Se nao, buscar todos os comentarios:**
```bash
inlineComments=$(gh api repos/$repo/pulls/$prNum/comments \
  --jq '[.[] | {path: .path, line: (.original_line // .line // .start_line), body: .body, user: .user.login}]')
reviewBody=$(gh api repos/$repo/pulls/$prNum/reviews \
  --jq '[.[] | .body] | join("\n\n")')
```

## 3. Analisar e salvar em `.cursor/pr-comments/pr-{prNum}.md`

Com os dados em maos:

**a) Parsear cada comentario inline** buscando no campo `body`:
- Severidade: `_🔴 Critical_`, `_🟠 Major_`, `_🟡 Minor_`
- Titulo em negrito (primeira linha `**...**`)
- Arquivo + linha ja estao nos campos `path` e `line`

**b) Parsear o `reviewBody`** para extrair outside diff comments e comentarios que nao aparecem inline.

**c) Escrever o arquivo** com:
- Secao `## Relatorio gerado` no inicio com estatisticas resumidas
- Cabecalho: titulo, URL, autor do PR, branch, data gerada
- Estatisticas: total de comentarios, arquivos afetados, autores
- Comentarios na ordem original do GitHub

## 4. Apresentar tabela no chat

Apos gerar o arquivo, exibir:

1. Caminho do arquivo gerado
2. Resumo estatistico: totais por severidade, arquivos afetados, autores
3. Action items **agrupados por funcionalidade/area**, ordenados por urgencia dentro de cada grupo

**Escala de urgencia (1 = mais urgente):**

| Nivel | Criterio |
|-------|----------|
| 1 | Bloqueante, security, data loss |
| 2 | Bug funcional, quebra comportamento esperado |
| 3 | Problema de qualidade ou performance |
| 4 | Melhoria de codigo, minor refactor |
| 5 | Sugestao estetica, nitpick |

**Coluna Avaliacao (somente Critical e Major):**
- Ler o arquivo afetado e avaliar se o problema e pertinente
- Resultado: `✅ Confirmado`, `❌ Falso positivo` ou `⚠️ Parcialmente valido` + justificativa curta

**Formato de saida:**

```md
### 🟦 Auth
| Urgencia | Sev | Arquivo | Problema | Avaliacao |
|----------|-----|---------|----------|-----------|
| 1 | 🔴 | auth.ts:42 | Token nao expira | ✅ Confirmado. Fluxo X nunca invalida o token |

### 🟦 Geral
| Urgencia | Sev | Arquivo | Problema | Avaliacao |
|----------|-----|---------|----------|-----------|
| 5 | 🟡 | index.ts:3 | Import nao utilizado | |
```

4. Perguntar se deseja aplicar alguma correcao.
