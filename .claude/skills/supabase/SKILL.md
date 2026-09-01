---
name: supabase
description: Operar e diagnosticar o Supabase de projetos criados pelo template 10xDev. Usar para criar a fundacao inicial users, inspecionar ou alterar schema, constraints, indices, RLS, grants, functions, Auth, Realtime, Storage e paginacao PostgREST; testar isolamento com JWT; ou investigar acesso negado, dados vazando e divergencia entre service role e usuario autenticado. A skill resolve o projeto pelas variaveis locais, faz preflight read-only, pede aprovacao antes de DDL e prova as postconditions sem expor segredos.
---

# Supabase

Operar tres fronteiras distintas:

| Superficie | Credencial | Papel |
|---|---|---|
| Backend Express | `SUPABASE_SERVICE_ROLE_KEY` | operacao privilegiada depois da autorizacao do backend |
| Browser/SSR | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + JWT | Auth e acesso limitado por RLS |
| Management API | `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` | inventario e DDL administrativo |

Nunca usar sucesso com service role como prova de RLS. Provar policies com anon key e JWT real.

## Escolher o playbook

| Tarefa | Ler |
|---|---|
| Criar o ponto zero `users` | [fundacao.md](fundacao.md) |
| Inspecionar/aplicar DDL, constraints, grants, indices ou backfill | [operacao.md](operacao.md) |
| Projetar RLS, Auth, Realtime, clients, views ou RPCs | [rls-e-auth.md](rls-e-auth.md) |
| Criar bucket ou operar upload/download e policies de arquivo | [storage.md](storage.md) |
| Provar policies, paginacao, erros, RPCs e Realtime | [testes.md](testes.md) |

Ler `rls-e-auth.md` junto de `operacao.md` quando DDL mudar acesso, function, view, grant ou
tabela exposta.

## Workflow obrigatorio

1. Confirmar `SUPABASE_PROJECT_REF`; nunca inferir alvo pelo nome da pasta ou URL lembrada.
2. Localizar models, services, frontend e subscriptions que consomem o objeto afetado.
3. Inventariar read-only colunas, constraints, indices, policies, grants e functions.
4. Escrever a matriz de acesso e o rollback logico antes do SQL.
5. Mostrar o contrato e pedir aprovacao explicita antes de escrita administrativa.
6. Aplicar atomicamente pela Management API; nao criar migration `.sql` neste template.
7. Repetir o inventario e comparar definicoes finais, nao apenas o HTTP 200.
8. Testar admin e anon+JWT separadamente; registrar somente evidencia sanitizada.

## Regras duras

- Nunca expor service role, secret key ou management token ao frontend, logs ou respostas.
- Nunca aceitar `user_id` do body; usar `req.user.id` no backend e `auth.uid()` nas policies.
- Nunca testar RLS com service role.
- Nunca alterar uma policy sem inventariar policies permissivas concorrentes.
- Nunca tratar erro Supabase como `[]`; colecao vazia exige `error === null`.
- Nunca supor que `.select()` retornou tudo; paginar leituras potencialmente grandes.
- Nunca criar `SECURITY DEFINER` por conveniencia; justificar, fixar `search_path`, qualificar
  objetos, validar caller e restringir grants.
- Nunca aplicar DDL sem alvo, estado atual, transacao, rollback e postconditions definidos.
- Manter a fundacao inicial estritamente em `users`; criar outra tabela somente por
  requisito real do briefing.

## Aprendizado reutilizavel

- Policies permissivas aplicaveis se combinam com OR; uma policy antiga ampla pode anular a nova.
- SELECT negado por RLS normalmente retorna `200` e `[]`; testar uma linha-alvo conhecida.
- Realtime Postgres Changes depende de SELECT/RLS para o JWT inscrito.
- Views podem atravessar a fronteira; preferir `security_invoker = true` quando devem obedecer ao
  chamador.
- Chaves publishable/secret podem substituir anon/service role no futuro; migrar apenas como
  mudanca de infraestrutura testada, nunca ad hoc.

## Fontes primarias

- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase: Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
