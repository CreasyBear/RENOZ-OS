---
status: pending
priority: p2
issue_id: PERF-001
tags: [code-review, performance, resend, tracking]
dependencies: [ARCH-001]
---

# PERF-001: Click Tracking Blocking DB Query

## Problem Statement

The current click tracking in `src/lib/server/email-tracking.ts` performs a blocking database read before redirect. If database is slow:
- User experiences delay clicking links
- Poor UX for email recipients
- Potential timeouts

**Why it matters**: Link click should feel instant to users. Any perceptible delay degrades trust.

## Findings

### Discovery 1: Current Pattern
- **Location**: `src/lib/server/email-tracking.ts:150-175`
- **Evidence**: `recordEmailClick()` does SELECT then UPDATE before returning redirect URL
- **Impact**: User waits for both operations

### Discovery 2: Architecture Decision Impact
- **Context**: If using Resend webhooks for tracking, this code won't be used for Resend emails
- **Recommendation**: Fix for non-Resend emails, ensure webhook processing is also fast

## Proposed Solutions

### Solution A: Async Recording Pattern (Recommended)
Redirect immediately, record click asynchronously

**Pros**:
- Instant redirect for user
- Recording happens in background
- No UX impact

**Cons**:
- Recording might fail silently
- Need error handling strategy

**Effort**: Small (2-3 hours)
**Risk**: Low

### Solution B: URL Contains Redirect Target
Encode original URL in tracking URL, no DB lookup needed

**Pros**:
- No DB read before redirect
- Very fast

**Cons**:
- Long URLs
- Still need to record (can be async)

**Effort**: Small (1-2 hours)
**Risk**: Low

### Solution C: Cache Lookup
Cache email -> URL mappings in Redis

**Pros**:
- Fast lookups
- Reduces DB load

**Cons**:
- Cache invalidation
- Additional infrastructure

**Effort**: Medium (4-5 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/routes/api/track/click.$emailId.$linkId.ts` - MODIFY
- `src/lib/server/email-tracking.ts` - MODIFY (if keeping)

### Current Problem Pattern
```typescript
// SLOW: Waits for DB before redirect
export async function recordEmailClick(emailId, linkId, originalUrl) {
  const [email] = await db.select().from(emailHistory)...; // WAIT

  await db.update(emailHistory)...; // WAIT

  return { redirectUrl: originalUrl }; // Finally redirect
}
```

### Fixed Pattern (Solution A)
```typescript
// src/routes/api/track/click.$emailId.$linkId.ts
export const GET = createAPIFileRoute('/api/track/click/:emailId/:linkId')({
  handler: async ({ params, request }) => {
    const { emailId, linkId } = params;
    const url = new URL(request.url).searchParams.get('url');
    const sig = new URL(request.url).searchParams.get('sig');

    // Validate signature (fast, no DB)
    if (!validateTrackingSignature(emailId, sig, linkId)) {
      return new Response('Invalid', { status: 400 });
    }

    // REDIRECT IMMEDIATELY
    const redirectUrl = url ? decodeURIComponent(url) : '/';

    // Record asynchronously (don't await)
    recordClickAsync(emailId, linkId, redirectUrl).catch(err => {
      console.error('[click-tracking] Failed to record:', err);
      // Could send to error monitoring
    });

    return Response.redirect(redirectUrl, 302);
  },
});

async function recordClickAsync(emailId: string, linkId: string, url: string) {
  // This runs after redirect is sent
  await db.update(emailHistory)
    .set({
      clickedAt: sql`COALESCE(${emailHistory.clickedAt}, NOW())`,
      linkClicks: sql`...`
    })
    .where(eq(emailHistory.id, emailId));
}
```

## Acceptance Criteria

- [ ] Click redirect completes in < 50ms
- [ ] Click recording still happens (async)
- [ ] Failed recordings are logged
- [ ] No user-visible delay when clicking links
- [ ] Works for both Resend and non-Resend tracking

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | URL already in query params - use it |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (Performance Requirements)
- Existing: `src/lib/server/email-tracking.ts`
