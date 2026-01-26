---
status: complete
priority: p2
issue_id: "MMR-009"
tags: [architecture, reliability, redis, error-handling]
dependencies: []
---

# Redis Singleton Not Reset on Error

## Problem Statement

The Redis singleton pattern doesn't reset the connection on errors, which could leave the system in a failed state requiring a restart to recover.

## Findings

- **Location:** Redis client initialization/singleton
- **Issue:** Connection errors leave singleton in broken state
- **Impact:** Services may fail indefinitely until process restart
- **Severity:** P2 HIGH - Affects system reliability

## Proposed Solutions

### Option 1: Implement Connection Reset (Recommended)

**Approach:** Reset singleton on connection errors, allowing automatic reconnection.

**Pros:**
- Self-healing system
- No manual intervention needed
- Simple implementation

**Cons:**
- Brief window of unavailability during reset

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Connection Pool with Health Checks

**Approach:** Use a connection pool that automatically manages unhealthy connections.

**Pros:**
- More robust handling
- Built-in retry logic
- Better for high availability

**Cons:**
- More complex setup
- May need library change

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Current pattern (problematic):**
```typescript
let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config);
  }
  return redisClient; // Returns broken client if connection failed
}
```

**Recommended pattern:**
```typescript
let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config);
    redisClient.on('error', (err) => {
      console.error('Redis error, resetting connection:', err);
      redisClient = null; // Reset singleton on error
    });
  }
  return redisClient;
}
```

## Resources

- **Review Agent:** Architecture Strategist
- **ioredis Reconnect:** https://github.com/redis/ioredis#auto-reconnect

## Acceptance Criteria

- [ ] Redis singleton resets on connection error
- [ ] Automatic reconnection works correctly
- [ ] Error logging captures connection issues
- [ ] Health check endpoint monitors Redis status

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Architecture Strategist Agent

**Actions:**
- Identified singleton error handling gap
- Assessed reliability implications
- Proposed connection reset pattern

**Learnings:**
- Singletons need error recovery mechanisms
- Redis clients should handle reconnection automatically
