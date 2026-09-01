# Meu Projeto

Sistema comercial autônomo no Instagram (prospecção → CRM → worker), no stack 10xDev.

## Visão Geral

- **Frontend**: Next.js 16 + React 19 (App Router) — `frontend/`
- **Backend**: Express 5 + TypeScript, padrão Controller → Model → Database — `backend/`
- **Banco**: Supabase (PostgreSQL). Sem SQLite, sem Redis — jobs duráveis na tabela `jobs`.
- **UI**: Radix UI + Tailwind CSS + shadcn/ui (interface em PT-BR)
- **Auth**: Supabase Auth (email + senha) — login, cadastro e onboarding prontos

O operador preenche `config/business.json` (veja `config/business.example.json`). Setup do Chrome CDP, OpenAI e webhook Meta: [`SETUP.md`](SETUP.md).

> Gerado a partir de um template 10xDev. Setup completo (rename, env, banco,
> deploy) em [`TEMPLATE.md`](TEMPLATE.md) — apague esse arquivo depois de configurar.

## Quick Start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp config/business.example.json config/business.json
# preencha os dois .env com as credenciais do seu projeto Supabase
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001/health
- **CRM** (área logada): http://localhost:3000/crm

Sem credenciais de Supabase/OpenAI/Chrome o app ainda sobe: o backend usa store em memória + cliente CDP simulado. Não envie DMs reais nesse modo.

## Rotas

```
/                    landing publica
/lp/<nome>           paginas de anuncio
/login, /cadastro    entrada (email + senha)
/seja-bem-vindo      onboarding pos-cadastro
/inicio              area logada
/crm                 kanban, pausa, custos de IA
/crm/leads/:id       ficha do lead e timeline
/componentes         catalogo de componentes UI
```

## Comandos

| Comando | Onde | O que faz |
|---|---|---|
| `npm run dev` | raiz | frontend + backend + worker de jobs |
| `npm run build` | raiz | build dos dois workspaces |
| `npm run lint` | raiz | ESLint dos dois workspaces |
| `npm run typecheck` | `backend/`, `frontend/` | `tsc --noEmit` |
| `npm test -- <arquivo>` | `backend/`, `frontend/` | Jest (nunca a suíte inteira sem filtro — ver `.claude/CLAUDE.md`) |

## Documentação

Regras de código, contrato de API, autenticação, banco de dados e deploy estão em
[`.claude/CLAUDE.md`](.claude/CLAUDE.md) — é a referência que vale durante o
desenvolvimento, tanto para humanos quanto para agentes.

Manual do operador (Chrome, OpenAI, DDL, pausa): [`SETUP.md`](SETUP.md).
