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

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * TTL values in seconds for different cache types.
 */
export const DASHBOARD_CACHE_TTL = {
  /** Full dashboard metrics - 5 minutes */
  fullMetrics: 5 * 60,
  /** Dashboard summary - 5 minutes */
  summary: 5 * 60,
  /** Chart data - 15 minutes */
  charts: 15 * 60,
  /** Activity feed - 1 minute */
  activity: 60,
  /** Targets - 30 minutes */
  targets: 30 * 60,
  /** Current state - 5 minutes */
  currentState: 5 * 60,
} as const;

/**
 * Cache key prefixes for dashboard data.
 */
export const DASHBOARD_CACHE_KEYS = {
  metrics: 'dashboard:metrics',
  summary: 'dashboard:summary',
  charts: 'dashboard:charts',
  activity: 'dashboard:activity',
  targets: 'dashboard:targets',
  currentState: 'dashboard:current',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardMetricsCacheKey {
  orgId: string;
  dateFrom: string;
  dateTo: string;
  preset?: string;
}

export interface ChartCacheKey {
  orgId: string;
  chartType: string;
  dateRange: string;
}

// ============================================================================
// REDIS CLIENT
// ============================================================================

/**
 * Get Redis client instance.
 * Returns null if Redis is not configured.
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    console.warn('[DashboardCache] Redis not configured - UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN missing');
    return null;
  }

  return new Redis({ url, token });
}

// ============================================================================
// DASHBOARD CACHE CLASS
// ============================================================================

/**
 * Dashboard caching service using Upstash Redis.
 *
 * @example
 * ```typescript
 * // Get cached metrics
 * const cached = await DashboardCache.getMetrics({
 *   orgId: 'org-123',
 *   dateFrom: '2026-01-01',
 *   dateTo: '2026-01-31',
 * });
 *
 * // Set metrics in cache
 * await DashboardCache.setMetrics(
 *   { orgId: 'org-123', dateFrom: '2026-01-01', dateTo: '2026-01-31' },
 *   metricsData
 * );
 *
 * // Invalidate all cache for an organization
 * await DashboardCache.invalidateOrg('org-123');
 * ```
 */
export class DashboardCache {
  // ==========================================================================
  // METRICS
  // ==========================================================================

  /**
   * Build cache key for dashboard metrics.
   */
  private static buildMetricsKey(params: DashboardMetricsCacheKey): string {
    const parts = [
      DASHBOARD_CACHE_KEYS.metrics,
      params.orgId,
      params.dateFrom,
      params.dateTo,
    ];
    if (params.preset) {
      parts.push(params.preset);
    }
    return parts.join(':');
  }

  /**
   * Get cached dashboard metrics.
   * Returns null if not in cache or Redis unavailable.
   */
  static async getMetrics<T = unknown>(params: DashboardMetricsCacheKey): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const key = this.buildMetricsKey(params);
      const cached = await redis.get<T>(key);
      return cached;
    } catch (error) {
      console.error('[DashboardCache] Error getting metrics:', error);
      return null;
    }
  }

  /**
   * Set dashboard metrics in cache.
   */
  static async setMetrics<T = unknown>(
    params: DashboardMetricsCacheKey,
    data: T
  ): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const key = this.buildMetricsKey(params);
      await redis.set(key, data, { ex: DASHBOARD_CACHE_TTL.fullMetrics });
      return true;
    } catch (error) {
      console.error('[DashboardCache] Error setting metrics:', error);
      return false;
    }
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  /**
   * Get cached dashboard summary.
   */
  static async getSummary<T = unknown>(orgId: string): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.summary}:${orgId}`;
      return await redis.get<T>(key);
    } catch (error) {
      console.error('[DashboardCache] Error getting summary:', error);
      return null;
    }
  }

  /**
   * Set dashboard summary in cache.
   */
  static async setSummary<T = unknown>(orgId: string, data: T): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.summary}:${orgId}`;
      await redis.set(key, data, { ex: DASHBOARD_CACHE_TTL.summary });
      return true;
    } catch (error) {
      console.error('[DashboardCache] Error setting summary:', error);
      return false;
    }
  }

  // ==========================================================================
  // CHARTS
  // ==========================================================================

  /**
   * Build cache key for chart data.
   */
  private static buildChartKey(params: ChartCacheKey): string {
    return [
      DASHBOARD_CACHE_KEYS.charts,
      params.orgId,
      params.chartType,
      params.dateRange,
    ].join(':');
  }

  /**
   * Get cached chart data.
   */
  static async getChart<T = unknown>(params: ChartCacheKey): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const key = this.buildChartKey(params);
      return await redis.get<T>(key);
    } catch (error) {
      console.error('[DashboardCache] Error getting chart:', error);
      return null;
    }
  }

  /**
   * Set chart data in cache.
   */
  static async setChart<T = unknown>(params: ChartCacheKey, data: T): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const key = this.buildChartKey(params);
      await redis.set(key, data, { ex: DASHBOARD_CACHE_TTL.charts });
      return true;
    } catch (error) {
      console.error('[DashboardCache] Error setting chart:', error);
      return false;
    }
  }

  // ==========================================================================
  // ACTIVITY
  // ==========================================================================

  /**
   * Get cached activity feed.
   */
  static async getActivity<T = unknown>(orgId: string, page: number = 1): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.activity}:${orgId}:${page}`;
      return await redis.get<T>(key);
    } catch (error) {
      console.error('[DashboardCache] Error getting activity:', error);
      return null;
    }
  }

  /**
   * Set activity feed in cache.
   */
  static async setActivity<T = unknown>(
    orgId: string,
    page: number,
    data: T
  ): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.activity}:${orgId}:${page}`;
      await redis.set(key, data, { ex: DASHBOARD_CACHE_TTL.activity });
      return true;
    } catch (error) {
      console.error('[DashboardCache] Error setting activity:', error);
      return false;
    }
  }

  // ==========================================================================
  // TARGETS
  // ==========================================================================

  /**
   * Get cached targets.
   */
  static async getTargets<T = unknown>(orgId: string): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.targets}:${orgId}`;
      return await redis.get<T>(key);
    } catch (error) {
      console.error('[DashboardCache] Error getting targets:', error);
      return null;
    }
  }

  /**
   * Set targets in cache.
   */
  static async setTargets<T = unknown>(orgId: string, data: T): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.targets}:${orgId}`;
      await redis.set(key, data, { ex: DASHBOARD_CACHE_TTL.targets });
      return true;
    } catch (error) {
      console.error('[DashboardCache] Error setting targets:', error);
      return false;
    }
  }

  // ==========================================================================
  // CURRENT STATE
  // ==========================================================================

  /**
   * Get cached current state.
   */
  static async getCurrentState<T = unknown>(orgId: string): Promise<T | null> {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.currentState}:${orgId}`;
      return await redis.get<T>(key);
    } catch (error) {
      console.error('[DashboardCache] Error getting current state:', error);
      return null;
    }
  }

  /**
   * Set current state in cache.
   */
  static async setCurrentState<T = unknown>(orgId: string, data: T): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const key = `${DASHBOARD_CACHE_KEYS.currentState}:${orgId}`;
      await redis.set(key, data, { ex: DASHBOARD_CACHE_TTL.currentState });
      return true;
    } catch (error) {
      console.error('[DashboardCache] Error setting current state:', error);
      return false;
    }
  }

  // ==========================================================================
  // INVALIDATION
  // ==========================================================================

  /**
   * Invalidate all dashboard cache for an organization.
   * Uses pattern matching to delete all keys for the org.
   */
  static async invalidateOrg(orgId: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      // Find all dashboard keys for this organization
      const patterns = [
        `${DASHBOARD_CACHE_KEYS.metrics}:${orgId}:*`,
        `${DASHBOARD_CACHE_KEYS.summary}:${orgId}`,
        `${DASHBOARD_CACHE_KEYS.charts}:${orgId}:*`,
        `${DASHBOARD_CACHE_KEYS.activity}:${orgId}:*`,
        `${DASHBOARD_CACHE_KEYS.targets}:${orgId}`,
        `${DASHBOARD_CACHE_KEYS.currentState}:${orgId}`,
      ];

      for (const pattern of patterns) {
        // For simple keys (no wildcard), delete directly
        if (!pattern.includes('*')) {
          await redis.del(pattern);
          continue;
        }

        // For pattern keys, scan and delete
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      return true;
    } catch (error) {
      console.error('[DashboardCache] Error invalidating org:', error);
      return false;
    }
  }

  /**
   * Invalidate all dashboard cache across all organizations.
   * Use sparingly - typically only for system-wide cache clear.
   */
  static async invalidateAll(): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const pattern = 'dashboard:*';
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        // Delete in batches to avoid memory issues
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await redis.del(...batch);
        }
      }

      return true;
    } catch (error) {
      console.error('[DashboardCache] Error invalidating all:', error);
      return false;
    }
  }

  /**
   * Invalidate specific cache types for an organization.
   */
  static async invalidateType(
    orgId: string,
    type: keyof typeof DASHBOARD_CACHE_KEYS
  ): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const prefix = DASHBOARD_CACHE_KEYS[type];
      const pattern = `${prefix}:${orgId}*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      return true;
    } catch (error) {
      console.error(`[DashboardCache] Error invalidating ${type}:`, error);
      return false;
    }
  }

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  /**
   * Check if Redis is available and responding.
   */
  static async isHealthy(): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export default DashboardCache;
