"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

/**
 * Sessão do Supabase em React. Só leitura: quem inicia sessão é o `authService`, e o
 * `onAuthStateChange` propaga a mudança pra cá. O perfil completo da aplicação (role,
 * onboardedAt) vem do backend por `userService.getMe()` — não duplicamos essa fonte aqui.
 */

export interface SessionUser {
  id: string
  email: string | null
  name: string | null
  avatarUrl: string | null
}

interface AuthContextValue {
  user: SessionUser | null
  /** true enquanto a sessão inicial não foi lida — evita piscar a tela de deslogado. */
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readMetaString(session: Session, key: string): string | null {
  const value = session.user.user_metadata[key]
  return typeof value === "string" && value ? value : null
}

function toSessionUser(session: Session | null): SessionUser | null {
  if (!session) return null
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: readMetaString(session, "name") ?? readMetaString(session, "full_name"),
    avatarUrl: readMetaString(session, "avatar_url"),
  }
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setUser(toSessionUser(data.session))
        setIsLoading(false)
      })
      .catch(() => {
        if (mounted) setIsLoading(false)
      })

    // Cobre login, logout e refresh de token — inclusive os disparados em outra aba.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(toSessionUser(session))
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: user !== null }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return context
}
