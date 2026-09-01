# Roteiro de 30 minutos

O tempo mede o caminho feliz de um template e contas ja existentes. Criacao de conta,
DNS, aprovacao OAuth ou propagacao Azure nao contam como trabalho instantaneo.

## 0–5 min — Decidir

- **Primeiro comando, antes de qualquer pergunta:** `ls backend/.env frontend/.env.local`.
  Sem esses arquivos o relogio nao vale — nao ha banco, auth, smoke nem deploy. Dizer isso
  antes de combinar prazo, nao no minuto 25.
- Entrevista curta e sintese do produto.
- Escolher primeiro fluxo vertical e nao-objetivos.
- Mapear recursos/rotas e ownership.
- Confirmar nomes de repositorio, Supabase e Azure.

Gate: nenhuma decisao material pendente escondida.

## 5–10 min — Preparar

- Rebatizar packages, app, README, env examples e deploy.
- `npm ci` usando o lockfile raiz do template.
- Copiar envs locais sem versionar segredo.
- Executar `validate-project.mjs --mode template`.

Gate: backend e frontend iniciam simultaneamente.

## 10–17 min — Fundacao

- Mostrar schema e policies.
- Invocar `$supabase`; validar DDL com rollback e aplicar somente apos aprovacao.
- Configurar redirect OAuth local.
- Validar `frontend/proxy.ts`, callback e `/users/me`.

Gate: usuario autentica e ve somente o proprio registro.

## 17–25 min — Primeiro valor

- Implementar uma entidade completa do banco a tela.
- Criar rota propria e item de navegacao.
- Cobrir estados vazio/loading/erro/sucesso.
- Aplicar identidade visual minima por tokens.

Gate: uma acao real persiste e reaparece apos refresh.

## 25–30 min — Verificar e publicar

- Validador em modo project, testes focados, typecheck e lint.
- Build dos dois workspaces e verificacao dos Dockerfiles/workflow.
- Smoke local de auth, CRUD e ownership.
- Invocar `$supabase` em auditoria final e provar isolamento pelas duas fronteiras.
- Revisar diff por segredo/placeholder.
- Apresentar o checklist completo; qualquer falha bloqueia publicacao.
- Perguntar se o usuario quer deploy e explicar que os envs serao lidos sem mostrar valores.
- Invocar `deploy-azure`; mostrar alvo e pedir novo OK antes de mutar pela Azure CLI.
- Se o usuario nao quiser deploy, encerrar com o fluxo local pronto e os proximos passos.

Gate: URLs, health/readiness e rollback conhecido.

## O que nao cabe silenciosamente

Billing, IA, upload, filas, Playwright, multi-tenant e integrações frágeis ganham fase propria.
Podem ser preparados em 30 minutos, mas nao declarados production-ready sem seus testes.
