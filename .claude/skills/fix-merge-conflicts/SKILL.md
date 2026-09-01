---
name: fix-merge-conflicts
description: "Resolve conflitos de merge automaticamente, sem interacao, e valida com lint/build no final. Use quando houver conflitos de merge no branch atual."
---

# Fix Merge Conflicts

Resolve todos os conflitos de merge do branch atual de forma nao-interativa e deixa o repo buildavel.

## Restricoes

- Opera a partir da raiz do repositorio. Se nao estiver num repo Git, para e reporta.
- Nao pede input ao usuario. Toma decisoes sensiveis e explica em resumo ao final.
- Prefere mudancas minimas e corretas que preservam a intencao dos dois lados.
- Usa flags nao-interativas em todas as ferramentas.
- Nao faz push nem tag — apenas commit local.

## 1. Detectar conflitos

```bash
git status --porcelain | cat
```

Coleta arquivos com marcadores de conflito (status U ou arquivos com `<<<<<<<` / `=======` / `>>>>>>>`).

## 2. Resolver conflitos por arquivo

Abre cada arquivo conflitante e remove os marcadores.

Mescla os dois lados logicamente quando possivel. Se mutuamente exclusivos, escolhe a variante que:
- Compila e passa type checks
- Preserva APIs publicas e comportamento existentes

**Estrategia por tipo de arquivo:**
- `package.json` / lockfiles: mescla chaves conservadoramente; regenera lockfiles via package manager
- Arquivos gerados / build artifacts: prefere manter fora do versionamento; caso contrario, prefere branch atual (ours)
- Config files: preserva uniao das configuracoes seguras; evita deletar campos obrigatorios
- Text/markdown: inclui conteudo unico dos dois lados, deduplica headings
- Arquivos binarios: prefere branch atual (ours)

## 3. Validar

Se Node/TypeScript presente: instala deps se manifests mudaram, roda lint/typecheck/build/testes se disponiveis.

```bash
npm run lint
npm run build
```

## 4. Finalizar

- Stage todos os arquivos resolvidos e lockfiles regenerados
- Cria um unico commit:

```bash
git add . && git commit -m "chore: resolver conflitos de merge"
```

- Exibe resumo conciso dos arquivos tocados e decisoes de resolucao relevantes.

## Orientacoes operacionais

- Se uma resolucao for ambigua e bloquear build/testes, prefere a variante que compila e passa os testes.
- Se um arquivo ainda tiver marcadores de conflito apos a primeira passagem, revisita e resolve antes de prosseguir.
- Para refactors grandes causando conflitos, prefere imports consistentes, tipos e limites de modulo. Usa exhaustive switch guards em TypeScript e anotacoes de tipo explicitas quando necessario.
- Mantem edicoes minimas e legiveis; evita reformatar codigo nao relacionado.
