---
status: pending
priority: p1
issue_id: SEC-003
tags: [code-review, security, resend, rate-limiting]
dependencies: []
---

# SEC-003: Rate Limiting Required on Public Endpoints

## Problem Statement

The webhook endpoint (`/api/webhooks/resend`) and unsubscribe endpoint (`/api/unsubscribe/$token`) are publicly accessible without authentication. Without rate limiting, these endpoints are vulnerable to:
- DoS attacks
- Brute force token guessing
- Resource exhaustion

**Why it matters**: A single attacker could overwhelm the system, preventing legitimate webhook processing or unsubscribe requests.

## Findings

### Discovery 1: Existing Rate Limit Utility
- **Location**: `src/lib/server/rate-limit.ts` (mentioned in PRD)
- **Status**: Need to verify existence and usage
- **Recommendation**: Reuse existing pattern if available

### Discovery 2: Recommended Limits from PRD
- **Webhook endpoint**: 100 requests/minute
- **Unsubscribe endpoint**: 10 requests/minute per IP

## Proposed Solutions

### Solution A: Use Existing Rate Limit Utility (Recommended)
Apply existing rate limiting middleware to new endpoints

**Pros**:
- Consistent with codebase patterns
- Already tested
- Minimal new code

**Cons**:
- Need to verify utility exists

**Effort**: Small (1-2 hours)
**Risk**: Low

### Solution B: Supabase Edge Function Rate Limiting
Use Supabase's built-in rate limiting if available

**Pros**:
- Infrastructure-level protection
- No application code

**Cons**:
- Platform-specific
- Less granular control

**Effort**: Small (1 hour)
**Risk**: Low

### Solution C: Redis-based Rate Limiting
Implement sliding window rate limiting with Redis

**Pros**:
- Distributed rate limiting
- Very accurate
- Handles multiple instances

**Cons**:
- Requires Redis
- More infrastructure

**Effort**: Medium (4-5 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/routes/api/webhooks/resend.ts` - ADD rate limiting
- `src/routes/api/unsubscribe.$token.ts` - ADD rate limiting
- `src/lib/server/rate-limit.ts` - VERIFY/CREATE

### Implementation Pattern
```typescript
import { rateLimit } from '@/lib/server/rate-limit';

// Webhook: 100/minute (by endpoint, not IP - webhooks come from Resend IPs)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: () => 'webhook-global', // Single bucket for all webhook traffic
});

// Unsubscribe: 10/minute per IP
const unsubscribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (request) => request.headers.get('x-forwarded-for') || 'unknown',
});
```

## Acceptance Criteria

- [ ] Webhook endpoint limited to 100 requests/minute
- [ ] Unsubscribe endpoint limited to 10 requests/minute per IP
- [ ] Rate limit exceeded returns 429 Too Many Requests
- [ ] Rate limit headers included in response (X-RateLimit-*)
- [ ] Legitimate Resend traffic not affected (100/min is generous)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Check for existing rate-limit.ts utility |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (SEC-003 section)
- Potential existing: `src/lib/server/rate-limit.ts`
- Stories: INT-RES-001, INT-RES-007
