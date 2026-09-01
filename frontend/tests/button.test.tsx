import { describe, it, expect } from "@jest/globals"
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

// Teste de componente: prova que o setup jsdom + Testing Library renderiza de fato.
describe("Button", () => {
  it("renderiza o conteúdo com papel de button", () => {
    render(<Button>Salvar</Button>)
    const button = screen.getByRole("button", { name: "Salvar" })
    // Matchers do @testing-library/jest-dom (via jest.setup.ts).
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent("Salvar")
  })
})
