#!/usr/bin/env node
/**
 * Apply CRM DDL via Supabase Management API.
 * Usage (from repo root, with backend/.env filled):
 *   npm run apply:crm-schema
 *
 * Does nothing useful without SUPABASE_ACCESS_TOKEN + project ref.
 * Never prints secrets.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv(path.resolve(scriptDir, '..', 'backend', '.env'))

const url = process.env.SUPABASE_URL || ''
const token = process.env.SUPABASE_ACCESS_TOKEN || ''
const refFromEnv = process.env.SUPABASE_PROJECT_REF || ''
const refMatch = url.match(/^https:\/\/([^.]+)\.supabase\.co/)
const projectRef = refFromEnv || (refMatch ? refMatch[1] : '')

function isPlaceholder(value) {
  if (!value) return true
  return value.includes('sua-') || value.includes('aqui') || value.includes('seu-token')
}

if (!projectRef || isPlaceholder(token)) {
  console.error(
    'BLOQUEADO: preencha SUPABASE_PROJECT_REF / SUPABASE_URL e SUPABASE_ACCESS_TOKEN em backend/.env antes de aplicar o schema.',
  )
  process.exit(1)
}

const sqlPath = path.resolve(scriptDir, '..', 'backend', 'src', 'database', 'crm-schema.sql')
const query = fs.readFileSync(sqlPath, 'utf8')
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
})

const body = await response.text()
if (!response.ok) {
  console.error(`Falha HTTP ${response.status} ao aplicar schema (corpo omitido se parecer token).`)
  console.error(body.slice(0, 500))
  process.exit(1)
}
console.log(`Schema CRM aplicado no projeto ${projectRef}.`)
