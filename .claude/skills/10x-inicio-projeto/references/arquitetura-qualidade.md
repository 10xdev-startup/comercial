# Arquitetura e qualidade

## Estrutura obrigatoria

```text
backend/src/
├── controllers/   # HTTP, validacao e orquestracao curta
├── models/        # unico acesso ao Supabase
├── routes/        # paths e middleware
├── middleware/    # Express; nao renomear para proxy
├── types/
├── utils/
└── database/supabase.ts

frontend/
├── app/           # uma rota por recurso
├── components/    # UI compartilhada e componentes de dominio
├── services/      # apiClient + chamadas HTTP por dominio
├── types/         # contratos do frontend
├── lib/           # utilitarios sem HTTP
└── proxy.ts       # convencao Next.js 16 para sessao/roteamento
```

Adicionar `engine/` ou `worker/` apenas quando o briefing exigir processo isolado. Declarar
quem e dono de cada responsabilidade e o contrato de comunicacao antes de criar a pasta.

## Backend

- Fluxo: Routes -> Controller -> Model -> Database.
- Controllers nunca chamam `.from(...)`, SDK externo ou `res.json(...)` cru.
- Models usam `TABLE`/`COLUMNS`, lancam erro e retornam colecoes vazias em vez de `null`.
- Toda query service-role de dado privado inclui owner/membership.
- `user_id` vem de `req.user`; body nao escolhe identidade nem role.
- Erros de dominio usam `AppError`; handler central produz o envelope.
- Rotas e propriedades publicas possuem contrato tipado e teste de ownership.

## Frontend

- `apiClient` desembrulha o envelope uma vez; nao espalhar `fetch`.
- Server Component busca dado inicial quando apropriado; Client Component fica para interacao.
- Sidebar e tabs representam recursos reais. Nunca fazer botoes diferentes apontarem para a
  mesma tela sem motivo explicito.
- Dashboard mostra resumo e proximos passos; CRUD detalhado vive na rota do recurso.
- Cada tela cobre loading, vazio, erro, sucesso e permissao insuficiente.
- UI nasce de uma hierarquia e uma tarefa; nao de uma grade de cards genericos.
- Usar tokens CSS/Tailwind sem hex ou cor semantica hardcoded no componente.
- Verde/amarelo/vermelho ficam para significado quando a marca adotar essa regra.

## Coesao e tamanho

Limites sao alarmes, nao meta de minificacao:

- funcao acima de 60 linhas: revisar responsabilidades;
- controller/model/component acima de 300 linhas: justificar ou dividir;
- arquivo de produto acima de 450 linhas: falha no gate sem justificativa registrada;
- componente com rede + estado complexo + layout: extrair service/hook/subcomponent;
- duplicacao em dois dominios: primeiro confirmar que o contrato e realmente o mesmo.

Nao criar `utils.ts` generico para regra de dominio. Nomear pelo conceito.

## Banco

- PK UUID; FK com politica de delete deliberada.
- `created_at` e `updated_at`; trigger central para update quando necessario.
- `not null`, `check`, `unique` e indices refletem invariantes reais.
- Dinheiro guarda moeda, valor inteiro e original; nao usar float.
- Estados possuem check/enum e transicoes testadas.
- JSONB apenas para documento flexivel; campos filtrados/relacionados viram colunas.
- RLS e grants fazem parte da definicao da tabela, nao de uma etapa futura.

## Qualidade verificavel

Para cada fluxo vertical, exigir:

1. teste de sucesso;
2. input invalido;
3. usuario sem acesso;
4. dependencia externa falhando, quando existir;
5. estado vazio/loading/erro no frontend;
6. typecheck e lint;
7. smoke real pelas portas locais.

Nunca rodar a suite Jest inteira no WSL. Usar arquivo, `--findRelatedTests` ou `-o`.
