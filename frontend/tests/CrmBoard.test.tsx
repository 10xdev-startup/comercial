import { describe, it, expect, jest } from "@jest/globals"
import { render, screen, fireEvent } from "@testing-library/react"
import { CrmBoardView, type CrmBoardViewProps } from "@/app/(dashboard)/crm/CrmBoard"
import type { ExperimentSummary, Lead } from "@/types/crm"

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

function boardProps(overrides: Partial<CrmBoardViewProps> = {}): CrmBoardViewProps {
  return {
    columns: { discovered: [lead] },
    metrics: { leadCount: 1, activeCustomerCount: 0, aiCostUsdThisMonth: 0, aiCostPerLead: 0 },
    status: { paused: false, pauseReason: null, updatedAt: "2026-09-01T12:00:00.000Z" },
    jobs: [],
    experiments: [],
    error: null,
    loading: false,
    pausing: false,
    creating: false,
    discovering: false,
    onRefresh: () => undefined,
    onTogglePause: () => undefined,
    onCreateLead: () => undefined,
    onDiscoverLeads: () => undefined,
    ...overrides,
  }
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
    expect(screen.getAllByText("Pausa manual").length).toBeGreaterThan(0)
  })

  it("mostra o motivo da pausa por orçamento, restrição e circuit breaker", () => {
    const { rerender } = render(
      <CrmBoardView {...boardProps({ status: { paused: true, pauseReason: "openai_budget", updatedAt: "2026-09-01T12:00:00.000Z" } })} />,
    )
    expect(screen.getAllByText("Orçamento da OpenAI no mês atingido").length).toBeGreaterThan(0)
    rerender(
      <CrmBoardView {...boardProps({ status: { paused: true, pauseReason: "instagram_restriction", updatedAt: "2026-09-01T12:00:00.000Z" } })} />,
    )
    expect(screen.getAllByText("Restrição ou checkpoint do Instagram").length).toBeGreaterThan(0)
    rerender(
      <CrmBoardView {...boardProps({ status: { paused: true, pauseReason: "error_spike", updatedAt: "2026-09-01T12:00:00.000Z" } })} />,
    )
    expect(screen.getAllByText("Pico de erros (circuit breaker)").length).toBeGreaterThan(0)
    expect(screen.queryByText("openai_budget")).not.toBeInTheDocument()
    expect(screen.queryByText("error_spike")).not.toBeInTheDocument()
  })

  it("cria um experimento de uma variante e recusa vencedor com amostra pequena", () => {
    const onCreateExperiment = jest.fn()
    const onDeclareWinner = jest.fn()
    const experiment: ExperimentSummary = {
      id: "exp-1",
      name: "CTA WhatsApp",
      hypothesis: "zap no primeiro reply",
      status: "running",
      controlVariant: "control",
      variants: ["wa-first"],
      sampleSize: 20,
      winner: null,
      assignedCount: 1,
    }
    render(
      <CrmBoardView
        {...boardProps({
          experiments: [experiment],
          error: "Amostra insuficiente para declarar vencedor",
          onCreateExperiment,
          onDeclareWinner,
        })}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText("CTA WhatsApp"), { target: { value: "abertura" } })
    fireEvent.change(screen.getByPlaceholderText("zap no primeiro reply converte mais"), {
      target: { value: "tom curto" },
    })
    fireEvent.change(screen.getByPlaceholderText("wa-first"), { target: { value: "short" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar experimento" }))
    expect(onCreateExperiment).toHaveBeenCalledWith({
      name: "abertura",
      hypothesis: "tom curto",
      variant: "short",
      sampleSize: 20,
    })
    fireEvent.click(screen.getByRole("button", { name: "Declarar wa-first" }))
    expect(onDeclareWinner).toHaveBeenCalledWith("exp-1", "wa-first")
    expect(screen.getByText("Amostra insuficiente para declarar vencedor")).toBeInTheDocument()
    expect(screen.getByText(/control vs wa-first/)).toBeInTheDocument()
    expect(screen.getByText(/amostra 1\/20/)).toBeInTheDocument()
  })
})
