---
name: novo-projeto
description: "Do clone ao 'npm run dev' funcionando: renomeia o placeholder do template, configura .env com credenciais do Supabase e cria a fundacao do banco (tabela users). Use quando o usuario pedir pra renomear o projeto, dar nome ao produto, ou comecar um projeto novo a partir deste template."
---

# Novo Projeto — do clone ao rodando local

Guiado, sem script por tras: as tarefas sao mecanicas mas cada arquivo cita o
placeholder ou pede a credencial de um jeito diferente — resolva cada uma no
contexto certo em vez de find-replace cego. Confirme com o usuario antes de
qualquer coisa que grava no banco (passo 3).

## 1. Nome do produto

Precisa de duas coisas — pergunte se nao vierem juntas no pedido:
- **Nome de exibicao** (ex: "10xGov", "Vote Melhor") — vai pra UI e docs.
- **Descricao de uma linha** do que o produto faz — vai pro `.claude/CLAUDE.md`
  (secao "Projeto") e pro `README.md`.

Derive o **slug npm** a partir do nome: tudo minusculo, espacos viram hifen,
remove acento e qualquer caractere que o npm rejeite. `npm` **rejeita
maiuscula** em `"name"` — essa normalizacao nao e opcional.

## 2. Renomear

Nao confie numa lista fixa de arquivos (podem ter mudado desde a ultima vez).
Rode:

```bash
grep -rln "Meu Projeto\|meu-projeto" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . \
  | grep -v node_modules | grep -v /.next/
```

**Ignore `TEMPLATE.md`** — cita o placeholder como exemplo de instrucao pra quem
usa o template, nao e um lugar pra renomear (e normalmente apagado no fim do
setup). Ignore tambem este proprio arquivo de skill.

Troque cada ocorrencia no contexto certo:

- **`package.json`** (raiz, e `backend/`/`frontend/` se quiser espelhar) —
  `"name"` recebe o **slug** (minusculo), nao o nome de exibicao.
- **`frontend/.env.example`** (e `frontend/.env` local, se ja existir) —
  `NEXT_PUBLIC_APP_NAME=` recebe o nome de exibicao. Isso e o que a UI realmente
  le em runtime.
- **`frontend/app/layout.tsx`** — `title` do `<Metadata>`.
- **`frontend/components/AppSidebar.tsx`**, **`frontend/app/page.tsx`**,
  **`frontend/app/(auth)/layout.tsx`** — os fallbacks
  `process.env['NEXT_PUBLIC_APP_NAME'] || 'Meu Projeto'`. So disparam se a env
  var faltar, mas troque mesmo assim (defesa em profundidade).
- **`.claude/CLAUDE.md`** — secao `## Projeto`: troca o titulo em negrito pelo
  nome e a linha "descreva aqui..." pela descricao de uma linha.
- **`README.md`** — titulo e "Visao Geral" com o nome e a descricao.

Alem do placeholder, preencha tambem **`.github/workflows/deploy.yml`** (bloco
`env:`) com os 7 valores derivados do **slug** — mesma convencao de nomes que a
skill `/deploy-azure` documenta (secao "Regra de nomes" e passo 11), nao
duplique a tabela aqui. Isso importa mesmo que o usuario ainda nao va publicar
hoje: o arquivo pode ja vir com valores **reais de outro projeto** (nao
`seu-...`) se este template foi clonado de uma instancia ja configurada — nesse
caso o guard do preflight (`grep -q 'seu-'`) nao aborta, e um push futuro na
`main` deployaria em cima da infra Azure errada em silencio. Resetar pro slug
novo agora fecha esse buraco de uma vez.

## 3. Configurar o ambiente e a fundacao do banco

Se `backend/.env` / `frontend/.env` ainda nao existirem:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Peca as credenciais do Supabase (Settings → API no dashboard do projeto, e
Account → Access Tokens pro token de management) e preencha os dois `.env`.
Sem isso os passos seguintes nao tem onde aplicar.

Com as credenciais em maos, siga `.claude/CLAUDE.md` → "Banco de dados (Supabase
PostgreSQL)" **exatamente como documentado la** (nao duplique o SQL/curl aqui —
se o padrao mudar, so tem uma fonte pra manter certa):
- Seção "Acesso ao banco" pro padrao de `curl` na Management API.
- Seção "Tabelas principais" pro DDL da `public.users` — **passo obrigatorio**,
  o backend nao funciona sem essa tabela existir.
- Confirme a criacao pelo estado real (`information_schema`), nunca so pelo
  HTTP 200 do curl.

Ligue `mailer_autoconfirm` por padrao (secao "Autenticacao" do CLAUDE.md) —
cadastro sem confirmar email. Funciona em dev **e em producao**; nao e uma
flag de "so pra teste". **Avise o usuario que fez essa escolha** e que ela so
precisa mudar **se** o produto exigir email verificado — nesse caso, configurar
SMTP antes de desligar a flag (senao o cadastro trava, ninguem recebe o email).

## 4. Rodar local

```bash
npm install                        # tambem resincroniza o lockfile com o "name" novo do passo 2
npm run dev
```

Confirme que subiu: `curl http://localhost:3001/health` (backend) e frontend em
`http://localhost:3000`. Rode tambem o smoke test de codigo:

```bash
npm run typecheck -w backend && npm run lint -w backend
npm run typecheck -w frontend && npm run lint -w frontend
```

## 5. Configurar alerta de erro via Telegram (opcional)

`reportError` (`backend/src/services/errorReporting.ts`, ver CLAUDE.md) já grava
em `error_logs` sem isso — este passo só liga o alerta em tempo real. **Pergunte
se o usuário quer configurar agora**; se não, pule e siga pro próximo passo.

Se quiser:

1. Fale com **@BotFather** no Telegram, `/newbot`, siga o fluxo — ele devolve o
   `TELEGRAM_SUPPORT_BOT_TOKEN` (formato `123456:ABC-...`).
2. Adicione o bot recém-criado num grupo (ou mande uma mensagem direto pra ele)
   e pegue o `TELEGRAM_SUPPORT_CHAT_ID`:
   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates" | grep -o '"chat":{"id":[0-9-]*'
   ```
   (grupo tem ID negativo, conversa direta é positivo — os dois funcionam.)
3. Escreva os dois em `backend/.env`.
4. Teste antes de dar como pronto:
   ```bash
   curl -s -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
     -d "chat_id=<CHAT_ID>" -d "text=teste do reportError"
   ```

## 6. Iniciar o grafo do graphify

Rode `/graphify backend/src frontend` (não `/graphify .` na raiz — isso puxa
`.claude/skills/gstack` inteiro pro grafo, que é código das skills, não do
produto, e vira ruído). Vale rodar mesmo cedo: o grafo cresce incremental depois
via `/graphify <path> --update`.

## 7. Próximos passos — outras skills

Quando o usuário quiser subir pra produção, aponte pra skill **`/deploy-azure`**
— ela cuida da infra (Container Registry + App Service) e liga o auto-deploy via
GitHub Actions. Não tente montar isso aqui; é o trabalho dela.

Se o produto tiver **billing por uso** (planos, meters, webhooks de cobrança),
aponte pra skill **`/stripe-setup`** — ela audita e alinha a configuração
Stripe entre ambientes. Só é relevante se o produto tiver billing; não force.

## 8. Resumir

Liste o que foi renomeado, quais `.env` foram preenchidos, se a fundação do
banco foi criada (e a decisão de `mailer_autoconfirm`), se o alerta do Telegram
foi configurado (ou pulado), e se o `dev` subiu limpo.
Não commite sem o usuário pedir (ver skill `/commit`).
