---
name: stripe
description: "Opera a conta Stripe compartilhada da 10xDev, 10xMkt e 10xVagas com isolamento por namespace. Use para auditar ou criar meters, emitir meter events, criar metered items e rates, inspecionar rate cards, customers, checkout, creditos e webhooks, ou investigar cobranca por uso."
---

# Stripe API

## Regra principal: uma conta, tres produtos isolados

10xDev, 10xMkt e 10xVagas usam a mesma conta Stripe. Antes de qualquer escrita,
identifique o produto alvo e mantenha estes namespaces:

| Produto | Prefixo de `event_name` | Metadados obrigatorios |
| --- | --- | --- |
| 10xDev | `10xdev_` | `product=10xdev`, `platform=10xdev` |
| 10xMkt | `10xmkt_` | `product=10xmkt`, `platform=10xmkt` |
| 10xVagas | `10xvagas_` | `product=10xvagas`, `platform=10xvagas` |

Esta skill pertence ao 10xMkt. Por padrao, toda criacao deve usar `10xmkt_` e
Customer/Checkout devem carregar **ambos** `product=10xmkt` e
`platform=10xmkt`. Nunca reutilize meter, metered item, rate ou Customer de
outro produto so porque a conta e a mesma.

Eventos de sistema da Stripe, como `checkout.session.completed`, nao podem ser
renomeados. Isole o tratamento de webhooks pelos metadados do Customer,
Checkout Session, Subscription ou objeto relacionado.

## Seguranca e ambiente

- Leia `STRIPE_SECRET_KEY` de `backend/.env`; nunca mostre, copie ou grave a chave.
- Confira `livemode` antes de concluir que auditou ou alterou producao.
- Reads podem ser executados autonomamente. Writes em live exigem escopo exato e
  confirmacao explicita, salvo quando o usuario ja autorizou a operacao.
- Nao arquive meter, remova rate, Customer ou outro recurso sem confirmacao
  especifica. Prefira mudancas aditivas e reversiveis.
- Tire um snapshot dos recursos afetados antes de uma escrita em live.

## Ferramentas

### Wrapper do projeto

```bash
scripts/stripe-api.sh <METHOD> <PATH> [--data '<json>']
```

O wrapper autentica com `backend/.env` e seleciona a versao usada pelo backend:
v1 `2026-03-25.dahlia` e v2 Billing preview `2026-03-25.preview`.

- Use o wrapper para reads v1/v2 e writes JSON da Billing v2.
- O Stripe CLI oficial nao envia sozinho o header preview exigido pela Billing
  v2; use o wrapper nesses endpoints.
- O wrapper envia JSON. Para writes v1 que esperam form encoding, como criar
  meter ou meter event, use Stripe CLI/SDK ou `curl` com `-d`.
- Combine a saida com `jq`, sem imprimir a chave secreta.

```bash
RCID=$(grep -E '^STRIPE_RATE_CARD_ID=' backend/.env | cut -d= -f2-)
```

## Contrato de meter do 10xMkt

### Nomes canonicos

Os eventos conhecidos do produto sao:

- `10xmkt_tokens`
- `10xmkt_report_generated`
- `10xmkt_campaign_analysis_generated`
- `10xmkt_report_question_answered`
- `10xmkt_briefing_generated`
- `10xmkt_roteiro_generated`
- `10xmkt_mapping_inferred`
- `10xmkt_creative_generated`
- `10xmkt_google_campaign_suggestion`

Novos nomes devem ser `10xmkt_<acao_no_passado>`, em lowercase snake_case,
estaveis e com no maximo 100 caracteres. Um `event_name` representa uma unica
semantica para sempre; nao renomeie nem reaproveite um nome para outro evento.

O meter de tokens ativo observado em live em 2026-08-03 foi
`mtr_61V9rShW0ad3jFevv41Rmbems3uMHBtA`. Trate o ID como snapshot: antes de usar,
confirme pelo `event_name=10xmkt_tokens`. O nome e o identificador de contrato;
nao copie o ID para outro ambiente.

### Configuracao padrao

Todo meter novo deve usar:

- `customer_mapping.type=by_id`
- `customer_mapping.event_payload_key=stripe_customer_id`
- `value_settings.event_payload_key=value`
- `default_aggregation.formula=sum`
- meter de tokens: dimensoes `model` e `token_type`
- meter de feature: sem dimensoes, salvo requisito real de segmentacao

O `event_name` so pode pertencer a um meter ativo. Antes de criar:

1. Liste e pagine todos os meters ativos.
2. Filtre pelo `event_name` exato, nao por display name.
3. Se houver um resultado, reutilize-o e valide toda a configuracao.
4. Se houver mais de um, pare e reporte os IDs; nunca escolha o primeiro.
5. Somente se nao houver resultado, crie o meter.
6. Releia a lista e confirme que existe exatamente um.

Nao use `head`, `limit(1)` ou ordenacao para esconder duplicidade.

### Auditar meters e detectar colisao

```bash
./scripts/stripe-api.sh GET '/v1/billing/meters?status=active&limit=100' \
  | jq '[.data[] | select(.event_name | startswith("10xmkt_")) | {id, event_name, status, livemode, customer_mapping, value_settings, default_aggregation}]'
```

```bash
./scripts/stripe-api.sh GET '/v1/billing/meters?status=active&limit=100' \
  | jq '[.data[] | select(.event_name == "10xmkt_tokens")] | {count: length, ids: map(.id)}'
```

Se `has_more=true`, pagine com `starting_after`; uma auditoria parcial nao prova
unicidade.

### Criar meter

O exemplo abaixo e para o meter de tokens. Remova as dimensoes para um evento de
feature e troque nome/display name.

```bash
stripe billing meters create \
  --confirm \
  --default-aggregation.formula=sum \
  --display-name='10xMkt tokens' \
  --event-name=10xmkt_tokens \
  --customer-mapping.type=by_id \
  --customer-mapping.event-payload-key=stripe_customer_id \
  --value-settings.event-payload-key=value \
  -d 'dimension_payload_keys[0]=model' \
  -d 'dimension_payload_keys[1]=token_type' \
  --stripe-version=2026-03-25.dahlia
```

O Stripe CLI usa test mode por padrao. Acrescente `--live` somente depois da
confirmacao explicita e da auditoria do ambiente live.

Depois da criacao, valide `event_name`, `livemode`, status, mapeamentos,
agregacao e dimensoes na resposta e em um GET independente. A configuracao de
um meter nao pode ser livremente alterada depois; erro estrutural normalmente
exige arquivar e substituir, portanto revise antes do POST.

## Emitir meter events

### Payload canonico

Todo evento deve conter:

```json
{
  "event_name": "10xmkt_tokens",
  "identifier": "usage_<logical-event-uuid>",
  "timestamp": 1785765600,
  "payload": {
    "stripe_customer_id": "cus_...",
    "value": "1250",
    "model": "gpt-5",
    "token_type": "input"
  }
}
```

Regras:

- `identifier`: chave unica do evento logico, com ate 100 caracteres. Persista-a
  antes de enviar e reutilize a mesma em toda tentativa; nunca gere outra no retry.
- A Stripe recomenda UUID-like e aplica unicidade por uma janela movel de pelo
  menos 24 horas. A aplicacao deve tratar o identificador como globalmente unico.
- `timestamp`: Unix seconds, no maximo 35 dias no passado ou 5 minutos no futuro;
  omita para usar o horario atual da Stripe.
- `payload.value`: inteiro em string. Use contagem positiva; feature vale `"1"`.
- Tokens exigem `model` e `token_type`; eventos de feature nao inventam dimensoes.
- `stripe_customer_id` deve ser o Customer do 10xMkt, validado pelos metadados.
- Aceite sucesso de ingestao como recebimento, nao como agregacao imediata: o
  processamento e assincrono.

### Node.js

```ts
await stripe.billing.meterEvents.create({
  event_name: '10xmkt_tokens',
  identifier: usageEventId,
  timestamp: Math.floor(Date.now() / 1000),
  payload: {
    stripe_customer_id: stripeCustomerId,
    value: String(tokenCount),
    model,
    token_type: tokenType,
  },
})
```

O backend deve criar `usageEventId` uma vez e guardar esse valor junto ao evento
local antes da chamada externa. Em timeout, reenvie o mesmo payload e identifier.

### Python sem SDK

```python
import json
import urllib.parse
import urllib.request

body = urllib.parse.urlencode({
    "event_name": "10xmkt_report_generated",
    "identifier": usage_event_id,
    "timestamp": str(timestamp),
    "payload[stripe_customer_id]": stripe_customer_id,
    "payload[value]": "1",
}).encode()

request = urllib.request.Request(
    "https://api.stripe.com/v1/billing/meter_events",
    data=body,
    headers={
        "Authorization": f"Bearer {stripe_secret_key}",
        "Stripe-Version": "2026-03-25.dahlia",
    },
    method="POST",
)

with urllib.request.urlopen(request, timeout=15) as response:
    meter_event = json.load(response)
```

### curl

```bash
curl https://api.stripe.com/v1/billing/meter_events \
  -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  -H 'Stripe-Version: 2026-03-25.dahlia' \
  -d event_name=10xmkt_tokens \
  -d identifier="$USAGE_EVENT_ID" \
  -d timestamp="$EVENT_TIMESTAMP" \
  -d "payload[stripe_customer_id]=$STRIPE_CUSTOMER_ID" \
  -d 'payload[value]=1250' \
  -d 'payload[model]=gpt-5' \
  -d 'payload[token_type]=input'
```

Nao use `-v`, `set -x` ou qualquer comando que exponha o header de autorizacao.

## Rate card do 10xMkt

### Inspecionar rates

```bash
./scripts/stripe-api.sh GET "/v2/billing/rate_cards/$RCID/rates?limit=100" \
  | jq '.data[] | {id, meter: .metered_item.meter, model: (.metered_item.meter_segment_conditions[]? | select(.dimension=="model") | .value), tokenType: (.metered_item.meter_segment_conditions[]? | select(.dimension=="token_type") | .value), unit_amount}'
```

```bash
./scripts/stripe-api.sh GET "/v2/billing/rate_cards/$RCID/rates?limit=100" \
  | jq '.data[] | select(.metered_item.meter_segment_conditions[]? | select(.value=="gemini-2.5-flash-image"))'
```

### Criar metered item e rate

Crie um `metered_item` para cada par `(model, token_type)` usando o meter
`10xmkt_tokens` validado na etapa anterior. O `lookup_key` tambem deve carregar o
namespace `10xmkt_`.

```bash
./scripts/stripe-api.sh POST /v2/billing/metered_items --data '{
  "display_name": "10xMkt <model-id> input tokens",
  "lookup_key": "10xmkt_tokens_<model_id_snake>_input",
  "meter": "<METER_10XMKT_TOKENS_ID>",
  "meter_segment_conditions": [
    {"dimension": "model", "value": "<model-id>"},
    {"dimension": "token_type", "value": "input"}
  ]
}'
```

Repita para `output` e, somente se o provider emitir essa categoria, `cached`.

```bash
./scripts/stripe-api.sh POST "/v2/billing/rate_cards/$RCID/rates" --data '{
  "metered_item": "bli_XXX",
  "unit_amount": "0.000279"
}'
```

`unit_amount` e uma string decimal em reais por token. Por exemplo, R$ 279 por
1 milhao de tokens equivale a `"0.000279"`. O backend converte para centavos ao
ler. A moeda vem do rate card e nao deve ser enviada no rate.

Depois de criar:

1. Confirme um unico metered item para `(meter, model, token_type)`.
2. Confirme um unico rate correspondente no rate card do 10xMkt.
3. Compare `unit_amount` com a fonte de preco sem arredondamento indevido.
4. Confira `live_version` e `latest_version` do rate card.
5. Nao publique automaticamente drift antigo ou mudancas alheias encontradas no
   draft do rate card; reporte e delimite o que esta sendo ativado.

### Gotchas confirmados

1. `meter_segment_conditions` nao aceita `operator`; envie apenas
   `{dimension, value}`. O match e igualdade implicita.
2. `currency` nao vai no body do rate; ela e herdada do rate card.
3. Rate referencia o metered item por ID, nunca como objeto inline.
4. Rates novos podem afetar os proximos eventos imediatamente; nao conte com cache.
5. Meter events e resumos sao processados de forma assincrona.
6. O LLM Gateway ainda pode emitir o legado compartilhado
   `token-billing-tokens`. O backend do produto deve emitir `10xmkt_tokens`.
   Hoje a cobranca financeira usa Customer Balance explicito, portanto a
   telemetria duplicada nao duplica debito; reavalie antes de faturar por meter.

## Customers, checkout e creditos

### Buscar Customer

```bash
./scripts/stripe-api.sh GET '/v1/customers/search?query=email:"x@y.com"' | jq
```

Antes de usar o resultado, valide `metadata.product` e `metadata.platform` como
`10xmkt`. Email igual nao prova que o Customer pertence a este produto.

### Customer Balance

```bash
./scripts/stripe-api.sh GET "/v1/customers/$CUSTOMER_ID/balance_transactions?limit=10" | jq
```

### Meter event session v2

```bash
./scripts/stripe-api.sh POST /v2/billing/meter_event_session --data '{}'
```

## Checklist de conclusao

- Produto e modo test/live confirmados.
- Nenhum segredo apareceu no terminal, diff ou log.
- `event_name`, lookup keys e metadados usam somente o namespace alvo.
- Auditoria paginada encontrou exatamente um meter ativo por `event_name`.
- Meter usa customer/value mapping e agregacao esperados.
- Meter de tokens tem `model` e `token_type`; feature nao ganhou dimensao inutil.
- Emissao persiste e reutiliza `identifier` no retry.
- Metered item e rate apontam para recursos do mesmo produto.
- Read-back confirmou o estado final; processamento assincrono foi considerado.
- Nenhuma exclusao, arquivamento ou publicacao de drift alheio ocorreu sem aval.

## Quando usar / nao usar

Use esta skill para auditar/criar meters, emitir ou depurar meter events, manter
metered items e rates, conferir rate card, Customer Balance, Customers, checkout
e webhooks Stripe do projeto.

Nao use para substituir APIs de checkout ja expostas pelo backend, nem para
operacoes destrutivas sem autorizacao explicita.
