import { describe, it, expect } from "@jest/globals"
import { ApiRequestError, isApiRequestError, toApiRequestError, isNotFound, requiresAuth } from "@/services/apiErrors"

describe("apiErrors", () => {
  it("classifica status nos helpers nomeados", () => {
    expect(isNotFound(new ApiRequestError(404, "x"))).toBe(true)
    expect(requiresAuth(new ApiRequestError(401, "x"))).toBe(true)
    expect(isNotFound(new ApiRequestError(500, "x"))).toBe(false)
  })

  it("toApiRequestError não re-embrulha um ApiRequestError existente", () => {
    const err = new ApiRequestError(402, "sem créditos", "NO_CREDITS")
    expect(toApiRequestError(err, "fallback")).toBe(err)
  })

  it("toApiRequestError converte Error genérico preservando a mensagem", () => {
    const out = toApiRequestError(new Error("boom"), "fallback")
    expect(isApiRequestError(out)).toBe(true)
    expect(out.message).toBe("boom")
    expect(out.status).toBe(0)
  })
})
