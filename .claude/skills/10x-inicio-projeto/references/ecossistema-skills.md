# Ecossistema de skills

`10x-inicio-projeto` decide a sequencia e conserva o contexto. Cada skill especializada
continua dona do seu playbook. Ler o `SKILL.md` correspondente integralmente antes de usar.

| Momento | Skill | Usar quando | Saida esperada |
|---|---|---|---|
| descoberta | `10x-inicio-projeto` | sempre | briefing, defaults, nao-objetivos e mapa de rotas |
| arquitetura | `plan-eng-review` | plano nao trivial ou fronteiras novas | plano travado, riscos e testes |
| identidade/UI | `design-consultation` | produto sem sistema visual | `DESIGN.md` e direcao aprovada |
| revisao visual | `design-review` | primeira tela funcional | achados de hierarquia, responsividade e AI slop |
| seguranca live | `careful` | banco/infra/producao compartilhada | guardrails ativos e alvos resolvidos |
| banco | `supabase` | fundacao, DDL, RLS, Auth, Storage ou auditoria | contrato aplicado e isolamento provado |
| Stripe | `stripe-setup` | billing, creditos, meters ou gateway | contrato financeiro, auditoria e GO/NO-GO |
| erro | `investigate` | bug ou comportamento inesperado | causa raiz antes do fix |
| revisao tecnica | `review` | diff pronto para landing | achados priorizados e resolvidos |
| teste navegavel | `qa` | fluxo local pronto | smoke/E2E e bugs revalidados |
| commit | `commit` | usuario pediu commit/push | commits atomicos e branch publicada |
| PR | `pr` | usuario pediu PR | PR em portugues com validacoes e operacao |
| deploy | `deploy-azure` | usuario aprovou publicar | infra nomeada pelo slug, envs e workflow validados |
| pos-ship | `document-release` | mudanca publicada | docs sincronizadas com o que realmente subiu |

## Sequencia recomendada

```text
briefing
  -> plano
  -> plan-eng-review (se arquitetura nao trivial)
  -> design-consultation (se identidade ainda nao existe)
  -> supabase (fundacao)
  -> implementacao vertical
  -> design-review + review + qa + supabase (auditoria final)
  -> commit -> pr
  -> deploy-azure
  -> document-release
```

Nao executar todas mecanicamente. Registrar `usada`, `adiada` ou `nao aplicavel` para cada
gate relevante.

## Regras de handoff

- Skill marcada `MANUAL TRIGGER ONLY`: sugerir com motivo e aguardar o usuario invocar.
- `commit` e `pr`: nunca inferir autorizacao a partir de “termina” ou “deixa pronto”.
- `deploy-azure`: receber as evidencias do gate local, ler envs sem exibir valores, mostrar alvo,
  recursos, SKUs e mutacoes e aguardar um novo OK antes de qualquer comando Azure mutante.
- `careful`: ativar antes de operacao destrutiva/live, sem ampliar o escopo autorizado.
- `supabase`: executar fundacao antes do CRUD e auditoria como ultimo gate local; nunca testar RLS
  com service role.
- `stripe-setup`: nao faz parte do caminho base; so entra se billing estiver no briefing.
- `review` e `qa`: rodar sobre a fatia entregue, nao sobre features futuras.

## Padrao de deploy Azure

O deploy deve ser responsabilidade exclusiva de `.claude/skills/deploy-azure/SKILL.md`.
A skill de inicio fornece a ela:

```text
slug do produto
resource group / regiao
nomes desejados de ACR e Web Apps
servicos: frontend, backend e workers reais
portas e health/readiness
env vars publicas, privadas e build-time
dominios/CORS/callback OAuth
branch de deploy e repositorio GitHub
```

Depois do deploy, verificar URLs, health, readiness, callback, CORS e logs de cada servico.
