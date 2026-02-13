/**
 * Routing Module
 *
 * Centralized exports for routing utilities and metadata.
 */

export {
  ROUTE_METADATA,
  PUBLIC_ROUTES,
  NAV_GROUPS,
  getRouteMetadata,
  getNavRoutes,
  getNavRoutesByGroup,
  getSearchableRoutes,
  getBreadcrumbLabel,
  isPublicRoute,
} from './routes'

export type { 
  RouteMetadata, 
  PublicRoute,
  NavGroup,
  NavGroupConfig,
} from './routes'
