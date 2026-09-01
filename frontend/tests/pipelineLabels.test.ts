import { describe, it, expect } from "@jest/globals"
import { channelLabel, formatUsd, pipelineLabel } from "@/lib/pipelineLabels"

describe("pipelineLabels", () => {
  it("traduz estados do pipeline e do canal para PT-BR", () => {
    expect(pipelineLabel("discovered")).toBe("Descoberto")
    expect(pipelineLabel("whatsapp_handoff")).toBe("Encaminhado ao WhatsApp")
    expect(pipelineLabel("joined_affiliate_group")).toBe("Entrou no grupo")
    expect(channelLabel("waiting_inbound_reply")).toBe("Aguardando resposta")
    expect(channelLabel("do_not_contact")).toBe("Não contatar")
  })

  it("usa travessão quando o custo ainda não existe", () => {
    expect(formatUsd(null)).toBe("—")
    expect(formatUsd(0)).toMatch(/US\$|USD|0/)
  })
})
