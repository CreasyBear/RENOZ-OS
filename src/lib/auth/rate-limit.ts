/**
 * Server-Side Rate Limiting
 *
 * Uses Upstash Redis for distributed rate limiting.
 * Provides protection against brute-force attacks on login and other sensitive endpoints.
 *
 * SECURITY: This replaces client-side rate limiting which resets on page refresh.
 * Server-side tracking persists across sessions and cannot be bypassed by the client.
 *
 * @see https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { logger } from "@/lib/logger";

// ============================================================================
// REDIS CLIENT
// ============================================================================

/**
 * Upstash Redis client.
 * Falls back to no-op if not configured (development without Redis).
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Rate limiting disabled."
    );
    return null;
  }

  return new Redis({ url, token });
}

const redis = getRedisClient();
const inMemoryFallback = new Map<string, { count: number; windowStart: number }>();

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Login rate limiter.
 * 5 attempts per 15 minutes per identifier (email or IP).
 */
const loginRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "ratelimit:login:",
    })
  : null;

/**
 * API rate limiter.
 * 100 requests per minute per API token.
 */
const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "ratelimit:api:",
    })
  : null;

/**
 * Password reset rate limiter.
 * 3 attempts per hour per email.
 */
const passwordResetRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "ratelimit:password-reset:",
    })
  : null;

/**
 * Resend confirmation email rate limiter.
 * 3 attempts per hour per email (align with password reset).
 */
const resendConfirmationRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "ratelimit:resend-confirmation:",
    })
  : null;

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const FALLBACK_KEY_PREFIX = 'ratelimit-fallback';

function applyInMemoryFallbackLimit(
  namespace: string,
  identifier: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const key = `${FALLBACK_KEY_PREFIX}:${namespace}:${identifier}`;
  const now = Date.now();
  const current = inMemoryFallback.get(key);

  if (!current || now - current.windowStart >= windowMs) {
    inMemoryFallback.set(key, { count: 1, windowStart: now });
    return { success: true, remaining: maxAttempts - 1, reset: now + windowMs };
  }

  if (current.count >= maxAttempts) {
    throw new RateLimitError(
      `Too many login attempts. Please try again in ${Math.ceil((current.windowStart + windowMs - now) / 60000)} minutes.`,
      Math.ceil((current.windowStart + windowMs - now) / 1000)
    );
  }

  current.count += 1;
  inMemoryFallback.set(key, current);
  return {
    success: true,
    remaining: Math.max(0, maxAttempts - current.count),
    reset: current.windowStart + windowMs,
  };
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class RateLimitError extends Error {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

// ============================================================================
// RATE LIMIT FUNCTIONS
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check login rate limit.
 *
 * @param identifier - Email address or IP address
 * @throws RateLimitError if limit exceeded
 * @returns Remaining attempts
 */
export async function checkLoginRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  if (!loginRateLimiter) {
    return applyInMemoryFallbackLimit('login', identifier, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
  }

  const { success, remaining, reset } = await loginRateLimiter.limit(identifier);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw new RateLimitError(
      `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter
    );
  }

  return { success, remaining, reset };
}

/**
 * Reset login rate limit after successful login.
 * Call this after a successful authentication to clear the counter.
 *
 * @param identifier - Email address or IP address
 */
export async function resetLoginRateLimit(identifier: string): Promise<void> {
  if (!redis) {
    inMemoryFallback.delete(`${FALLBACK_KEY_PREFIX}:login:${identifier}`);
    return;
  }

  // Delete all keys for this identifier
  await redis.del(`ratelimit:login:${identifier}`);
}

/**
 * Check API rate limit.
 *
 * @param tokenId - API token ID
 * @throws RateLimitError if limit exceeded
 * @returns Remaining requests
 */
export async function checkApiRateLimit(
  tokenId: string
): Promise<RateLimitResult> {
  if (!apiRateLimiter) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const { success, remaining, reset } = await apiRateLimiter.limit(tokenId);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw new RateLimitError(
      `API rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }

  return { success, remaining, reset };
}

/**
 * Check password reset rate limit.
 *
 * @param email - User email address
 * @throws RateLimitError if limit exceeded
 * @returns Remaining attempts
 */
export async function checkPasswordResetRateLimit(
  email: string
): Promise<RateLimitResult> {
  if (!passwordResetRateLimiter) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const { success, remaining, reset } =
    await passwordResetRateLimiter.limit(email.toLowerCase());

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw new RateLimitError(
      `Too many password reset requests. Please try again in ${Math.ceil(retryAfter / 3600)} hours.`,
      retryAfter
    );
  }

  return { success, remaining, reset };
}

/**
 * Check resend confirmation email rate limit.
 *
 * @param email - User email address
 * @throws RateLimitError if limit exceeded
 * @returns Remaining attempts
 */
export async function checkResendConfirmationRateLimit(
  email: string
): Promise<RateLimitResult> {
  if (!resendConfirmationRateLimiter) {
    return { success: true, remaining: 999, reset: 0 };
  }

  const { success, remaining, reset } =
    await resendConfirmationRateLimiter.limit(email.toLowerCase());

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw new RateLimitError(
      `Too many resend requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter
    );
  }

  return { success, remaining, reset };
}

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

/**
 * Get client identifier for rate limiting.
 * Uses X-Forwarded-For header if behind a proxy, otherwise falls back to a default.
 *
 * @param request - Incoming request
 * @returns Client identifier (IP address)
 */
export function getClientIdentifier(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      // Get the first IP in the chain (original client).
      return forwarded.split(",")[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
  }

  // Conservative default: do not trust spoofable forwarding headers.
  return "unknown-client";
}
