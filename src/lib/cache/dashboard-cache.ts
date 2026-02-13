/**
 * Dashboard Cache Layer
 *
 * Redis caching for dashboard metrics using Upstash.
 * Provides TTL-based caching with pattern-based invalidation.
 *
 * @see dashboard.prd.json DASH-PERF-CACHE
 * @see docs/plans/2026-01-25-feat-dashboard-performance-infrastructure-plan.md
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * TTL values in seconds for different cache types.
 */
export const DASHBOARD_CACHE_TTL = {
  /** Full dashboard metrics - 5 minutes */
  metrics: 5 * 60,
  /** Current state - 5 minutes */
  currentState: 5 * 60,
} as const;

/**
 * Cache key prefixes for dashboard data.
 */
export const CACHE_PREFIX = 'dashboard';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardCacheKey {
  orgId: string;
  dateFrom: string;
  dateTo: string;
  preset?: string;
}

// ============================================================================
// REDIS CLIENT (Singleton)
// ============================================================================

let redisClient: Redis | null = null;
let warnedMissingConfig = false;

/**
 * Get Redis client instance (singleton).
 * Returns null if Redis is not configured.
 */
function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    if (!warnedMissingConfig) {
      logger.warn('[DashboardCache] Redis not configured');
      warnedMissingConfig = true;
    }
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================

/**
 * Build cache key for dashboard metrics.
 */
function buildKey(params: DashboardCacheKey): string {
  const parts = [CACHE_PREFIX, 'metrics', params.orgId, params.dateFrom, params.dateTo];
  if (params.preset) parts.push(params.preset);
  return parts.join(':');
}

/**
 * Get cached dashboard metrics.
 */
export async function getMetrics<T = unknown>(params: DashboardCacheKey): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return await redis.get<T>(buildKey(params));
  } catch (error) {
    logger.error('[DashboardCache] Get error', error as Error, {});
    return null;
  }
}

/**
 * Set dashboard metrics in cache.
 */
export async function setMetrics<T = unknown>(params: DashboardCacheKey, data: T): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.set(buildKey(params), data, { ex: DASHBOARD_CACHE_TTL.metrics });
    return true;
  } catch (error) {
    logger.error('[DashboardCache] Set error', error as Error, {});
    return false;
  }
}

/**
 * Get cached current state for an organization.
 */
export async function getCurrentState<T = unknown>(orgId: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    return await redis.get<T>(`${CACHE_PREFIX}:current:${orgId}`);
  } catch (error) {
    logger.error('[DashboardCache] Get current state error', error as Error, {});
    return null;
  }
}

/**
 * Set current state in cache.
 */
export async function setCurrentState<T = unknown>(orgId: string, data: T): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    await redis.set(`${CACHE_PREFIX}:current:${orgId}`, data, { ex: DASHBOARD_CACHE_TTL.currentState });
    return true;
  } catch (error) {
    logger.error('[DashboardCache] Set current state error', error as Error, {});
    return false;
  }
}

/**
 * Invalidate all dashboard cache for an organization.
 */
export async function invalidateOrg(orgId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    // Find and delete all keys matching the org pattern
    const pattern = `${CACHE_PREFIX}:*:${orgId}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (error) {
    logger.error('[DashboardCache] Invalidate error', error as Error, {});
    return false;
  }
}

/**
 * Check if Redis is available.
 */
export async function isHealthy(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    return (await redis.ping()) === 'PONG';
  } catch {
    return false;
  }
}

// ============================================================================
// BACKWARDS COMPATIBILITY - DashboardCache class wrapper
// ============================================================================

/**
 * @deprecated Use individual functions instead (getMetrics, setMetrics, etc.)
 * This class is kept for backwards compatibility during migration.
 */
export class DashboardCache {
  static getMetrics = getMetrics;
  static setMetrics = setMetrics;
  static getCurrentState = getCurrentState;
  static setCurrentState = setCurrentState;
  static invalidateOrg = invalidateOrg;
  static isHealthy = isHealthy;

  // Legacy methods that forward to invalidateOrg
  static async invalidateType(orgId: string, _type: string): Promise<boolean> {
    return invalidateOrg(orgId);
  }

  static async invalidateAll(): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;

    try {
      const keys = await redis.keys(`${CACHE_PREFIX}:*`);
      if (keys.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          await redis.del(...keys.slice(i, i + batchSize));
        }
      }
      return true;
    } catch (error) {
      logger.error('[DashboardCache] Invalidate all error', error as Error, {});
      return false;
    }
  }
}

export default DashboardCache;
