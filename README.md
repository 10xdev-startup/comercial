# 10xMídia — comercial

CRM de clientes da 10xMídia: conectar fontes de anúncio, unificar o período e entregar análise revisada. Este repositório começa pelo funil de **clientes** (sem afiliados).

## Visão Geral

- **Frontend**: Next.js 16 + React 19 (App Router) — `frontend/`
- **Backend**: Express 5 + TypeScript, padrão Controller → Model → Database — `backend/`
- **Banco**: Supabase (PostgreSQL)
- **UI**: Radix UI + Tailwind CSS + shadcn/ui (PT-BR)
- **Auth**: Supabase Auth (email + senha)
- **Jobs**: tabela `jobs` + worker no mesmo processo (sem Redis)

Setup do operador, schema e pausa geral: [`SETUP.md`](SETUP.md).

## Quick Start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# preencha as chaves do Supabase (URL já aponta para o projeto do operador)
npm run dev
```

- **Frontend**: http://localhost:3000
- **CRM**: http://localhost:3000/crm
- **Backend**: http://localhost:3001/health

O app sobe sem OpenAI, Chrome CDP ou tokens da Meta.

## Rotas

```
/                    landing publica
/lp/<nome>           paginas de anuncio
/login, /cadastro    entrada (email + senha)
/seja-bem-vindo      onboarding pos-cadastro
/inicio              area logada
/crm                 kanban do funil de clientes
/crm/leads/<id>      ficha + timeline
```

## Comandos

| Comando | Onde | O que faz |
|---|---|---|
| `npm run dev` | raiz | frontend + backend + worker |
| `npm run apply:crm-schema` | raiz | aplica `backend/src/database/crm-schema.sql` via Management API |
| `npm run build` | raiz | build dos dois workspaces |
| `npm run lint` | raiz | ESLint dos dois workspaces |
| `npm run typecheck` | `backend/`, `frontend/` | `tsc --noEmit` |
| `npm test -- <arquivo>` | `backend/`, `frontend/` | Jest (nunca a suíte inteira sem filtro — ver `.claude/CLAUDE.md`) |

## Documentação

Regras de código, contrato de API, autenticação, banco de dados e deploy estão em
[`.claude/CLAUDE.md`](.claude/CLAUDE.md).
