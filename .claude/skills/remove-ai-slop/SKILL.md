---
name: remove-ai-slop
description: "Analisa o diff contra a main e remove padroes tipicos de codigo gerado por IA que sao inconsistentes com o restante do codebase. Use quando quiser limpar codigo AI gerado."
---

# Remove AI Slop

Analisa o diff do branch atual contra a `main` e remove todos os padroes tipicos de codigo gerado por IA introduzidos neste branch.

## O que remover

- **Comentarios desnecessarios** que um humano nao adicionaria ou que sao inconsistentes com o restante do arquivo
- **Defensive checks ou try/catch excessivos** que sao anormais para aquela area do codebase (especialmente em codepaths validados e confiaveis)
- **Casts para `any`** usados para contornar problemas de tipo
- **Qualquer outro estilo** inconsistente com o arquivo em questao

## Como executar

1. Rode `git diff main...HEAD` para ver todas as mudancas do branch
2. Para cada arquivo alterado, leia o contexto ao redor para entender o estilo do codebase
3. Identifique e remova os padroes acima
4. Nao altere logica de negocio — apenas limpe o estilo e padroes AI

## Ao final

Apresente um resumo de **1 a 3 frases** do que foi alterado. Nada mais.
