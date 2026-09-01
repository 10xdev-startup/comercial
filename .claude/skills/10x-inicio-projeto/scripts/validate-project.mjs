#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '../../../..')
const modeArg = process.argv.indexOf('--mode')
const mode = modeArg >= 0 ? process.argv[modeArg + 1] : 'project'
if (!['project', 'template'].includes(mode)) {
  console.error('Uso: validate-project.mjs --mode template|project')
  process.exit(2)
}

const errors = []
const warnings = []
const required = [
  'package.json',
  'package-lock.json',
  '.dockerignore',
  'backend/.env.example',
  'backend/src/controllers',
  'backend/src/models',
  'backend/src/routes',
  'backend/src/middleware',
  'backend/src/database/supabase.ts',
  'frontend/.env.example',
  'frontend/app',
  'frontend/components',
  'frontend/services/apiClient.ts',
  'frontend/lib/supabase/client.ts',
  'frontend/lib/supabase/server.ts',
  'frontend/proxy.ts',
]

for (const item of required) {
  if (!existsSync(join(root, item))) errors.push(`ausente: ${item}`)
}
if (existsSync(join(root, 'frontend/middleware.ts'))) {
  errors.push('frontend/middleware.ts existe; Next.js 16 usa frontend/proxy.ts')
}

function json(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'))
}

const rootPackage = json('package.json')
const frontendPackage = json('frontend/package.json')
if (!String(rootPackage.scripts?.dev ?? '').includes('concurrently')) {
  errors.push('script raiz dev nao inicia workspaces com concurrently')
}
if (!rootPackage.scripts?.typecheck) errors.push('script raiz typecheck ausente')
if (!rootPackage.devDependencies?.concurrently) errors.push('dependencia concurrently ausente na raiz')
if (!frontendPackage.dependencies?.['@supabase/ssr']) errors.push('@supabase/ssr ausente no frontend')

for (const nested of ['backend/package-lock.json', 'frontend/package-lock.json']) {
  if (existsSync(join(root, nested))) errors.push(`lockfile duplicado: ${nested}`)
}

try {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n')
  for (const file of tracked) {
    if (!file || !existsSync(join(root, file))) continue
    if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example')) {
      errors.push(`env real versionado: ${file}`)
    }
  }
} catch {
  warnings.push('nao foi possivel auditar envs versionados via git ls-files')
}

const ignore = readFileSync(join(root, '.gitignore'), 'utf8')
if (!ignore.includes('.env.*') || !ignore.includes('!.env.example')) {
  errors.push('.gitignore nao protege envs reais e exemplos separadamente')
}

function filesUnder(path) {
  const absolute = join(root, path)
  if (!existsSync(absolute)) return []
  const output = []
  for (const entry of readdirSync(absolute)) {
    const child = join(absolute, entry)
    if (statSync(child).isDirectory()) output.push(...filesUnder(relative(root, child)))
    else output.push(child)
  }
  return output
}

for (const file of [...filesUnder('backend/src/controllers'), ...filesUnder('backend/src/routes')]) {
  if (!file.endsWith('.ts')) continue
  const source = readFileSync(file, 'utf8')
  const label = relative(root, file)
  if (/\.from\s*\(/.test(source)) errors.push(`acesso ao banco fora de Model: ${label}`)
  if (/\bres\.json\s*\(/.test(source)) errors.push(`resposta Express sem envelope: ${label}`)
}

for (const base of ['backend/src', 'frontend/app', 'frontend/components', 'frontend/services']) {
  for (const file of filesUnder(base)) {
    if (!/\.(ts|tsx)$/.test(file) || file.includes('/components/ui/') || file.includes('/showcase/')) continue
    const lines = readFileSync(file, 'utf8').split('\n').length
    if (lines > 450) errors.push(`arquivo-deus (${lines} linhas): ${relative(root, file)}`)
    else if (lines > 300) warnings.push(`revisar coesao (${lines} linhas): ${relative(root, file)}`)
  }
}

for (const file of filesUnder('frontend/components')) {
  if (!file.endsWith('.tsx') || file.includes('/ui/') || file.includes('/showcase/')) continue
  const source = readFileSync(file, 'utf8')
  if (/#[0-9a-fA-F]{3,8}\b/.test(source)) errors.push(`cor hexadecimal hardcoded: ${relative(root, file)}`)
  if (/(?:text|bg|border)-(?:blue|red|green|yellow|purple|indigo|cyan|amber)-\d{2,3}/.test(source)) {
    errors.push(`cor Tailwind hardcoded fora de token: ${relative(root, file)}`)
  }
}

// --- Armadilhas do template -------------------------------------------------
// Cada check abaixo nasceu de um bug que passou por typecheck, lint e testes.
// Ver references/armadilhas-template.md para o sintoma completo de cada um.

// 1) Client/env resolvido no escopo do modulo. O Next prerenderiza componentes
//    'use client' no build, entao instanciar no load quebra `next build` em toda
//    maquina sem .env.local — e o erro aponta para a pagina, nao para a causa.
//    Detecta so atribuicao em coluna 0 (escopo de modulo); dentro de funcao e ok.
for (const file of [...filesUnder('frontend/lib'), ...filesUnder('frontend/services')]) {
  if (!/\.(ts|tsx)$/.test(file) || /\.d\.ts$/.test(file)) continue
  const source = readFileSync(file, 'utf8')
  const label = relative(root, file)
  if (/^(?:export\s+)?const\s+\w+\s*=\s*(?:await\s+)?create\w*Client\s*\(/m.test(source)) {
    errors.push(`client instanciado no load do modulo (quebra next build sem env): ${label}`)
  }
  if (/^(?:export\s+)?const\s+\w+\s*=\s*process\.env\b/m.test(source)) {
    errors.push(`env lida no escopo do modulo (congela valor e quebra prerender): ${label}`)
  }
}

// 2) `jest.mock("@/...")` so resolve com moduleNameMapper. O next/jest so o gera
//    sozinho quando o tsconfig declara `baseUrl` — sem isso o SWC reescreve o
//    alias nos imports, mas a string do jest.mock fica intacta e falha.
const frontendTsconfigPath = join(root, 'frontend/tsconfig.json')
const jestConfigPath = join(root, 'frontend/jest.config.mjs')
if (existsSync(frontendTsconfigPath) && existsSync(jestConfigPath)) {
  // tsconfig do Next aceita comentarios; remove antes de parsear.
  const raw = readFileSync(frontendTsconfigPath, 'utf8').replace(/\/\/.*$/gm, '')
  let hasBaseUrl = false
  try {
    hasBaseUrl = Boolean(JSON.parse(raw).compilerOptions?.baseUrl)
  } catch {
    warnings.push('nao foi possivel parsear frontend/tsconfig.json para checar baseUrl')
  }
  const hasMapper = readFileSync(jestConfigPath, 'utf8').includes('moduleNameMapper')
  if (!hasBaseUrl && !hasMapper) {
    errors.push(
      'frontend/jest.config.mjs sem moduleNameMapper e tsconfig sem baseUrl: jest.mock("@/...") vai falhar',
    )
  }
}

// 3) `jest.mock` so e hoistado pelo SWC quando `jest` e o GLOBAL. Importar `jest`
//    de "@jest/globals" desliga o hoisting: o mock NAO aplica, o teste exercita o
//    modulo real e passa ou falha por engano — sem nenhuma mensagem de erro.
for (const file of filesUnder('frontend/tests')) {
  if (!/\.(ts|tsx)$/.test(file)) continue
  const source = readFileSync(file, 'utf8')
  if (!/\bjest\.mock\s*\(/.test(source)) continue
  const importsJest = /import\s*\{[^}]*\bjest\b[^}]*\}\s*from\s*['"]@jest\/globals['"]/.test(source)
  if (importsJest) {
    errors.push(
      `jest.mock nao vai aplicar (jest importado de @jest/globals impede o hoisting): ${relative(root, file)}`,
    )
  }
}

const sidebarPath = join(root, 'frontend/components/AppSidebar.tsx')
if (existsSync(sidebarPath)) {
  const sidebar = readFileSync(sidebarPath, 'utf8')
  const hrefs = [...sidebar.matchAll(/href:\s*['"]([^'"]+)['"]/g)].map((match) => match[1])
  const duplicates = hrefs.filter((href, index) => hrefs.indexOf(href) !== index)
  if (duplicates.length) errors.push(`rotas duplicadas na sidebar: ${[...new Set(duplicates)].join(', ')}`)

  const pageRoutes = filesUnder('frontend/app')
    .filter((file) => file.endsWith('/page.tsx'))
    .map((file) => relative(join(root, 'frontend/app'), file))
    .map((file) => file.replace(/(^|\/)\([^/]+\)/g, '').replace(/\/page\.tsx$/, '') || '/')
    .map((route) => route.startsWith('/') ? route : `/${route}`)
  for (const href of hrefs) {
    if (!pageRoutes.includes(href)) errors.push(`sidebar aponta para rota sem page.tsx: ${href}`)
  }
}

if (mode === 'project') {
  if (rootPackage.name === 'meu-projeto') errors.push('package raiz ainda usa nome meu-projeto')
  const envExample = readFileSync(join(root, 'frontend/.env.example'), 'utf8')
  if (/NEXT_PUBLIC_APP_NAME=Meu Projeto/.test(envExample)) errors.push('nome Meu Projeto ainda esta no env do frontend')
  const plans = existsSync(join(root, '.cursor/plans/fazendo')) ? readdirSync(join(root, '.cursor/plans/fazendo')) : []
  if (!plans.some((name) => name.endsWith('.plan.md'))) errors.push('briefing/plano de inicio nao registrado')
  const workflow = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8')
  if (/\bseu-(?:app|acr|resource|backend|frontend)/.test(workflow)) {
    warnings.push('deploy Azure desabilitado por placeholders; execute deploy-azure antes de publicar')
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`)
for (const error of errors) console.error(`ERRO ${error}`)
if (errors.length) {
  console.error(`\nBootstrap reprovado: ${errors.length} erro(s), ${warnings.length} aviso(s).`)
  process.exit(1)
}
console.log(`Bootstrap aprovado em modo ${mode}: ${warnings.length} aviso(s).`)
