---
name: Licoes para o template (10xDev)
overview: Problemas que nascem do template, levantados construindo o 10xGov — sessao 1 do clone ao primeiro deploy, sessao 2 do fluxo de login. Cada item com sintoma, causa raiz, fix pronto e onde aplicar.
todos: []
isProject: false
---

# `Licoes para o template nodejs-express-next-supabase`

Levantadas construindo o **10xGov** sobre o template. Todas foram **verificadas contra o
template** (`/root/code/template-nodejs-express-next-supabase`) — o que esta aqui e o que de
fato falta la, nao suposicao.

Duas sessoes, na ordem em que um projeto novo as encontra:

1. **Iniciando projeto** — do clone ao primeiro deploy na Azure (07/08/2026).
2. **Criando conta** — o fluxo de login e autenticacao (08/08/2026).

Dentro de cada uma, ordem = custo de descoberta. P0 quebra em silencio e mente sobre a
causa; P3 e polimento.

---

## Status (18/08/2026)

**22 dos 26 itens aplicados** neste template, em 10 commits na branch `feat/componentes`
(de `fix: unificar env do frontend` a `docs: separar TEMPLATE.md do README`) mais ajustes
posteriores na skill `/novo-projeto` (ainda nao commitados — ver nota abaixo). Status por
item nas tabelas "Resumo" e nos checklists de cada sessao (`[x]` feito, `[ ]` com nota
= pulado por decisao ou nao aplicavel).

**4 nao aplicados:**
- Sessao 1, #5 — `scripts/rename-project.mjs` nao existe; virou a skill
  **`/novo-projeto`** (guiada, sem script).
- Sessao 1, #9/#10 — dependiam de `scripts/validate-project.mjs`, que **nao existe
  neste template** (so no 10x-gov, via skill `10x-inicio-projeto`). Seguem pendentes
  porque dependem de um validador que nao existe.
- Sessao 1, #14 — regra do escape unicode em mensagem de commit. Nao existe neste
  template; e especifica de uma secao que o 10x-gov adicionou pro proprio dominio dele
  (regex de acento em PT-BR). Nao importada.

**Bonus fora da lista original:** skill `/novo-projeto` (rename + `env:` do workflow de
deploy a partir do mesmo slug + env + fundacao do banco + inicializa o grafo do
graphify, ponte pra `/deploy-azure` e `/stripe-setup` quando fizer sentido).

Se quiser propor mais melhorias pro template, adicione um novo `.plan.md` nesta mesma
pasta (`.cursor/plans/melhorias-template/`).

---

# 1. Iniciando projeto

Levantadas subindo o **10xGov** do template ate o primeiro deploy na Azure (07/08/2026, ~1h30
de ponta a ponta). O trabalho de produto foi pequeno — renomear, uma landing, tres rotas. O
resto do tempo foi atrito que o template podia ter resolvido de fabrica.

Verificadas contra o template (`/root/code/template-nodejs-express-next-supabase`) na mesma
data — o que esta aqui e o que de fato falta la.

## Resumo

> Status atualizado em 18/08/2026 — ver nota no topo do arquivo.

| #   | Licao                                                                   | Arquivo no template                            | P      | Status |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------- | ------ | ------ |
| 1   | `frontend/.env.local` versionado: o arquivo que voce preenche e o que o git rastreia | `.gitignore` + `frontend/.env.local`           | **P0** | ✅ Feito |
| 2   | Sem `.gitattributes`, o working tree em CRLF vira diff de 123 mil linhas | `.gitattributes` (ausente)                     | **P0** | ✅ Feito |
| 3   | `/` ocupado pelo dashboard: landing publica nao cabe sem mover pagina    | `frontend/app/(dashboard)/page.tsx`            | **P0** | ✅ Feito |
| 4   | Deploy OIDC nao autentica: falta federated credential e o subject mudou  | `.claude/skills/deploy-azure/SKILL.md`         | **P0** | ✅ Feito |
| 5   | "Meu Projeto" hardcoded em 5 arquivos, sem script de rename              | 5 arquivos                                     | P1     | ⏭️ Pulado (virou skill `/novo-projeto` guiada, sem script) |
| 6   | Convencao de env divergente entre os workspaces                         | ambos + 2 skills + validador                   | P1     | ✅ Feito |
| 7   | Workflow com 9 placeholders, todos derivaveis do slug                   | `.github/workflows/deploy.yml`                 | P1     | ✅ Feito (skill `/novo-projeto` preenche o `env:` a partir do slug) |
| 8   | README descreve o template, nao o produto                               | `README.md`                                    | P1     | ✅ Feito |
| 9   | O validador pega o erro certo e ninguem roda                            | `scripts/validate-project.mjs`                 | P2     | ⏭️ Pulado (validador nao existe neste template — 10x-inicio-projeto e so do 10x-gov) |
| 10  | `CLAUDE.md` aponta para arquivos que o proprio trabalho move            | `.claude/CLAUDE.md`                            | P2     | ⏭️ Pulado (depende do validador do #9) |
| 11  | `jest -o` nao serve com worktree limpo                                  | `.claude/CLAUDE.md`                            | P2     | ✅ Feito |
| 12  | graphify: 86% do grafo e codigo das skills, nao do produto              | doc do graphify                                | P3     | ✅ Feito |
| 13  | Custo e limites da Azure nao documentados                               | `.claude/skills/deploy-azure/SKILL.md`         | P3     | ✅ Feito |
| 14  | O escape unicode corrompe tambem em mensagem de commit                  | `.claude/CLAUDE.md`                            | P3     | ➖ N/A (regra nao existe neste template — especifica do dominio do 10x-gov) |

---

## P0 — quebram em silencio ou custam o dobro

### 1. O arquivo de env que voce preenche e o mesmo que o git rastreia

**Sintoma:** nenhum, ate o dia em que aparece. E ai ja e tarde.

**Causa:** o template versiona `frontend/.env.local` como se fosse arquivo-exemplo, e o
`.gitignore` **desfaz o ignore de proposito**:

```
.env
.env*.local
!.env.local     <- reabilita justamente o nome de env real
```

O backend usa `backend/.env.example` (correto: nome distinto, valor placeholder). O frontend
usa `.env.local`, que e o nome do arquivo **real** de desenvolvimento do Next. O fluxo que o
proprio README ensina — preencher os envs locais — leva o dev a escrever chaves reais dentro
de um arquivo rastreado. O `git add` seguinte commita segredo.

**Agravante:** o validador (`validate-project.mjs`) tem exatamente a checagem que pegaria isso
(`env real versionado: ...`), mas ela abre excecao para `.env.example` — e `.env.local` nao e
`.env.example`, entao deveria acusar. Nao acusa porque ninguem roda o validador (ver item 9).

**Fix:** um unico `.env` por workspace, nenhum deles versionado, e a documentacao das variaveis
inline no README. Foi o que o 10xGov adotou:

```
backend/.env      (ignorado)
frontend/.env     (ignorado)
```

```gitignore
.env
.env.*
```

Sem negacao, sem `.env.example`, sem `.env.local`. O README lista as chaves de cada workspace
em bloco de codigo — quem clona ve o que precisa preencher sem que exista arquivo para vazar.

**Se preferir manter arquivo-exemplo**, o requisito e que o nome **nunca** seja um nome que o
runtime carrega: `.env.example` sim, `.env.local` nunca.

---

### 2. Sem `.gitattributes`, um working tree em CRLF vira diff de 123 mil linhas

**Sintoma:** `git status` acusa 469 arquivos modificados num repo em que voce mexeu em 5.
`git diff --stat` fecha em **+123.603 / -123.610**. O conteudo dos arquivos e identico ao
commitado.

**Causa:** o working tree estava em CRLF e o HEAD em LF. O template nao tem `.gitattributes`,
`core.autocrlf` estava vazio e o disco e ext4 nativo — ou seja, nada no git pediu a conversao.
Ela veio de fora (ferramenta Windows tocando o repo, ou `read_text`/`write_text` do Python, que
faz universal newlines e reescreve o arquivo inteiro).

**Por que e P0:** commitar isso poluiria o `git blame` de **todo** o repositorio com um commit
so, e faria qualquer merge futuro conflitar em todo arquivo. O diff real do trabalho — 6 linhas
— ficaria invisivel no meio do ruido.

**Diagnostico rapido:**

```bash
git diff --ignore-cr-at-eol --stat   # mostra so a mudanca real
git diff <arquivo> | grep '^+' | cat -A | head   # ^M$ no fim = CRLF
```

**Fix** — `.gitattributes` na raiz do template:

```gitattributes
* text=auto eol=lf

*.tmpl linguist-language=Markdown
```

A primeira linha e a correcao. A segunda resolve um efeito colateral cosmetico: o GitHub
classificava o repo como **27,9% "Go Template"** por causa dos 49 `.tmpl` das skills do gstack,
que sao Markdown.

**Depois de adicionar**, o disco ainda fica em CRLF ate um re-checkout — o git avisa
`CRLF will be replaced by LF the next time Git touches it` a cada commit. Com o worktree limpo
e tudo pushado:

```bash
rm .git/index && git reset --hard HEAD
```

---

### 3. A rota `/` ja vem ocupada pelo dashboard

**Sintoma:** criar a landing publica em `app/page.tsx` colide com `app/(dashboard)/page.tsx` —
as duas resolvem para `/`, e o Next nao aceita.

**Causa:** o template poe a primeira tela da area logada na raiz. Todo produto real tem pagina
publica em `/`, entao **todo projeto novo vai precisar mover essa pagina** — no meio do
trabalho, arrastando junto a sidebar, o `CLAUDE.md` e qualquer link.

**O que o template tem hoje:**

```
frontend/app/(dashboard)/page.tsx          ->  /            (com sidebar)
frontend/app/(dashboard)/componentes/...   ->  /componentes (com sidebar)
```

**O que deveria vir pronto** (padrao ja validado no 10xdev e no 10x-mkt):

```
frontend/app/page.tsx                 ->  /              landing publica, sem sidebar
frontend/app/(lps)/lp/.gitkeep        ->  /lp/<nome>     paginas de anuncio, sem sidebar
frontend/app/(dashboard)/inicio/...   ->  /inicio        area logada, com sidebar
frontend/app/(dashboard)/componentes/ ->  /componentes   area logada, com sidebar
```

O que decide se a pagina tem sidebar e **o grupo**, nao a URL. O grupo `(lps)` nao tem
`layout.tsx` de proposito: os parenteses somem da URL e a pagina herda o layout raiz, entao
nasce sem sidebar. O prefixo real e o segmento `lp/`.

Vale a regra no `CLAUDE.md` do template: pagina publica nunca entra em `(dashboard)`, e item de
sidebar so existe para rota de `(dashboard)`.

---

### 4. O deploy por OIDC nao autentica com o que a skill manda fazer

**Sintoma:** infra criada, imagens no registry, apps no ar — e o primeiro run do GitHub Actions
depois do merge morre no login:

```
Error: AADSTS700213: No matching federated identity record found for presented
assertion subject 'repo:10xdev-startup@267465123/10x-gov@1327184779:ref:refs/heads/main'
```

**Duas causas somadas, e a skill nao cobre nenhuma:**

**(a) A skill nao cria federated credential.** Ela manda apenas:

```bash
az ad sp create-for-rbac --name "sp-{slug}-deploy" --role contributor --scopes ...
```

Isso cria um service principal com **senha**. Mas o workflow usa OIDC (`id-token: write`, sem
`client-secret` no `azure/login`), e OIDC exige uma **federated identity credential** ligando o
repositorio ao app. Sem ela, os tres secrets certos nao adiantam. Um `grep federated-credential`
na skill do template retorna **zero**.

**(b) O formato do subject mudou.** O subject classico

```
repo:<org>/<repo>:ref:refs/heads/main
```

nao casa mais: o GitHub agora apresenta os **IDs numericos** da org e do repo, num formato
imutavel que sobrevive a renomeacoes:

```
repo:<org>@<orgId>/<repo>@<repoId>:ref:refs/heads/main
```

**Fix** — a skill precisa de um passo apos o `create-for-rbac`, derivando os IDs reais:

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

**Duas notas que evitam o proximo tropeco:**

- O subject fica amarrado a **uma ref**. Disparar o workflow manualmente de outra branch exige
  outra credential. Se a intencao e validar o pipeline **antes** do merge, criar tambem a da
  branch de trabalho — senao o unico teste real do CI e o merge.
- A senha gerada pelo `create-for-rbac` nao e usada em OIDC. Nao guardar, nao colocar em secret.

---

## P1 — atrito garantido em todo projeto novo

### 5. "Meu Projeto" espalhado, sem script de rename

O template nasce com o placeholder em cinco arquivos, e nenhum comando que resolva:

| Arquivo                                | O que fica errado                      |
| -------------------------------------- | -------------------------------------- |
| `frontend/app/layout.tsx`              | titulo da aba do navegador             |
| `frontend/components/AppSidebar.tsx`   | fallback do nome na sidebar            |
| `package.json`                         | `"name": "meu-projeto"`                |
| `package-lock.json`                    | dois campos `name`                     |
| `.claude/CLAUDE.md`                    | descricao do projeto para o agente     |

**Pegadinha:** o npm **rejeita maiuscula** em nome de pacote. `10xGov` quebra o `npm ci`; o
`package.json` precisa de `10xgov`. Um humano descobre isso errando.

**Fix:** `scripts/rename-project.mjs "<Nome Do Produto>"` que troca os cinco, normaliza o nome
do pacote para minusculas, sincroniza o `package-lock.json` e roda o validador no fim.

---

### 6. Convencao de env divergente entre os workspaces

O template usa `backend/.env.example` de um lado e `frontend/.env.local` do outro. Fora o
problema de seguranca do item 1, a divergencia tem custo proprio: **padronizar depois obriga a
tocar quatro fontes**, e esquecer qualquer uma quebra em silencio mais tarde.

No 10xGov, mudar para `.env` unico exigiu corrigir:

| Fonte                                              | O que quebraria                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `.claude/skills/deploy-azure/SKILL.md`             | fazia `. frontend/.env.local` no preflight; falharia dizendo que as `NEXT_PUBLIC_*` sumiram |
| `.claude/skills/10x-inicio-projeto/SKILL.md`       | tres mencoes a `.env.local`                                          |
| `scripts/validate-project.mjs`                     | exigia os dois `.env.example` e **lancava excecao** ao ler o do front |
| `.gitignore` (raiz e frontend)                     | negacao `!.env.example` virava regra morta                           |

**Fix:** template ja nasce com `backend/.env` e `frontend/.env`, ambos ignorados, e as skills e
o validador escritos contra esses nomes.

---

### 7. O workflow tem 9 placeholders que sao funcao do slug

Todos os valores do bloco `env:` derivam mecanicamente do slug:

```yaml
ACR_NAME: cr{slug}
RESOURCE_GROUP: resource-{slug}
BACKEND_APP: web-backend-{slug}
FRONTEND_APP: web-frontend-{slug}
BACKEND_IMAGE: {slug}-backend
FRONTEND_IMAGE: {slug}-frontend
BACKEND_PUBLIC_URL: https://web-backend-{slug}.azurewebsites.net
```

O preflight que aborta enquanto houver `seu-*` esta certo e deve continuar. O que falta e o
**preenchimento automatico**: o mesmo script do item 5 recebe o slug e escreve o bloco.

Cuidado ao automatizar: o guard do preflight (`grep -q 'seu-'`) mora numa linha do proprio
workflow. Substituicao cega quebra o guard.

---

### 8. O README descreve o template, nao o produto

O `README.md` que o projeto herda fala "Template 10xDev" e ensina `cp backend/.env.example
backend/.env`. Fica desatualizado no minuto zero e, pior, **ensina um comando que deixa de
funcionar** assim que a convencao de env muda.

**Fix:** separar os dois papeis. `TEMPLATE.md` fica com as instrucoes de quem usa o template;
`README.md` nasce como esqueleto do produto (nome, visao, setup, rotas) para o rename preencher.

---

## P2 — a rede de protecao existe, mas nao esta ligada

### 9. O validador pega o erro certo e ninguem roda

`validate-project.mjs` tem checagens boas — inclusive `sidebar aponta para rota sem page.tsx`,
que e **exatamente** o erro cometido nesta sessao (a sidebar ficou apontando para `/home` depois
que a landing foi movida para `/`). O erro passou porque o validador so roda quando alguem
lembra.

**Fix:** rodar automaticamente. Como `postinstall`, como primeiro passo da skill de inicio, ou
como job do CI. Uma checagem que depende de memoria nao e rede de protecao.

**Dois defeitos do proprio validador**, corrigidos no 10xGov e que valem portar:

- **Lancava excecao em vez de erro legivel** quando `frontend/.env.example` nao existia
  (`readFileSync` direto, sem `existsSync`). Validador deve reprovar com mensagem, nunca
  estourar stack trace.
- **Acoplava-se ao nome do arquivo de exemplo** em quatro pontos, entao mudar a convencao de env
  quebrava o validador junto.

---

### 10. O `CLAUDE.md` aponta para arquivos que o proprio trabalho move

A secao "Arquivos-chave" listava `frontend/app/(dashboard)/page.tsx`. Ao mover a pagina para
`/inicio`, a referencia virou caminho inexistente — e a proxima sessao de agente seria mandada
para um arquivo que nao existe.

**Fix:** o validador deve extrair os caminhos citados no `CLAUDE.md` e verificar que existem.
Doc que aponta para arquivo morto e pior que doc ausente: parece confiavel.

---

### 11. `jest -o` nao serve quando o worktree esta limpo

O `CLAUDE.md` recomenda `npm test -- -o` para "rodar so os testes afetados". O `-o` olha o diff
**nao commitado** — com tudo commitado e pushado, ele volta vazio e parece "nada a testar".

**Fix:** documentar a alternativa que compara contra a base:

```bash
npm test -w frontend -- --changedSince=main
```

**Lacuna relacionada:** os quatro testes do template cobrem `apiResponse`, `requireRole`,
`apiErrors` e `button`. Nenhum cobre pagina, rota ou sidebar — justamente o que mais se mexe num
projeto novo. Quem valida mudanca de rota hoje e o validador, nao o Jest.

---

## P3 — ferramenta e ambiente

### 12. O grafo do graphify nasce 86% ruido

`graphify update .` num projeto recem-clonado gera 4.129 nos, dos quais **3.572 vem de
`.claude/`** — codigo TypeScript das skills do gstack, nao do produto. Consultar esse grafo da
blast radius do gstack.

**Fix:** excluir `.claude/` da extracao, ou documentar que o grafo so vale depois de existir
codigo de dominio. Versionar 3,4 MB de grafo majoritariamente irrelevante tambem polui o
historico.

Se for versionar, o `.gitignore` precisa das linhas que separam o que e regeneravel:

```gitignore
graphify-out/cost.json
graphify-out/cache/
graphify-out/graph.html
graphify-out/.graphify_*
graphify-out/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/
```

---

### 13. Custo e limites da Azure nao estao documentados

Duas duvidas que custaram consulta e quase viraram decisao errada:

- **Nao existe SKU gratuito de Container Registry.** Basic e o piso: R$ 0,8615/dia
  (~R$ 25,85/mes, Brazil South). Pedir "tudo gratuito" nao inclui o ACR.
- **F1 Linux roda container customizado.** Havia duvida sobre isso; a evidencia estava na
  propria assinatura (`10xgado` e `10xdev-starter-kit` rodam `DOCKER|...` em F1). Antes de
  afirmar limite de plataforma, **olhar os recursos que ja existem**.

O piso real de um projeto e **~R$ 25,85/mes**: ACR Basic + plano F1 + dois apps.

O que o F1 cobra em vez de dinheiro, e que precisa estar escrito: 60 min de CPU/dia
compartilhados **pelo plano inteiro** (os dois apps dividem), sem Always On (cold start de
container passa de 30s), 1 GB de storage, sem dominio proprio com SSL. Subir para B1
(~R$ 75,48/mes) e `az appservice plan update`, sem recriar nada.

Consultar preco sempre na fonte, nunca de memoria:

```bash
curl -s "https://prices.azure.com/api/retail/prices?\$filter=serviceName%20eq%20'Azure%20App%20Service'%20and%20armRegionName%20eq%20'brazilsouth'&currencyCode='BRL'"
```

---

### 14. O escape unicode corrompe tambem em mensagem de commit

A regra ja documentada no `CLAUDE.md` vale para arquivo. Nesta sessao ela foi violada num lugar
que a regra nao mencionava: **o corpo do commit**. O escape dos combining marks foi digitado na
mensagem e chegou decodificado — o commit gravou os bytes literais.

**Fix:** ampliar a regra para qualquer texto que atravesse a tool call, inclusive mensagem de
commit, e usar a mesma receita de montar por codigo:

```python
BS = chr(92)
escape = BS + 'u0300-' + BS + 'u036f'
subprocess.run(['git', 'commit', '-F', '-'], input=msg.encode(), check=True)
```

Verificacao: `git log -1 --format=%B | grep -cP "[\x{0300}-\x{036f}]"` tem que dar 0.

---

## Ambiente: o WSL caiu tres vezes

Nao e licao de template, mas moldou a sessao. Alem das tres quedas, o `.git` corrompeu (tres
objetos com zero byte, incluindo a ponta do branch, com `git status` respondendo
`bad object HEAD`) e um arquivo sumiu do disco.

**O que salvou:** tudo relevante ja estava pushado. O reparo foi apagar os objetos vazios,
reapontar o ref para o commit que estava no `origin` e reconstruir o indice:

```bash
git fsck --no-progress                 # lista os objetos vazios
rm -f .git/objects/<xx>/<resto>        # apaga os de zero byte
git update-ref refs/heads/<branch> <sha-do-origin>
rm -f .git/index && git reset -q
git fsck --no-progress                 # tem que sair limpo
```

**Habito que isso reforca:** commitar e pushar cedo, em blocos pequenos. O unico trabalho
perdido foi o commit que ainda nao tinha subido.

---

## Ambiente: falha de sandbox que se disfarca de bug da aplicacao

Tambem nao e licao de template, mas custou uma investigacao inteira na sessao da Fonte de
dados (10/08/2026).

**Sintoma:** `next/jest` parecia quebrado — `--showConfig` devolvia **stdout vazio**, sem erro
legivel, e a suite parecia nao rodar.

**Causa raiz:** o Next sobe o TypeScript como **subprocesso**. Num sandbox sem permissao pra
isso, o spawn falha com `EPERM` e a saida volta vazia. A aplicacao estava intacta: reexecutado
fora da restricao, tudo passa.

**Por que engana:** o erro nao aparece como "permissao negada". Aparece como ausencia — saida
vazia, config sumida, teste que "nao roda". A leitura natural e culpar a configuracao do
projeto e sair mexendo em `jest.config.mjs`, que e justamente onde nao esta o problema.

**Regra:** ferramenta que gera subprocesso (`next`, `tsc`, `eslint`) voltando **vazia** ou com
`EPERM` e suspeita de ambiente ate prova em contrario. Confirme por outro caminho antes de
"consertar" o projeto — rodar o comando direto, ou o teste por um atalho que nao dependa do
subprocesso.

**Varia por sandbox, nao e propriedade do repo:** na sessao do Claude Code o
`npx jest --showConfig` funcionou normalmente (foi assim que se leu o `moduleNameMapper`);
o `EPERM` apareceu so no sandbox do Codex. Entao o sintoma nao reproduz igual em todo agente —
o que se generaliza e a regra de diagnostico, nao o erro.

---

## O fluxo que queremos no proximo projeto

Hoje, do clone ao primeiro deploy: **~1h30**. Com os itens acima resolvidos, o caminho vira:

```bash
# 1. clonar e nomear o produto (itens 5, 7, 8)
npx 10x-init "10xGov" --slug 10xgov
#    renomeia os 5 arquivos, normaliza o nome do pacote, preenche o env: do
#    workflow a partir do slug, gera o esqueleto do README e roda o validador

# 2. configurar o acesso (itens 1, 6)
#    o init pergunta as chaves do Supabase e escreve backend/.env e frontend/.env
#    — ambos ignorados, nenhum arquivo de exemplo para vazar

# 3. subir a fundacao do banco (item 5 da sessao "Criando conta")
/supabase fundacao
#    cria public.users, RLS, trigger e grants; decide mailer_autoconfirm

# 4. rodar
npm ci && npm run dev

# 5. publicar (item 4)
/deploy-azure
#    cria os 5 recursos, builda as imagens, e — o passo que falta hoje —
#    cria a federated credential com o subject de IDs imutaveis
```

O alvo e **nenhuma decisao de infraestrutura durante o trabalho de produto**: rota publica,
convencao de env, line ending e credencial de deploy ja resolvidos quando o primeiro `git clone`
termina.

---

## Checklist para o template

```
[x] 1. remover frontend/.env.local do versionamento; .env unico por workspace   P0
[x] 2. .gitattributes com "* text=auto eol=lf" + linguist para .tmpl            P0
[x] 3. rotas: / publica, (lps)/lp/ criado, dashboard em /inicio                 P0
[x] 4. deploy-azure: criar federated credential com subject de IDs imutaveis    P0
[ ] 5. scripts/rename-project.mjs (5 arquivos + slug em minusculas)             P1  -- pulado: virou skill /novo-projeto guiada (sem script)
[x] 6. skills e validador escritos contra backend/.env e frontend/.env          P1  -- "validador" nao existe neste template, o resto foi feito
[x] 7. preencher o env: do workflow a partir do slug, sem quebrar o guard       P1  -- skill /novo-projeto, tambem fecha o caso do guard nao pegar valor real de outro projeto
[x] 8. separar TEMPLATE.md (instrucoes) de README.md (produto)                  P1
[ ] 9. rodar o validador automaticamente; trocar excecao por erro legivel       P2  -- pulado: nao ha validador neste template
[ ] 10. validador confere os caminhos citados no CLAUDE.md                      P2  -- pulado: depende do #9
[x] 11. CLAUDE.md: --changedSince=main; teste de rota/sidebar                   P2  -- doc feito; testes de rota/sidebar ainda nao existem
[x] 12. graphify: excluir .claude/ da extracao + .gitignore dos regeneraveis    P3
[x] 13. deploy-azure: custo real (ACR sem free) e limites do F1                 P3
[ ] 14. CLAUDE.md: regra do escape unicode vale para mensagem de commit         P3  -- N/A: regra nao existe neste template
```

---

# 2. Criando conta

Levantadas construindo o fluxo de login/autenticacao do **10xGov** (08/08/2026).

## Resumo


| #   | Licao                                                       | Arquivo no template                                         | P      | Status |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------- | ------ | ------ |
| 1   | `.env` do projeto tem que vencer o shell (`override: true`) | `backend/src/index.ts`                                      | **P0** | ✅ Feito |
| 2   | Erro de auth que esconde a causa real                       | `backend/src/middleware/supabaseMiddleware.ts`              | **P0** | ✅ Feito |
| 3   | `dotenv.config()` chamado duas vezes                        | `backend/src/{index,database/supabase}.ts`                  | P1     | ✅ Feito |
| 4   | Editor marca `baseUrl` como deprecado                       | `.vscode/settings.json` (ausente) + `backend/tsconfig.json` | P1     | ✅ Feito |
| 5   | Projeto novo nasce sem a tabela `users`                     | doc de setup / skill de inicio                              | P1     | ✅ Feito (doc no CLAUDE.md + skill `/novo-projeto`) |
| 6   | `mailer_autoconfirm=false` sem SMTP trava o cadastro        | doc de setup                                                | P1     | ✅ Feito (skill `/novo-projeto` liga por padrao e avisa) |
| 7   | `typecheck` do backend nao cobre `src/tests/`               | `backend/tsconfig.json` + `package.json`                    | P2     | ✅ Feito |
| 8   | `@jest/globals` obrigatorio e nao documentado               | `.claude/CLAUDE.md`                                         | P2     | ✅ Feito |
| 9   | DDL multi-linha nao cabe no `curl -d` inline                | `.claude/CLAUDE.md`                                         | P3     | ✅ Feito |
| 10  | Ranges de `supabase-js` divergentes entre workspaces        | `*/package.json`                                            | P3     | ✅ Feito |
| 11  | `service_role` em JWT legado, resto em chave nova           | `backend/.env.example`                                      | P3     | ✅ Feito |
| 12  | Auth do frontend nao vem no template                        | `frontend/` inteiro                                         | P3     | ✅ Feito |


---

## P0 — quebram em silencio

### 1. O `.env` do projeto tem que vencer o ambiente do shell

**Sintoma:** todo endpoint autenticado responde `401 Token invalido ou expirado`. O login
funciona, a sessao existe no browser, o JWT e valido — e mesmo assim o backend recusa.

**Causa:** `dotenv.config()` **nao sobrescreve** variavel que ja existe no ambiente. Um
`export SUPABASE_URL=...` no `~/.bashrc` (deixado por outro projeto) faz o backend subir
apontado para **outro projeto Supabase**. O JWT foi emitido pelo projeto A e validado no
projeto B — invalido, corretamente. A mensagem culpa o token; o errado e a URL.

**Pista que estava a vista o tempo todo:** o dotenv loga `injected env (4) from .env` quando o
arquivo tem 6 chaves. **Numero injetado menor que o numero de chaves do arquivo = alguem ja
tinha aquelas variaveis no ambiente.** Vale como check rapido: `env | grep -E "^(PORT|SUPABASE)"`.

**Fix** — em `backend/src/index.ts`:

```ts
// Unico ponto de carga da env no backend.
// `override: true` NAO e detalhe: sem ele o dotenv preserva o que ja existe no
// ambiente, e um `export SUPABASE_URL=...` no ~/.bashrc (de outro projeto) faz este
// backend falar com o Supabase errado — o sintoma e 401 "Token invalido" em todo
// endpoint autenticado, porque o JWT foi emitido por outro projeto.
// Em producao (Azure) nao existe arquivo .env, entao as vars do ambiente seguem valendo.
dotenv.config({ override: true })
```

**Corolario para o dev, nao para o template:** exportar `SUPABASE_URL` /
`SUPABASE_ACCESS_TOKEN` no `~/.bashrc` e perigoso alem deste bug — qualquer `curl` na
Management API feito **sem** `source .env` roda **DDL no projeto errado**. Manter essas
variaveis so nos `.env` por workspace.

---

### 2. O erro de auth precisa distinguir token ruim de infra ruim

**Sintoma:** o item 1 levou muito mais tempo do que devia porque a mensagem apontava para o
lugar errado.

**Causa:** o middleware colapsa **qualquer** falha do `getUser` em uma unica mensagem:

```ts
const { data, error } = await supabase.auth.getUser(token)
if (error || !authUser) {
  sendError(res, 401, 'Token invalido ou expirado', 'AUTH_INVALID')  // <- projeto errado
}                                                                     //    cai aqui tambem
```

Token expirado, assinatura invalida, apikey errada, projeto errado, DNS fora do ar — tudo vira
"Token invalido ou expirado".

**Fix sugerido:** separar falha de credencial do usuario (401) de falha de comunicacao com o
Supabase (503), e logar `error.status`/`error.message` no servidor. Um `error.status === 0`
(fetch failed) ou 5xx nao e problema do token do usuario e nao deve dizer que e.

---

## P1 — atrito garantido em todo projeto novo

### 3. `dotenv.config()` chamado duas vezes

**Sintoma:** o boot loga duas linhas de injecao de env, a segunda com `(0)` — parece bug.

**Causa:** `index.ts:8` e `database/supabase.ts:4` chamam `dotenv.config()`. Ambas carregam o
mesmo `backend/.env`; a segunda nao injeta nada porque a primeira ja injetou.

**Fix:** uma unica chamada, em `index.ts` (ver item 1), e remover o `dotenv` de
`database/supabase.ts`. Seguro porque o client de la e **lazy** (Proxy): so le `process.env`
na primeira query, muito depois do boot.

---

### 4. O editor marca `baseUrl` como deprecado — e "consertar" derruba o backend

**Sintoma:** `backend/tsconfig.json` com 1 erro no VSCode, sublinhado em `baseUrl`. O
`tsc` do projeto nao acusa nada.

**Causa:** o editor valida com o TypeScript **embutido dele** (mais novo) em vez do TS do
workspace. 

**A armadilha:** remover o `baseUrl` para calar o aviso **quebra o `npm run dev`** — o
`tsconfig-paths@4` resolve os aliases `@/*` a partir dele (`config-loader.js:42`), e o dev
script roda `ts-node-dev --require tsconfig-paths/register`.

**Fix (dois arquivos)** — `.vscode/settings.json`, novo:

```jsonc
{
  // Usa o TypeScript do repositório em vez do que vem embutido no editor.
  // Sem isso o editor valida com uma versão mais nova e acusa problemas que o
  // `tsc` do projeto não tem — por exemplo `baseUrl` marcado como deprecado.
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

E o comentario-guarda em `backend/tsconfig.json`, imediatamente acima de `baseUrl`, dizendo
que a correcao e o editor usar o TS do workspace — nao mexer no tsconfig.

---

### 5. Projeto novo nasce sem a tabela `users`

**Sintoma:** `UserModel`, `UserController`, `/users/me`, `/users/onboard` e o
`supabaseMiddleware` vem prontos no template, mas `public.users` **nao existe** no Supabase
novo. Todo endpoint de usuario falha ate alguem rodar a fundacao.

**Fix:** o setup inicial deve criar a fundacao (SQL de `.claude/skills/supabase/fundacao.md`)
como **passo obrigatorio**, nao opcional — ou o doc precisa dizer, na primeira linha, que o
backend nao funciona antes disso.

---

### 6. `mailer_autoconfirm=false` sem SMTP trava o cadastro por email

**Sintoma:** projeto Supabase novo vem com confirmacao de email ligada e **sem SMTP proprio**.
O mailer embutido entrega poucos emails por hora e de forma restrita — na pratica ninguem
consegue confirmar a conta e entrar.

**Fix:** o setup deve tomar essa decisao explicitamente:

- **MVP/dev:** ligar `mailer_autoconfirm` (`PATCH /v1/projects/{ref}/config/auth`) — o
`signUp` ja devolve sessao e nao existe `/auth/callback` a manter.
- **Producao com email verificado:** configurar SMTP (Resend/SendGrid) **antes**, e so entao
manter a confirmacao ligada.

Deixar como esta e escolher a opcao que nao funciona.

---

## P2 — lacunas na rede de protecao

### 7. `typecheck` do backend nao cobre `src/tests/`

**Sintoma:** erro de tipo em teste do backend so aparece quando **aquele arquivo** roda no
`ts-jest`. Como a suite inteira nao pode rodar (WSL), um teste nao executado fica quebrado sem
ninguem ver. No frontend isso nao acontece: `tests/` esta no `include` e o `tsc` pega na hora.

**Causa:** `backend/tsconfig.json` tem `"exclude": [..., "**/*.test.ts"]` — necessario, porque
o mesmo arquivo serve o **build** (`tsc` + `outDir: ./dist`) e sem o exclude os testes iriam
para `dist/`.

**Fix:** separar build de typecheck.

```jsonc
// backend/tsconfig.typecheck.json  (novo)
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src/**/*"]        // sem o exclude de testes — nada e emitido
}
```

```jsonc
// backend/package.json
"typecheck": "tsc --noEmit -p tsconfig.typecheck.json"
```

O `build` continua ignorando os testes; o `typecheck` passa a cobri-los.

---

### 8. `@jest/globals` e obrigatorio e nao esta documentado

**Sintoma:** teste novo roda verde no Jest e o `npm run typecheck` quebra com dezenas de
`Cannot find name 'describe'` — uma causa so, 37 erros.

**Causa:** o projeto **nao instala `@types/jest`** (decisao correta) e todos os testes
importam os globais explicitamente. Quem nao sabe disso escreve o teste sem o import.

**Fix — documentar no `CLAUDE.md`**, incluindo o porque de nao "consertar" instalando
`@types/jest`:

- ele injeta `describe`/`it`/`expect` no escopo **global de todo o workspace** — no backend,
`roots: src/` faz esses nomes valerem dentro de controllers e models;
- e DefinitelyTyped, versionado a parte do `jest` (da para ter `jest@29` + `@types/jest@30`);
- colide com qualquer runner que exporte `expect`/`test` (Playwright, Vitest).

`@jest/globals` ja vem dentro do proprio `jest`: zero dependencia nova, sempre na versao certa.

---

## P3 — documentacao e consistencia

### 9. DDL multi-linha nao cabe no `curl -d` inline

O `CLAUDE.md` so documenta `-d '{"query":"<SQL aqui>"}'`, que funciona para SQL de uma linha.
DDL real (create table + functions com `$$...$$` + triggers + policies) tem newlines e aspas
que corrompem o JSON se escapadas a mao.

**Padrao que funciona** (arquivo no scratchpad, **nunca** `.sql` no repo):

```bash
source .env
S=<scratchpad>
python3 -c "import json; print(json.dumps({'query': open('$S/ddl.sql').read()}))" > $S/payload.json
curl -s -X POST "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @$S/payload.json
```

Envolver em `begin; ... rollback;`, validar, trocar **so** o `rollback` por `commit`
(`sed -i 's/^rollback;$/commit;/'`) e aplicar. Confirmar pelo estado real
(`information_schema`, `pg_policies`, `pg_trigger`) — nunca pelo HTTP 200.

---

### 10. Ranges de `supabase-js` divergentes entre workspaces

No 10xGov o backend declarava `^2.99.1` e o frontend `^2.108.1`. Hoje ambos resolvem para a
mesma versao (hoisted pelos workspaces), mas os ranges permitem divergir num `npm i` futuro —
em um projeto onde front e back precisam concordar sobre formato de token. Manter o **mesmo
range** nos dois `package.json` do template.

---

### 11. `service_role` em JWT legado enquanto o resto usa chave nova

Projeto novo mistura formatos: `SUPABASE_ANON_KEY` como `sb_publishable_...` (nova) e
`SUPABASE_SERVICE_ROLE_KEY` como `eyJ...` (JWT legado). Funciona **enquanto** as chaves
legadas estiverem habilitadas no projeto (`GET /v1/projects/{ref}/api-keys/legacy` →
`{"enabled":true}`). No dia em que forem desativadas, o backend para de funcionar inteiro.

Padronizar o `.env.example` na **secret key nova** (`sb_secret_...`).

---

### 12. Auth do frontend nao vem no template

O template tem `supabaseMiddleware`, `apiClient` com Bearer e `userService` — mas **nenhuma
tela de login**, nenhum `proxy.ts` e nenhum gate de rota. Todo projeto novo reescreve isso.

O que o 10xGov construiu e vale portar (email + senha, sem OAuth):


| Arquivo                                          | Papel                                                   |
| ------------------------------------------------ | ------------------------------------------------------- |
| `lib/authRedirect.ts`                            | destino pos-login a prova de open redirect (+ teste)    |
| `services/authService.ts`                        | `signInWithEmail` / `signUpWithEmail` / `signOut`       |
| `hooks/useAuth.tsx`                              | sessao em React (so leitura; `onAuthStateChange`)       |
| `app/(auth)/layout.tsx` + `login/` + `cadastro/` | telas de entrada, moldura compartilhada                 |
| `app/seja-bem-vindo/`                            | primeiro acesso (Server Component checa `onboarded_at`) |
| `proxy.ts`                                       | gate de rotas + refresh de cookie no mesmo lugar        |


Tres detalhes que custaram tempo e valem virar comentario no template:

- **Full reload (`window.location.assign`) depois de login/cadastro**, nao `router.push`: o
gate roda no servidor e precisa enxergar o cookie recem-escrito.
- **Redirect no proxy tem que carregar os cookies do refresh** (`response.cookies.getAll()` →
`redirect.cookies.set(...)`), senao a sessao renovada se perde e a proxima request recomeca.
- `**normalizeRedirectTarget` precisa rejeitar as proprias rotas de entrada** (`/login`,
`/cadastro`, `/seja-bem-vindo`), alem de destino externo — senao o usuario volta ao comeco.

---

## Checklist para o template

```
[x] 1. dotenv.config({ override: true }) em backend/src/index.ts        P0
[x] 2. supabaseMiddleware: separar 401 de token vs 503 de infra         P0
[x] 3. remover o dotenv duplicado de database/supabase.ts               P1
[x] 4. .vscode/settings.json + comentario-guarda no baseUrl             P1
[x] 5. fundacao `users` como passo obrigatorio do setup                 P1  -- doc no CLAUDE.md + skill /novo-projeto
[x] 6. decidir mailer_autoconfirm no setup (com SMTP ou sem)            P1  -- skill /novo-projeto liga por padrao e avisa
[x] 7. backend/tsconfig.typecheck.json + script typecheck               P2
[x] 8. CLAUDE.md: @jest/globals obrigatorio e por que nao @types/jest    P2
[x] 9. CLAUDE.md: padrao de DDL multi-linha na Management API           P3
[x] 10. alinhar range do supabase-js entre os workspaces                P3
[x] 11. .env.example na secret key nova (sb_secret_...)                 P3
[x] 12. portar o fluxo de auth do frontend (tabela acima)               P3
```

