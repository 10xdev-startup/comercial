import { describe, it, expect, jest } from "@jest/globals"
import { render, screen, fireEvent } from "@testing-library/react"
import { FirstContactActions, SimulateInboundActions } from "@/app/(dashboard)/crm/leads/[id]/LeadDetail"

describe("FirstContactActions", () => {
  it("mostra o botão de primeiro contato e o aviso de dry-run", () => {
    const onEnqueue = jest.fn()
    render(
      <FirstContactActions
        paused={false}
        pauseReason={null}
        canEnqueue
        enqueueing={false}
        liveSend={false}
        onEnqueue={onEnqueue}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Enfileirar primeiro contato" }))
    expect(onEnqueue).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/não clica em Enviar no Instagram/i)).toBeInTheDocument()
    expect(screen.getByText(/INSTAGRAM_LIVE_SEND=true/)).toBeInTheDocument()
  })

  it("desativa o botão quando o sistema está pausado", () => {
    render(
      <FirstContactActions
        paused
        pauseReason="manual"
        canEnqueue
        enqueueing={false}
        liveSend={false}
        onEnqueue={() => undefined}
      />,
    )
    expect(screen.getByRole("button", { name: "Enfileirar primeiro contato" })).toBeDisabled()
    expect(screen.getByText(/Sistema pausado \(Pausa manual\)/)).toBeInTheDocument()
  })
})

describe("SimulateInboundActions", () => {
  it("dispara pergunta, opt-in e opt-out sem Meta", () => {
    const onSimulate = jest.fn()
    render(<SimulateInboundActions simulating={false} onSimulate={onSimulate} />)
    fireEvent.click(screen.getByRole("button", { name: "Simular pergunta" }))
    fireEvent.click(screen.getByRole("button", { name: "Simular opt-in (WhatsApp)" }))
    fireEvent.click(screen.getByRole("button", { name: "Simular opt-out" }))
    expect(onSimulate).toHaveBeenNthCalledWith(1, "question")
    expect(onSimulate).toHaveBeenNthCalledWith(2, "opt_in")
    expect(onSimulate).toHaveBeenNthCalledWith(3, "opt_out")
    expect(screen.getByText(/Sem Meta e sem Chrome/)).toBeInTheDocument()
  })
})
