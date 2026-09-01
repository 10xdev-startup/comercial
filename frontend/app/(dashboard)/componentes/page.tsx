import { readFileSync } from "fs"
import { join } from "path"
import { SHOWCASE_BLOCKS } from "@/lib/showcase"
import { ShowcaseGallery } from "@/components/showcase/ShowcaseGallery"

// Lê o código direto do arquivo fonte de cada bloco — sem strings duplicadas,
// então o "Copiar código" nunca fica fora de sincronia com o componente real.
function readBlockSources(): Record<string, string> {
  const cwd = process.cwd()
  const codeById: Record<string, string> = {}

  for (const block of SHOWCASE_BLOCKS) {
    const candidates = [join(cwd, block.file), join(cwd, "frontend", block.file)]
    let source = ""
    for (const path of candidates) {
      try {
        source = readFileSync(path, "utf8")
        break
      } catch {
        // tenta o próximo caminho candidato
      }
    }
    codeById[block.id] = source
  }

  return codeById
}

export default function ComponentesPage() {
  const codeById = readBlockSources()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-2">
      <div>
        <h1 className="text-xl font-bold text-foreground">Vitrine de Componentes</h1>
        <p className="text-sm text-muted-foreground">
          Blocos prontos e genéricos para começar seu projeto. Clique em “Copiar código” e cole no seu app.
        </p>
      </div>
      <ShowcaseGallery codeById={codeById} />
    </div>
  )
}
