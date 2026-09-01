# Testes diretos e diagnostico

Mocks provam a aplicacao; nao provam RLS, grants, publicacao nem schema cache.

## Piramide minima

```text
Jest unit/contract
  -> smoke Express com JWT
  -> smoke PostgREST com anon key + JWT
  -> inventario administrativo final
```

## Identidades

Usar dois usuarios de teste reais:

- usuario A, com a propria linha `users` conhecida;
- usuario B, com a propria linha `users` conhecida.

Guardar JWT em arquivo temporario restrito e nunca imprimir. Todo teste negativo precisa de uma
linha-alvo conhecida; `[]` sozinho pode significar RLS correta, tabela vazia, filtro ou JWT errado.

## Matriz PostgREST

| Caso | Assercao |
|---|---|
| A consulta dado A | linha-alvo aparece |
| A consulta dado B | linha-alvo nao aparece |
| B consulta dado B | linha-alvo aparece |
| B consulta dado A | linha-alvo nao aparece |
| JWT ausente/expirado | nenhum dado privado |
| A insere/atualiza/deleta como B | nenhuma linha muda |

SELECT negado pode retornar `200` e `[]`; registrar status e corpo sanitizado.

## Backend

Testar separadamente o endpoint Express:

- JWT valido permite apenas o owner;
- outro usuario recebe 404 quando existencia for sensivel;
- erro Supabase nao vira `[]`;
- DTO expoe allowlist de campos;
- GET nao chama mutation, IA ou integracao acidentalmente.

Um 200 do backend usa service role e nao valida RLS; manter o smoke PostgREST.

## RPC, Realtime e paginacao

Quando aplicavel, cobrir RPC com caller permitido/negado, grants, replay e concorrencia. Para
Realtime, conectar JWT permitido e negado, produzir uma mutation e provar evento/ausencia depois
de reconectar. Para paginacao, testar fronteiras 999/1000/1001, ordenacao, duplicacao, lacunas e
erro em pagina intermediaria.

## Evidencia

Registrar somente data, ambiente, tabela/RPC/rota, papel, esperado/observado e identificadores
sinteticos ou truncados. Nunca guardar token, email real, headers ou dados pessoais na skill.
