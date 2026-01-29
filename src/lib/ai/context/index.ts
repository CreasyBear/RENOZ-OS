/**
 * AI Context Module
 *
 * Provides application context for AI operations.
 *
 * ⚠️ NOTE: Builder implementations are in src/server/functions/ai/context/
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

// Builder functions (server-only)
export {
  buildAppContext,
  buildToolContext,
  mergeAppContext,
  getDefaultAppContext,
  DEFAULT_METRICS_FILTER,
  type BuildAppContextInput,
  buildCachedAppContext,
  type BuildCachedAppContextInput,
} from '@/server/functions/ai/context/builder';

// Cache functions (safe - no db)
export {
  type CachedUserContext,
  type CachedOrgContext,
  getCachedUserContext,
  getCachedOrgContext,
  setCachedUserContext,
  setCachedOrgContext,
  invalidateUserContext,
  invalidateOrgContext,
  invalidateOrgContexts,
  getUserContextWithCache,
  getOrgContextWithCache,
} from './cache';
