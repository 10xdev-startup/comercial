# Template 10xDev — Next.js + Express + Supabase

Instruções para quem está **usando este repositório como ponto de partida** de um
projeto novo. O `README.md` é o esqueleto do produto — preencha-o depois de seguir
os passos abaixo. Depois de configurado, apague este arquivo (ele não é sobre o
produto, é sobre o template).

## Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui (Radix) — `frontend/`
- **Backend**: Node.js, Express, TypeScript, Supabase (PostgreSQL) — `backend/`
- **Padrão backend**: Controller → Model → Database
- **API**: envelope wrapped (`{ success, data }` / `{ success: false, error }`) em toda resposta
- **Auth**: Supabase Auth (email + senha) — login, cadastro, gate de rotas (`proxy.ts`) e onboarding já prontos

Ver `.claude/CLAUDE.md` para as regras completas de código, testes, deploy e banco —
esse arquivo é o que os agentes (Claude Code) leem primeiro em cada sessão.

## 1. Do clone ao rodando local

Skill **`/novo-projeto`** cobre os quatro passos que toda instância nova precisa,
em sequência guiada:

1. Renomear o placeholder `"Meu Projeto"` / `meu-projeto` em todo lugar que ele
   aparece (título da página, fallback de UI, nome do pacote npm já em
   minúsculas, `.claude/CLAUDE.md`, `README.md`).
2. Configurar `backend/.env` e `frontend/.env` com as credenciais do seu projeto
   Supabase (Settings → API; o `SUPABASE_ACCESS_TOKEN` é o token de
   **management**, `sbp_...`, em Account → Access Tokens).
3. Criar a fundação do banco — tabela `public.users` (**obrigatória**, nada de
   rota de usuário ou login funciona sem ela) e decidir `mailer_autoconfirm`.
4. `npm install && npm run dev` e confirmar que subiu.

## 2. Rotas — o que já vem pronto

```
/                    landing publica (frontend/app/page.tsx), sem sidebar
/lp/<nome>           paginas de anuncio (frontend/app/(lps)/lp/), sem sidebar
/login, /cadastro    entrada (email + senha)
/seja-bem-vindo      onboarding pos-cadastro
/inicio              primeira pagina da area logada, com sidebar
/componentes         catalogo de componentes UI, com sidebar
```

Landing publica nunca entra em `(dashboard)`; item de sidebar só existe para rota
de `(dashboard)`. Detalhe em `.claude/CLAUDE.md` → "Rotas (frontend)".

## 3. Publicar

Skill `/deploy-azure` faz o setup guiado da infra (Container Registry + App
Service) e liga o auto-deploy via GitHub Actions. Depois do setup inicial, todo
push na `main` deploya sozinho. `/novo-projeto` aponta pra ela no final, não
tenta montar deploy sozinha.

## O que NÃO vem pronto (construa por cima)

- Roles por recurso (membership) — hoje só existe `role` global (`user`/`admin`)
- Testes de rota/sidebar (a suíte cobre `apiResponse`, `requireRole`, `apiErrors`,
  `button`, `authRedirect` — nada de página ou navegação ainda)
