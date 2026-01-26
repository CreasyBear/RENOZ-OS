/**
 * AI Context Module
 *
 * Provides application context for AI operations.
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
} from './builder';
