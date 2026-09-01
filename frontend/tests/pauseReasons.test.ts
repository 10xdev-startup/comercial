import { describe, it, expect } from "@jest/globals"
import { pauseReasonLabel, pausedSystemCopy } from "@/lib/pauseReasons"

describe("pauseReasonLabel", () => {
  it("traduz os códigos de pausa visíveis ao operador", () => {
    expect(pauseReasonLabel("openai_budget")).toBe("Orçamento da OpenAI no mês atingido")
    expect(pauseReasonLabel("instagram_restriction")).toBe("Restrição ou checkpoint do Instagram")
    expect(pauseReasonLabel("error_spike")).toBe("Pico de erros (circuit breaker)")
    expect(pauseReasonLabel("opt_out_spike")).toBe("Pico de pedidos de opt-out")
    expect(pauseReasonLabel("browser_unavailable")).toBe("Chrome do operador indisponível")
    expect(pauseReasonLabel("manual")).toBe("Pausa manual")
    expect(pausedSystemCopy("openai_budget")).toMatch(/Orçamento da OpenAI/)
  })
})
