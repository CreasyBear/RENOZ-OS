---
status: pending
priority: p1
issue_id: SEC-002
tags: [code-review, security, resend, webhooks]
dependencies: []
---

# SEC-002: Webhook Signature Verification Required

## Problem Statement

Resend webhooks use SVIX for signature verification. Without proper verification, attackers could send fake webhook events to manipulate email delivery status, create false bounces, or disrupt the suppression system.

**Why it matters**: Webhook endpoints are publicly accessible. Without cryptographic verification, any HTTP request could be processed as a legitimate Resend event.

## Findings

### Discovery 1: No Webhook Endpoint Exists Yet
- **Location**: `src/routes/api/webhooks/` (directory doesn't exist)
- **Evidence**: Webhook processing is part of the new implementation
- **Recommendation**: Implement verification from the start

### Discovery 2: Resend SDK Provides Verification
- **Source**: Resend documentation
- **Evidence**: `resend.webhooks.verify()` method available
- **Recommendation**: Use official SDK method, not manual verification

## Proposed Solutions

### Solution A: Use Resend SDK Verification (Recommended)
Use the official `resend.webhooks.verify()` method

**Pros**:
- Official support from Resend
- Handles edge cases (timestamp tolerance, multiple signatures)
- Updates automatically with SDK

**Cons**:
- Requires raw request body (not parsed JSON)

**Effort**: Small (1-2 hours)
**Risk**: Low

### Solution B: Manual SVIX Verification
Implement SVIX signature verification manually

**Pros**:
- No SDK dependency
- Full control

**Cons**:
- More code to maintain
- Easy to get wrong
- Must handle edge cases manually

**Effort**: Medium (3-4 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/routes/api/webhooks/resend.ts` - NEW

### Implementation Pattern
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const POST = createAPIFileRoute('/api/webhooks/resend')({
  handler: async ({ request }) => {
    // CRITICAL: Get raw body before any parsing
    const rawBody = await request.text();

    try {
      const event = resend.webhooks.verify({
        payload: rawBody,
        headers: {
          id: request.headers.get('svix-id') ?? '',
          timestamp: request.headers.get('svix-timestamp') ?? '',
          signature: request.headers.get('svix-signature') ?? '',
        },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      });

      // Process event...
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('[webhook] Signature verification failed:', error);
      return new Response('Invalid signature', { status: 401 });
    }
  },
});
```

### Required Environment Variables
- `RESEND_WEBHOOK_SECRET` - From Resend dashboard webhook settings

## Acceptance Criteria

- [ ] Webhook endpoint verifies SVIX signature on every request
- [ ] Invalid signatures return 401 Unauthorized
- [ ] Raw request body is used (not parsed JSON)
- [ ] Verification errors are logged for debugging
- [ ] Valid webhooks respond with 200 immediately (before processing)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Resend SDK has built-in verification |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (SEC-001 section)
- Resend Docs: Webhook verification
- Story: INT-RES-001 (Webhook Endpoint)
