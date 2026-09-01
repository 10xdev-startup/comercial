import { describe, it, expect } from "@jest/globals"
import { render, screen } from "@testing-library/react"
import { ReadinessStrip } from "@/app/(dashboard)/crm/ReadinessStrip"
import type { CrmReadiness } from "@/types/crm"

const base: CrmReadiness = {
  supabaseConfigured: false,
  openaiKeyPresent: false,
  instagramAppSecretPresent: false,
  instagramPageTokenPresent: false,
  instagramLiveSend: false,
  chromeCdpConfigured: false,
  chromeCdpReachable: false,
  workerPaused: false,
  pauseReason: null,
  webhookUrlHint: "https://SEU_DOMINIO/webhooks/instagram",
  webhookPath: "/webhooks/instagram",
  maxDmsPerDay: 30,
  operatingHours: "09:00-20:00",
  operatingTimezone: "America/Sao_Paulo",
}

describe("ReadinessStrip", () => {
  it("mostra flags em PT-BR sem imprimir segredos", () => {
    render(
      <ReadinessStrip
        readiness={{
          ...base,
          openaiKeyPresent: true,
          chromeCdpConfigured: true,
          chromeCdpReachable: true,
          workerPaused: true,
          pauseReason: "openai_budget",
        }}
      />,
    )
    expect(screen.getByText("Prontidão")).toBeInTheDocument()
    expect(screen.getByText("OpenAI: chave presente")).toBeInTheDocument()
    expect(screen.getByText("Chrome CDP: alcançável")).toBeInTheDocument()
    expect(screen.getByText("Live send: desligado")).toBeInTheDocument()
    expect(screen.getByText("Supabase: memória local")).toBeInTheDocument()
    expect(screen.getByText(/Worker: pausado \(Orçamento da OpenAI no mês atingido\)/)).toBeInTheDocument()
    expect(screen.getByText(/\/webhooks\/instagram/)).toBeInTheDocument()
    expect(screen.getByText(/SETUP.md seção 7/)).toBeInTheDocument()
    expect(screen.queryByText(/sk-/)).not.toBeInTheDocument()
    expect(screen.queryByText(/EAA/)).not.toBeInTheDocument()
    expect(screen.queryByText(/127\.0\.0\.1/)).not.toBeInTheDocument()
  })

  it("mostra Chrome fora do ar quando a URL existe mas não responde", () => {
    render(
      <ReadinessStrip
        readiness={{
          ...base,
          chromeCdpConfigured: true,
          chromeCdpReachable: false,
        }}
      />,
    )
    expect(screen.getByText("Chrome CDP: fora do ar")).toBeInTheDocument()
  })
})
