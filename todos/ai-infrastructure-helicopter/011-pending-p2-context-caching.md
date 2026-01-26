---
status: pending
priority: p2
issue_id: "ARCH-006"
tags: [helicopter-review, architecture, ai-infrastructure, caching, performance, group-1]
dependencies: ["ARCH-004"]
---

# ARCH-006: Context Caching

## Problem Statement

AppContext is rebuilt fresh on every request without caching. For data that changes infrequently (organization settings, user preferences), this adds unnecessary database queries and latency.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Current state (no caching):**
```typescript
// Every request fetches fresh
const ctx = await withAuth();
const userContext = {
  userId: ctx.user.id,
  organizationId: ctx.organizationId,
  // Fetched every time...
};
```

**Midday pattern (2-level caching):**
```typescript
// _reference/.midday-reference uses chat-cache package
import { getChatUserContext } from "@midday/cache/chat-cache";

// Caches user context with TTL
const context = await getChatUserContext(userId, teamId);
```

**Impact:**
- Extra database queries on every AI request
- Higher latency before stream starts
- Unnecessary load on database
- Organization settings rarely change but fetched repeatedly

## Proposed Solutions

### Option A: Redis 2-Level Cache (Recommended)
- **Pros:** Fast, shared across instances, matches Midday pattern
- **Cons:** Redis dependency (already have)
- **Effort:** Small (1-2 hours)
- **Risk:** Low

### Option B: In-Memory LRU Cache
- **Pros:** No external dependency, very fast
- **Cons:** Not shared across instances, memory pressure
- **Effort:** Small (1 hour)
- **Risk:** Low but limited

## Recommended Action

Option A - Implement Redis caching for user and organization context.

## Technical Details

**Files to create:**
- `src/lib/ai/context/cache.ts` - Context caching utilities

**Files to modify:**
- `src/lib/ai/context/builder.ts` - Use cache in buildAppContext

**Cache strategy:**
```typescript
// src/lib/ai/context/cache.ts
import { redis } from '@/lib/redis';

const USER_CONTEXT_TTL = 300; // 5 minutes
const ORG_CONTEXT_TTL = 3600; // 1 hour (settings change rarely)

interface CachedUserContext {
  userId: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface CachedOrgContext {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  baseCurrency: string;
  settings: Record<string, unknown>;
}

export async function getCachedUserContext(
  userId: string
): Promise<CachedUserContext | null> {
  const key = `ai:user:${userId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedUserContext(
  userId: string,
  context: CachedUserContext
): Promise<void> {
  const key = `ai:user:${userId}`;
  await redis.setex(key, USER_CONTEXT_TTL, JSON.stringify(context));
}

export async function getCachedOrgContext(
  organizationId: string
): Promise<CachedOrgContext | null> {
  const key = `ai:org:${organizationId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedOrgContext(
  organizationId: string,
  context: CachedOrgContext
): Promise<void> {
  const key = `ai:org:${organizationId}`;
  await redis.setex(key, ORG_CONTEXT_TTL, JSON.stringify(context));
}

// Invalidation helpers
export async function invalidateUserContext(userId: string): Promise<void> {
  await redis.del(`ai:user:${userId}`);
}

export async function invalidateOrgContext(organizationId: string): Promise<void> {
  await redis.del(`ai:org:${organizationId}`);
}
```

**Updated builder:**
```typescript
// src/lib/ai/context/builder.ts
export async function buildAppContext(input: BuildAppContextInput): Promise<AppContext> {
  // Try cache first
  const [cachedUser, cachedOrg] = await Promise.all([
    getCachedUserContext(input.userId),
    getCachedOrgContext(input.organizationId),
  ]);

  // Fetch missing data
  const [user, org] = await Promise.all([
    cachedUser ?? fetchAndCacheUser(input.userId),
    cachedOrg ?? fetchAndCacheOrg(input.organizationId),
  ]);

  return {
    user,
    organization: org,
    dashboard: input.dashboard,
    forcedToolCall: input.forcedToolCall,
    conversationId: input.conversationId,
  };
}
```

## Acceptance Criteria

- [ ] User context cached in Redis with 5-minute TTL
- [ ] Organization context cached with 1-hour TTL
- [ ] Cache miss fetches from DB and populates cache
- [ ] Non-blocking cache writes (don't wait for SET)
- [ ] Invalidation helpers for settings changes
- [ ] Cache hit rate logged for monitoring
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | 2-level caching (user + org) covers 90% of context data |

## Resources

- `_reference/.midday-reference/packages/cache/` - Midday cache implementation
- `src/lib/redis.ts` - Existing Redis client
- `patterns/02-app-context.md` - Context caching strategy
