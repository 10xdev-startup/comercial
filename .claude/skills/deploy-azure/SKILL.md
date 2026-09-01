---
name: deploy-azure
description: "Guia de deploy na Azure (Container Registry + App Service) e ligacao do auto-deploy (GitHub Actions). Use quando o usuario pedir para deployar, subir para Azure, ou configurar infraestrutura Azure."
---

# Deploy Azure

Quando o usuario invocar esta skill, pergunte o **slug do projeto** caso nao esteja claro pelo contexto (ex: `10xmkt`, `minhaloja`). Derive os nomes dos recursos a partir do slug e apresente a tabela de nomes antes de exibir qualquer comando.

> Esta skill cobre o **setup inicial da infra** (passos 01–10) **e a ligacao do auto-deploy** via GitHub Actions (passo 11). O `.github/workflows/deploy.yml` vem com placeholders `seu-...` e **aborta no preflight** ate ser configurado — o passo 11 é o que preenche o `env:` do workflow + os secrets. **Avise o usuario disso**: sem preencher, o push na `main` falha de proposito.

## Regra de nomes

O slug **nao pode ter tracos** no Container Registry. Se o usuario passar `minha-loja`, normalize para `minhaloja` apenas no CR.

| Recurso | Nome |
|---|---|
| Resource Group | `resource-{slug}` |
| Container Registry | `cr{slug}` (sem tracos) |
| App Service Plan | `app-plan-{slug}` |
| Backend App | `web-backend-{slug}` |
| Frontend App | `web-frontend-{slug}` |

Apresente sempre a tabela preenchida com os nomes reais antes de comecar.

---

## 01 — Azure CLI

```bash
# Instalar (Windows)
winget install Microsoft.AzureCLI

# Verificar
az --version

# Login
az login --use-device-code
```

> Apos instalar, feche e reabra o terminal antes de continuar.

---

## 02 — Resource Group

```bash
az group create --name resource-{slug} --location "Brazil South"
```

Verificar registro do provider:
```bash
az provider show --namespace Microsoft.ContainerRegistry --query "registrationState"
# Esperado: "Registered"
```

---

## 03 — Container Registry

Antes de criar, pergunte ao usuario qual SKU do Container Registry ele quer:

| SKU | Preco/mes | Storage | Uso indicado |
|---|---|---|---|
| `Basic` | ~$5 | 10 GiB | Dev, projetos pequenos |
| `Standard` | ~$20 | 100 GiB | Producao na maioria dos casos |
| `Premium` | ~$50 | 500 GiB | Geo-replicacao, private endpoints |

```bash
# Criar (substitua {sku} pelo escolhido: Basic, Standard ou Premium)
az acr create \
  --resource-group resource-{slug} \
  --name cr{slug} \
  --sku {sku} \
  --admin-enabled true

# Build e push — Backend (roda na nuvem, sem Docker local)
az acr build \
  --registry cr{slug} \
  --image {slug}-backend:latest \
  --file backend/Dockerfile \
  backend/

# Build e push — Frontend (NEXT_PUBLIC_* embutidas no build)
az acr build \
  --registry cr{slug} \
  --image {slug}-frontend:latest \
  --file frontend/Dockerfile \
  --build-arg "NEXT_PUBLIC_API_URL=https://web-backend-{slug}.azurewebsites.net" \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>" \
  frontend/
```

Registrar provider Microsoft.Web:
```bash
az provider register --namespace Microsoft.Web
az provider show --namespace Microsoft.Web --query "registrationState"
# Esperado: "Registered"
```

---

## 04 — App Service Plan

Antes de criar, pergunte ao usuario qual SKU ele quer:

| SKU | Preco/mes | Limitacoes |
|---|---|---|
| `F1` | Gratuito | 60 min CPU/dia, sem custom domain, sem SSL — so para testes |
| `B1` | ~$13 | Dedicated, custom domain + SSL — minimo recomendado para producao |
| `B2` | ~$26 | 2x CPU/RAM do B1 |
| `S1` | ~$70 | Auto-scale, staging slots |

> **F1 nao e gratuito no todo.** Os 60 min de CPU/dia sao do **plano inteiro** — backend e frontend dividem a mesma cota, nao 60 min cada. Sem "Always On", o container hiberna e o cold start passa de 30s na proxima request. E o Container Registry (passo 03) **nao tem SKU gratuito** — o piso real de um projeto e ACR Basic + F1 + 2 apps, ~R$ 25,85/mes (Brazil South). Subir pra B1 depois e so `az appservice plan update`, sem recriar nada. Preco sempre da fonte, nunca de memoria: `curl -s "https://prices.azure.com/api/retail/prices?\$filter=serviceName%20eq%20'Azure%20App%20Service'%20and%20armRegionName%20eq%20'brazilsouth'&currencyCode='BRL'"`.

```bash
# Substitua {sku} pelo escolhido: F1, B1, B2, S1...
az appservice plan create \
  --name app-plan-{slug} \
  --resource-group resource-{slug} \
  --is-linux \
  --sku {sku}
```

---

## 05 — App Service Backend

```bash
az webapp create \
  --resource-group resource-{slug} \
  --plan app-plan-{slug} \
  --name web-backend-{slug} \
  --deployment-container-image-name cr{slug}.azurecr.io/{slug}-backend:latest
```

---

## 06 — App Service Frontend

```bash
az webapp create \
  --resource-group resource-{slug} \
  --plan app-plan-{slug} \
  --name web-frontend-{slug} \
  --deployment-container-image-name cr{slug}.azurecr.io/{slug}-frontend:latest
```

---

## 07 — Configurar porta (obrigatorio no Azure)

```bash
# Backend (porta 8000)
az webapp config appsettings set \
  --name web-backend-{slug} \
  --resource-group resource-{slug} \
  --settings WEBSITES_PORT=8000

# Frontend (porta 8080)
az webapp config appsettings set \
  --name web-frontend-{slug} \
  --resource-group resource-{slug} \
  --settings WEBSITES_PORT=8080
```

---

## 08 — Variaveis de Ambiente — Backend

```bash
az webapp config appsettings set \
  --name web-backend-{slug} \
  --resource-group resource-{slug} \
  --settings \
    PORT=8000 \
    NODE_ENV=production \
    SUPABASE_URL=<valor> \
    SUPABASE_SERVICE_ROLE_KEY=<valor> \
    SUPABASE_ANON_KEY=<valor>
```

---

## 09 — Variaveis de Ambiente — Frontend

> As `NEXT_PUBLIC_*` ja foram embutidas no build (passo 03). As abaixo sao extras se necessario.

```bash
az webapp config appsettings set \
  --name web-frontend-{slug} \
  --resource-group resource-{slug} \
  --settings \
    NEXT_PUBLIC_API_URL=https://web-backend-{slug}.azurewebsites.net \
    NEXT_PUBLIC_SUPABASE_URL=<valor> \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<valor>
```

---

## 10 — Verificar Deploy

```bash
curl https://web-backend-{slug}.azurewebsites.net/health
```

- **Frontend:** `https://web-frontend-{slug}.azurewebsites.net`
- **Backend:** `https://web-backend-{slug}.azurewebsites.net/health`

---

## 11 — CI/CD: auto-deploy no push (GitHub Actions)

A infra ja existe; agora ligue o **auto-deploy** (push na `main` → deploy). Edite o bloco `env:` de `.github/workflows/deploy.yml` com os nomes derivados do `{slug}`:

| `env:` do workflow | Valor |
|---|---|
| `ACR_NAME` | `cr{slug}` |
| `RESOURCE_GROUP` | `resource-{slug}` |
| `BACKEND_APP` | `web-backend-{slug}` |
| `FRONTEND_APP` | `web-frontend-{slug}` |
| `BACKEND_IMAGE` | `{slug}-backend` |
| `FRONTEND_IMAGE` | `{slug}-frontend` |
| `BACKEND_PUBLIC_URL` | `https://web-backend-{slug}.azurewebsites.net` |

Configure os **Secrets** do repo (Settings → Secrets and variables → Actions):
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` — do service principal (OIDC)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — baked no build do front

> **Enquanto o `env:` tiver `seu-...`, o workflow aborta no preflight** com erro — por isso é importante passar por aqui. Depois de preenchido, todo push na `main` deploya sozinho (e da pra disparar manual via "Run workflow").

Service principal pro OIDC (se ainda nao existe):
```bash
az ad sp create-for-rbac --name "sp-{slug}-deploy" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/resource-{slug}
```

> A senha que este comando devolve **nao e usada em OIDC** — nao guarde, nao coloque em secret.

**Federated credential — sem ela o login OIDC nao autentica.** `create-for-rbac` so cria o service principal; falta ligar o repo a ele. Sem este passo, o primeiro run do workflow depois do merge morre com `AADSTS700213: No matching federated identity record found`:

```bash
APP_ID=$(az ad app list --display-name "sp-{slug}-deploy" --query "[0].appId" -o tsv)
OWNER_ID=$(gh api repos/{owner}/{repo} --jq .owner.id)
REPO_ID=$(gh api repos/{owner}/{repo} --jq .id)

az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"github-{repo}-main\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:{owner}@$OWNER_ID/{repo}@$REPO_ID:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"
```

> **O subject usa os IDs numericos da org/repo, nao os nomes.** O formato classico `repo:<org>/<repo>:ref:refs/heads/main` nao casa mais — o GitHub hoje apresenta `repo:<org>@<orgId>/<repo>@<repoId>:ref:refs/heads/main`, um formato imutavel que sobrevive a renomeacoes. Pegue os IDs reais via `gh api`, nunca derive do nome.
>
> **O subject fica amarrado a uma ref.** A credential acima so autentica push/dispatch na `main`. Pra disparar o workflow manualmente de outra branch (ex.: validar o pipeline antes do merge), crie outra federated credential com `\"subject\": \"repo:{owner}@$OWNER_ID/{repo}@$REPO_ID:ref:refs/heads/<branch>\"` — senao o unico teste real do CI e o proprio merge.

