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

/**
 * Get or create Redis client for rate limiting.
 * Uses lazy initialization with singleton pattern.
 */
function getRedisClient(): Redis | null {
  if (!redisAvailable) {
    return null;
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
    return null;
  }
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
        // Graceful degradation - allow request when Redis unavailable
        return {
          success: true,
          reset: Date.now(),
          remaining: RATE_LIMITS.chat.requests,
          limit: RATE_LIMITS.chat.requests,
        };
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
        // Graceful degradation - allow request on error
        return {
          success: true,
          reset: Date.now(),
          remaining: RATE_LIMITS.chat.requests,
          limit: RATE_LIMITS.chat.requests,
        };
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
        // Graceful degradation - allow request when Redis unavailable
        return {
          success: true,
          reset: Date.now(),
          remaining: RATE_LIMITS.agent.requests,
          limit: RATE_LIMITS.agent.requests,
        };
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
        // Graceful degradation - allow request on error
        return {
          success: true,
          reset: Date.now(),
          remaining: RATE_LIMITS.agent.requests,
          limit: RATE_LIMITS.agent.requests,
        };
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
