---
status: pending
priority: p2
issue_id: PERF-002
tags: [code-review, performance, resend, batch]
dependencies: []
---

# PERF-002: Batch Operations Support

## Problem Statement

Email campaigns may send to hundreds or thousands of recipients. Without batch operations:
- Individual sends are slow (N API calls)
- Database operations don't scale
- Campaign processing takes too long

**Why it matters**: Campaigns need to complete in reasonable time. Batch operations are critical for scale.

## Findings

### Discovery 1: Resend Batch API
- **Source**: Resend documentation
- **Evidence**: `resend.batch.send()` supports up to 100 emails per call
- **Recommendation**: Use batch API for campaigns

### Discovery 2: Current Campaign Job
- **Location**: `src/trigger/jobs/send-campaign.ts`
- **Status**: Placeholder code, needs implementation
- **Opportunity**: Design for batch from the start

### Discovery 3: Suppression Batch Check
- **Related**: DI-004 (suppression check)
- **Need**: Batch suppression lookup for efficiency

## Proposed Solutions

### Solution A: Chunked Batch Processing (Recommended)
Send in chunks of 100, with parallel suppression checks

**Pros**:
- Uses Resend batch API efficiently
- Handles campaigns of any size
- Good balance of speed and reliability

**Cons**:
- Still limited by API rate limits

**Effort**: Medium (4-5 hours)
**Risk**: Low

### Solution B: Queue-Based Fan-Out
Queue individual sends, process in parallel workers

**Pros**:
- Maximum parallelism
- Easy retry per recipient

**Cons**:
- More API calls
- Higher Resend costs potentially

**Effort**: Medium (4-5 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/trigger/jobs/send-campaign.ts` - IMPLEMENT batch
- `src/lib/server/email-suppression.ts` - ADD batch check
- `src/server/functions/communications/campaigns.ts` - UPDATE

### Implementation Pattern
```typescript
// src/trigger/jobs/send-campaign.ts
import { Resend } from 'resend';
import { task } from '@trigger.dev/sdk/v3';

const resend = new Resend(process.env.RESEND_API_KEY);
const BATCH_SIZE = 100; // Resend limit

export const sendCampaign = task({
  id: 'send-campaign',
  maxDuration: 300, // 5 minutes
  run: async ({ campaignId }) => {
    const campaign = await getCampaign(campaignId);
    const recipients = await getRecipients(campaign);

    // Batch suppression check
    const suppressionMap = await checkSuppressionBatch(
      recipients.map(r => r.email),
      campaign.organizationId
    );

    // Filter out suppressed
    const validRecipients = recipients.filter(
      r => !suppressionMap.get(r.email)
    );

    // Process in chunks
    const chunks = chunkArray(validRecipients, BATCH_SIZE);
    let sentCount = 0;
    let failedCount = 0;

    for (const chunk of chunks) {
      try {
        const emails = chunk.map(recipient => ({
          from: campaign.fromAddress,
          to: recipient.email,
          subject: campaign.subject,
          html: renderTemplate(campaign.template, recipient),
          headers: {
            'List-Unsubscribe': generateUnsubscribeHeader(recipient),
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }));

        const { data, error } = await resend.batch.send(emails);

        if (error) {
          console.error(`[campaign] Batch failed:`, error);
          failedCount += chunk.length;
          continue;
        }

        // Record sent emails
        await recordBatchSent(campaign.id, data);
        sentCount += chunk.length;

      } catch (error) {
        console.error(`[campaign] Chunk failed:`, error);
        failedCount += chunk.length;
      }
    }

    return {
      total: recipients.length,
      sent: sentCount,
      skipped: recipients.length - validRecipients.length,
      failed: failedCount,
    };
  },
});

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

### Performance Targets
| Operation | Target |
|-----------|--------|
| 100 emails | < 5s |
| 1000 emails | < 30s |
| Suppression check (batch) | < 100ms |

## Acceptance Criteria

- [ ] Campaigns use batch API (100 emails per call)
- [ ] Suppression checked in batch before sending
- [ ] Progress reported during campaign send
- [ ] Failed batches don't stop entire campaign
- [ ] Campaign results show sent/skipped/failed counts

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Resend batch limit is 100 emails |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (Resend API Reference)
- Existing: `src/trigger/jobs/send-campaign.ts`
- Related: DI-004 (suppression batch)
