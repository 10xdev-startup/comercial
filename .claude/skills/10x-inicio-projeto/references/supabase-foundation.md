# Handoff para Supabase

A skill `supabase` e a unica fonte de verdade para DDL, RLS, grants, Auth, Storage e testes
conectados. Nao duplicar SQL dentro da skill de inicio.

## Contexto que o bootstrap entrega

Antes de invocar `$supabase`, fornecer:

```text
Produto: <nome e slug>
Project ref confirmado: <sim/nao; nunca expor token>
Ownership: individual por user_id
Auth: <providers e email obrigatorio ou opcional>
Tabelas da fundacao: users
Operacoes por tabela: <select/insert/update/delete>
Delete policy: <cascade/restrict/soft delete>
Limites: <nome, slug, descricao, quantidade>
Consumidores: <models, services, browser/SSR>
Autorizacao para DDL: <sim/nao>
```

## Duas passagens

1. **Fundacao:** invocar `$supabase` com `fundacao.md`, validar com `rollback`, pedir aprovacao e
   aplicar somente se autorizado.
2. **Auditoria final:** depois do fluxo vertical, invocar `$supabase` novamente para inventariar
   o estado final e provar A→A, A↛B, anonimo negado e service role filtrada pelo id autenticado.

Se faltarem credenciais, gerar apenas o contrato e deixar a aplicacao conectada bloqueada. Nunca
simular que o banco foi aplicado ou que RLS foi testada.
