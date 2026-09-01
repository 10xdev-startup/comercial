import { describe, it, expect } from '@jest/globals'
import { assertPipelineTransition, canTransitionPipeline } from '@/domain/pipeline'

describe('pipeline transitions', () => {
  it('allows customer discovered -> qualified -> contacted -> replied', () => {
    expect(canTransitionPipeline('customer', 'discovered', 'qualified')).toBe(true)
    expect(canTransitionPipeline('customer', 'qualified', 'contacted')).toBe(true)
    expect(canTransitionPipeline('customer', 'contacted', 'replied')).toBe(true)
  })

  it('allows skipping qualify on first contact', () => {
    expect(canTransitionPipeline('customer', 'discovered', 'contacted')).toBe(true)
  })

  it('rejects jumping to active_customer', () => {
    expect(canTransitionPipeline('customer', 'discovered', 'active_customer')).toBe(false)
    expect(() => assertPipelineTransition('customer', 'discovered', 'active_customer')).toThrow(/Invalid pipeline/)
  })

  it('uses affiliate-only states for funnel B', () => {
    expect(canTransitionPipeline('affiliate', 'interested', 'joined_affiliate_group')).toBe(true)
    expect(canTransitionPipeline('customer', 'interested', 'joined_affiliate_group')).toBe(false)
    expect(canTransitionPipeline('affiliate', 'interested', 'whatsapp_handoff')).toBe(false)
  })
})
