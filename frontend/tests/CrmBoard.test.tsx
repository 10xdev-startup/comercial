import { describe, it, expect, jest } from "@jest/globals"
import { render, screen, fireEvent } from "@testing-library/react"
import { CrmBoardView } from "@/app/(dashboard)/crm/CrmBoard"
import type { Lead } from "@/types/crm"

const lead: Lead = {
  id: "lead-1",
  instagramHandle: "loja_centro",
  displayName: "Loja Centro",
  bio: "Tráfego pago",
  pipelineState: "discovered",
  channelState: "browser_contact_pending",
  score: 72,
  niche: "ads",
  tags: [],
  origin: "test",
  roleGuess: "store",
  nextAction: "qualify",
  nextActionAt: null,
  lastContactedAt: null,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
}

describe("CrmBoardView", () => {
  it("mostra o kanban de clientes em PT-BR e o botão de pausa", () => {
    render(
      <CrmBoardView
        columns={{ discovered: [lead] }}
        metrics={{ leadCount: 1, activeCustomerCount: 0, aiCostUsdThisMonth: 0, aiCostPerLead: 0 }}
        status={{ paused: false, pauseReason: null, updatedAt: "2026-09-01T12:00:00.000Z" }}
        jobs={[]}
        experiments={[]}
        error={null}
        loading={false}
        pausing={false}
        creating={false}
        discovering={false}
        onRefresh={() => undefined}
        onTogglePause={() => undefined}
        onCreateLead={() => undefined}
        onDiscoverLeads={() => undefined}
      />,
    )
    expect(screen.getByRole("heading", { name: "CRM de clientes" })).toBeInTheDocument()
    expect(screen.getByText("Descoberto")).toBeInTheDocument()
    expect(screen.getByText("Loja Centro")).toBeInTheDocument()
    expect(screen.queryByText("Afiliados")).not.toBeInTheDocument()
    expect(screen.queryByText("Entrou no grupo")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pausar sistema" })).toBeInTheDocument()
    expect(screen.getByText("Custo de IA no mês")).toBeInTheDocument()
  })

  it("pausa o sistema pelo botão", () => {
    const onTogglePause = jest.fn()
    render(
      <CrmBoardView
        columns={{ discovered: [lead] }}
        metrics={{ leadCount: 1, activeCustomerCount: 0, aiCostUsdThisMonth: 0, aiCostPerLead: 0 }}
        status={{ paused: false, pauseReason: null, updatedAt: "2026-09-01T12:00:00.000Z" }}
        jobs={[]}
        experiments={[]}
        error={null}
        loading={false}
        pausing={false}
        creating={false}
        discovering={false}
        onRefresh={() => undefined}
        onTogglePause={onTogglePause}
        onCreateLead={() => undefined}
        onDiscoverLeads={() => undefined}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Pausar sistema" }))
    expect(onTogglePause).toHaveBeenCalledTimes(1)
  })

  it("enfileira descoberta simulada e desativa o botão quando pausado", () => {
    const onDiscoverLeads = jest.fn()
    const { rerender } = render(
      <CrmBoardView
        columns={{ discovered: [lead] }}
        metrics={{ leadCount: 1, activeCustomerCount: 0, aiCostUsdThisMonth: 0, aiCostPerLead: 0 }}
        status={{ paused: false, pauseReason: null, updatedAt: "2026-09-01T12:00:00.000Z" }}
        jobs={[]}
        experiments={[]}
        error={null}
        loading={false}
        pausing={false}
        creating={false}
        discovering={false}
        onRefresh={() => undefined}
        onTogglePause={() => undefined}
        onCreateLead={() => undefined}
        onDiscoverLeads={onDiscoverLeads}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Descobrir leads simulados" }))
    expect(onDiscoverLeads).toHaveBeenCalledTimes(1)

    rerender(
      <CrmBoardView
        columns={{ discovered: [lead] }}
        metrics={{ leadCount: 1, activeCustomerCount: 0, aiCostUsdThisMonth: 0, aiCostPerLead: 0 }}
        status={{ paused: true, pauseReason: "manual", updatedAt: "2026-09-01T12:00:00.000Z" }}
        jobs={[]}
        experiments={[]}
        error={null}
        loading={false}
        pausing={false}
        creating={false}
        discovering={false}
        onRefresh={() => undefined}
        onTogglePause={() => undefined}
        onCreateLead={() => undefined}
        onDiscoverLeads={onDiscoverLeads}
      />,
    )
    expect(screen.getByRole("button", { name: "Descobrir leads simulados" })).toBeDisabled()
  })
})
