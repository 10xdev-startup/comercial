// Setup global do Jest (frontend), carregado via `setupFilesAfterEnv` no next/jest.
// Roda antes de cada arquivo de teste.

// 1) Matchers de DOM: toBeInTheDocument, toHaveTextContent, toHaveClass, etc.
//    Entry point `/jest-globals` augmenta o `@jest/expect` (usado pelo `expect`
//    do `@jest/globals`) — o import puro augmentaria só o namespace global `jest`.
import "@testing-library/jest-dom/jest-globals"
import { TextEncoder, TextDecoder } from "node:util"

const globalAny = globalThis as unknown as Record<string, unknown>

// 1.5) Envs publicas do Supabase. `lib/supabase/client.ts` cria o client no LOAD do
//      modulo e lanca sem credencial, entao qualquer teste que importe `services/`
//      (direta ou transitivamente) quebraria no import. Valores fake de propósito:
//      teste nao fala com Supabase real — mocke a dependencia externa.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key"

// 2) Polyfills/stubs para APIs que o jsdom NÃO implementa mas que Radix/shadcn usam.
//    Sem isto, testar Dialog/Dropdown/Tooltip/Select quebra com "X is not a function".

// jsdom não expõe TextEncoder/TextDecoder no global.
if (typeof globalThis.TextEncoder === "undefined") {
  globalAny.TextEncoder = TextEncoder
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalAny.TextDecoder = TextDecoder
}

// Radix usa ResizeObserver; o jsdom não tem.
class ResizeObserverStub {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
}
globalAny.ResizeObserver = ResizeObserverStub

// matchMedia é usado por muita UI; o jsdom não implementa.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {
      /* noop (API antiga) */
    },
    removeListener: () => {
      /* noop (API antiga) */
    },
    addEventListener: () => {
      /* noop */
    },
    removeEventListener: () => {
      /* noop */
    },
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// Pointer capture / scroll que popovers, menus e selects do Radix chamam.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    /* noop */
  }
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {
    /* noop */
  }
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {
    /* noop */
  }
}
