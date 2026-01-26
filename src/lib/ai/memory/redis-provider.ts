/**
 * Redis Memory Provider
 *
 * Working memory storage using Redis for ephemeral context.
 * Implements AI-INFRA-012 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { Redis } from '@upstash/redis';
import type { MemoryProvider, WorkingMemory } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default TTL values in seconds.
 */
const DEFAULT_TTL = {
  /** Session data - 8 hours */
  session: 8 * 60 * 60,
  /** Recent actions - 1 hour */
  recentActions: 60 * 60,
  /** Pending approvals - 24 hours */
  pendingApprovals: 24 * 60 * 60,
  /** General working memory - from env or 24 hours */
  default: parseInt(process.env.AI_MEMORY_TTL_SECONDS ?? '86400', 10),
} as const;

// ============================================================================
// IN-MEMORY FALLBACK
// ============================================================================

/**
 * In-memory fallback when Redis is unavailable.
 * Used for graceful degradation.
 */
class InMemoryStore {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// ============================================================================
// REDIS MEMORY PROVIDER
// ============================================================================

/**
 * Redis-based memory provider for working memory.
 */
export class RedisMemoryProvider implements MemoryProvider {
  readonly name = 'redis';

  private redis: Redis | null = null;
  private fallback = new InMemoryStore();
  private redisAvailable = true;
  private lastAvailabilityCheck = 0;
  private readonly AVAILABILITY_CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Create a new Redis memory provider.
   */
  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection.
   */
  private initializeRedis(): void {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('[RedisMemoryProvider] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Using in-memory fallback.');
      this.redisAvailable = false;
      return;
    }

    try {
      // Upstash REST API requires both url and token
      this.redis = new Redis({
        url,
        token,
      });
    } catch (error) {
      console.error('[RedisMemoryProvider] Failed to initialize Redis:', error);
      this.redisAvailable = false;
    }
  }

  /**
   * Check if Redis is available.
   * Implements circuit breaker pattern with automatic retry after timeout.
   */
  async isAvailable(): Promise<boolean> {
    // Rate limit availability checks
    const now = Date.now();
    if (now - this.lastAvailabilityCheck < this.AVAILABILITY_CHECK_INTERVAL) {
      return this.redisAvailable;
    }
    this.lastAvailabilityCheck = now;

    // If Redis was unavailable, try to reinitialize (circuit breaker recovery)
    if (!this.redisAvailable || !this.redis) {
      console.info('[RedisMemoryProvider] Attempting to reconnect to Redis...');
      this.initializeRedis();
    }

    if (!this.redis) {
      this.redisAvailable = false;
      return false;
    }

    try {
      await this.redis.ping();
      if (!this.redisAvailable) {
        console.info('[RedisMemoryProvider] Redis connection restored.');
      }
      this.redisAvailable = true;
      return true;
    } catch {
      console.warn('[RedisMemoryProvider] Redis ping failed. Using in-memory fallback.');
      this.redisAvailable = false;
      this.redis = null; // Reset client for next retry
      return false;
    }
  }

  /**
   * Get a value from Redis or fallback.
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.redisAvailable && this.redis) {
      try {
        const value = await this.redis.get<T>(key);
        return value;
      } catch (error) {
        console.error('[RedisMemoryProvider] Get failed, using fallback:', error);
        this.redisAvailable = false;
        this.redis = null; // Reset for next reconnection attempt
      }
    }

    return this.fallback.get<T>(key);
  }

  /**
   * Set a value in Redis or fallback.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? DEFAULT_TTL.default;

    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.set(key, value, { ex: ttl });
        return;
      } catch (error) {
        console.error('[RedisMemoryProvider] Set failed, using fallback:', error);
        this.redisAvailable = false;
        this.redis = null; // Reset for next reconnection attempt
      }
    }

    await this.fallback.set(key, value, ttl);
  }

  /**
   * Delete a value from Redis or fallback.
   */
  async delete(key: string): Promise<void> {
    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (error) {
        console.error('[RedisMemoryProvider] Delete failed, using fallback:', error);
        this.redisAvailable = false;
        this.redis = null; // Reset for next reconnection attempt
      }
    }

    await this.fallback.delete(key);
  }
}

// ============================================================================
// WORKING MEMORY HELPERS
// ============================================================================

/**
 * Generate Redis key for working memory.
 * Pattern: 'working:{orgId}:{userId}:{field}'
 */
export function getWorkingMemoryKey(
  organizationId: string,
  userId: string,
  field?: string
): string {
  const base = `working:${organizationId}:${userId}`;
  return field ? `${base}:${field}` : base;
}

/**
 * Get working memory for a user.
 */
export async function getWorkingMemory(
  provider: MemoryProvider,
  organizationId: string,
  userId: string
): Promise<WorkingMemory | null> {
  const key = getWorkingMemoryKey(organizationId, userId);
  return provider.get<WorkingMemory>(key);
}

/**
 * Set working memory for a user.
 */
export async function setWorkingMemory(
  provider: MemoryProvider,
  memory: WorkingMemory,
  ttlSeconds?: number
): Promise<void> {
  const key = getWorkingMemoryKey(memory.organizationId, memory.userId);
  await provider.set(key, memory, ttlSeconds ?? DEFAULT_TTL.default);
}

/**
 * Update a specific field in working memory.
 */
export async function updateWorkingMemoryField<K extends keyof WorkingMemory>(
  provider: MemoryProvider,
  organizationId: string,
  userId: string,
  field: K,
  value: WorkingMemory[K],
  ttlSeconds?: number
): Promise<void> {
  const existing = await getWorkingMemory(provider, organizationId, userId);
  const updated: WorkingMemory = {
    ...existing,
    userId,
    organizationId,
    [field]: value,
  };
  await setWorkingMemory(provider, updated, ttlSeconds);
}

/**
 * Add a recent action to working memory.
 */
export async function addRecentAction(
  provider: MemoryProvider,
  organizationId: string,
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string
): Promise<void> {
  const existing = await getWorkingMemory(provider, organizationId, userId);
  const recentActions = existing?.recentActions ?? [];

  // Keep last 10 actions
  const updated = [
    {
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
    },
    ...recentActions.slice(0, 9),
  ];

  await updateWorkingMemoryField(
    provider,
    organizationId,
    userId,
    'recentActions',
    updated,
    DEFAULT_TTL.recentActions
  );
}

/**
 * Clear working memory for a user.
 */
export async function clearWorkingMemory(
  provider: MemoryProvider,
  organizationId: string,
  userId: string
): Promise<void> {
  const key = getWorkingMemoryKey(organizationId, userId);
  await provider.delete(key);
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let redisProvider: RedisMemoryProvider | null = null;

/**
 * Get the Redis memory provider singleton.
 */
export function getRedisMemoryProvider(): RedisMemoryProvider {
  if (!redisProvider) {
    redisProvider = new RedisMemoryProvider();
  }
  return redisProvider;
}
