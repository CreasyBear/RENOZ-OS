---
status: pending
priority: p2
issue_id: EMAIL-TPL-005
tags: [code-review, performance, email-templates]
dependencies: []
---

# N+1 Query Pattern in Campaign/Scheduled Email Processing

## Problem Statement

Campaign and scheduled email jobs process recipients sequentially, making individual Resend API calls and database updates per email. This creates N+1 patterns that scale poorly.

**Impact**: MEDIUM - Performance degrades with list size, increased API costs.

## Findings

### Evidence

1. **send-campaign.ts**:
```typescript
// Current: Sequential processing
for (const recipient of recipients) {
  await resend.emails.send({ to: recipient.email, ... });
  await updateEmailHistory(recipient.id, ...);
}
```

2. **process-scheduled-emails.ts**: Same sequential pattern

3. **Resend supports batch**: Up to 100 emails per API call

### Agent Source
- performance-oracle: "N+1 patterns in email processing"
- architecture-strategist: "Sequential processing bottleneck"

## Proposed Solutions

### Option A: Resend Batch API (Recommended)
Use `resend.batch.send()` for up to 100 emails per call.

**Pros**:
- 100x fewer API calls
- Built-in by Resend
- Atomic tracking

**Cons**: Partial failure handling needed
**Effort**: Medium
**Risk**: Low

### Option B: Parallel Promise Processing
Use `Promise.all` with chunking.

**Pros**: Faster than sequential
**Cons**: Still N API calls, rate limit risk
**Effort**: Small
**Risk**: Medium - rate limiting

### Option C: Queue-Based Fan-Out
Spawn individual Trigger.dev jobs per email.

**Pros**: Resilient, retryable
**Cons**: Overhead per email, more complex
**Effort**: Large
**Risk**: Low

## Recommended Action

Option A - Use Resend batch API with chunks of 100.

## Technical Details

### Current Pattern
```typescript
// N API calls, N database updates
for (const recipient of recipients) {
  const result = await resend.emails.send({...});
  await db.update(emailHistory).set({...}).where(...);
}
```

### Optimized Pattern
```typescript
// 1 API call per 100 recipients
const BATCH_SIZE = 100;
const chunks = chunk(recipients, BATCH_SIZE);

for (const batch of chunks) {
  const emails = batch.map(r => ({
    from: EMAIL_FROM,
    to: r.email,
    subject: subject,
    html: renderTemplate(r),
  }));

  const results = await resend.batch.send(emails);

  // Batch database update
  await db.transaction(async (tx) => {
    for (let i = 0; i < results.data.length; i++) {
      await tx.update(emailHistory)
        .set({ resendMessageId: results.data[i].id, status: 'sent' })
        .where(eq(emailHistory.id, batch[i].historyId));
    }
  });
}
```

### Affected Files
- `src/trigger/jobs/send-campaign.ts`
- `src/trigger/jobs/process-scheduled-emails.ts`

## Acceptance Criteria

- [ ] Campaign sends use batch API (max 100 per call)
- [ ] Scheduled emails use batch API
- [ ] Database updates batched in transactions
- [ ] Partial failure handling (some emails fail in batch)
- [ ] Progress logging for large campaigns

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From performance-oracle review |

## Resources

- Resend Batch API: https://resend.com/docs/api-reference/emails/send-batch-emails
