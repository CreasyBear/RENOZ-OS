/**
 * AI Context Caching
 *
 * Redis-based caching for user and organization context.
 * Reduces database queries on AI requests by caching slow-changing data.
 * Implements ARCH-006 from helicopter review.
 *
 * Cache Strategy:
 * - User context: 5-minute TTL (roles/permissions may change)
 * - Organization context: 1-hour TTL (settings rarely change)
 *
 * @see patterns/02-app-context.md
 */

import { getRedisMemoryProvider } from '../memory/redis-provider';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Cache TTL values in seconds.
 */
const CACHE_TTL = {
  /** User context - 5 minutes (roles/permissions may change) */
  user: 300,
  /** Organization context - 1 hour (settings rarely change) */
  organization: 3600,
} as const;

/**
 * Cache key prefixes for namespacing.
 */
const CACHE_KEYS = {
  user: 'ai:context:user',
  organization: 'ai:context:org',
} as const;

// ============================================================================
// CACHED CONTEXT TYPES
// ============================================================================

/**
 * Cached user context for AI operations.
 * Contains role and permissions for authorization decisions.
 */
export interface CachedUserContext {
  /** User ID */
  userId: string;
  /** Display name */
  name: string;
  /** Email address */
  email: string;
  /** User role */
  role: string;
  /** Granted permissions */
  permissions: string[];
}

/**
 * Cached organization context for AI operations.
 * Contains settings that affect AI behavior (timezone, locale, currency).
 */
export interface CachedOrgContext {
  /** Organization ID */
  id: string;
  /** Organization name */
  name: string;
  /** Timezone for date/time formatting */
  timezone: string;
  /** Locale for number/date formatting */
  locale: string;
  /** Base currency for monetary values */
  baseCurrency: string;
  /** Extended settings */
  settings: Record<string, unknown>;
}

// ============================================================================
// USER CONTEXT CACHE
// ============================================================================

/**
 * Get cached user context.
 *
 * @param userId - User ID to look up
 * @returns Cached context or null if not found/expired
 */
export async function getCachedUserContext(
  userId: string
): Promise<CachedUserContext | null> {
  const provider = getRedisMemoryProvider();
  const key = `${CACHE_KEYS.user}:${userId}`;

  try {
    const cached = await provider.get<CachedUserContext>(key);
    return cached;
  } catch (error) {
    console.warn('[ContextCache] Failed to get user context from cache:', error);
    return null;
  }
}

/**
 * Set cached user context.
 * Uses fire-and-forget pattern to avoid blocking the response.
 *
 * @param userId - User ID
 * @param context - User context to cache
 */
export function setCachedUserContext(
  userId: string,
  context: CachedUserContext
): void {
  const provider = getRedisMemoryProvider();
  const key = `${CACHE_KEYS.user}:${userId}`;

  // Fire and forget - don't await to avoid blocking
  provider.set(key, context, CACHE_TTL.user).catch((error) => {
    console.warn('[ContextCache] Failed to set user context in cache:', error);
  });
}

/**
 * Invalidate cached user context.
 * Call this when user profile, role, or permissions change.
 *
 * @param userId - User ID to invalidate
 */
export async function invalidateUserContext(userId: string): Promise<void> {
  const provider = getRedisMemoryProvider();
  const key = `${CACHE_KEYS.user}:${userId}`;

  try {
    await provider.delete(key);
  } catch (error) {
    console.warn('[ContextCache] Failed to invalidate user context:', error);
  }
}

// ============================================================================
// ORGANIZATION CONTEXT CACHE
// ============================================================================

/**
 * Get cached organization context.
 *
 * @param organizationId - Organization ID to look up
 * @returns Cached context or null if not found/expired
 */
export async function getCachedOrgContext(
  organizationId: string
): Promise<CachedOrgContext | null> {
  const provider = getRedisMemoryProvider();
  const key = `${CACHE_KEYS.organization}:${organizationId}`;

  try {
    const cached = await provider.get<CachedOrgContext>(key);
    return cached;
  } catch (error) {
    console.warn('[ContextCache] Failed to get org context from cache:', error);
    return null;
  }
}

/**
 * Set cached organization context.
 * Uses fire-and-forget pattern to avoid blocking the response.
 *
 * @param organizationId - Organization ID
 * @param context - Organization context to cache
 */
export function setCachedOrgContext(
  organizationId: string,
  context: CachedOrgContext
): void {
  const provider = getRedisMemoryProvider();
  const key = `${CACHE_KEYS.organization}:${organizationId}`;

  // Fire and forget - don't await to avoid blocking
  provider.set(key, context, CACHE_TTL.organization).catch((error) => {
    console.warn('[ContextCache] Failed to set org context in cache:', error);
  });
}

/**
 * Invalidate cached organization context.
 * Call this when organization settings or configuration change.
 *
 * @param organizationId - Organization ID to invalidate
 */
export async function invalidateOrgContext(organizationId: string): Promise<void> {
  const provider = getRedisMemoryProvider();
  const key = `${CACHE_KEYS.organization}:${organizationId}`;

  try {
    await provider.delete(key);
  } catch (error) {
    console.warn('[ContextCache] Failed to invalidate org context:', error);
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Invalidate all context for an organization.
 * Useful when organization-wide changes occur.
 *
 * @param organizationId - Organization ID
 * @param userIds - Array of user IDs to invalidate
 */
export async function invalidateOrgContexts(
  organizationId: string,
  userIds: string[]
): Promise<void> {
  await Promise.all([
    invalidateOrgContext(organizationId),
    ...userIds.map((userId) => invalidateUserContext(userId)),
  ]);
}

// ============================================================================
// CACHE WITH FETCH HELPERS
// ============================================================================

/**
 * Get user context with fallback to fetch function.
 * Implements the cache-aside pattern.
 *
 * @param userId - User ID
 * @param fetchFn - Function to fetch context on cache miss
 * @returns User context (from cache or freshly fetched)
 */
export async function getUserContextWithCache(
  userId: string,
  fetchFn: () => Promise<CachedUserContext>
): Promise<CachedUserContext> {
  // Try cache first
  const cached = await getCachedUserContext(userId);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const context = await fetchFn();

  // Populate cache (non-blocking)
  setCachedUserContext(userId, context);

  return context;
}

/**
 * Get organization context with fallback to fetch function.
 * Implements the cache-aside pattern.
 *
 * @param organizationId - Organization ID
 * @param fetchFn - Function to fetch context on cache miss
 * @returns Organization context (from cache or freshly fetched)
 */
export async function getOrgContextWithCache(
  organizationId: string,
  fetchFn: () => Promise<CachedOrgContext>
): Promise<CachedOrgContext> {
  // Try cache first
  const cached = await getCachedOrgContext(organizationId);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const context = await fetchFn();

  // Populate cache (non-blocking)
  setCachedOrgContext(organizationId, context);

  return context;
}
