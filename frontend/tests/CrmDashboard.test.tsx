import { describe, it, expect, jest } from "@jest/globals"
import { render, screen, fireEvent } from "@testing-library/react"
import { CrmBoardView } from "@/app/(dashboard)/crm/CrmDashboard"
import type { Lead } from "@/types/crm"

const lead: Lead = {
  id: "lead-1",
  instagramHandle: "loja_centro",
  displayName: "Loja Centro",
  bio: "Moda",
  funnel: "customer",
  pipelineState: "discovered",
  channelState: "browser_contact_pending",
  score: 72,
  niche: "moda",
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
  it("mostra o kanban em PT-BR, métricas placeholder e o botão de pausa", () => {
    render(
      <CrmBoardView
        funnel="customer"
        columns={{ discovered: [lead] }}
        metrics={{
          leadCount: 1,
          activeCustomerCount: 0,
          monthlySpendUsd: 0,
          monthlyBudgetUsd: 50,
          costPerLeadUsd: null,
          costPerActiveCustomerUsd: null,
        }}
        status={{ paused: false, pauseReason: null, updatedAt: "2026-09-01T12:00:00.000Z" }}
        jobs={[]}
        error={null}
        loading={false}
        pausing={false}
        onFunnelChange={() => undefined}
        onRefresh={() => undefined}
        onTogglePause={() => undefined}
      />,
    )
    expect(screen.getByRole("heading", { name: "CRM comercial" })).toBeInTheDocument()
    expect(screen.getByText("Custo de IA / lead")).toBeInTheDocument()
    expect(screen.getByText("Descoberto")).toBeInTheDocument()
    expect(screen.getByText("Loja Centro")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pausar sistema" })).toBeInTheDocument()
  })

  it("pausa o sistema pelo botão", () => {
    const onTogglePause = jest.fn()
    render(
      <CrmBoardView
        funnel="customer"
        columns={{ discovered: [lead] }}
        metrics={null}
        status={{ paused: false, pauseReason: null, updatedAt: "2026-09-01T12:00:00.000Z" }}
        jobs={[]}
        error={null}
        loading={false}
        pausing={false}
        onFunnelChange={() => undefined}
        onRefresh={() => undefined}
        onTogglePause={onTogglePause}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Pausar sistema" }))
    expect(onTogglePause).toHaveBeenCalledTimes(1)
  })
})
