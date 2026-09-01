# Operacao, schema e Management API

Ler para inspecao direta, DDL, constraints, indices, grants, backfills ou schema cache.

## Credenciais e endpoint

Usar `SUPABASE_PROJECT_REF` e `SUPABASE_ACCESS_TOKEN` de `backend/.env`. Carregar sem imprimir.
Nao usar `curl -v`, tracing de shell nem output de headers.

```text
POST https://api.supabase.com/v1/projects/<project-ref>/database/query
Authorization: Bearer <management-token>
Content-Type: application/json
{"query":"<SQL>"}
```

## Sequencia segura

1. Confirmar o `project_ref`; nao inferir pelo diretorio.
2. Inventariar somente definicoes, nunca dados pessoais.
3. Comparar consumidores do objeto antes de alterar contrato.
4. Tornar SQL idempotente apenas quando isso nao esconder drift.
5. Encapsular mudancas relacionadas em uma transacao.
6. Incluir `notify pgrst, 'reload schema';` ao mudar objetos expostos.
7. Repetir o inventario e provar invariantes depois da escrita.

Se um objeto com o mesmo nome tiver definicao diferente, parar e comparar; `if exists` nao e
permissao para substituir silenciosamente.

## Inventario minimo

```sql
select table_schema, table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = '<table>'
order by ordinal_position;

select c.conname, c.contype, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and t.relname = '<table>';

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = '<table>';

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = '<table>'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = '<table>'
order by grantee, privilege_type;
```

Para functions, inventariar definicao, owner, `prosecdef`, `proconfig`, argumentos e grants:

```sql
select n.nspname as schema_name,
       p.proname,
       p.prosecdef as security_definer,
       p.proconfig,
       pg_get_userbyid(p.proowner) as owner,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = '<function>';

select routine_schema, routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public' and routine_name = '<function>';
```

## DDL e backfill

- Contar nulos antes de `not null` e duplicatas antes de unique.
- Inventariar valores antes de mudar check/enum.
- Estimar linhas e locks antes de backfill; usar lotes retomaveis quando grande.
- Qualificar FKs e decidir `cascade`, `restrict` ou soft delete conscientemente.
- Definir limite de tamanho, quantidade e estado no contrato, nao apenas na UI.
- Validar `pg_get_constraintdef`, policies, grants e contagens depois da aplicacao.

## Paginacao PostgREST

Nao assumir que o limite do projeto e o default. Consultar a configuracao e paginar toda leitura
potencialmente maior, com ordenacao deterministica:

```ts
const PAGE_SIZE = 1000
for (let from = 0; ; from += PAGE_SIZE) {
  const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
  if (error) throw error
  rows.push(...(data ?? []))
  if (!data || data.length < PAGE_SIZE) break
}
```

Usar RPC para agregacao pesada em vez de transportar todas as linhas.

## Erros

Preservar `message`, `code`, `details`, `hint` e status quando atravessarem a camada de banco.
Nunca converter erro em lista vazia ou sucesso parcial.
