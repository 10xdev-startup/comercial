import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '10xMídia',
  description: 'Conecte Meta Ads, Google Ads e planilhas, gere o relatório do cliente com análise escrita por IA e acompanhe leads no CRM.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      {/* Extensoes de browser (ColorZilla, Grammarly...) injetam atributos no body
          antes do React hidratar — o aviso de mismatch que geram nao vem do nosso
          codigo. O suppress vale so para os atributos deste elemento, nao para a arvore. */}
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
