/**
 * Sidebar Provider
 *
 * Context provider for sidebar state management.
 * Handles collapse modes, keyboard shortcuts, and cookie persistence.
 *
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <AppShell>
 *     <Sidebar />
 *     <Main />
 *   </AppShell>
 * </SidebarProvider>
 * ```
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useIsMobile } from '@/hooks'

// ============================================================================
// CONSTANTS
// ============================================================================

export const SIDEBAR_WIDTH = '16rem' // 256px expanded
export const SIDEBAR_WIDTH_COLLAPSED = '3rem' // 48px collapsed (icon mode)
export const SIDEBAR_COOKIE_NAME = 'sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// ============================================================================
// TYPES
// ============================================================================

export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'
export type SidebarState = 'expanded' | 'collapsed'

export interface SidebarContextValue {
  /**
   * Current sidebar state
   */
  state: SidebarState
  /**
   * Whether sidebar is expanded
   */
  isExpanded: boolean
  /**
   * Whether sidebar is collapsed
   */
  isCollapsed: boolean
  /**
   * Collapse mode
   */
  collapsible: SidebarCollapsible
  /**
   * Toggle sidebar state
   */
  toggle: () => void
  /**
   * Expand sidebar
   */
  expand: () => void
  /**
   * Collapse sidebar
   */
  collapse: () => void
  /**
   * Set collapse mode
   */
  setCollapsible: (mode: SidebarCollapsible) => void
  /**
   * Whether viewport is mobile-sized
   */
  isMobile: boolean
  /**
   * Mobile sheet open state
   */
  openMobile: boolean
  /**
   * Set mobile sheet open state
   */
  setOpenMobile: (open: boolean) => void
  /**
   * Toggle mobile sheet
   */
  toggleMobile: () => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const SidebarContext = createContext<SidebarContextValue | null>(null)

// ============================================================================
// COOKIE HELPERS
// ============================================================================

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  return undefined
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

// ============================================================================
// PROVIDER
// ============================================================================

interface SidebarProviderProps {
  children: ReactNode
  /**
   * Default collapse mode
   * @default 'icon'
   */
  defaultCollapsible?: SidebarCollapsible
  /**
   * Default state
   * @default 'expanded'
   */
  defaultState?: SidebarState
  /**
   * Whether to persist state in cookie
   * @default true
   */
  persistState?: boolean
}

export function SidebarProvider({
  children,
  defaultCollapsible = 'icon',
  defaultState = 'expanded',
  persistState = true,
}: SidebarProviderProps) {
  // Initialize state from cookie or default
  const [state, setState] = useState<SidebarState>(() => {
    if (persistState) {
      const saved = getCookie(SIDEBAR_COOKIE_NAME)
      if (saved === 'expanded' || saved === 'collapsed') {
        return saved
      }
    }
    return defaultState
  })

  const [collapsible, setCollapsibleState] = useState<SidebarCollapsible>(defaultCollapsible)

  // Mobile state (separate from desktop collapsed state)
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = useState(false)

  // Close mobile sheet when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile])

  // Persist state to cookie
  useEffect(() => {
    if (persistState) {
      setCookie(SIDEBAR_COOKIE_NAME, state, SIDEBAR_COOKIE_MAX_AGE)
    }
  }, [state, persistState])

  // Keyboard shortcut: Cmd/Ctrl + B
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setState((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggle = useCallback(() => {
    setState((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'))
  }, [])

  const expand = useCallback(() => {
    setState('expanded')
  }, [])

  const collapse = useCallback(() => {
    setState('collapsed')
  }, [])

  const setCollapsible = useCallback((mode: SidebarCollapsible) => {
    setCollapsibleState(mode)
    // If changing to 'none', ensure expanded
    if (mode === 'none') {
      setState('expanded')
    }
  }, [])

  const toggleMobile = useCallback(() => {
    setOpenMobile((prev) => !prev)
  }, [])

  const value: SidebarContextValue = {
    state,
    isExpanded: state === 'expanded',
    isCollapsed: state === 'collapsed',
    collapsible,
    toggle,
    expand,
    collapse,
    setCollapsible,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleMobile,
  }

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

/**
 * Safe version that returns null outside of provider
 */
export function useSidebarSafe(): SidebarContextValue | null {
  return useContext(SidebarContext)
}
