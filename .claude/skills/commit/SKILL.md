---
name: commit
description: "Fluxo padrao para organizar commits e push com quality gate integrado. Use quando o usuario pedir para commitar, subir, ou fazer push."
---

# Git Commit & Push Workflow

**Nunca commite automaticamente.** So commite quando o usuario pedir explicitamente (ex: "commita", "pode subir", "sobe", "commit", "push").

## Modos de execucao

### 1) Commit rapido (default quando usuario pedir so "commit")

Use quando o usuario pedir apenas **commit** (ex: "commita", "pode subir", "so commit", "so commita"):

- Rode `git status` + `git diff --stat` + `git diff` por grupo de arquivos
- Rode **sempre** `npm run lint`
- Monte e apresente a **tabela de commits por arquivos**
- Nao rode `npm run build` automaticamente
- Aguarde "ok" do usuario para executar o(s) commit(s)

### 2) Commit completo (somente quando usuario pedir "completo")

Use quando o usuario pedir explicitamente **completo** (ex: "commit completo", "faz o completo", "quality gate completo"):

- Faca tudo do modo rapido
- Rode tambem `npm run build`
- Apresente tabela enriquecida com status
- Aguarde "ok" do usuario para executar o(s) commit(s)

## 1. Analisar alteracoes pendentes

- Rode `git status` e `git diff --stat` para listar todos os arquivos modificados
- Rode `git diff` por grupo de arquivos para entender cada mudanca

## 2. Quality Gate por modo

### Lint (sempre)

```bash
npm run lint
```

- **Sempre roda**, independente do tamanho da mudanca
- Se falhar, corrija os erros e rode novamente. Nao prossiga ate passar.

### Build (somente no completo)

```bash
npm run build
```

Rode no modo **completo**.
Se falhar, corrija e rode novamente. Nao prossiga ate passar.

**Frontend com limitacao de memoria (WSL):**
```bash
cd frontend && NODE_OPTIONS="--max-old-space-size=4096" npm run build
```
Use quando o build crashar por falta de memoria no WSL (erro de heap ou crash do terminal).

## 3. Agrupar por responsabilidade

Separe as alteracoes em commits logicos, cada um com **uma unica responsabilidade**:
- Agrupe arquivos que fazem parte da mesma feature/fix/refactor
- Nunca misture alteracoes de backend com frontend se forem de funcionalidades diferentes
- Nunca misture performance com feature nova

## 4. Apresentar commits para aprovacao

Apresente titulo + corpo de cada commit antes de executar:

---
**#N** — `tipo: titulo`
**Arquivos:** `arquivo1.ts`, `arquivo2.ts`
> Corpo descritivo em 2-3 linhas explicando o que foi feito e o motivo.

---

Aguarde o "ok" do usuario antes de executar os commits.

## 5. Executar commits na ordem

Cada commit usa HEREDOC com titulo + corpo descritivo:

```bash
git add arquivo1 arquivo2 && git commit -m "$(cat <<'EOF'
tipo: titulo curto em portugues

Descricao detalhada em 2-3 linhas explicando
o que foi feito e o motivo da alteracao.
EOF
)"
```

## 6. Verificar e fazer push

- Rode `git status` + `git log --oneline` para confirmar
- **Faca o push automaticamente** logo apos os commits
- Sempre perguntar antes de fazer `push --force`

## Regras

- Titulos de commit em **portugues**, lowercase, sem ponto final
- Corpo do commit em **portugues** com contexto util
- Titulo deve ser o **mais descritivo possivel** dentro do limite de ~72 caracteres
  - Bom: `feat: adicionar filtro por data no relatorio de vendas`
  - Ruim: `feat: adicionar filtro`
- Sempre perguntar antes de fazer `push --force`

**Tipos de commit:** `feat`, `fix`, `perf`, `style`, `refactor`, `docs`, `chore`, `test`
