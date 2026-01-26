/**
 * AI Context Builder
 *
 * Functions to build AppContext from various sources.
 * Implements ARCH-001 from helicopter review.
 *
 * @see patterns/02-app-context.md
 */

import type {
  AppContext,
  UserInfo,
  OrganizationInfo,
  DashboardContext,
  ForcedToolCall,
  MetricsFilter,
  ToolExecutionContext,
} from './types';

// ============================================================================
// BUILDER INPUTS
// ============================================================================

/**
 * Input for building AppContext from an authenticated request.
 */
export interface BuildAppContextInput {
  /** Authenticated user info */
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  /** User's role */
  role: string;
  /** Organization ID */
  organizationId: string;
  /** Organization details (optional, can be fetched if needed) */
  organization?: {
    name?: string | null;
    timezone?: string | null;
    locale?: string | null;
    baseCurrency?: string | null;
  };
  /** Request context from client */
  requestContext?: {
    /** Current page/view */
    currentView?: string;
    /** Conversation ID */
    conversationId?: string;
    /** Dashboard metrics filter */
    metricsFilter?: MetricsFilter;
    /** Selected entities */
    selectedEntities?: string[];
    /** Active tab */
    activeTab?: string;
    /** Forced tool call from widget click */
    forcedToolCall?: ForcedToolCall;
    /** Client timezone */
    timezone?: string;
  };
}

// ============================================================================
// BUILDER FUNCTIONS
// ============================================================================

/**
 * Build a complete AppContext from request inputs.
 *
 * @example
 * ```typescript
 * const ctx = await withAuth();
 * const appContext = buildAppContext({
 *   user: ctx.user,
 *   role: ctx.role,
 *   organizationId: ctx.organizationId,
 *   requestContext: body.context,
 * });
 * ```
 */
export function buildAppContext(input: BuildAppContextInput): AppContext {
  const {
    user,
    role,
    organizationId,
    organization,
    requestContext,
  } = input;

  // Build user info
  const userInfo: UserInfo = {
    id: user.id,
    name: user.name ?? undefined,
    email: user.email ?? undefined,
    role,
  };

  // Build organization info
  const orgInfo: OrganizationInfo = {
    id: organizationId,
    name: organization?.name ?? undefined,
    timezone: organization?.timezone ?? requestContext?.timezone ?? 'UTC',
    locale: organization?.locale ?? 'en-US',
    baseCurrency: organization?.baseCurrency ?? 'NZD',
  };

  // Build dashboard context if present
  let dashboardContext: DashboardContext | undefined;
  if (requestContext?.currentView || requestContext?.metricsFilter) {
    dashboardContext = {
      activePage: requestContext.currentView,
      metricsFilter: requestContext.metricsFilter,
      selectedEntities: requestContext.selectedEntities,
      activeTab: requestContext.activeTab,
    };
  }

  return {
    user: userInfo,
    organization: orgInfo,
    dashboard: dashboardContext,
    forcedToolCall: requestContext?.forcedToolCall,
    conversationId: requestContext?.conversationId,
  };
}

/**
 * Build a ToolExecutionContext from AppContext.
 * This extracts the minimal context needed for tool execution.
 */
export function buildToolContext(appContext: AppContext): ToolExecutionContext {
  return {
    userId: appContext.user.id,
    organizationId: appContext.organization.id,
    conversationId: appContext.conversationId,
    timezone: appContext.organization.timezone,
    baseCurrency: appContext.organization.baseCurrency,
    metricsFilter: appContext.dashboard?.metricsFilter,
    forcedToolParams: appContext.forcedToolCall?.toolParams,
  };
}

/**
 * Merge partial context updates into existing AppContext.
 * Useful for updating context mid-conversation.
 */
export function mergeAppContext(
  base: AppContext,
  updates: Partial<{
    dashboard: Partial<DashboardContext>;
    forcedToolCall: ForcedToolCall | null;
  }>
): AppContext {
  return {
    ...base,
    dashboard: updates.dashboard
      ? { ...base.dashboard, ...updates.dashboard }
      : base.dashboard,
    forcedToolCall: updates.forcedToolCall === null
      ? undefined
      : updates.forcedToolCall ?? base.forcedToolCall,
  };
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default metrics filter (last 30 days).
 */
export const DEFAULT_METRICS_FILTER: MetricsFilter = {
  period: 'last_30_days',
};

/**
 * Get default AppContext for testing/development.
 */
export function getDefaultAppContext(userId: string, organizationId: string): AppContext {
  return {
    user: {
      id: userId,
      role: 'member',
    },
    organization: {
      id: organizationId,
      timezone: 'UTC',
      locale: 'en-US',
      baseCurrency: 'NZD',
    },
    dashboard: {
      metricsFilter: DEFAULT_METRICS_FILTER,
    },
  };
}
