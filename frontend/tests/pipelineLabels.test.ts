import { describe, it, expect } from "@jest/globals"
import { CHANNEL_LABELS, PIPELINE_LABELS, pipelineLabel } from "@/lib/pipelineLabels"

describe("pipelineLabels", () => {
  it("traduz só o funil de clientes", () => {
    expect(pipelineLabel("whatsapp_handoff")).toBe("Encaminhado ao WhatsApp")
    expect(pipelineLabel("active_customer")).toBe("Cliente ativo")
    expect(Object.keys(PIPELINE_LABELS)).not.toContain("joined_affiliate_group")
    expect(Object.keys(PIPELINE_LABELS)).not.toContain("active_affiliate")
    expect(CHANNEL_LABELS.waiting_inbound_reply).toBe("Aguardando resposta")
  })
})
