---
status: pending
priority: p1
issue_id: DI-001
tags: [code-review, data-integrity, resend, webhooks, idempotency]
dependencies: []
---

# DI-001: Webhook Idempotency Required

## Problem Statement

Resend may retry webhook deliveries if it doesn't receive a 200 response quickly enough. Without idempotency checks, duplicate webhooks could:
- Count opens/clicks multiple times
- Create duplicate suppression entries
- Corrupt email analytics

**Why it matters**: Data accuracy depends on processing each event exactly once, regardless of how many times it's delivered.

## Findings

### Discovery 1: Resend Event IDs
- **Source**: Resend webhook payload structure
- **Evidence**: Each event has unique `email_id` + `type` combination
- **Recommendation**: Use composite key for deduplication

### Discovery 2: Email History Schema
- **Location**: `drizzle/schema/communications/email-history.ts`
- **Evidence**: Has `resendMessageId` field (or needs to be added)
- **Recommendation**: Store event IDs and check before processing

## Proposed Solutions

### Solution A: Event ID Tracking Table (Recommended)
Create dedicated table to track processed webhook events

**Pros**:
- Clear separation of concerns
- Can track all event types
- Easy to query/audit

**Cons**:
- Additional table
- More storage

**Effort**: Small (2-3 hours)
**Risk**: Low

### Solution B: Store in Email History
Add processed events array/JSONB to email_history table

**Pros**:
- No new table
- Co-located with email data

**Cons**:
- JSONB queries can be slow
- Harder to audit

**Effort**: Small (2 hours)
**Risk**: Low

### Solution C: Redis-based Deduplication
Use Redis SET with TTL for processed event IDs

**Pros**:
- Very fast lookups
- Auto-expiring entries

**Cons**:
- Requires Redis
- No audit trail

**Effort**: Medium (3-4 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `drizzle/schema/communications/webhook-events.ts` - NEW (if Solution A)
- `src/trigger/jobs/process-resend-webhook.ts` - ADD idempotency check
- `drizzle/schema/index.ts` - EXPORT new table

### Schema (Solution A)
```typescript
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull(), // Resend event ID
  eventType: text('event_type').notNull(), // email.opened, email.bounced, etc.
  emailId: text('email_id').notNull(), // Resend email_id
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  payload: jsonb('payload'), // Store full payload for debugging
}, (table) => ({
  uniqueEvent: uniqueIndex('webhook_events_unique_idx').on(table.eventId, table.eventType),
}));
```

### Processing Pattern
```typescript
async function processWebhook(event: ResendEvent) {
  // Check if already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: and(
      eq(webhookEvents.eventId, event.data.email_id),
      eq(webhookEvents.eventType, event.type)
    )
  });

  if (existing) {
    console.log(`[webhook] Skipping duplicate: ${event.type} for ${event.data.email_id}`);
    return { success: true, duplicate: true };
  }

  // Process and record atomically
  await db.transaction(async (tx) => {
    // Record event first
    await tx.insert(webhookEvents).values({
      eventId: event.data.email_id,
      eventType: event.type,
      emailId: event.data.email_id,
      payload: event,
    });

    // Then process
    await processEventType(tx, event);
  });
}
```

## Acceptance Criteria

- [ ] Duplicate webhook events are detected and skipped
- [ ] First event is always processed
- [ ] Processing and recording happen atomically (transaction)
- [ ] Duplicate detection logged for debugging
- [ ] Can query which events have been processed (audit trail)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Resend uses email_id + type as unique key |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (DI-001 section)
- Story: INT-RES-002 (Webhook Event Processing)
