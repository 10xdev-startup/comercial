# Licoes da 10xVagas

Estas licoes vieram de correcoes reais, nao de preferencia estetica.

## O que truncou o processo

- O produto mudou de ApplyKey para 10xJobs e 10xVagas enquanto codigo e UI ja existiam.
- Requisitos chegaram em camadas: visual, rotas, auth, banco, jobs, billing e IA. Sem um
  briefing congelado por fase, cada camada reabriu decisoes anteriores.
- O dashboard nasceu antes do mapa de recursos; botoes e conteudos convergiram para uma
  tela grande e generica.
- Schema e RPCs foram aplicados por trechos avulsos. Faltou um contrato de ownership,
  constraints, grants e auditoria desde a primeira tabela.
- Ambientes Supabase de produtos diferentes e uma conta Stripe compartilhada aumentaram o
  risco de consultar ou mutar o produto errado.
- Branches/PRs vizinhos tocaram auth, slug, perfil e billing ao mesmo tempo.
- O template prometia comportamentos que o codigo ainda nao materializava.
- Validacao visual veio tarde, depois de muito codigo cenografico.

## Correcoes que viraram gates

| Commit 10xVagas/template | Aprendizado |
|---|---|
| `e139d5c` | Supabase precisa inicializacao lazy; `/health` deve subir mesmo sem banco pronto. |
| `dd4bd64`, `e988331` | Workspaces exigem uma estrategia unica de dependencias/lockfile. |
| `f355030`, `f0af35d` | Estado persistido e Radix exigem hidratacao deterministica no React 19. |
| `bed6218`, `bbc13c6` | Allowlist e CORS nao podem ficar como regra acidental do template. |
| `a83be8c` | Landing publica e workspace autenticado sao superficies diferentes. |
| `e79f9da`, `cda1355` | Dominio pertence ao backend; frontend nao le snapshot local como banco. |
| `c986976` | Ordenacao e paginacao precisam de contrato global, nao remendo visual. |
| `b3da1f6`, `3d60152` | Checkout, grants e meters exigem idempotencia persistida. |
| `af29813` | Limites, headers, payload e erros devem nascer com a API. |
| `a7f46cc` | Job longo precisa lease/heartbeat e recuperacao, nao apenas status `running`. |
| `d754268` | RLS, grants, constraints, triggers e ownership precisam de auditoria reproduzivel. |
| `fde5238` | OAuth precisa callback, redirect seguro e cookies testados como um fluxo. |

## Regra de uso

Nao copiar codigo ou dominio da 10xVagas. Usar os commits para perguntar: “qual gate teria
impedido esse retrabalho no primeiro dia?” e incorporar esse gate no bootstrap.
