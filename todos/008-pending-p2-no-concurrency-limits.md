---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, performance, reliability, sprint-review]
dependencies: []
---

# No Concurrency Limits on Trigger.dev Tasks

## Problem Statement

PDF generation tasks have no concurrency limits. At high volume, this could cause OOM crashes (each PDF render uses ~50-100MB RAM).

## Findings

**Source:** Performance Oracle Agent

**Current Implementation:**
```typescript
export const generateInvoicePdf = task({
  id: "generate-invoice-pdf",
  retry: { maxAttempts: 3 },
  // No queue or concurrency configuration!
  run: async (payload) => { ... }
});
```

**Impact:**
- 10 concurrent = 500MB-1GB memory
- 100 concurrent = potential OOM crashes
- Worker pool exhaustion during bulk operations

## Proposed Solutions

### Option A: Add queue with concurrency limit (Recommended)
**Pros:** Prevents OOM, ensures stable throughput
**Cons:** May slow bulk operations
**Effort:** Small (1 hour)
**Risk:** Low

```typescript
export const generateInvoicePdf = task({
  id: "generate-invoice-pdf",
  retry: { maxAttempts: 3 },
  queue: {
    name: "pdf-generation",
    concurrencyLimit: 5, // Max 5 concurrent
  },
  machine: {
    preset: "medium-1x", // 2GB RAM
  },
  run: async (payload) => { ... }
});
```

## Recommended Action

_To be filled during triage_

## Technical Details

**Trigger.dev docs:** https://trigger.dev/docs/v3/queues
**Memory per render:** ~50-100MB
**Recommended limit:** 5-10 concurrent

## Acceptance Criteria

- [ ] All generate-*.tsx tasks have queue configuration
- [ ] Concurrency limit set appropriately
- [ ] No OOM crashes under load
- [ ] Bulk operations complete (slower but stable)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Trigger.dev queues: https://trigger.dev/docs/v3/queues
