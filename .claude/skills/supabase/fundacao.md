# Fundacao `users`

O ponto zero cria somente `public.users`, espelhando `auth.users`. Qualquer tabela de dominio
nasce depois, a partir dos recursos e invariantes confirmados no briefing.

## Contrato

- `users.id = auth.users.id` com exclusao em cascata.
- Email obrigatorio no default de autenticacao do template.
- Papel global, status, onboarding e timestamps.
- Trigger idempotente para criar a linha da aplicacao.
- RLS e grants para cada usuario acessar somente a propria linha.

Se o produto aceitar identidade sem email, parar e adaptar o contrato antes de aplicar; nunca
converter email ausente em string vazia.

## Validar sem persistir

Mostrar o SQL e executar primeiro mantendo o `rollback` final. Depois da validacao e da aprovacao
do usuario, trocar somente o `rollback` por `commit` e aplicar novamente no mesmo `project_ref`.

```sql
begin;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_not_blank check (btrim(email) <> ''),
  constraint users_email_length check (char_length(email) <= 320),
  constraint users_name_length check (name is null or char_length(name) <= 120),
  constraint users_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 2048)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

create or replace function public.guard_users_sensitive_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.role() in ('anon', 'authenticated') and (
    new.id is distinct from old.id or
    new.email is distinct from old.email or
    new.role is distinct from old.role or
    new.status is distinct from old.status or
    new.onboarded_at is distinct from old.onboarded_at or
    new.created_at is distinct from old.created_at
  ) then
    raise exception 'Alteracao de coluna sensivel nao permitida';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_users_sensitive_columns on public.users;
create trigger guard_users_sensitive_columns
before update on public.users
for each row execute function public.guard_users_sensitive_columns();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or btrim(new.email) = '' then
    raise exception 'Email obrigatorio para criar usuario da aplicacao';
  end if;

  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'first_name',
      pg_catalog.split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;

revoke all on table public.users from anon, authenticated;
grant select, update on table public.users to authenticated;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
for select to authenticated using ((select auth.uid()) = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.guard_users_sensitive_columns() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

notify pgrst, 'reload schema';

rollback;
```

## Postconditions

1. Confirmar `users` como unica tabela da fundacao.
2. Confirmar RLS, grants, constraints, triggers e functions pelas definicoes finais.
3. Testar usuario A lendo/editando A e sem acesso a B; repetir para B.
4. Testar anonimo sem JWT e o backend com service role buscando pelo `id` autenticado.
