---
name: get-pr-comments
description: "Busca e exibe comentarios do PR ativo do branch atual via gh CLI. Use quando quiser ver o feedback do PR aberto."
---

# Get PR Comments

Busca e exibe os comentarios do PR ativo para o branch atual.

## Passos

1. Verificar se o `gh` CLI esta disponivel
2. Rodar `gh pr view --json number,url,title` para checar se existe PR para o branch atual
   - Se nao existir PR, informar o usuario e parar
   - Se existir, continuar
3. Buscar todos os comentarios do PR:
   ```bash
   gh pr view --json comments,reviews
   ```
4. Exibir os comentarios em formato legivel:
   - Comentarios de review com autor, data e corpo
   - Comentarios gerais do PR com autor, data e corpo
   - Agrupados por thread de review quando aplicavel
5. Resumir o feedback e os action items solicitados pelos revisores
