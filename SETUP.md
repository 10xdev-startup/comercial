# Setup do operador — 10xMídia (funil de clientes)

Este slice sobe o CRM de **clientes** e um worker de jobs duráveis. Não envia DM no Instagram, não usa API privada, não forja fingerprint e não tem funil de afiliados.

## 1. Configuração local

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp config/business.example.json config/business.json
```

Preencha em `backend/.env` (nunca commite):

| Variável | Onde achar |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → `service_role` |
| `SUPABASE_ANON_KEY` | Project Settings → API Keys → `anon` |
| `SUPABASE_ACCESS_TOKEN` | Conta → Access Tokens (`sbp_...`) — só para aplicar o schema |
| `SUPABASE_URL` / `SUPABASE_PROJECT_REF` | Já apontam para `scyreebjlbhaeovpskqs` no `.env.example` |

No frontend, `NEXT_PUBLIC_SUPABASE_ANON_KEY` é o mesmo valor de `SUPABASE_ANON_KEY`.

`OPENAI_API_KEY`, `CHROME_CDP_URL` e tokens da Meta **podem ficar vazios**. O `npm run dev` sobe assim mesmo (CRM em memória se o service-role ainda for placeholder).

## 2. Schema Postgres

O SQL está em `backend/src/database/crm-schema.sql` (não é pasta `migrations/`). Aplicar pela Management API:

```bash
npm run apply:crm-schema
```

Ou, a partir de `backend/`, o fluxo documentado no `.claude/CLAUDE.md`:

```bash
source .env
REF=$(echo "$SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')
python3 -c "import json; print(json.dumps({'query': open('../backend/src/database/crm-schema.sql').read()}))" > /tmp/crm-schema.json
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/crm-schema.json
```

Tabelas: `leads`, `conversations`, `messages`, `campaigns`, `jobs`, `experiments`, `ai_usage`, `do_not_contact`, `system_state`. `pipeline_state` e `channel_state` são colunas separadas. Só estados de cliente.

## 3. Subir

```bash
npm run dev
```

- Frontend: http://localhost:3000
- CRM (área logada): http://localhost:3000/crm
- Backend: http://localhost:3001/health
- Worker: mesmo processo do Express, tabela `jobs`, sem Redis

Sem credenciais reais do Supabase, o CRM usa store em memória (some ao reiniciar). Com credenciais + schema aplicado, persiste no Postgres.

## 4. Pausa geral

No painel, **Pausar sistema** grava `system_state.paused`. O worker deixa de reivindicar jobs até retomar.

## 5. O que este slice não faz

- Envio live de DM no Chrome do operador
- Webhook / Graph API do Instagram
- Chamadas OpenAI
- Funil de afiliados (nenhuma coluna, estado ou tela)

Se a chave OpenAI vazar: revogue em https://platform.openai.com/api-keys e rode com `WORKER_ENABLED=false` até trocar.
