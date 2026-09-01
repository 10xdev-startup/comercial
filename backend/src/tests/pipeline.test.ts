import { describe, it, expect } from '@jest/globals'
import { assertPipelineTransition, canTransitionPipeline, isClientPipelineState } from '@/domain/pipeline'
import { CLIENT_PIPELINE_ORDER } from '@/types/crm'

describe('client pipeline', () => {
  it('allows the documented client transitions and rejects jumps', () => {
    expect(canTransitionPipeline('discovered', 'qualified')).toBe(true)
    expect(canTransitionPipeline('interested', 'whatsapp_handoff')).toBe(true)
    expect(canTransitionPipeline('registered', 'active_customer')).toBe(true)
    expect(canTransitionPipeline('discovered', 'active_customer')).toBe(false)
    expect(() => assertPipelineTransition('contacted', 'registered')).toThrow(/Invalid client pipeline/)
  })

  it('does not include affiliate states', () => {
    expect(CLIENT_PIPELINE_ORDER).toEqual([
      'discovered',
      'qualified',
      'contacted',
      'replied',
      'interested',
      'whatsapp_handoff',
      'registered',
      'active_customer',
      'closed',
    ])
    expect(CLIENT_PIPELINE_ORDER.join(' ')).not.toMatch(/affiliate|joined_affiliate/)
    expect(isClientPipelineState('joined_affiliate_group')).toBe(false)
    expect(isClientPipelineState('active_affiliate')).toBe(false)
  })
})
