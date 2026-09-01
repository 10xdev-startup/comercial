# Setup do operador — 10xMídia (funil de clientes)

Este slice sobe o CRM de **clientes**, um worker de jobs duráveis e o primeiro contato no Instagram via Playwright/CDP. O envio live fica **bloqueado** até o operador ligar o flag. Não usa API privada, não forja fingerprint, não contorna bloqueio e não tem funil de afiliados.

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

## 5. Chrome do operador (primeiro contato)

Três modos:

1. **Padrão / CI (dry-run simulado)** — `CHROME_CDP_URL` vazio e `INSTAGRAM_LIVE_SEND` diferente de `true`. O job `send_first_dm` usa fake CDP + página simulada, grava a mensagem na timeline com prefixo `[dry-run]` e **não** fala com o Instagram. É o que os testes da VM usam.
2. **Dry-run no Chrome real** — só `CHROME_CDP_URL=http://127.0.0.1:9222`. O worker anexa via Playwright `connectOverCDP` ao Chrome já aberto e logado, abre o perfil público, preenche o composer e **recusa clicar Send**.
3. **Envio live** — os dois: `CHROME_CDP_URL` e `INSTAGRAM_LIVE_SEND=true`. Aí sim clica Send no composer público.

Chrome com depuração remota (modos 2 e 3):

```bash
google-chrome --remote-debugging-port=9222
```

Em `backend/.env` (nunca commite):

```
CHROME_CDP_URL=http://127.0.0.1:9222
INSTAGRAM_LIVE_SEND=false
```

Para live, troque o flag para `true`. Checkpoint, suspensão ou “unusual activity”: o job falha com `instagram_restriction` e **não** tenta contornar.

Desligar o live send: `INSTAGRAM_LIVE_SEND=false` (ou apague a linha). Sem a URL, volta ao fake CDP.

## 6. O que este slice não faz

- Envio live de DM **sem** `INSTAGRAM_LIVE_SEND=true` e `CHROME_CDP_URL`
- Webhook / Graph API do Instagram
- Chamadas OpenAI
- Funil de afiliados (nenhuma coluna, estado ou tela)
- Fingerprint spoofing, stealth plugin ou contorno de bloqueio

Se a chave OpenAI vazar: revogue em https://platform.openai.com/api-keys e rode com `WORKER_ENABLED=false` até trocar.
