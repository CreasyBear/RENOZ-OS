/**
 * AI Rate Limiting
 *
 * Implements rate limiting for AI endpoints using Upstash Ratelimit.
 * Implements AI-INFRA-018 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ============================================================================
// TYPES
// ============================================================================

export type RateLimitType = 'chat' | 'agent';

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Timestamp (ms) when the rate limit resets */
  reset: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Total limit for the window */
  limit: number;
}

export interface RateLimitResponse {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Seconds until rate limit resets (for Retry-After header) */
  retryAfter?: number;
  /** Error message if rate limited */
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Security configuration for rate limiting behavior.
 * FAIL_CLOSED: When true, rejects requests when Redis is unavailable (secure).
 * When false, allows requests through (insecure, for development only).
 */
const FAIL_CLOSED = process.env.NODE_ENV === 'production';

/**
 * Retry timeout in milliseconds before attempting to reconnect to Redis
 * after a failure. Implements circuit breaker pattern.
 */
const CIRCUIT_BREAKER_TIMEOUT_MS = 60_000; // 1 minute

const RATE_LIMITS = {
  /** Chat: 20 messages per minute per user */
  chat: {
    requests: 20,
    window: '1m' as const,
  },
  /** Agent: 5 tasks per hour per user */
  agent: {
    requests: 5,
    window: '1h' as const,
  },
} as const;

// ============================================================================
// REDIS CLIENT
// ============================================================================

let redisClient: Redis | null = null;
let redisAvailable = true;
let lastRedisFailure = 0;

/**
 * Get or create Redis client for rate limiting.
 * Uses lazy initialization with singleton pattern and circuit breaker.
 */
function getRedisClient(): Redis | null {
  // Circuit breaker: if Redis failed recently, skip retry until timeout
  if (!redisAvailable) {
    const timeSinceFailure = Date.now() - lastRedisFailure;
    if (timeSinceFailure < CIRCUIT_BREAKER_TIMEOUT_MS) {
      return null;
    }
    // Timeout elapsed, allow retry
    console.info('[AI Rate Limit] Circuit breaker timeout elapsed, retrying Redis connection');
    redisAvailable = true;
  }

  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      '[AI Rate Limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Rate limiting disabled.'
    );
    redisAvailable = false;
    lastRedisFailure = Date.now();
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
    });
    return redisClient;
  } catch (error) {
    console.error('[AI Rate Limit] Failed to initialize Redis client:', error);
    redisAvailable = false;
    lastRedisFailure = Date.now();
    return null;
  }
}

/**
 * Create a fail-closed rate limit result (used when Redis is unavailable in production).
 * Returns a result that rejects the request.
 */
function createFailClosedResult(): RateLimitResult {
  return {
    success: false,
    reset: Date.now() + CIRCUIT_BREAKER_TIMEOUT_MS,
    remaining: 0,
    limit: 0,
  };
}

/**
 * Create a fail-open rate limit result (used in development when Redis is unavailable).
 * Returns a result that allows the request.
 */
function createFailOpenResult(type: RateLimitType): RateLimitResult {
  const config = RATE_LIMITS[type];
  return {
    success: true,
    reset: Date.now(),
    remaining: config.requests,
    limit: config.requests,
  };
}

// ============================================================================
// RATE LIMITERS
// ============================================================================

let chatLimiter: Ratelimit | null = null;
let agentLimiter: Ratelimit | null = null;

/**
 * Get chat rate limiter instance.
 * 20 messages per minute per user using sliding window.
 */
function getChatLimiter(): Ratelimit | null {
  if (chatLimiter) return chatLimiter;

  const redis = getRedisClient();
  if (!redis) return null;

  chatLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.chat.requests, RATE_LIMITS.chat.window),
    prefix: 'ai:chat',
    analytics: true,
  });

  return chatLimiter;
}

/**
 * Get agent rate limiter instance.
 * 5 tasks per hour per user using sliding window.
 */
function getAgentLimiter(): Ratelimit | null {
  if (agentLimiter) return agentLimiter;

  const redis = getRedisClient();
  if (!redis) return null;

  agentLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.agent.requests, RATE_LIMITS.agent.window),
    prefix: 'ai:agent',
    analytics: true,
  });

  return agentLimiter;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * AI rate limiters object for direct access.
 */
export const aiRateLimiters = {
  /**
   * Check chat rate limit for a user.
   * @param userId - The user ID to check
   * @returns Rate limit result
   */
  chat: {
    async limit(userId: string): Promise<RateLimitResult> {
      const limiter = getChatLimiter();

      if (!limiter) {
        // Security: fail-closed in production, fail-open in development
        if (FAIL_CLOSED) {
          console.error('[AI Rate Limit] Redis unavailable in production - rejecting request');
          return createFailClosedResult();
        }
        console.warn('[AI Rate Limit] Redis unavailable in development - allowing request');
        return createFailOpenResult('chat');
      }

      try {
        const result = await limiter.limit(userId);
        return {
          success: result.success,
          reset: result.reset,
          remaining: result.remaining,
          limit: result.limit,
        };
      } catch (error) {
        console.error('[AI Rate Limit] Chat rate limit check failed:', error);
        // Mark Redis as unavailable and trigger circuit breaker
        redisAvailable = false;
        lastRedisFailure = Date.now();
        chatLimiter = null; // Reset limiter for next attempt

        if (FAIL_CLOSED) {
          console.error('[AI Rate Limit] Failing closed due to error in production');
          return createFailClosedResult();
        }
        console.warn('[AI Rate Limit] Failing open due to error in development');
        return createFailOpenResult('chat');
      }
    },
  },

  /**
   * Check agent rate limit for a user.
   * @param userId - The user ID to check
   * @returns Rate limit result
   */
  agent: {
    async limit(userId: string): Promise<RateLimitResult> {
      const limiter = getAgentLimiter();

      if (!limiter) {
        // Security: fail-closed in production, fail-open in development
        if (FAIL_CLOSED) {
          console.error('[AI Rate Limit] Redis unavailable in production - rejecting request');
          return createFailClosedResult();
        }
        console.warn('[AI Rate Limit] Redis unavailable in development - allowing request');
        return createFailOpenResult('agent');
      }

      try {
        const result = await limiter.limit(userId);
        return {
          success: result.success,
          reset: result.reset,
          remaining: result.remaining,
          limit: result.limit,
        };
      } catch (error) {
        console.error('[AI Rate Limit] Agent rate limit check failed:', error);
        // Mark Redis as unavailable and trigger circuit breaker
        redisAvailable = false;
        lastRedisFailure = Date.now();
        agentLimiter = null; // Reset limiter for next attempt

        if (FAIL_CLOSED) {
          console.error('[AI Rate Limit] Failing closed due to error in production');
          return createFailClosedResult();
        }
        console.warn('[AI Rate Limit] Failing open due to error in development');
        return createFailOpenResult('agent');
      }
    },
  },
} as const;

/**
 * Check rate limit for AI endpoints.
 * @param type - The type of rate limit to check ('chat' or 'agent')
 * @param userId - The user ID to check
 * @returns Rate limit response with allowed status and retry info
 */
export async function checkRateLimit(
  type: RateLimitType,
  userId: string
): Promise<RateLimitResponse> {
  const limiter = type === 'chat' ? aiRateLimiters.chat : aiRateLimiters.agent;
  const result = await limiter.limit(userId);

  if (result.success) {
    return { allowed: true };
  }

  // Calculate seconds until reset for Retry-After header
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return {
    allowed: false,
    retryAfter: Math.max(1, retryAfter),
    error: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
  };
}

/**
 * Create a 429 response for rate-limited requests.
 * @param retryAfter - Seconds until rate limit resets
 * @returns Response object with appropriate headers
 */
export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
