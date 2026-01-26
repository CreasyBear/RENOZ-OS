---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, quality, sprint-review]
dependencies: []
---

# console.log Instead of logger in check-inventory-alerts.ts

## Problem Statement

`check-inventory-alerts.ts` uses `console.log` instead of Trigger.dev's `logger`. This is inconsistent with all other jobs.

## Findings

**Source:** Pattern Recognition Agent

**Inconsistent Logging:**
```typescript
// check-inventory-alerts.ts (lines 239, 249, 284, 289)
console.log('Starting inventory alerts check');
console.log(`Checking ${orgs.length} organizations for inventory alerts`);
```

**All other jobs use:**
```typescript
import { logger } from "@trigger.dev/sdk/v3";
logger.info('Starting...', { orgId });
```

## Proposed Solutions

### Option A: Replace with logger (Recommended)
**Pros:** Consistency, structured logging
**Cons:** None
**Effort:** Tiny (15 minutes)
**Risk:** None

```typescript
import { task, schedules, logger } from "@trigger.dev/sdk/v3";

// Replace all console.log with:
logger.info('Starting inventory alerts check');
logger.info(`Checking organizations for inventory alerts`, { count: orgs.length });
```

## Recommended Action

_To be filled during triage_

## Technical Details

**File:** `src/trigger/jobs/check-inventory-alerts.ts`
**Lines:** 239, 249, 284, 289

## Acceptance Criteria

- [ ] All `console.log` replaced with `logger.*`
- [ ] Structured logging with context objects
- [ ] Consistent with other job files

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- Trigger.dev logging: https://trigger.dev/docs/v3/logging
