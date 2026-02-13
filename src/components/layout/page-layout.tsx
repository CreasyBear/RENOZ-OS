/* eslint-disable react-refresh/only-export-components -- Layout exports compound components + variants */
/**
 * PageLayout Component
 *
 * Reusable page container with layout variants and compound components.
 *
 * Variants:
 * - container: max-width with center alignment (default)
 * - full-width: no max-width, full horizontal space
 * - narrow: narrower max-width for forms
 * - with-sidebar: detail page with side panel (right)
 * - with-left-sidebar: list page with left filter/sidebar (Products, Schedule)
 *
 * @example
 * ```tsx
 * <PageLayout variant="container">
 *   <PageLayout.Header title="Customers" actions={<Button>Add Customer</Button>} />
 *   <PageLayout.Content>
 *     <CustomerList />
 *   </PageLayout.Content>
 * </PageLayout>
 *
 * // With sidebar
 * <PageLayout variant="with-sidebar">
 *   <PageLayout.Header title="Customer Details" />
 *   <PageLayout.Content>
 *     <CustomerForm />
 *   </PageLayout.Content>
 *   <PageLayout.Sidebar>
 *     <ActivityFeed />
 *   </PageLayout.Sidebar>
 * </PageLayout>
 * ```
 */
import { type ReactNode, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/_shared/use-mobile'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { X } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type PageLayoutVariant = 'container' | 'full-width' | 'narrow' | 'with-sidebar' | 'with-left-sidebar'

interface PageLayoutContextValue {
  variant: PageLayoutVariant
}

interface PageLayoutProps {
  children: ReactNode
  variant?: PageLayoutVariant
  className?: string
}

interface PageHeaderProps {
  /**
   * Page title. Set to `null` for detail pages where EntityHeader displays the title.
   * When null, leading and/or actions are rendered.
   */
  title: ReactNode | null
  description?: ReactNode
  /** Left slot for detail pages (e.g. Back button). Use with title=null. */
  leading?: ReactNode
  actions?: ReactNode
  className?: string
}

interface PageContentProps {
  children: ReactNode
  className?: string
}

interface PageSidebarProps {
  children: ReactNode
  className?: string
  /** Title shown in the drawer header on mobile */
  title?: string
  /** Whether the mobile drawer is open (controlled by useContextPanel) */
  isOpen?: boolean
  /** Callback when the mobile drawer open state changes */
  onOpenChange?: (open: boolean) => void
}

interface PageLeftSidebarProps {
  children: ReactNode
  className?: string
}

// ============================================================================
// CONTEXT
// ============================================================================

const PageLayoutContext = createContext<PageLayoutContextValue | null>(null)

function usePageLayout() {
  const context = useContext(PageLayoutContext)
  if (!context) {
    throw new Error('PageLayout compound components must be used within PageLayout')
  }
  return context
}

// ============================================================================
// VARIANT STYLES
// ============================================================================

const containerStyles: Record<PageLayoutVariant, string> = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  'full-width': 'px-4 sm:px-6 lg:px-8',
  narrow: 'max-w-3xl mx-auto px-4 sm:px-6',
  'with-sidebar': 'px-4 sm:px-6 lg:px-8',
  'with-left-sidebar': 'px-4 sm:px-6 lg:px-8',
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Page header with title, optional description, and action buttons.
 *
 * NOTE: Breadcrumbs are rendered by the global Header component, not here.
 * This follows the single-responsibility principle:
 * - Global Header → navigation concerns (breadcrumbs, search, user menu)
 * - PageLayout.Header → page concerns (title, description, actions)
 * - EntityHeader (in detail views) → entity concerns (name, status, avatar)
 */
function PageHeader({
  title,
  description,
  leading,
  actions,
  className,
}: PageHeaderProps) {
  const { variant } = usePageLayout();

  // Don't render header if title is explicitly null (detail pages use EntityHeader instead)
  if (title === null) {
    if (!leading && !actions) return null
    return (
      <div
        className={cn(
          'py-4 flex flex-wrap items-center justify-between gap-4 overflow-x-hidden',
          className
        )}
      >
        {leading ? (
          <div className="min-w-0 shrink-0">{leading}</div>
        ) : actions ? (
          <div className="min-w-0 flex-1" aria-hidden />
        ) : null}
        {actions && (
          <div className="flex items-center gap-3 shrink-0">{actions}</div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'py-6 border-b border-border',
        variant === 'with-left-sidebar' && 'lg:pl-[17rem]',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0 transition-opacity duration-200">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Main content area within the page layout.
 */
function PageContent({ children, className }: PageContentProps) {
  const { variant } = usePageLayout()

  return (
    <div
      className={cn(
        'py-6 min-w-0',
        variant === 'with-sidebar' && 'lg:pr-80',
        variant === 'with-left-sidebar' && 'lg:pl-[17rem]',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Optional sidebar for detail views (only renders with 'with-sidebar' variant).
 *
 * Responsive behavior:
 * - Desktop (≥1024px): Renders as a fixed right panel
 * - Mobile (<1024px): Renders as a bottom drawer controlled by isOpen/onOpenChange
 *
 * Use the useContextPanel hook to control the mobile drawer state.
 *
 * @example
 * ```tsx
 * const { isOpen, open, setIsOpen } = useContextPanel();
 *
 * <Button className="lg:hidden" onClick={open}>Show Details</Button>
 * <PageLayout.Sidebar
 *   title="Activity"
 *   isOpen={isOpen}
 *   onOpenChange={setIsOpen}
 * >
 *   <ActivityFeed />
 * </PageLayout.Sidebar>
 * ```
 */
function PageSidebar({
  children,
  className,
  title = 'Details',
  isOpen = false,
  onOpenChange,
}: PageSidebarProps) {
  const { variant } = usePageLayout()
  const isMobile = useIsMobile()

  if (variant !== 'with-sidebar') {
    logger.warn('PageLayout.Sidebar should only be used with variant="with-sidebar"')
    return null
  }

  // Desktop: Fixed right panel (always visible)
  if (!isMobile) {
    return (
      <aside
        className={cn(
          'hidden lg:fixed lg:right-0 lg:top-16 lg:bottom-0 lg:w-80',
          'lg:block lg:overflow-y-auto lg:border-l lg:border-border',
          'bg-background p-6',
          className
        )}
      >
        {children}
      </aside>
    )
  }

  // Mobile: Bottom drawer with snap points
  return (
    <Drawer
      open={isOpen}
      onOpenChange={onOpenChange}
      direction="bottom"
    >
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between border-b pb-4">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className={cn('overflow-y-auto p-6', className)}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * Left sidebar for list pages (Products categories, Schedule past-due).
 * Fixed on left, hidden on mobile. Header and Content get lg:pl-[17rem] to align.
 */
function PageLeftSidebar({ children, className }: PageLeftSidebarProps) {
  const { variant } = usePageLayout()

  if (variant !== 'with-left-sidebar') {
    logger.warn('PageLayout.LeftSidebar should only be used with variant="with-left-sidebar"')
    return null
  }

  return (
    <aside
      className={cn(
        'hidden lg:fixed lg:top-16 lg:bottom-0 lg:w-64 lg:z-30',
        'lg:overflow-y-auto lg:border-r lg:border-border',
        'bg-background p-4',
        className
      )}
      style={{
        left: 'var(--app-sidebar-width, 0)',
      }}
    >
      {children}
    </aside>
  )
}

/**
 * PageLayout root component.
 */
function PageLayoutRoot({ children, variant = 'container', className }: PageLayoutProps) {
  return (
    <PageLayoutContext.Provider value={{ variant }}>
      <div className={cn(containerStyles[variant], className)}>
        {children}
      </div>
    </PageLayoutContext.Provider>
  )
}

// ============================================================================
// COMPOUND COMPONENT EXPORT
// ============================================================================

/**
 * PageLayout compound component with Header, Content, and Sidebar sub-components.
 */
export const PageLayout = Object.assign(PageLayoutRoot, {
  Header: PageHeader,
  Content: PageContent,
  Sidebar: PageSidebar,
  LeftSidebar: PageLeftSidebar,
})

// Export hook for accessing layout context
export { usePageLayout }

// Export types for consumers
export type {
  PageLayoutVariant,
  PageLayoutProps,
  PageHeaderProps,
  PageContentProps,
  PageSidebarProps,
  PageLeftSidebarProps,
}
