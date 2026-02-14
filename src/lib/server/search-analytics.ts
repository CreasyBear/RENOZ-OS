/**
 * Search Analytics
 *
 * Redis-backed search term analytics with in-memory fallback.
 * Tracks search term counts for popular terms and autocomplete suggestions.
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const KEY_TERMS = 'search:analytics:terms';
const KEY_TOTAL = 'search:analytics:total';
const MAX_SEARCH_ANALYTICS_SIZE = 1000;

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn(
      '[search-analytics] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Using in-memory fallback.'
    );
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

// ============================================================================
// IN-MEMORY FALLBACK
// ============================================================================

interface SearchAnalyticsEntry {
  term: string;
  count: number;
  lastSearched: Date;
}

const inMemoryStore = new Map<string, SearchAnalyticsEntry>();

function evictOldestInMemory(): void {
  if (inMemoryStore.size < MAX_SEARCH_ANALYTICS_SIZE) return;

  const entries = Array.from(inMemoryStore.entries());
  entries.sort((a, b) => a[1].lastSearched.getTime() - b[1].lastSearched.getTime());
  const toRemove = entries.length - MAX_SEARCH_ANALYTICS_SIZE;
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    inMemoryStore.delete(entries[i][0]);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Track a search term for analytics.
 */
export async function trackSearchTerm(term: string): Promise<void> {
  const normalizedTerm = term.toLowerCase().trim();
  if (normalizedTerm.length < 2) return;

  const redis = getRedis();

  if (redis) {
    try {
      await redis.zincrby(KEY_TERMS, 1, normalizedTerm);
      await redis.incr(KEY_TOTAL);

      const card = await redis.zcard(KEY_TERMS);
      if (card > MAX_SEARCH_ANALYTICS_SIZE) {
        const removeCount = card - MAX_SEARCH_ANALYTICS_SIZE;
        await redis.zremrangebyrank(KEY_TERMS, 0, removeCount - 1);
      }
    } catch (error) {
      logger.error('[search-analytics] Redis track failed, using in-memory', error as Error, { term: normalizedTerm });
      trackSearchTermInMemory(normalizedTerm);
    }
  } else {
    trackSearchTermInMemory(normalizedTerm);
  }
}

function trackSearchTermInMemory(term: string): void {
  const existing = inMemoryStore.get(term);
  if (existing) {
    inMemoryStore.delete(term);
    existing.count++;
    existing.lastSearched = new Date();
    inMemoryStore.set(term, existing);
  } else {
    evictOldestInMemory();
    inMemoryStore.set(term, {
      term,
      count: 1,
      lastSearched: new Date(),
    });
  }
}

/**
 * Get most popular search terms.
 */
export async function getPopularTerms(limit: number): Promise<Array<{ term: string; count: number }>> {
  const redis = getRedis();

  if (redis) {
    try {
      const results = (await redis.zrange(KEY_TERMS, 0, limit - 1, {
        rev: true,
        withScores: true,
      })) as (string | number)[];
      // Upstash returns interleaved [member, score, member, score, ...]
      const pairs: Array<{ term: string; count: number }> = [];
      for (let i = 0; i < results.length; i += 2) {
        pairs.push({
          term: String(results[i]),
          count: Math.round(Number(results[i + 1] ?? 0)),
        });
      }
      return pairs;
    } catch (error) {
      logger.error('[search-analytics] Redis getPopularTerms failed, using in-memory', error as Error);
      return getPopularTermsInMemory(limit);
    }
  }

  return getPopularTermsInMemory(limit);
}

function getPopularTermsInMemory(limit: number): Array<{ term: string; count: number }> {
  return Array.from(inMemoryStore.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => ({ term: entry.term, count: entry.count }));
}

/**
 * Get popular terms matching a prefix.
 */
export async function getMatchingPopularTerms(prefix: string, limit: number): Promise<string[]> {
  const normalizedPrefix = prefix.toLowerCase().trim();
  const terms = await getPopularTerms(MAX_SEARCH_ANALYTICS_SIZE);
  return terms
    .filter((t) => t.term.startsWith(normalizedPrefix))
    .slice(0, limit)
    .map((t) => t.term);
}

/**
 * Get analytics summary (total searches, unique terms, top terms).
 */
export async function getAnalyticsSummary(period: 'day' | 'week' | 'month'): Promise<{
  totalSearches: number;
  uniqueTerms: number;
  topTerms: Array<{ term: string; count: number; percentage: number }>;
}> {
  const redis = getRedis();

  if (redis) {
    try {
      const [totalStr, topWithScoresRaw] = await Promise.all([
        redis.get<string>(KEY_TOTAL),
        redis.zrange(KEY_TERMS, 0, 9, { rev: true, withScores: true }),
      ]);

      const topWithScores = topWithScoresRaw as (string | number)[];
      const totalSearches = parseInt(totalStr ?? '0', 10);
      const topTerms: Array<{ term: string; count: number; percentage: number }> = [];
      for (let i = 0; i < topWithScores.length; i += 2) {
        const count = Math.round(Number(topWithScores[i + 1] ?? 0));
        topTerms.push({
          term: String(topWithScores[i]),
          count,
          percentage: totalSearches > 0 ? (count / totalSearches) * 100 : 0,
        });
      }

      const uniqueTerms = await redis.zcard(KEY_TERMS);

      return {
        totalSearches,
        uniqueTerms,
        topTerms,
      };
    } catch (error) {
      logger.error('[search-analytics] Redis getAnalyticsSummary failed, using in-memory', error as Error);
      return getAnalyticsSummaryInMemory(period);
    }
  }

  return getAnalyticsSummaryInMemory(period);
}

function getAnalyticsSummaryInMemory(
  _period: 'day' | 'week' | 'month'
): {
  totalSearches: number;
  uniqueTerms: number;
  topTerms: Array<{ term: string; count: number; percentage: number }>;
} {
  const allTerms = Array.from(inMemoryStore.values());
  const totalSearches = allTerms.reduce((sum, t) => sum + t.count, 0);
  const topTerms = allTerms
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((t) => ({
      term: t.term,
      count: t.count,
      percentage: totalSearches > 0 ? (t.count / totalSearches) * 100 : 0,
    }));

  return {
    totalSearches,
    uniqueTerms: allTerms.length,
    topTerms,
  };
}
