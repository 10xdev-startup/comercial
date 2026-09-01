# gstack — Comandos Disponíveis

Instalado em `.claude/skills/gstack/` com symlinks em `.claude/skills/`.

---

## Fase 1 — Pensar (antes de codar)

### `/office-hours`
**Para que serve:** Sessão estilo Y Combinator. Reframe do produto — questiona premissas, identifica riscos, sugere direções antes de escrever código.
**Quando usar:** Antes de decidir uma nova feature grande.

### `/plan-ceo-review`
**Para que serve:** Avalia se o plano resolve o problema certo, se o escopo está adequado, se a proposta de valor é clara.
**Quando usar:** Antes de features estratégicas.

### `/plan-eng-review`
**Para que serve:** Trava arquitetura antes de implementar. Gera diagramas de data flow, identifica edge cases.
**Quando usar:** Antes de refatorações ou mudanças estruturais.

### `/plan-design-review`
**Para que serve:** Avalia o plano de design com nota 0-10 em 7 dimensões. Detecta "AI slop".
**Quando usar:** Antes de redesenhar componentes ou UI.

### `/design-consultation`
**Para que serve:** Cria um design system completo do zero — paleta, tipografia, espaçamentos.
**Quando usar:** Para padronizar o visual do projeto.

---

## Fase 2 — Construir e Revisar

### `/review`
**Para que serve:** Review de PR focado em bugs de produção. Checa SQL injection, race conditions, segurança.
**Quando usar:** Antes de todo merge.

### `/investigate`
**Para que serve:** Debugging em 5 fases: sintomas → hipóteses → evidência → fix → verificação.
**Quando usar:** Quando algo quebra e a causa não é óbvia.

### `/design-review`
**Para que serve:** Audita a UI e faz commits atômicos de correção.
**Quando usar:** Após implementar UI.

---

## Fase 3 — Testar

### `/qa`
**Para que serve:** Abre browser real, testa fluxos, acha bugs, corrige automaticamente, re-verifica.
**Quando usar:** Testar fluxos completos.

### `/qa-only`
**Para que serve:** Mesmo que `/qa` mas só reporta — nunca altera código.
**Quando usar:** Quando quiser diagnóstico sem mudanças automáticas.

### `/browse`
**Para que serve:** Chromium headless — navega, clica, preenche forms, tira screenshots.
**Quando usar:** Validar responsividade, testar em diferentes viewports.

---

## Fase 4 — Entregar

### `/commit`
**Para que serve:** Fluxo padrão de commit: lint → build → agrupa por responsabilidade → push.
**Quando usar:** Sempre que quiser commitar.

### `/pr`
**Para que serve:** Cria Pull Request automaticamente via gh CLI.
**Quando usar:** Para abrir PR da branch atual.

### `/ship`
**Para que serve:** Fluxo completo: sync com main → testes → review → push → PR.
**Quando usar:** Para entregar features.

### `/document-release`
**Para que serve:** Atualiza toda a documentação para refletir o que foi entregue.
**Quando usar:** Após features grandes.

### `/retro`
**Para que serve:** Retrospectiva com métricas de commits, LOC, breakdown por área.
**Quando usar:** Final de semana/sprint.

---

## Power Tools (proteção)

### `/careful`
**Para que serve:** Intercepta comandos destrutivos (`rm -rf`, `DROP TABLE`, `git push --force`) e pede confirmação.

### `/freeze`
**Para que serve:** Restringe edições a um diretório específico.

### `/guard`
**Para que serve:** Combina `/careful` + `/freeze`.

### `/unfreeze`
**Para que serve:** Remove a restrição do `/freeze`.

---

## Utilitários

### `/codex`
**Para que serve:** Segunda opinião via OpenAI Codex CLI — review, challenge, consult.

### `/gstack-upgrade`
**Para que serve:** Atualiza o gstack para a versão mais recente.
