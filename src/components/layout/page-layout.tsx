/**
 * PageLayout Component
 *
 * Reusable page container with layout variants and compound components.
 *
 * Variants:
 * - container: max-width with center alignment (default)
 * - full-width: no max-width, full horizontal space
 * - narrow: narrower max-width for forms
 * - with-sidebar: detail page with side panel
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

// ============================================================================
// TYPES
// ============================================================================

type PageLayoutVariant = 'container' | 'full-width' | 'narrow' | 'with-sidebar'

interface PageLayoutContextValue {
  variant: PageLayoutVariant
}

interface PageLayoutProps {
  children: ReactNode
  variant?: PageLayoutVariant
  className?: string
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
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
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Page header with title, optional description, and action buttons.
 */
function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        'py-6 border-b border-gray-200',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
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
        'py-6',
        variant === 'with-sidebar' && 'lg:pr-80',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Optional sidebar for detail views (only renders with 'with-sidebar' variant).
 */
function PageSidebar({ children, className }: PageSidebarProps) {
  const { variant } = usePageLayout()

  if (variant !== 'with-sidebar') {
    console.warn('PageLayout.Sidebar should only be used with variant="with-sidebar"')
    return null
  }

  return (
    <aside
      className={cn(
        'hidden lg:fixed lg:right-0 lg:top-16 lg:bottom-0 lg:w-80',
        'lg:block lg:overflow-y-auto lg:border-l lg:border-gray-200',
        'bg-white p-6',
        className
      )}
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
})

// Export types for consumers
export type { PageLayoutVariant, PageLayoutProps, PageHeaderProps }
