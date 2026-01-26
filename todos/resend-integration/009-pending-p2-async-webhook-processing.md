---
status: pending
priority: p2
issue_id: ARCH-002
tags: [code-review, architecture, resend, webhooks, trigger-dev]
dependencies: [SEC-002]
---

# ARCH-002: Async Webhook Processing via Trigger.dev

## Problem Statement

Webhook endpoints must respond quickly (< 100ms) or the sender will retry. Heavy processing (database writes, external calls) in the webhook handler risks:
- Timeout and duplicate deliveries
- Lost events during high load
- Degraded webhook reliability

**Why it matters**: Resend expects fast acknowledgment. Slow responses trigger retries, causing duplicate processing.

## Findings

### Discovery 1: PRD Architecture Decision
- **Source**: `_Initiation/_prd/3-integrations/resend/PROMPT.md`
- **Decision**: "ASYNC_VIA_TRIGGER_DEV - Webhook endpoint responds immediately after SVIX signature verification. Actual processing happens in Trigger.dev job"

### Discovery 2: Existing Trigger.dev Setup
- **Location**: `src/trigger/jobs/`
- **Evidence**: Multiple jobs already defined (send-campaign, etc.)
- **Recommendation**: Follow existing patterns

## Proposed Solutions

### Solution A: Trigger.dev Job Dispatch (Recommended)
Webhook validates signature, queues job, returns 200 immediately

**Pros**:
- Consistent with codebase patterns
- Built-in retries and monitoring
- Handles high load gracefully

**Cons**:
- Slight delay before processing
- Need Trigger.dev running

**Effort**: Small (2-3 hours)
**Risk**: Low

### Solution B: In-Process Background Task
Use Node.js setImmediate or similar for background processing

**Pros**:
- No external dependency
- Immediate processing

**Cons**:
- Lost if process crashes
- No retry mechanism
- Doesn't scale across instances

**Effort**: Small (1-2 hours)
**Risk**: High (data loss risk)

### Solution C: Redis Queue
Use Redis-based queue (BullMQ or similar)

**Pros**:
- Fast
- Reliable
- Good monitoring

**Cons**:
- Different system than Trigger.dev
- Additional infrastructure

**Effort**: Medium (4-5 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/routes/api/webhooks/resend.ts` - DISPATCH to job
- `src/trigger/jobs/process-resend-webhook.ts` - NEW job
- `trigger.config.ts` - REGISTER job

### Implementation Pattern
```typescript
// src/routes/api/webhooks/resend.ts
import { tasks } from '@trigger.dev/sdk/v3';
import { processResendWebhook } from '@/trigger/jobs/process-resend-webhook';

export const POST = createAPIFileRoute('/api/webhooks/resend')({
  handler: async ({ request }) => {
    // Verify signature (must be fast)
    const rawBody = await request.text();
    const event = verifyWebhook(rawBody, request.headers);

    // Queue for processing (non-blocking)
    await tasks.trigger('process-resend-webhook', {
      event,
      receivedAt: new Date().toISOString(),
    });

    // Return immediately
    return new Response('OK', { status: 200 });
  },
});

// src/trigger/jobs/process-resend-webhook.ts
import { task } from '@trigger.dev/sdk/v3';

export const processResendWebhook = task({
  id: 'process-resend-webhook',
  maxDuration: 60, // 60 seconds max
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async ({ event, receivedAt }) => {
    // Check idempotency
    // Process based on event type
    // Update database
    // Create activities
  },
});
```

### Performance Targets
| Operation | Target |
|-----------|--------|
| Webhook response | < 100ms |
| Signature verification | < 50ms |
| Job dispatch | < 50ms |
| Job processing | < 1s total |

## Acceptance Criteria

- [ ] Webhook responds in < 100ms
- [ ] Processing happens in Trigger.dev job
- [ ] Failed processing retries automatically (3 attempts)
- [ ] High load doesn't cause webhook timeouts
- [ ] Job failures are logged and alertable

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Follow existing Trigger.dev patterns |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (Architecture Decisions)
- Existing jobs: `src/trigger/jobs/`
- Story: INT-RES-001, INT-RES-002
