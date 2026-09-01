# Meu Projeto

> Descreva aqui em uma frase o que o produto faz.

## Visão Geral

- **Frontend**: Next.js 16 + React 19 (App Router) — `frontend/`
- **Backend**: Express 5 + TypeScript, padrão Controller → Model → Database — `backend/`
- **Banco**: Supabase (PostgreSQL)
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth (email + senha) — login, cadastro e onboarding prontos

> Gerado a partir de um template 10xDev. Setup completo (rename, env, banco,
> deploy) em [`TEMPLATE.md`](TEMPLATE.md) — apague esse arquivo depois de configurar.

## Quick Start

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# preencha os dois .env com as credenciais do seu projeto Supabase
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001/health

## Rotas

```
/                    landing publica
/lp/<nome>           paginas de anuncio
/login, /cadastro    entrada (email + senha)
/seja-bem-vindo      onboarding pos-cadastro
/inicio              area logada
/componentes         catalogo de componentes UI
```

## Comandos

| Comando | Onde | O que faz |
|---|---|---|
| `npm run dev` | raiz | frontend + backend juntos |
| `npm run build` | raiz | build dos dois workspaces |
| `npm run lint` | raiz | ESLint dos dois workspaces |
| `npm run typecheck` | `backend/`, `frontend/` | `tsc --noEmit` |
| `npm test -- <arquivo>` | `backend/`, `frontend/` | Jest (nunca a suíte inteira sem filtro — ver `.claude/CLAUDE.md`) |

## Documentação

Regras de código, contrato de API, autenticação, banco de dados e deploy estão em
[`.claude/CLAUDE.md`](.claude/CLAUDE.md) — é a referência que vale durante o
desenvolvimento, tanto para humanos quanto para agentes.
