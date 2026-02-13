/* eslint-disable react-refresh/only-export-components -- Layout exports compound components */
/**
 * RouteShell Component
 *
 * Thin wrapper around PageLayout that provides route-aware defaults
 * and semantic aliases for common patterns.
 *
 * This is the recommended layout component for all authenticated routes.
 * It provides consistent structure with breadcrumbs, error handling,
 * and responsive sidebars.
 *
 * @example
 * ```tsx
 * // List view
 * <RouteShell variant="full-width">
 *   <RouteShell.Header title="Customers" actions={<Button>Add</Button>} />
 *   <RouteShell.Content>
 *     <CustomerTable />
 *   </RouteShell.Content>
 * </RouteShell>
 *
 * // Detail view with responsive context panel
 * const { isOpen, open, setIsOpen } = useContextPanel();
 *
 * <RouteShell variant="with-panel">
 *   <RouteShell.Header
 *     title="Customer Details"
 *     actions={<Button className="lg:hidden" onClick={open}>Show Activity</Button>}
 *   />
 *   <RouteShell.Content>
 *     <CustomerForm />
 *   </RouteShell.Content>
 *   <RouteShell.ContextPanel
 *     title="Activity"
 *     isOpen={isOpen}
 *     onOpenChange={setIsOpen}
 *   >
 *     <ActivityTimeline />
 *   </RouteShell.ContextPanel>
 * </RouteShell>
 * ```
 */
import { PageLayout } from './page-layout'
import type {
  PageLayoutVariant,
  PageLayoutProps,
  PageHeaderProps,
  PageSidebarProps,
} from './page-layout'

// ============================================================================
// TYPE ALIASES
// ============================================================================

/**
 * RouteShell variant - semantic alias for PageLayoutVariant.
 *
 * - `full-width`: List views, dashboards - no max-width
 * - `container`: Detail views - centered with max-width
 * - `narrow`: Settings, forms - narrow centered
 * - `with-panel`: Master-detail with right context panel
 */
export type RouteShellVariant = PageLayoutVariant

export type RouteShellProps = PageLayoutProps;
export type RouteShellHeaderProps = PageHeaderProps;
export type RouteShellContextPanelProps = PageSidebarProps;

// ============================================================================
// ROUTE SHELL COMPOUND COMPONENT
// ============================================================================

/**
 * RouteShell - Standard layout for all authenticated routes.
 *
 * Wraps PageLayout with semantic aliases:
 * - RouteShell.Header = PageLayout.Header (with breadcrumbs)
 * - RouteShell.Content = PageLayout.Content
 * - RouteShell.ContextPanel = PageLayout.Sidebar (semantic naming)
 * - RouteShell.Footer = New component for sticky footers
 */
export const RouteShell = Object.assign(
  function RouteShellRoot(props: RouteShellProps) {
    return <PageLayout {...props} />
  },
  {
    /** Page header with breadcrumbs, title, and actions */
    Header: PageLayout.Header,

    /** Main content area */
    Content: PageLayout.Content,

    /**
     * Context panel (right sidebar on desktop, bottom sheet on mobile).
     * Only renders with variant="with-panel" or variant="with-sidebar".
     */
    ContextPanel: PageLayout.Sidebar,

    /** Alias for Sidebar - use ContextPanel for semantic clarity */
    Sidebar: PageLayout.Sidebar,
  }
)

// ============================================================================
// HOOK FOR ACCESSING ROUTE SHELL STATE
// ============================================================================

/**
 * useRouteShell - Access the current RouteShell context.
 *
 * Use this hook in child components to access layout state,
 * such as the current variant.
 *
 * Note: This re-exports the PageLayout context hook.
 */
export { usePageLayout as useRouteShell } from './page-layout'

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

export type { PageLayoutVariant, PageLayoutProps, PageHeaderProps, PageSidebarProps }
