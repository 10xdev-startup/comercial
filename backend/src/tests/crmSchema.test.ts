import { CRM_TABLES } from '@/database/crmSchema'
import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import path from 'path'

describe('crm schema', () => {
  const ddl = readFileSync(path.resolve(__dirname, '../database/crm-schema.sql'), 'utf8')

  it('creates the required tables with separate pipeline and channel fields', () => {
    for (const table of CRM_TABLES) {
      expect(ddl).toContain(`create table if not exists public.${table}`)
    }
    expect(ddl).toContain('pipeline_state')
    expect(ddl).toContain('channel_state')
    expect(ddl).toContain('whatsapp_handoff')
    expect(ddl).toContain('browser_contact_pending')
  })

  it('does not encode an affiliate funnel', () => {
    expect(ddl.toLowerCase()).not.toContain('affiliate')
    expect(ddl).not.toContain('joined_affiliate_group')
    expect(ddl).not.toContain("funnel in ('customer'")
  })
})
