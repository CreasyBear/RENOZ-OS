/**
 * Rate Limiter for Server Functions
 *
 * Redis-backed limiter for public endpoints with local development fallback.
 * Production fails closed when Redis is missing or unavailable.
 *
 * @example
 * ```ts
 * // In server function
 * const clientId = getClientIdentifier(request)
 * await checkRateLimit('invitation-lookup', clientId, { maxRequests: 10, windowMs: 60000 })
 * ```
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// In-memory store for rate limit tracking
// Key format: `${namespace}:${identifier}`
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const distributedLimiters = new Map<string, Ratelimit>();
let redisClient: Redis | null | undefined;
let warnedMissingRedis = false;

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      // Remove entries older than 1 hour
      if (now - value.windowStart > 60 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

// Start cleanup on module load
startCleanupTimer();

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    if (!isTestRuntime() && !warnedMissingRedis) {
      warnedMissingRedis = true;
      logger.warn(
        '[server-rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Public rate limits fail closed in production and use in-memory fallback outside production.'
      );
    }
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getDistributedLimiter(
  namespace: string,
  options: RateLimitOptions
): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const limiterKey = `${namespace}:${options.maxRequests}:${options.windowMs}`;
  const existing = distributedLimiters.get(limiterKey);
  if (existing) {
    return existing;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      options.maxRequests,
      `${Math.ceil(options.windowMs / 1000)} s`
    ),
    analytics: true,
    prefix: `ratelimit:public:${namespace}:`,
  });
  distributedLimiters.set(limiterKey, limiter);
  return limiter;
}

function unavailableRateLimitResult(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const retryAfterMs = Math.min(options.windowMs, 60 * 1000);
  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(now + retryAfterMs),
    retryAfterMs,
  };
}

/**
 * Check if a request is within rate limits.
 * Returns result without throwing - caller decides how to handle.
 */
export function checkRateLimitSync(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Initialize or reset expired window
  if (!record || now - record.windowStart >= options.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: new Date(now + options.windowMs),
      retryAfterMs: 0,
    };
  }

  // Check if within limit
  if (record.count < options.maxRequests) {
    record.count++;
    return {
      allowed: true,
      remaining: options.maxRequests - record.count,
      resetAt: new Date(record.windowStart + options.windowMs),
      retryAfterMs: 0,
    };
  }

  // Rate limited
  const retryAfterMs = record.windowStart + options.windowMs - now;
  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(record.windowStart + options.windowMs),
    retryAfterMs,
  };
}

/**
 * Check a public-edge rate limit with Redis when configured.
 * Falls back to the in-memory limiter outside production.
 * In production, missing/unavailable Redis fails closed.
 */
export async function checkRateLimitResult(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const limiter = getDistributedLimiter(namespace, options);

  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      const retryAfterMs = Math.max(0, result.reset - Date.now());
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: new Date(result.reset),
        retryAfterMs: result.success ? 0 : retryAfterMs,
      };
    } catch (error) {
      const rateLimitError = error instanceof Error ? error : new Error(String(error));
      logger.error('[server-rate-limit] Redis rate limit check failed', rateLimitError, {
        namespace,
      });
      if (process.env.NODE_ENV === 'production') {
        return unavailableRateLimitResult(options);
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return unavailableRateLimitResult(options);
  }

  return checkRateLimitSync(namespace, identifier, options);
}

/**
 * Check rate limit and throw if exceeded.
 * Use in server functions for automatic error handling.
 */
export async function checkRateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions
): Promise<void> {
  const result = await checkRateLimitResult(namespace, identifier, options);

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
    const message =
      options.message ?? `Too many requests. Please try again in ${retryAfterSeconds} seconds.`;
    throw new RateLimitError(message, result.retryAfterMs);
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class RateLimitError extends Error {
  public readonly retryAfterMs: number;
  public readonly code = 'RATE_LIMIT_EXCEEDED';

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get a client identifier from request headers.
 * Uses IP address as primary identifier with fallback.
 */
export function getClientIdentifier(request?: Request): string {
  if (!request) {
    return 'unknown';
  }

  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (trustProxy) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // Take the first IP (client's actual IP)
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
  }

  // Conservative fallback when proxy headers are untrusted.
  return 'unknown-client';
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Preset rate limit configurations for common use cases.
 */
export const RATE_LIMITS = {
  /** For public lookup endpoints (e.g., invitation by token) */
  publicLookup: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 requests per minute
    message: 'Too many lookup attempts. Please wait a moment.',
  },

  /** For public action endpoints (e.g., accept invitation) */
  publicAction: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    message: 'Too many attempts. Please wait before trying again.',
  },

  /** For password reset requests */
  passwordReset: {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000, // 3 requests per 15 minutes
    message: 'Too many password reset requests. Please try again later.',
  },

  /** For login attempts */
  login: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 10 attempts per 15 minutes
    message: 'Too many login attempts. Please try again later.',
  },

  /**
   * For unsubscribe endpoint (INT-RES-007/SEC-003)
   * @see src/routes/api/unsubscribe.$token.ts
   */
  unsubscribe: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute per IP
    message: 'Too many unsubscribe requests. Please try again in a minute.',
  },

  /**
   * For Resend webhook endpoint (INT-RES-001/SEC-003)
   * @see src/routes/api/webhooks/resend.ts
   */
  resendWebhook: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    message: 'Too many webhook requests.',
  },
} as const;
