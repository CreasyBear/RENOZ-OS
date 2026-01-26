---
status: pending
priority: p1
issue_id: DI-004
tags: [code-review, data-integrity, resend, suppression]
dependencies: [DI-001]
---

# DI-004: Suppression Check Required Before Every Send

## Problem Statement

Emails must not be sent to suppressed addresses (bounced, complained, unsubscribed). Without pre-send checks:
- Bounced addresses receive emails (damages sender reputation)
- Complained users receive emails (CAN-SPAM violation)
- Unsubscribed users receive emails (GDPR violation)

**Why it matters**: Sending to suppressed addresses can result in domain blacklisting, legal penalties, and customer trust erosion.

## Findings

### Discovery 1: Campaign Send Job
- **Location**: `src/trigger/jobs/send-campaign.ts`
- **Evidence**: Currently placeholder code, no suppression logic
- **Recommendation**: Add suppression check before each send

### Discovery 2: Scheduled Emails Job
- **Location**: `src/trigger/jobs/process-scheduled-emails.ts`
- **Evidence**: Needs same suppression check
- **Recommendation**: Create shared utility function

## Proposed Solutions

### Solution A: Shared Suppression Check Utility (Recommended)
Create reusable function called from all email send paths

**Pros**:
- Single source of truth
- Easy to test
- Can batch check multiple emails

**Cons**:
- Need to ensure all send paths use it

**Effort**: Small (2-3 hours)
**Risk**: Low

### Solution B: Database Trigger
Create PostgreSQL trigger to prevent inserts to email_history for suppressed addresses

**Pros**:
- Can't be bypassed
- Enforced at database level

**Cons**:
- Triggers are harder to test/debug
- Error messages less clear

**Effort**: Medium (3-4 hours)
**Risk**: Medium

## Recommended Action
[To be filled during triage]

## Technical Details

### Affected Files
- `src/lib/server/email-suppression.ts` - NEW (utility)
- `src/trigger/jobs/send-campaign.ts` - ADD check
- `src/trigger/jobs/process-scheduled-emails.ts` - ADD check
- Any other email send paths

### Implementation Pattern
```typescript
// src/lib/server/email-suppression.ts

import { db } from '@/lib/db';
import { emailSuppression } from 'drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';

export type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe' | 'manual';

export async function isEmailSuppressed(
  email: string,
  organizationId: string
): Promise<{ suppressed: boolean; reason?: SuppressionReason }> {
  const suppression = await db.query.emailSuppression.findFirst({
    where: and(
      eq(emailSuppression.email, email.toLowerCase()),
      eq(emailSuppression.organizationId, organizationId),
      isNull(emailSuppression.deletedAt) // Soft delete check
    ),
  });

  if (suppression) {
    return { suppressed: true, reason: suppression.reason };
  }

  return { suppressed: false };
}

export async function checkSuppressionBatch(
  emails: string[],
  organizationId: string
): Promise<Map<string, SuppressionReason | null>> {
  const suppressions = await db.query.emailSuppression.findMany({
    where: and(
      inArray(emailSuppression.email, emails.map(e => e.toLowerCase())),
      eq(emailSuppression.organizationId, organizationId),
      isNull(emailSuppression.deletedAt)
    ),
  });

  const result = new Map<string, SuppressionReason | null>();
  emails.forEach(email => {
    const suppression = suppressions.find(s => s.email === email.toLowerCase());
    result.set(email, suppression?.reason ?? null);
  });

  return result;
}
```

### Usage in Send Job
```typescript
// In send-campaign.ts
const suppressed = await isEmailSuppressed(recipient.email, organizationId);
if (suppressed.suppressed) {
  console.log(`[campaign] Skipping suppressed email: ${recipient.email} (${suppressed.reason})`);
  skippedCount++;
  continue;
}
```

## Acceptance Criteria

- [ ] All email send paths check suppression list
- [ ] Batch sends filter out suppressed addresses efficiently
- [ ] Suppressed emails logged with reason (not sent)
- [ ] Suppression check completes in < 10ms
- [ ] Campaign reports show skipped count

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from multi-agent review | Need batch check for campaign sends |

## Resources

- PRD: `_Initiation/_prd/3-integrations/resend/PROMPT.md` (Suppression Architecture section)
- Stories: INT-RES-003 (Schema), INT-RES-004 (Auto-Suppression)
