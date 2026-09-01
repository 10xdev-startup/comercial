/**
 * Tipa o `jest` GLOBAL nos testes do frontend.
 *
 * Por que existe: `jest.mock()` so e hoistado acima dos imports pelo SWC do
 * next/jest quando `jest` e o global. Se o teste importar `jest` de
 * "@jest/globals", o hoisting nao acontece, o mock nao aplica e o teste passa a
 * exercitar o modulo real — sem erro visivel. Mas o global nao vem tipado (nao
 * usamos @types/jest), entao `tsc --noEmit` acusaria "Cannot find name 'jest'".
 *
 * Aqui o tipo e reaproveitado do proprio "@jest/globals" — sem dependencia nova.
 * `describe`/`it`/`expect` continuam vindo por import, como no resto da suite.
 */
import type { jest as jestObject } from "@jest/globals"

declare global {
  var jest: typeof jestObject
}

export {}
