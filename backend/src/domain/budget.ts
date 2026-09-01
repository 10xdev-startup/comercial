export function monthlySpendExceedsBudget(spentUsd: number, budgetUsd: number): boolean {
  if (budgetUsd <= 0) return false
  return spentUsd >= budgetUsd
}

/** Rough default rates (USD / 1M tokens) used only for estimated cost until live billing exists. */
export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const rates: Record<string, { in: number; out: number }> = {
    'gpt-4.1': { in: 2, out: 8 },
    'gpt-4.1-mini': { in: 0.4, out: 1.6 },
    stub: { in: 0, out: 0 },
  }
  const rate = rates[model] ?? { in: 2, out: 8 }
  return (promptTokens * rate.in + completionTokens * rate.out) / 1_000_000
}
