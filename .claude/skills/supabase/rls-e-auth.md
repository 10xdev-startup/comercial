# RLS, Auth, Realtime e clients

Ler sempre que a tarefa tocar policy, papel, browser, Auth, Realtime, view ou RPC.

## Modelo mental

```text
browser: anon/publishable key + JWT
   ├── PostgREST ─────────────► grants + RLS
   └── Realtime ──────────────► SELECT + RLS por subscriber

backend: secret/service role
   └── bypass RLS ────────────► middleware + ownership no Model

Management API
   └── DDL administrativo ────► preflight + transacao + postconditions
```

## Ownership do ponto zero

O template usa ownership direto:

- `users.id = auth.uid()`;
- toda tabela privada de dominio criada depois recebe `user_id`.

Exemplo para uma tabela privada de dominio:

```sql
create policy records_select_own
on public.<records>
for select
to authenticated
using (<records>.user_id = (select auth.uid()));
```

Indexar `<records>(user_id)` quando o acesso usar esse filtro. Para INSERT/UPDATE, usar
`WITH CHECK` equivalente; para UPDATE, combinar `USING` e `WITH CHECK`.

## Desenhar policies

1. Declarar matriz SELECT/INSERT/UPDATE/DELETE.
2. Direcionar acesso privado a `authenticated`.
3. Usar `(select auth.uid())`, `USING` para estado atual e `WITH CHECK` para estado novo.
4. Preferir allowlist positiva para papeis globais.
5. Inventariar todas as policies; policies permissivas se combinam com OR.
6. Criar indices para colunas usadas em ownership e subqueries.

## Backend privilegiado

Service role ignora RLS. Antes de toda query privada, middleware/controller deve autenticar e o
Model deve filtrar `.eq('user_id', userId)` ou comprovar ownership do projeto. Nunca anexar cookie
ou sessao de usuario ao client admin.

## Realtime

- Policy SELECT tambem define a fronteira de Postgres Changes.
- Filtro do channel reduz eventos, mas nao concede acesso.
- Validar publicacao, payload e comportamento com JWT permitido e negado.
- Reaplicar JWT ou reconectar depois de mudar auth/policy.
- Nao ampliar SELECT apenas para viabilizar evento; considerar Broadcast privado pelo backend.

## Functions

Preferir `SECURITY INVOKER`. Usar `SECURITY DEFINER` somente para operacao atomica que realmente
precise do privilegio do owner.

Checklist obrigatorio para definer:

- `set search_path = ''`;
- nomes de schema qualificados;
- `auth.uid()` e argumentos validados dentro da function;
- owner e grants de `public`, `anon`, `authenticated` e `service_role` inventariados;
- grants amplos revogados;
- retorno minimo e concorrencia/replay testados.

## Views e chaves

Views criadas por papel privilegiado podem atravessar RLS. Quando devem obedecer ao chamador e o
PostgreSQL suportar, usar `with (security_invoker = true)`; caso contrario, revogar browser ou
manter fora do schema exposto.

- Frontend: anon/publishable, publica apenas com RLS correta.
- Backend: service role/secret, nunca expor.
- Management: token `sbp_...`, apenas administracao.
