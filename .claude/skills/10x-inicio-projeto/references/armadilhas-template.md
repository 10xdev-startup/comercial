# Armadilhas do template

Cada item aqui foi pago em tempo real durante um bootstrap. Todas aparecem no PRIMEIRO
dominio de qualquer projeto derivado — nunca antes. Ler antes de escrever a fatia vertical.

## 1. Fetch em efeito quebra o lint

O template nao tem nenhuma pagina que busca dados, entao a primeira tela de produto e a
primeira a enfrentar `react-hooks/set-state-in-effect` (ativa via `eslint-config-next`).

A regra proibe chamar de dentro do efeito **qualquer** funcao que faca `setState` — nao
adianta extrair um `load()` com `useCallback` nem colocar o `await` antes do `setState`.

Padrao que passa:

```tsx
const [reloadKey, setReloadKey] = useState(0)

useEffect(() => {
  let active = true
  service.list().then(
    (data) => { if (!active) return; setData(data); setError(null); setLoading(false) },
    (err: unknown) => { if (!active) return; setError(messageFor(err)); setLoading(false) },
  )
  return () => { active = false }
}, [reloadKey])

// Recarregar e handler de evento, nao efeito — aqui setState e permitido.
const retry = useCallback(() => {
  setLoading(true)
  setReloadKey((key) => key + 1)
}, [])
```

A flag `active` nao e enfeite: descarta resposta que chega depois do unmount.

## 2. `req.params` no Express 5 e `string | string[]`

O template nao tem rota com parametro, entao o primeiro `/:id` quebra o `typecheck` com
`Argument of type 'string | string[]' is not assignable to parameter of type 'string'`.
Estreitar no controller e transformar em erro de contrato:

```ts
function parseId(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !value) {
    throw new AppError(422, 'id e obrigatorio', 'INVALID_ID')
  }
  return value
}
```

## 3. `DELETE` e o envelope wrapped

`204 No Content` nao pode ter corpo, mas o contrato exige `sendOk`. Nao inventar `res.status(204).end()`:
responder `sendOk(res, { id })` com 200. Mantem o envelope e a UI confirma o que sumiu.

## 4. Nao instanciar client nem ler env no load do modulo

**Ja corrigido no template** — `lib/supabase/client.ts` expoe `createClient()` memoizado e
ninguem instancia no escopo do modulo. Nao reintroduzir; o validador barra.

Por que a regra existe: o Next prerenderiza componentes `'use client'` durante o build.
Um `createClient()` no escopo do modulo faz `next build` falhar com
`Credenciais publicas do Supabase nao configuradas` em qualquer maquina sem `.env.local`,
e o erro aponta para a PAGINA, nao para a causa. Vale para qualquer recurso que leia env
no load: instanciar cedo transforma env ausente em build quebrado.

## 5. `jest.mock` no frontend exige o `jest` GLOBAL

**Metade ja vem resolvida no template**: `frontend/jest.config.mjs` traz o
`moduleNameMapper` do alias `@/` (o `next/jest` so o geraria sozinho se o `tsconfig`
declarasse `baseUrl`, o que nao acontece) e `frontend/jest.d.ts` tipa o `jest` global sem
`@types/jest`.

A metade que depende de quem escreve o teste: **usar o `jest` global**. `jest.mock` so sobe
acima dos imports quando `jest` e global — importar `jest` de `@jest/globals` desliga o
hoisting do SWC, e entao o mock resolve, **nao aplica**, e o teste exercita o modulo real
passando ou falhando por engano. E o unico modo de falha desta lista sem mensagem de erro.
O validador detecta e barra.

Convencao: importar `describe`/`it`/`expect`/`beforeEach` de `@jest/globals` e usar o `jest`
global. No backend nao vale — o `ts-jest` hoista normalmente com `jest` importado.

## 6. Teste que toca `services/` precisa de env publica

**Ja corrigido no template**: as envs fake do Supabase moram em `frontend/jest.setup.ts`,
que o `setupFilesAfterEnv` carrega antes dos imports do arquivo de teste. Valores fake de
proposito — teste nao fala com Supabase real. Sem isso, qualquer teste que importe
`services/` (direta ou transitivamente) estoura no import.

## 7. `npm run build` e o unico gate que pega a classe do item 4

`typecheck`, `lint`, testes e o validador passavam todos com o bug do item 4 presente.
So o build executa o prerender. Nunca declarar o bootstrap pronto sem rodar build dos
dois workspaces — e rodar cedo, no esqueleto, nao no fim.
