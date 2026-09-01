# Setup do operador — 10xMídia (funil de clientes)

Este sistema sobe o CRM de **clientes**, um worker de jobs duráveis, o primeiro contato no Instagram via Playwright/CDP, o webhook oficial da Meta, o motor de conversa (OpenAI) e experimentos de uma variável. O envio live fica **bloqueado** até o operador ligar o flag. Não usa API privada, não forja fingerprint, não contorna bloqueio e não tem funil de afiliados.

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

`OPENAI_API_KEY`, `CHROME_CDP_URL` e tokens da Meta **podem ficar vazios**. O `npm run dev` sobe assim mesmo (CRM em memória se o service-role ainda for placeholder). Sem esses segredos: OpenAI usa heurística, Graph API vira stub, assinatura do webhook é aceita (stub) e o Instagram live continua desligado.

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
- Webhook Meta: `GET/POST http://localhost:3001/webhooks/instagram` (sem login)
- Worker: mesmo processo do Express, tabela `jobs`, sem Redis

Sem credenciais reais do Supabase, o CRM usa store em memória (some ao reiniciar). Com credenciais + schema aplicado, persiste no Postgres.

## 3.1 Comece sem o Chrome (iniciante)

Você **não** precisa ligar o Chrome agora. Depois de `npm run dev`:

1. Abra o CRM.
2. Clique em **Descobrir leads simulados** (cria perfis de exemplo a partir do ICP, sem abrir o Instagram).
3. Abra um lead e clique em **Enfileirar primeiro contato**.

O worker usa o fake CDP e **não** clica em Enviar. Quando for usar o Instagram de verdade, use o comando Linux da seção 7 e deixe `INSTAGRAM_LIVE_SEND=false` até ter certeza.

## 4. Pausa geral

No painel, **Pausar sistema** grava `system_state.paused`. O worker deixa de reivindicar jobs até retomar.

A pausa também dispara sozinha quando:

- o Instagram mostra checkpoint/restrição
- o Chrome CDP some (`browser_unavailable`)
- o gasto de OpenAI no mês atinge `OPENAI_MONTHLY_BUDGET_USD`
- há pico de erro, restrição ou opt-out (circuit breaker)

## 5. OpenAI (opcional)

1. Crie a chave em https://platform.openai.com/api-keys num **projeto separado**.
2. Permissão **Restricted** (só Chat Completions).
3. Em Settings → Limits, defina um hard limit mensal na OpenAI **e** copie o mesmo teto para `OPENAI_MONTHLY_BUDGET_USD` no `.env`.
4. Sem a chave, o motor interpreta com heurística e **não** chama a API. Os testes usam um mock.

Se a chave vazar: revogue em https://platform.openai.com/api-keys e rode com `WORKER_ENABLED=false` até trocar.

## 6. Webhook e Graph API oficiais (opcional)

Callback da Meta (app Instagram / Messenger):

```
https://SEU_DOMINIO/webhooks/instagram
```

| Variável | Uso |
|---|---|
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | Token do desafio `hub.verify_token`. Vazio = GET devolve o `hub.challenge` (stub de desenvolvimento). |
| `INSTAGRAM_APP_SECRET` | HMAC SHA-256 do body. Vazio = assinatura aceita e o log grava `webhook_signature_stub`. **Não use isso em produção.** |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Envio oficial depois da resposta. Vazio = `graph_send_stub` (grava na timeline, não chama a Graph). |

Depois que o webhook casa o lead, o **navegador não envia mais naquele fio**. Sem token oficial, a conversa continua em stub — não há fallback pelo Chrome.

## 7. Chrome do operador (primeiro contato)

Três modos:

1. **Padrão / CI (dry-run simulado)** — `CHROME_CDP_URL` vazio e `INSTAGRAM_LIVE_SEND` diferente de `true`. O job `send_first_dm` usa fake CDP + página simulada, grava a mensagem na timeline com prefixo `[dry-run]` e **não** fala com o Instagram. É o que os testes da VM usam.
2. **Dry-run no Chrome real** — só `CHROME_CDP_URL=http://127.0.0.1:9222`. O worker anexa via Playwright `connectOverCDP` ao Chrome já aberto e logado, abre o perfil público, preenche o composer e **recusa clicar Send**.
3. **Envio live** — os dois: `CHROME_CDP_URL` e `INSTAGRAM_LIVE_SEND=true`. Aí sim clica Send no composer público.

Chrome com depuração remota (modos 2 e 3). Use um **perfil dedicado** (`CHROME_PROFILE_DIR`), não o perfil pessoal. Chrome 136+ recusa debug no perfil padrão.

macOS:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$HOME/.chrome-comercial"
```

Linux:

```bash
google-chrome --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir="$HOME/.chrome-comercial"
```

Windows:

```bat
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir="%USERPROFILE%\.chrome-comercial"
```

Logue no Instagram **uma vez**, na mão, nesse perfil.

**Aviso:** a porta de debug dá controle total sobre a sessão logada. Mantenha em `127.0.0.1`, nunca `0.0.0.0`, nunca em máquina compartilhada. Esta VM de cloud **não** tem o Chrome do operador — o fake CDP é a evidência de CI.

Em `backend/.env` (nunca commite):

```
CHROME_CDP_URL=http://127.0.0.1:9222
INSTAGRAM_LIVE_SEND=false
```

Para live, troque o flag para `true`. Checkpoint, suspensão ou “unusual activity”: o job falha com `instagram_restriction`, o sistema pausa e **não** tenta contornar.

Desligar o live send: `INSTAGRAM_LIVE_SEND=false` (ou apague a linha). Sem a URL, volta ao fake CDP.

## 8. Experimentos

No CRM, experimentos aceitam **exatamente uma variante** além do controle. Não há declaração de vencedor antes de `sample_size`. Atribuição fica em `leads.experiment_id` / `experiment_variant`.

## 9. O que este sistema não faz

- Envio live de DM **sem** `INSTAGRAM_LIVE_SEND=true` e `CHROME_CDP_URL`
- Chamada real à Graph/OpenAI sem as chaves (fica em stub/heurística)
- Funil de afiliados (nenhuma coluna, estado ou tela)
- Fingerprint spoofing, stealth plugin, API privada do Instagram ou contorno de bloqueio
