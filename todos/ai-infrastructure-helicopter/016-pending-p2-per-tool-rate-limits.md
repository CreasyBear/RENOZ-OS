---
status: pending
priority: p2
issue_id: "SEC-005"
tags: [helicopter-review, security, ai-infrastructure, rate-limiting, group-3]
dependencies: []
---

# SEC-005: Per-Tool Rate Limits

## Problem Statement

Currently only global rate limits exist for the chat endpoint. Individual tools that perform expensive operations (reports, searches) or access sensitive data should have their own rate limits to prevent abuse.

## Findings

**Source:** Security Sentinel Agent + Helicopter Review

**Current state (global only):**
```typescript
// src/routes/api/ai/chat.ts
const rateLimitResult = await checkRateLimit('chat', ctx.user.id);
// No per-tool limits
```

**Pattern requirement:**
```typescript
// Per-tool rate limits
const toolRateLimits = {
  searchCustomers: '10/minute',
  runReport: '5/hour',
  getMetrics: '20/minute',
  createOrderDraft: '10/hour',
};
```

**Impact:**
- Expensive tools (reports) could be called unlimited times
- Search tools could be abused for data enumeration
- No protection against tool-specific abuse patterns
- Cost control not granular enough

## Proposed Solutions

### Option A: Upstash Ratelimit Per Tool (Recommended)
- **Pros:** Flexible, Redis-based, matches Midday pattern
- **Cons:** Multiple Redis calls per request
- **Effort:** Small (1-2 hours)
- **Risk:** Low

### Option B: In-Memory Token Bucket
- **Pros:** No Redis dependency for limits
- **Cons:** Not distributed, resets on deploy
- **Effort:** Small (1 hour)
- **Risk:** Medium - not production-ready

## Recommended Action

Option A - Implement per-tool rate limits using Upstash Ratelimit.

## Technical Details

**Files to create:**
- `src/lib/ai/tools/rate-limits.ts`

**Files to modify:**
- Tool execute functions to check rate limits

**Implementation:**
```typescript
// src/lib/ai/tools/rate-limits.ts
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

/**
 * Per-tool rate limit configurations.
 * Key is tool name, value is limit configuration.
 */
export const toolRateLimits = {
  // Search tools - moderate limits
  search_customers: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1m'), // 10 per minute
    prefix: 'ai:ratelimit:tool:search_customers',
  }),

  // Report tools - strict limits (expensive)
  run_report: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1h'), // 5 per hour
    prefix: 'ai:ratelimit:tool:run_report',
  }),

  get_metrics: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1m'), // 20 per minute
    prefix: 'ai:ratelimit:tool:get_metrics',
  }),

  get_trends: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1m'), // 10 per minute
    prefix: 'ai:ratelimit:tool:get_trends',
  }),

  // Draft tools - moderate limits
  create_order_draft: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1h'), // 10 per hour
    prefix: 'ai:ratelimit:tool:create_order_draft',
  }),

  create_quote_draft: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1h'), // 10 per hour
    prefix: 'ai:ratelimit:tool:create_quote_draft',
  }),
} as const;

export type RateLimitedTool = keyof typeof toolRateLimits;

/**
 * Check rate limit for a specific tool.
 * Returns { success, reset } where reset is ms until limit resets.
 */
export async function checkToolRateLimit(
  toolName: string,
  userId: string
): Promise<{ success: boolean; reset: number; remaining: number }> {
  const limiter = toolRateLimits[toolName as RateLimitedTool];

  if (!limiter) {
    // No limit configured for this tool
    return { success: true, reset: 0, remaining: Infinity };
  }

  const result = await limiter.limit(userId);
  return {
    success: result.success,
    reset: result.reset,
    remaining: result.remaining,
  };
}

/**
 * Format rate limit error message.
 */
export function formatRateLimitError(toolName: string, resetMs: number): string {
  const resetSeconds = Math.ceil(resetMs / 1000);
  const resetMinutes = Math.ceil(resetSeconds / 60);

  if (resetMinutes > 1) {
    return `Rate limit reached for ${toolName}. Try again in ${resetMinutes} minutes.`;
  }
  return `Rate limit reached for ${toolName}. Try again in ${resetSeconds} seconds.`;
}
```

**Usage in tools:**
```typescript
// In tool execute function
execute: async function* ({ query }, executionOptions) {
  const ctx = executionOptions.experimental_context as ToolExecutionContext;

  // Check per-tool rate limit
  const { success, reset } = await checkToolRateLimit('search_customers', ctx.userId);
  if (!success) {
    yield { text: formatRateLimitError('search', reset) };
    return;
  }

  // ... rest of tool logic
}
```

## Acceptance Criteria

- [ ] Rate limit configuration for search tools (10/min)
- [ ] Rate limit configuration for report tools (5/hr)
- [ ] Rate limit configuration for draft tools (10/hr)
- [ ] `checkToolRateLimit()` function implemented
- [ ] Rate limits checked in tool execute functions
- [ ] User-friendly error messages when limited
- [ ] Reset time included in error
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Per-tool limits essential for cost control and abuse prevention |

## Resources

- `patterns/04-tool-patterns.md` - Per-tool rate limit pattern
- Upstash Ratelimit documentation
- `src/lib/ai/ratelimit.ts` - Existing rate limit setup
