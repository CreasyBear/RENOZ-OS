---
status: complete
priority: p3
issue_id: "017"
tags: [prd-review, data-integrity, compliance, cleanup, ai-infrastructure]
dependencies: []
---

# Add Data Retention and Cleanup Policies

## Problem Statement

The PRD does not define data retention policies or cleanup jobs for AI tables. Without these:
- Conversations grow unbounded
- Expired approvals accumulate
- Completed tasks never deleted
- Cost tracking becomes unwieldy

## Findings

**Source:** Data Integrity Guardian Agent

**Location:** PRD does not address retention beyond approval expiry (AI-INFRA-017)

**Missing retention policies:**
| Table | Suggested Retention | PRD Status |
|-------|-------------------|------------|
| ai_conversations | 90 days inactive | Not defined |
| ai_approvals | 7 days after expiry | Not defined |
| ai_agent_tasks | 30 days after completion | Not defined |
| ai_cost_tracking | 3 years (financial) | Not defined |

## Proposed Solutions

### Option A: Add Retention Stories to PRD (Recommended)
- **Pros:** Operationally complete system
- **Cons:** Extends PRD scope
- **Effort:** Small (2 new stories)
- **Risk:** Low

### Option B: Defer to Operations Phase
- **Pros:** Focus on core features
- **Cons:** Tech debt accumulates
- **Effort:** None now
- **Risk:** Medium (data growth issues)

## Recommended Action

Option A - Add stories for conversation archival and data cleanup.

## Technical Details

**New story AI-INFRA-023: Conversation Retention Job:**
```json
{
  "id": "AI-INFRA-023",
  "name": "Conversation Retention Policy Job",
  "type": "server",
  "acceptance_criteria": [
    "Trigger.dev job runs daily at 3 AM",
    "Archives conversations inactive for 90+ days",
    "Archives to S3 or separate archive table",
    "Deletes from hot table after archive",
    "Logs count of archived conversations"
  ]
}
```

**New story AI-INFRA-024: Data Cleanup Jobs:**
```json
{
  "id": "AI-INFRA-024",
  "name": "AI Data Cleanup Jobs",
  "type": "server",
  "acceptance_criteria": [
    "Weekly job purges expired approvals older than 7 days",
    "Monthly job aggregates cost records older than 3 months",
    "Monthly job deletes completed tasks older than 30 days",
    "All jobs idempotent and logged"
  ]
}
```

**Implementation patterns:**
```typescript
// Archive old conversations
export const archiveConversations = schedules.task({
  id: "archive-ai-conversations",
  cron: "0 3 * * *",
  run: async () => {
    const cutoff = subDays(new Date(), 90);
    const archived = await archiveToStorage(
      await db.select().from(aiConversations)
        .where(lt(aiConversations.lastMessageAt, cutoff))
    );
    await db.delete(aiConversations)
      .where(lt(aiConversations.lastMessageAt, cutoff));
    console.log(`Archived ${archived.length} conversations`);
  }
});

// Aggregate old cost records
export const aggregateCosts = schedules.task({
  id: "aggregate-ai-costs",
  cron: "0 2 1 * *", // Monthly
  run: async () => {
    // Aggregate to monthly summaries then delete detail records
  }
});
```

## Acceptance Criteria

- [ ] Stories AI-INFRA-023, AI-INFRA-024 added to PRD
- [ ] Retention periods documented
- [ ] Archive strategy defined (S3 vs archive table)
- [ ] Cleanup jobs idempotent

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from data integrity review | AI data needs explicit retention policies |

## Resources

- Existing Trigger.dev scheduled jobs
- Data retention best practices
