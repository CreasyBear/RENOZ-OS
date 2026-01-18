/**
 * Sidebar Hook
 *
 * Re-exports the sidebar context hook for use outside the layout components.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toggle, isCollapsed } = useSidebar()
 *
 *   return (
 *     <button onClick={toggle}>
 *       {isCollapsed ? 'Expand' : 'Collapse'}
 *     </button>
 *   )
 * }
 * ```
 */
export {
  useSidebar,
  useSidebarSafe,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  type SidebarCollapsible,
  type SidebarState,
  type SidebarContextValue,
} from '@/components/layout/sidebar-provider'
