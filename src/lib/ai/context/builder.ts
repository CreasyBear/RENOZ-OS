/**
 * AI Context Builder
 *
 * Functions to build AppContext from various sources.
 * Implements ARCH-001 (context structure) and ARCH-006 (caching) from helicopter review.
 *
 * @see patterns/02-app-context.md
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, organizations } from 'drizzle/schema';
import { getPermittedActions, type Role } from '@/lib/auth/permissions';
import type {
  AppContext,
  UserInfo,
  OrganizationInfo,
  DashboardContext,
  ForcedToolCall,
  MetricsFilter,
  ToolExecutionContext,
} from './types';
import {
  getUserContextWithCache,
  getOrgContextWithCache,
  type CachedUserContext,
  type CachedOrgContext,
} from './cache';

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

// ============================================================================
// CACHED CONTEXT BUILDERS (ARCH-006)
// ============================================================================

/**
 * Input for building cached AppContext.
 * Simpler than BuildAppContextInput since we fetch user/org from cache/DB.
 */
export interface BuildCachedAppContextInput {
  /** User ID to fetch context for */
  userId: string;
  /** Organization ID to fetch context for */
  organizationId: string;
  /** Request context from client (not cached) */
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
    /** Client timezone override */
    timezone?: string;
  };
}

/**
 * Fetch user context from database.
 * Called on cache miss.
 */
async function fetchUserContext(userId: string): Promise<CachedUserContext> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Get permissions for the role
  const permissions = getPermittedActions(user.role as Role);

  return {
    userId: user.id,
    name: user.name ?? '',
    email: user.email,
    role: user.role,
    permissions: [...permissions],
  };
}

/**
 * Fetch organization context from database.
 * Called on cache miss.
 */
async function fetchOrgContext(organizationId: string): Promise<CachedOrgContext> {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      timezone: organizations.timezone,
      locale: organizations.locale,
      currency: organizations.currency,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  return {
    id: org.id,
    name: org.name,
    timezone: org.timezone,
    locale: org.locale,
    baseCurrency: org.currency,
    settings: (org.settings as Record<string, unknown>) ?? {},
  };
}

/**
 * Build AppContext with Redis caching.
 *
 * Uses a 2-level cache strategy:
 * - User context: 5-minute TTL (roles/permissions may change)
 * - Organization context: 1-hour TTL (settings rarely change)
 *
 * Cache writes are non-blocking (fire-and-forget).
 *
 * @example
 * ```typescript
 * const ctx = await withAuth();
 * const appContext = await buildCachedAppContext({
 *   userId: ctx.user.id,
 *   organizationId: ctx.organizationId,
 *   requestContext: body.context,
 * });
 * ```
 */
export async function buildCachedAppContext(
  input: BuildCachedAppContextInput
): Promise<AppContext> {
  const { userId, organizationId, requestContext } = input;

  // Fetch user and org context in parallel (from cache or DB)
  const [cachedUser, cachedOrg] = await Promise.all([
    getUserContextWithCache(userId, () => fetchUserContext(userId)),
    getOrgContextWithCache(organizationId, () => fetchOrgContext(organizationId)),
  ]);

  // Build user info from cached context
  const userInfo: UserInfo = {
    id: cachedUser.userId,
    name: cachedUser.name || undefined,
    email: cachedUser.email || undefined,
    role: cachedUser.role,
    permissions: cachedUser.permissions,
  };

  // Build organization info from cached context
  // Client timezone can override organization timezone
  const orgInfo: OrganizationInfo = {
    id: cachedOrg.id,
    name: cachedOrg.name || undefined,
    timezone: requestContext?.timezone ?? cachedOrg.timezone,
    locale: cachedOrg.locale,
    baseCurrency: cachedOrg.baseCurrency,
  };

  // Build dashboard context if present (not cached - changes per request)
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
