# Manual do operador — sistema comercial Instagram

Este repositório usa o template 10xDev (Next.js em `frontend/`, Express em `backend/`, Supabase Postgres). Não é o stack SQLite/Drizzle do prompt original.

O Chrome real do operador **não existe** em container/cloud. A camada de navegador está implementada e testada contra páginas simuladas e um cliente CDP fake. O dry-run e o smoke test reais ficam para a sua máquina.

## 1. Configuração do negócio

```bash
cp config/business.example.json config/business.json
```

Preencha os placeholders. `config/business.json` está no `.gitignore` — nenhum dado real pode ir para o Git. O código lê esse arquivo (ou o example, se o json real ainda não existir).

A IA só pode afirmar o que está em `verifiedClaims`. Tudo em `unverifiedClaims` é bloqueado.

## 2. Ambiente

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Preencha Supabase como no [`TEMPLATE.md`](TEMPLATE.md). Chaves novas deste produto:

| Variável | Para quê |
|---|---|
| `OPENAI_API_KEY` | Redação/decisão. Sem ela o worker não chama a OpenAI. |
| `OPENAI_MODEL` / `OPENAI_MODEL_FAST` | Nomes exatos do modelo. Sem alias flutuante. |
| `OPENAI_MONTHLY_BUDGET_USD` | Teto; ao atingir, o sistema pausa. |
| `CHROME_CDP_URL` | `http://127.0.0.1:9222` — só na sua máquina. |
| `CHROME_PROFILE_DIR` | Perfil dedicado (`.chrome-profile/`). |
| `BROWSER_MODE` | `simulated` (padrão) · `dry-run` · `live` |
| `INSTAGRAM_APP_SECRET` | HMAC `X-Hub-Signature-256`. Sem secret, a verificação é só o esboço (aceita o POST). |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | Handshake GET do webhook Meta. |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` / `INSTAGRAM_BUSINESS_ACCOUNT_ID` | API oficial (ainda não envia sem token). |
| `MAX_DMS_PER_DAY` | Padrão 30. |
| `MIN/MAX_SECONDS_BETWEEN_DMS` | Intervalo entre DMs (90–240). |
| `OPERATING_HOURS` / `OPERATING_TIMEZONE` | Janela 09:00–20:00, `America/Sao_Paulo`. |
| `WORKER_ENABLED` | `false` sobe só o HTTP. |

### Chave OpenAI

1. [platform.openai.com/api-keys](https://platform.openai.com/api-keys) — projeto **separado**, permissão Restricted.
2. Settings → Billing: crédito.
3. Settings → Limits: hard limit mensal (ex. USD 50). Esse é o freio real.
4. Cole em `OPENAI_API_KEY`.

Se a chave vazar: revogue na dashboard e gere outra. Revogar resolve; reescrever o Git é secundário.

## 3. Banco (Supabase Postgres)

O template **não** versiona arquivos `.sql`. O DDL está em `backend/src/database/crmDdl.ts` (`CRM_DDL`). Aplique via Management API:

```bash
cd backend
source .env
REF=$(echo "$SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')
python3 -c "from pathlib import Path; import json,re; t=Path('src/database/crmDdl.ts').read_text(); m=re.search(r'export const CRM_DDL = \`([^\`]*)\`', t, re.S); print(json.dumps({'query': m.group(1)}))" > /tmp/crm-ddl.json
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/crm-ddl.json
```

Confirme em `information_schema.tables` as tabelas `leads`, `conversations`, `messages`, `campaigns`, `experiments`, `jobs`, `ai_usage`, `do_not_contact`, `system_state`.

Sem Supabase configurado o backend usa um **store em memória** (com leads de demonstração) para o painel e o worker subirem. Não use isso em produção.

Não há Redis. A fila é a tabela `jobs` (ou o store em memória).

## 4. Subir

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000 — landing, login, onboarding e `/crm`
- Backend: http://localhost:3001/health
- Webhook Meta: `GET/POST http://localhost:3001/webhooks/instagram`

Pausa geral: botão **Pausar sistema** no CRM, ou `POST /crm/pause` `{ "paused": true, "reason": "manual" }`.

## 5. Chrome real (só na sua máquina)

Perfil **dedicado**. Chrome 136+ recusa debug no perfil padrão.

**macOS**

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$PWD/.chrome-profile"
```

**Linux**

```bash
google-chrome --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir="$PWD/.chrome-profile"
```

**Windows (PowerShell)**

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --remote-debugging-address=127.0.0.1 `
  --user-data-dir="$PWD\.chrome-profile"
```

Nessa janela, entre no Instagram uma vez (2FA incluso). Teste:

```bash
curl -s http://127.0.0.1:9222/json/version
```

Dry-run (conecta, **não** clica em Enviar):

```bash
# backend/.env
BROWSER_MODE=dry-run
CHROME_CDP_URL=http://127.0.0.1:9222
```

Smoke test real: só depois da sua autorização explícita, `BROWSER_MODE=live`. O processo **nunca** abre um Chrome novo se o CDP falhar — registra `browser_unavailable`, pausa a fila e avisa no painel.

A porta de debug dá controle total sobre a sessão logada. Mantenha em `127.0.0.1`, nunca `0.0.0.0`, nunca em máquina compartilhada.

Este repositório **não** implementa API privada do Instagram, fingerprint spoofing nem contorno de bloqueio.

## 6. Backup

Com Supabase: use o backup do projeto (Dashboard → Database → Backups) ou `pg_dump` com a connection string. Restauração: restore point do Supabase ou `psql` no dump.

O store em memória some ao reiniciar o processo — não é backup.

## 7. O que este passo ainda não faz

- Chamadas reais à OpenAI (grava uso/orçamento; sem chave não dispara rede).
- Envio live pelo Chrome (fake CDP + documentação do dry-run).
- Resposta contínua pela Graph API (webhook casa o lead e trava o canal; envio oficial falta token).
- Descoberta autônoma de perfis e experimentos A/B medidos.
