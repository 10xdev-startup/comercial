"use client"

import React, { useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar
} from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Check, LogOut, Maximize2, Minimize2, MousePointerClick, PanelLeft } from 'lucide-react'
import { signOut } from '@/services/authService'

type SidebarMode = 'expanded' | 'collapsed' | 'hover'

const NAV_ITEMS = [
  { href: '/inicio', title: 'Início', icon: '🏠' },
  { href: '/componentes', title: 'Componentes', icon: '🧩' },
]

const SIDEBAR_MODE_KEY = 'sidebar-mode'
const SIDEBAR_MODE_EVENT = 'sidebar-mode-change'

function readSidebarMode(): SidebarMode {
  const stored = localStorage.getItem(SIDEBAR_MODE_KEY)
  return stored === 'collapsed' || stored === 'hover' ? stored : 'expanded'
}

function subscribeSidebarMode(callback: () => void): () => void {
  window.addEventListener(SIDEBAR_MODE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(SIDEBAR_MODE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// Lê o modo persistido sem causar hydration mismatch. O snapshot do server é
// sempre 'expanded', então a primeira renderização do client é idêntica à do
// server; o valor salvo é aplicado logo após a hidratação. Usa useSyncExternalStore
// (em vez de useState + effect) por ser a forma idiomática de ler um sistema
// externo e por não cair na regra react-hooks/set-state-in-effect.
function usePersistedSidebarMode() {
  const mode = React.useSyncExternalStore(
    subscribeSidebarMode,
    readSidebarMode,
    () => 'expanded' as SidebarMode
  )
  const setMode = React.useCallback((next: SidebarMode) => {
    localStorage.setItem(SIDEBAR_MODE_KEY, next)
    window.dispatchEvent(new Event(SIDEBAR_MODE_EVENT))
  }, [])
  return [mode, setMode] as const
}

// false no server e na primeira renderização do client; true após a hidratação.
// Usado para adiar a montagem do DropdownMenu (que gera ids do Radix) para depois
// do hydrate — no primeiro paint server e client renderizam o mesmo botão simples,
// então não há id divergente e o hydration mismatch desaparece.
const noopSubscribe = () => () => {}
function useHydrated() {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false)
}

function AppSidebar() {
  const router    = useRouter()
  const pathname  = usePathname()
  const { setOpen, isMobile } = useSidebar()

  const hydrated = useHydrated()
  const [sidebarMode, setSidebarMode] = usePersistedSidebarMode()

  const prevModeRef = useRef<string | null>('expanded')

  useEffect(() => {
    if (prevModeRef.current === sidebarMode) return
    prevModeRef.current = sidebarMode
    if (isMobile) return
    setOpen(sidebarMode === 'expanded')
  }, [sidebarMode, setOpen, isMobile])

  const leaveTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownOpenRef  = useRef(false)

  const handleEnter = React.useCallback(() => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    setOpen(true)
  }, [setOpen])

  const handleLeave = React.useCallback(() => {
    if (dropdownOpenRef.current) return
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    leaveTimeoutRef.current = setTimeout(() => setOpen(false), 300)
  }, [setOpen])

  const handleDropdownChange = React.useCallback((open: boolean) => {
    dropdownOpenRef.current = open
    if (!open && sidebarMode === 'hover' && !isMobile) {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = setTimeout(() => setOpen(false), 400)
    }
  }, [sidebarMode, isMobile, setOpen])

  useEffect(() => () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
  }, [])

  const appName = useMemo(
    () => process.env['NEXT_PUBLIC_APP_NAME'] || 'Meu Projeto',
    []
  )

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={sidebarMode === 'hover' && !isMobile ? handleEnter : undefined}
      onMouseLeave={sidebarMode === 'hover' && !isMobile ? handleLeave : undefined}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{appName}</span>
                <span className="truncate text-xs text-muted-foreground">v0.1.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-y-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.href)}
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {!hydrated ? (
              <SidebarMenuButton className="text-muted-foreground hover:text-foreground">
                <PanelLeft className="size-4" />
              </SidebarMenuButton>
            ) : (
            <DropdownMenu onOpenChange={handleDropdownChange}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="text-muted-foreground hover:text-foreground">
                  <PanelLeft className="size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSidebarMode('expanded')}>
                  <Maximize2 className="size-4 mr-2" />
                  Expandido
                  {sidebarMode === 'expanded' && <Check className="size-4 ml-auto text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSidebarMode('collapsed')}>
                  <Minimize2 className="size-4 mr-2" />
                  Recolhido
                  {sidebarMode === 'collapsed' && <Check className="size-4 ml-auto text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSidebarMode('hover')}>
                  <MousePointerClick className="size-4 mr-2" />
                  Expandir ao passar
                  {sidebarMode === 'hover' && <Check className="size-4 ml-auto text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut().then(() => window.location.assign('/login'))}>
                  <LogOut className="size-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {sidebarMode === 'hover' && <SidebarRail />}
    </Sidebar>
  )
}

export default React.memo(AppSidebar)
