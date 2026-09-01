import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/**
 * Assina o `matchMedia` via `useSyncExternalStore` — o padrão recomendado para
 * ler estado de uma fonte externa sem `setState` dentro de um effect (regra
 * `react-hooks/set-state-in-effect` do React 19). O snapshot do servidor assume
 * desktop (`false`) para hidratar sem mismatch.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  )
}
