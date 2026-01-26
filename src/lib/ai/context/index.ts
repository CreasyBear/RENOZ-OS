/**
 * AI Context Module
 *
 * Provides application context for AI operations.
 * Implements ARCH-001 (context structure) and ARCH-006 (caching).
 */

// Types
export type {
  AppContext,
  UserInfo,
  OrganizationInfo,
  DashboardContext,
  ForcedToolCall,
  MetricsFilter,
  PeriodOption,
  ToolExecutionContext,
} from './types';

// Type guards
export { isPeriodOption, isMetricsFilter } from './types';

// Builder functions
export {
  buildAppContext,
  buildToolContext,
  mergeAppContext,
  getDefaultAppContext,
  DEFAULT_METRICS_FILTER,
  type BuildAppContextInput,
  // Cached builder (ARCH-006)
  buildCachedAppContext,
  type BuildCachedAppContextInput,
} from './builder';

// Cache functions (ARCH-006)
export {
  // Types
  type CachedUserContext,
  type CachedOrgContext,
  // Getters
  getCachedUserContext,
  getCachedOrgContext,
  // Setters (fire-and-forget)
  setCachedUserContext,
  setCachedOrgContext,
  // Invalidation
  invalidateUserContext,
  invalidateOrgContext,
  invalidateOrgContexts,
  // Cache-aside helpers
  getUserContextWithCache,
  getOrgContextWithCache,
} from './cache';
