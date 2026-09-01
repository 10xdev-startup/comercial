---
name: stripe-setup
description: "Auditar, alinhar e replicar a configuracao Stripe (pricing plan, rate card, meters e webhooks) de billing por uso entre ambientes. Use quando precisar validar se o ambiente esta correto, migrar para outra conta, ou diagnosticar custo zerado/pendente infinito/eventos faltando."
---

# Stripe Setup

Playbook generico para padronizar um ambiente Stripe de **billing por uso** (usage-based)
e replica-lo em outra conta/projeto sem comandos ad-hoc. O modelo assumido: o backend e
espelho dos dados financeiros da Stripe — o custo final por chamada vem dos creditos
aplicados na Stripe, nao de calculo local.

> **Template:** preencha os placeholders (`<...>`, `SEU_BACKEND`, env vars) com os valores
> do seu projeto. Nao commite IDs de conta livemode, URLs internas ou tabela de precos real
> em repositorio publico — mantenha isso em `.env` / docs privadas.

## Quando usar

- Configurar uma nova conta Stripe igual a um ambiente existente.
- Validar pricing plan, rate card, meters e webhooks antes de liberar.
- Diagnosticar custo zerado, custo pendente infinito ou eventos faltando.

## Pre-requisitos

- `STRIPE_SECRET_KEY` carregada no shell (`source backend/.env` ou `export STRIPE_SECRET_KEY=sk_...`).
- `curl` e `jq` disponiveis.
- Permissao da chave para `/v1/billing/meters`, `/v1/webhook_endpoints`, `/v2/billing/*`, `/v2/core/event_destinations`.

**Versoes da API (ajuste para a sua):**
- v1 → `Stripe-Version: <YYYY-MM-DD.codinome>`
- v2 → `Stripe-Version: <YYYY-MM-DD.preview>`

**Nunca** ecoe `STRIPE_SECRET_KEY` ou `whsec_...` em logs/output.

## Variaveis obrigatorias do backend

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_THIN_WEBHOOK_SECRET
STRIPE_PRICING_PLAN_ID
STRIPE_RATE_CARD_ID
STRIPE_CREDITS_PACK_LOOKUP_KEYS    # CSV de lookup keys (ex: credits_pack_brl_10,...)
```

Se os `event_name` dos meters forem chumbados no codigo (em vez de virem de env var),
documente isso: mudar nome de meter = mudar codigo + deploy.

## Snapshot do ambiente (preencha o seu)

Mantenha, **fora do repositorio publico**, um snapshot concreto da conta livemode com os
IDs reais — ele complementa este playbook generico. Registre pelo menos:

- **Rate card**: `rcd_...` (live_version, nº de rates, meter associado)
- **Webhook v1**: `we_...` + URL (`https://SEU_BACKEND/api/billing/webhook`)
- **Thin destination** (erros de meter): `ed_...` + URL
- **Pricing plan**: `bpp_...` (+ cadences `bc_...` se houver)
- **Meters ativos**: tabela `event_name → mtr_... → dimensões`
- **Infra**: onde as env vars sao setadas (ex: provider de hospedagem)
- **Conta compartilhada?** Se a mesma conta Stripe serve mais de um produto, anote os
  endpoints de cada um (ver gotcha de multi-tenant abaixo).

### Modelo de billing assumido (usage-based + customer balance)

Compra avulsa de creditos (top-up 1:1) → Customer Balance → uso de IA debita o saldo via
`createBalanceTransaction` com precos do rate card. Sem subscription, sem invoice mensal.

- **Top-up**: customer paga `R$X` → ganha `R$X` de saldo no Customer Balance
- **Uso**: `calculateTokenCost(rates, model, tokens)` → `stripe.customers.createBalanceTransaction({amount, currency})`
- **Markup**: configurado via env (ex: `STRIPE_USAGE_MARKUP`, `USD_BRL_RATE`) — nao hardcode a margem real aqui
- **Meter** (`<seu_meter_de_tokens>`): usado para audit/observabilidade; a cobranca em si e via `createBalanceTransaction`
- **Pricing plan + cadences**: podem existir mas ficar **inertes** se nao houver cobranca via invoice (decorativos)

### Meters (exemplo de estrutura — substitua pelos seus)

| event_name | id | dimensões |
|---|---|---|
| `<seu_meter_de_tokens>` | `mtr_...` | model, token_type |
| `<feature_a>` | `mtr_...` | — |
| `<feature_b>` | `mtr_...` | — |

**Meters inativos:** liste-os para nao reativar nem chumbar no codigo por engano
(encarnacoes antigas substituidas costumam ficar penduradas no dashboard).

### Modelos no rate card (exemplo — ajuste preco/moeda/modelos)

Pricing por 1M tokens. Defina markup e câmbio via env, nao fixe a tabela real em repo publico.

| Modelo (rate card) | Provider name (catalogo) | input | output | endpoint do gateway |
|---|---|---|---|---|
| `<modelo-1>` | `<Vendor Modelo 1>` | `<preco_in>` | `<preco_out>` | `/v1/messages` |
| `<modelo-2>` | `<Vendor Modelo 2>` | `<preco_in>` | `<preco_out>` | `/chat/completions` |
| `<modelo-3>` | `<Vendor Modelo 3>` | `<preco_in>` | `<preco_out>` | `/responses` ⚠️ reasoning |

**Regra critica:** o nome no rate card deve bater com o nome do modelo derivado do seu
catalogo de providers (ex: `stripVendorPrefix(provider.model)`). Mismatch silencioso faz o
modelo sumir do endpoint que lista modelos disponiveis.

---

## Fluxo recomendado

1. Auditoria geral → 2. Alinhar webhook principal → 3. Validar meters → 4. Publicar rate card → 5. Rodar testes de aceitacao.

---

## 1) Auditoria geral

Coleta o snapshot de webhooks, event destinations, meters ativos, pricing plan, rate card e price de top-up.

```bash
SK="$STRIPE_SECRET_KEY"
V1='Stripe-Version: <YYYY-MM-DD.codinome>'
V2='Stripe-Version: <YYYY-MM-DD.preview>'

# Webhooks v1
curl -s https://api.stripe.com/v1/webhook_endpoints?limit=100 \
  -u "$SK:" -H "$V1" | jq '.data[] | {id, url, status, enabled_events}'

# Event destinations v2 (thin)
curl -s "https://api.stripe.com/v2/core/event_destinations?include[0]=webhook_endpoint.url&limit=100" \
  -u "$SK:" -H "$V2" | jq '.data[] | {id, name, status, event_payload, enabled_events, url: .webhook_endpoint.url}'

# Meters ativos
curl -s "https://api.stripe.com/v1/billing/meters?limit=100" \
  -u "$SK:" -H "$V1" | jq '[.data[] | select(.status=="active") | {id, event_name, display_name, dims: .dimension_payload_keys}]'

# Pricing plan
curl -s "https://api.stripe.com/v2/billing/pricing_plans/$STRIPE_PRICING_PLAN_ID" \
  -u "$SK:" -H "$V2" | jq '{id, active, currency, tax_behavior, live_version, latest_version}'

# Rate card + total de rates
curl -s "https://api.stripe.com/v2/billing/rate_cards/$STRIPE_RATE_CARD_ID" \
  -u "$SK:" -H "$V2" | jq '{id, active, live_version, latest_version}'
curl -s "https://api.stripe.com/v2/billing/rate_cards/$STRIPE_RATE_CARD_ID/rates?limit=100" \
  -u "$SK:" -H "$V2" | jq '.data | length'

# Price de top-up
curl -s "https://api.stripe.com/v1/prices?lookup_keys[0]=$STRIPE_PRICE_CREDITS_PACK_LOOKUP_KEY&limit=1" \
  -u "$SK:" -H "$V1" | jq '.data[] | {id, lookup_key, unit_amount, currency, active}'
```

**Sinais de problema:**
- `live_version != latest_version` no pricing plan ou rate card → publicar (passo 4).
- Meter ativo ausente ou duplicado para algum `event_name` esperado.
- Webhook em `/api/billing/webhook` sem um dos 3 eventos minimos (passo 2).
- Meter de tokens sem `model` ou `token_type` em `dimension_payload_keys`.

---

## 2) Webhook principal (snapshot v1)

Endpoint backend: `/api/billing/webhook`. Eventos minimos:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `billing.credit_balance_transaction.created`

**Procurar endpoint existente:**
```bash
URL='https://SEU_BACKEND/api/billing/webhook'
EXISTING=$(curl -s https://api.stripe.com/v1/webhook_endpoints?limit=100 \
  -u "$SK:" -H "$V1" | jq -r --arg u "$URL" '.data[] | select(.url==$u) | .id')
echo "endpoint id: ${EXISTING:-<nao existe>}"
```

**Criar (se nao existir):**
```bash
curl -s https://api.stripe.com/v1/webhook_endpoints -u "$SK:" -H "$V1" \
  -d url="$URL" \
  -d 'enabled_events[]=checkout.session.completed' \
  -d 'enabled_events[]=payment_intent.succeeded' \
  -d 'enabled_events[]=billing.credit_balance_transaction.created' \
  | jq '{id, url, enabled_events}'
# Salvar `secret` retornado em STRIPE_WEBHOOK_SECRET (whsec_...)
```

**Atualizar eventos (se existir):**
```bash
curl -s "https://api.stripe.com/v1/webhook_endpoints/$EXISTING" -u "$SK:" -H "$V1" \
  -d 'enabled_events[]=checkout.session.completed' \
  -d 'enabled_events[]=payment_intent.succeeded' \
  -d 'enabled_events[]=billing.credit_balance_transaction.created' \
  | jq '{id, enabled_events}'
```

## 2b) Webhook thin destination (erros de meter)

Endpoint backend: `/api/billing/meter-errors/webhook`. Payload `thin`. Eventos:

- `v1.billing.meter.error_report_triggered`
- `v1.billing.meter.no_meter_found`

```bash
curl -s https://api.stripe.com/v2/core/event_destinations -u "$SK:" -H "$V2" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "meter-errors",
    "type": "webhook_endpoint",
    "event_payload": "thin",
    "enabled_events": [
      "v1.billing.meter.error_report_triggered",
      "v1.billing.meter.no_meter_found"
    ],
    "webhook_endpoint": { "url": "https://SEU_BACKEND/api/billing/meter-errors/webhook" }
  }' | jq '{id, status, enabled_events, url: .webhook_endpoint.url}'
# Salvar segredo gerado em STRIPE_THIN_WEBHOOK_SECRET
```

---

## 3) Validar meters

Checa se cada `event_name` esperado (chumbado no codigo ou em config) tem exatamente 1
meter ativo. O meter de tokens precisa das dimensoes `model` e `token_type` se voce usa um
AI Gateway que emite por elas.

```bash
# Liste aqui os event_names que o seu backend usa
EXPECTED=(<seu_meter_de_tokens> <feature_a> <feature_b>)

METERS=$(curl -s "https://api.stripe.com/v1/billing/meters?limit=100" -u "$SK:" -H "$V1")

for ev in "${EXPECTED[@]}"; do
  COUNT=$(echo "$METERS" | jq --arg e "$ev" '[.data[] | select(.status=="active" and .event_name==$e)] | length')
  echo "$ev → $COUNT ativo(s)"
done

# Dimensoes do meter de tokens
echo "$METERS" | jq '.data[] | select(.status=="active" and .event_name=="<seu_meter_de_tokens>") | .dimension_payload_keys'
```

Esperado: `1 ativo(s)` para cada linha; dimensoes incluindo `model` e `token_type` no meter de tokens.

---

## 4) Publicar latest_version do rate card

Promove `latest_version` para `live_version` quando ha mudancas em rascunho que ainda nao salivaram.

```bash
RC=$(curl -s "https://api.stripe.com/v2/billing/rate_cards/$STRIPE_RATE_CARD_ID" -u "$SK:" -H "$V2")
LIVE=$(echo "$RC" | jq -r .live_version)
LATEST=$(echo "$RC" | jq -r .latest_version)
echo "live=$LIVE latest=$LATEST"

if [ "$LIVE" != "$LATEST" ]; then
  curl -s "https://api.stripe.com/v2/billing/rate_cards/$STRIPE_RATE_CARD_ID" \
    -u "$SK:" -H "$V2" -H 'Content-Type: application/json' \
    -d "{\"live_version\": \"$LATEST\"}" \
    | jq '{id, live_version, latest_version}'
fi
```

Para ajustes em massa (preco por modelo/token), prefira scripts versionados no backend a
edicoes manuais (ex: `scripts/stripe/setup-rate-card.ts`). Atencao: scripts que **apagam e
recriam** todas as rates exigem snapshot antes.

---

## 5) Checklist go/no-go

Use antes de declarar o ambiente alinhado.

### Chaves e modo
- [ ] `STRIPE_SECRET_KEY` aponta para a conta certa (live vs test).
- [ ] Chave tem permissao para `/v1/billing/meters`, `/v1/webhook_endpoints`, `/v2/billing/*`, `/v2/core/event_destinations`, `/v1/billing/credit_balance_*`.
- [ ] `livemode` esperado (`true` em producao).

### Variaveis
- [ ] Todas as `STRIPE_*` preenchidas e consistentes com os IDs reais da Stripe.

### Pricing plan + rate card
- [ ] Pricing plan `active=true` e `live_version == latest_version`.
- [ ] Moeda e `tax_behavior` corretos para o seu mercado.
- [ ] Rate card `active=true` e `live_version == latest_version`.
- [ ] Quantidade de rates coerente com a matriz de modelos (input/output por modelo).

### Top-up de creditos
- [ ] Existe Price ativo para cada lookup_key em `STRIPE_CREDITS_PACK_LOOKUP_KEYS` (CSV).
- [ ] `unit_amount` e `currency` batem com o produto esperado.
- [ ] Checkout cai no mesmo `customer` usado para consumo.

### Meters
- [ ] 1 meter ativo (sem duplicata) para cada `event_name` usado no codigo (ver passo 3).
- [ ] Meter de tokens com dimensoes `model` e `token_type` (se usa AI Gateway).

### Webhook principal `/api/billing/webhook`
- [ ] Status `enabled`.
- [ ] `STRIPE_WEBHOOK_SECRET` configurado no backend.
- [ ] Eventos: `checkout.session.completed`, `payment_intent.succeeded`, `billing.credit_balance_transaction.created`.
- [ ] Ultimas entregas com 2xx.

### Thin destination `/api/billing/meter-errors/webhook`
- [ ] Status `enabled`. Payload `thin`.
- [ ] `STRIPE_THIN_WEBHOOK_SECRET` configurado.
- [ ] Eventos: `v1.billing.meter.error_report_triggered`, `v1.billing.meter.no_meter_found`.
- [ ] Ultimas entregas com 2xx.

### Fluxo financeiro por chamada
- [ ] Backend grava o identificador do meter event + IDs Stripe no registro de uso.
- [ ] Custo final por chamada vem **apenas** dos creditos aplicados na Stripe.
- [ ] Enquanto nao liquida: status pendente, custo final nao e forcado para `0`.
- [ ] `billing.credit_balance_transaction.created` dispara reconciliacao e preenche o custo real.

### Testes de aceitacao
- [ ] Compra de credito aprovada aumenta saldo disponivel.
- [ ] Compra recusada/estornada nao entra como compra efetiva.
- [ ] 1 chamada real de IA gera: meter event na Stripe + registro no banco com event id + status pendente.
- [ ] Apos liquidacao: custo real aparece na linha; total debitado bate com as credit balance transactions.

### Criterio final de GO
- Nenhum warning critico na auditoria.
- Todos os eventos obrigatorios ativos.
- Todos os meters esperados ativos sem duplicata.
- Fluxo de ponta a ponta (compra + uso + liquidacao) validado em execucao real.

---

## Diagnostico rapido

| Sintoma | Causa provavel |
|---|---|
| Tokens medidos, custo por linha vazio/pendente | Stripe recebeu meter events mas ainda nao liquidou os creditos. Aguardar `billing.credit_balance_transaction.created`. |
| Saldo reservado alto, disponivel baixo | Normal enquanto Stripe nao fecha o debito final. |
| Eventos de erro de meter no log | Validar thin destination e payload. Conferir `v1.billing.meter.error_report_triggered` e `v1.billing.meter.no_meter_found`. |
| Custo final = 0 em todas as linhas | Backend esta forcando 0 quando deveria deixar pendente, ou rate card nao publicado. |
| Modelo sumiu da lista de modelos disponiveis | Nome do modelo no rate card nao bate com o nome derivado do catalogo de providers. |
| `400 No active meter found for event name "X"` em volume alto | Nome usado no codigo nao bate com meter ativo no Stripe. Deploy = unico caminho de correcao se o nome for chumbado. |
| Reasoning model retorna 404 `unsupported_endpoint` | Modelo de reasoning chamado em `/chat/completions`; muitos exigem `/responses`. Atualizar `endpoint` no catalogo. |
| `StripeIdempotencyError` em `createBalanceTransaction` (webhook 500) | Conta Stripe compartilhada: outro backend processou o `checkout.session.completed` primeiro com `description` diferente. Ver gotcha de multi-tenant. |

## Gotcha: conta Stripe compartilhada (multi-tenant)

Se a mesma conta Stripe serve mais de um produto/backend, todo `checkout.session.completed`
chega a **todos** os endpoints registrados. Sem filtro, varios backends chamam
`createBalanceTransaction` com a mesma idempotency key e `description` divergente — o segundo
a chegar leva `StripeIdempotencyError 400`.

Mitigacao:
- No checkout, marque `payment_intent_data.metadata.product = '<seu_produto>'`.
- No handler do webhook, ignore `checkout.session.completed` cujo `metadata.product` nao bata.
- Torne `processPaymentGrant` defensivo: engula `StripeIdempotencyError` apos confirmar que a
  transacao ja foi criada por outro processador.

## Regras operacionais

- **Nunca** expor `STRIPE_SECRET_KEY` nem `whsec_...` em logs/output.
- **Nunca** commitar IDs de conta livemode, URLs internas ou tabela de precos real em repo publico.
- Custo por request **sempre** vem dos creditos aplicados na Stripe. Calculo local e so estimativa.
- Se ainda nao liquidou, status e pendente — nao force o custo para `0`.
- Antes de qualquer mudanca destrutiva (deletar webhook, alterar rate card live), rodar a auditoria do passo 1 e salvar o output.
- **Rate card e catalogo precisam estar em sync.** Toda vez que renomear/adicionar modelo no catalogo de providers, atualizar os custos no script de rate card, rodar e publicar `latest_version`. Se o script recria todas as rates, guarde o snapshot antes.
- **Endpoint do gateway por tipo de modelo:**
  - Anthropic (`/v1/messages`)
  - OpenAI Chat (`/chat/completions`) — chat models / formato OpenAI
  - OpenAI Responses (`/responses`) — reasoning / codex models
- **Cache de rates:** se o backend cacheia as rates (ex: TTL de alguns minutos), mudancas no rate card so refletem apos o intervalo (ou restart).
- **Conta compartilhada:** todo checkout que cria balance transaction precisa setar `metadata.product`, e o webhook precisa filtrar por ele (ver gotcha acima).
```
