# Storage

Ler para bucket, upload, download, signed URL, public URL ou policy em `storage.objects`.

## Default

Escolher bucket privado. Bucket publico torna leitura acessivel a qualquer pessoa com a URL,
independentemente de SELECT policy.

Usar path controlado pelo servidor:

```text
<user_id>/<object_id>-<safe-name>
```

Nao confiar em nome, MIME, extensao ou path enviados pelo navegador. Definir limite de tamanho,
MIME permitido, normalizacao e isolamento antes de criar o bucket.

## Regras

- Restringir policies por `bucket_id` e primeiro segmento igual a `auth.uid()`.
- Para upload novo, INSERT basta; upsert tambem exige SELECT e UPDATE.
- `owner_id` nao concede acesso sozinho e pode estar vazio em upload administrativo.
- Servir privado por download autenticado ou signed URL curta.
- Operar move/copy/delete pela Storage API, nunca por DELETE SQL em `storage.objects`.
- Nao alterar o schema `storage`; adicionar indice apenas depois de medir.

## Preflight

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = '<bucket>';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename in ('buckets', 'objects')
order by tablename, policyname;
```

Exemplo conceitual de leitura owner-scoped:

```sql
create policy objects_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = '<bucket>'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
```

Adaptar a todas as operacoes reais e testar usuario A, usuario B, JWT ausente, overwrite,
move/copy/delete e expiracao de signed URL. Remover fixtures pela Storage API.
