import fs from 'fs'
import path from 'path'
import { parseBusinessConfig, type BusinessConfig } from '@/domain/claims'

let cached: BusinessConfig | null = null

function candidatePaths(file: string): string[] {
  return [
    path.resolve(process.cwd(), '..', 'config', file),
    path.resolve(process.cwd(), 'config', file),
    path.resolve(__dirname, '..', '..', '..', 'config', file),
  ]
}

function readJson(file: string): unknown | null {
  for (const candidate of candidatePaths(file)) {
    if (!fs.existsSync(candidate)) continue
    return JSON.parse(fs.readFileSync(candidate, 'utf8')) as unknown
  }
  return null
}

export function loadBusinessConfig(): BusinessConfig {
  if (cached) return cached
  const raw = readJson('business.json') ?? readJson('business.example.json')
  if (!raw) {
    throw new Error('Missing config/business.json and config/business.example.json')
  }
  cached = parseBusinessConfig(raw)
  return cached
}

export function resetBusinessConfigCache(): void {
  cached = null
}
