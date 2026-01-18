/**
 * AppShell Component
 *
 * Main application shell providing the structure for authenticated pages.
 * Includes sidebar navigation, header with user menu, and main content area.
 *
 * Features:
 * - Responsive sidebar (collapsible on mobile)
 * - Sidebar context with 3 modes: offcanvas, icon, none
 * - Keyboard shortcut (Cmd+B) to toggle sidebar
 * - Cookie persistence for sidebar state
 * - Command palette (Cmd+K)
 * - AI sidebar (Cmd+Shift+A)
 * - ARIA labels and keyboard navigation
 *
 * @example
 * ```tsx
 * <AppShell>
 *   <YourPageContent />
 * </AppShell>
 * ```
 */
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { CommandPalette } from './command-palette'
import { AISidebar } from './ai-sidebar'
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal'
import {
  SidebarProvider,
  useSidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
} from './sidebar-provider'

// ============================================================================
// TYPES
// ============================================================================

interface AppShellProps {
  children: ReactNode
}

// ============================================================================
// INNER COMPONENT (uses sidebar context)
// ============================================================================

function AppShellInner({ children }: AppShellProps) {
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
  const {
    isCollapsed,
    collapsible,
    isMobile,
    openMobile,
    setOpenMobile,
  } = useSidebar()

  // Calculate main content padding based on sidebar state
  const showCollapsedSidebar = collapsible === 'icon' && isCollapsed
  const sidebarWidth = showCollapsedSidebar ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH

  // Mobile sidebar width (18rem as per spec)
  const MOBILE_SIDEBAR_WIDTH = '18rem'

  return (
    <div className="flex min-h-screen">
      {/* Command Palette - Cmd+K */}
      <CommandPalette />

      {/* AI Sidebar - Cmd+Shift+A */}
      <AISidebar open={aiSidebarOpen} onOpenChange={setAiSidebarOpen} />

      {/* Keyboard Shortcuts Modal - Cmd+/ */}
      <KeyboardShortcutsModal />

      {/* Mobile sidebar overlay */}
      {isMobile && openMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpenMobile(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpenMobile(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar - desktop: fixed position, mobile: sheet overlay */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50',
          'transform transition-transform duration-200 ease-in-out',
          // Mobile: slide in/out as sheet
          isMobile && (openMobile ? 'translate-x-0' : '-translate-x-full'),
          // Desktop: always visible, relative positioning
          !isMobile && 'md:relative md:z-auto md:translate-x-0'
        )}
        style={{
          width: isMobile ? MOBILE_SIDEBAR_WIDTH : undefined,
        }}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div
        className="flex flex-1 flex-col transition-all duration-200"
        style={{
          // Only add padding on desktop
          paddingLeft: isMobile ? 0 : `var(--sidebar-width, 0)`,
        }}
      >
        {/* CSS to set sidebar width variable on md+ screens */}
        {!isMobile && (
          <style>{`
            :root {
              --sidebar-width: ${sidebarWidth};
            }
          `}</style>
        )}

        {/* Header */}
        <Header
          onMobileMenuClick={() => setOpenMobile(true)}
          onAIClick={() => setAiSidebarOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1" role="main">
          {children}
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT (provides sidebar context)
// ============================================================================

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider defaultCollapsible="icon" defaultState="expanded">
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  )
}
