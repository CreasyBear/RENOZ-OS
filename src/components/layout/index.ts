/**
 * Layout Components
 *
 * Exports for the application shell and layout components.
 */

export { AppShell } from './app-shell'
export { Sidebar } from './sidebar'
export { SidebarNavItem } from './sidebar-nav-item'
export { Header } from './header'
export { Breadcrumbs } from './breadcrumbs'
export { UserMenu } from './user-menu'
export { PageLayout } from './page-layout'
export type { PageLayoutVariant, PageLayoutProps, PageHeaderProps } from './page-layout'
export { CommandPalette } from './command-palette'
export { AISidebar } from './ai-sidebar'
export { AIMessageList, type Message } from './ai-message-list'
export { AIChatInput } from './ai-chat-input'
export {
  SidebarProvider,
  useSidebar,
  useSidebarSafe,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_COOKIE_NAME,
  type SidebarCollapsible,
  type SidebarState,
  type SidebarContextValue,
} from './sidebar-provider'
export { SidebarRail } from './sidebar-rail'
export { RouteErrorFallback } from './route-error-fallback'
