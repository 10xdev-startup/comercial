import { describe, it, expect } from "@jest/globals"
import { normalizeRedirectTarget, welcomeHref } from "@/lib/authRedirect"

// Guarda o destino pós-login: usado pelo gate de rotas do proxy (?redirect=) e pela
// tela de boas-vindas (?next=). Dois riscos cobertos aqui — open redirect e
// devolver o usuário pra uma rota do próprio fluxo de entrada.

describe("normalizeRedirectTarget", () => {
  it("cai em /inicio sem valor", () => {
    expect(normalizeRedirectTarget(null)).toBe("/inicio")
    expect(normalizeRedirectTarget(undefined)).toBe("/inicio")
    expect(normalizeRedirectTarget("")).toBe("/inicio")
  })

  it("rejeita valor repetido na query (array)", () => {
    expect(normalizeRedirectTarget(["/inicio", "/componentes"])).toBe("/inicio")
  })

  it("rejeita destino externo", () => {
    expect(normalizeRedirectTarget("https://evil.com")).toBe("/inicio")
    expect(normalizeRedirectTarget("//evil.com")).toBe("/inicio")
    expect(normalizeRedirectTarget("evil.com")).toBe("/inicio")
  })

  it("rejeita os bypasses que o browser normaliza", () => {
    // Começam com '/' e não com '//', mas o parser de URL (igual ao browser)
    // resolve os quatro pra fora do domínio.
    expect(normalizeRedirectTarget("/\\evil.com")).toBe("/inicio")
    expect(normalizeRedirectTarget("/\\/evil.com")).toBe("/inicio")
    expect(normalizeRedirectTarget("/\t/evil.com")).toBe("/inicio")
    expect(normalizeRedirectTarget("/\n/evil.com")).toBe("/inicio")
  })

  it("não confunde hífen com caractere perigoso", () => {
    expect(normalizeRedirectTarget("/componentes/meu-bloco-1")).toBe("/componentes/meu-bloco-1")
  })

  it("rejeita as rotas do fluxo de entrada", () => {
    expect(normalizeRedirectTarget("/login")).toBe("/inicio")
    expect(normalizeRedirectTarget("/login?redirect=/componentes")).toBe("/inicio")
    expect(normalizeRedirectTarget("/cadastro")).toBe("/inicio")
    expect(normalizeRedirectTarget("/cadastro?redirect=/componentes")).toBe("/inicio")
  })

  it("rejeita a própria tela de boas-vindas", () => {
    // Senão vira /seja-bem-vindo?next=/seja-bem-vindo e a CTA cai nela de novo.
    expect(normalizeRedirectTarget("/seja-bem-vindo")).toBe("/inicio")
    expect(normalizeRedirectTarget("/seja-bem-vindo?next=/componentes")).toBe("/inicio")
  })

  it("preserva deep link interno", () => {
    expect(normalizeRedirectTarget("/componentes")).toBe("/componentes")
    expect(normalizeRedirectTarget("/componentes/abc-123")).toBe("/componentes/abc-123")
    expect(normalizeRedirectTarget("/componentes?aba=blocos")).toBe("/componentes?aba=blocos")
  })
})

// Um só lugar monta essa URL: o cadastro leva o primeiro acesso pra cá, e o deep
// link que trouxe o usuário não pode se perder no caminho.
describe("welcomeHref", () => {
  it("sem deep link, vai pra tela limpa", () => {
    expect(welcomeHref("/inicio")).toBe("/seja-bem-vindo")
  })

  it("carrega o deep link no ?next=", () => {
    expect(welcomeHref("/componentes/abc-123")).toBe("/seja-bem-vindo?next=%2Fcomponentes%2Fabc-123")
  })

  it("codifica a query do destino, senão ela se mistura com a do ?next=", () => {
    expect(welcomeHref("/componentes?aba=blocos")).toBe("/seja-bem-vindo?next=%2Fcomponentes%3Faba%3Dblocos")
  })
})
