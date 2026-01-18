# Pre-Mortem Analysis: Communications Domain (DOM-COMMS)
Created: 2026-01-18
Author: architect-agent
Mode: DEEP

## Overview

Analysis of the Communications Domain implementation covering:
- Activity bridge (auto-creates activities from emails)
- Source tracking (manual vs auto-captured)
- Quick log UI (Cmd+L shortcut)

---

## Summary

| Category | Tigers | Elephants | Paper Tigers |
|----------|--------|-----------|--------------|
| Scalability | 1 | 0 | 0 |
| Integration | 1 | 0 | 1 |
| Data | 1 | 0 | 1 |
| Security | 0 | 1 | 0 |
| Testing | 2 | 0 | 0 |
| **Total** | **5** | **1** | **2** |

---

```yaml
premortem:
  mode: deep
  context: "Communications Domain - activity bridge, source tracking, quick log"
  
  tigers:
    # TIGER 1: Missing activity.create permission
    - risk: "Missing activity.create permission - quick-log falls back to customer.read"
      location: "src/lib/server/quick-log.ts:42"
      severity: medium
      category: integration
      evidence: |
        Code at line 42:
          const ctx = await withAuth({ permission: PERMISSIONS.activity?.create ?? PERMISSIONS.customer.read });
        
        PERMISSIONS.activity only has 'read' and 'export' (verified in src/lib/auth/permissions.ts).
        The optional chaining (?.create) always returns undefined, so it falls back to customer.read.
      mitigation_checked: "Searched for PERMISSIONS.activity.create - not defined anywhere"
      suggested_fix: |
        Add to src/lib/auth/permissions.ts:
          activity: {
            create: 'activity.create',  // ADD THIS
            read: 'activity.read',
            export: 'activity.export',
          }
        Then add 'activity.create' to appropriate roles in ROLE_PERMISSIONS.
    
    # TIGER 2: No transaction wrapping for multi-table operations
    - risk: "Quick-log creates activity + scheduled_calls without transaction - partial failure possible"
      location: "src/lib/server/quick-log.ts:59-100"
      severity: medium
      category: data
      evidence: |
        Lines 85-100 show two separate db operations:
          1. db.insert(activities).values(...)
          2. db.insert(scheduledCalls).values(...)
        
        If #1 succeeds but #2 fails, we have orphan data.
        Other server functions (e.g., product-inventory.ts) use db.transaction() for multi-table ops.
      mitigation_checked: |
        - Searched for "transaction" in quick-log.ts: not found
        - No try/catch around the second insert
        - No rollback mechanism
      suggested_fix: |
        Wrap both inserts in db.transaction():
          return await db.transaction(async (tx) => {
            const [activity] = await tx.insert(activities)...
            if (type === "call" && customerId) {
              await tx.insert(scheduledCalls)...
            }
            return { success: true, activityId: activity.id, type };
          });
    
    # TIGER 3: No rate limiting on tracking endpoints
    - risk: "Tracking endpoints (open/click) have no rate limiting - potential DoS vector"
      location: "src/routes/api/track/open.$emailId.ts, click.$emailId.$linkId.ts"
      severity: medium
      category: scalability
      evidence: |
        Open endpoint fires recordEmailOpen without any rate limiting.
        Click endpoint does same with recordEmailClick.
        Email clients may auto-preload/prefetch images multiple times.
        Malicious actors could spam tracking endpoints.
      mitigation_checked: |
        - Searched for "rateLimit|throttle" in codebase: no results
        - No middleware wrapping these routes
        - recordEmailOpen does check "alreadyOpened" but still hits DB each time
      suggested_fix: |
        Add rate limiting middleware to tracking endpoints:
        - IP-based: Max 10 requests/minute per IP per emailId
        - Consider Redis for distributed rate limiting
        - Add request coalescing for repeated tracking pixel loads
    
    # TIGER 4: No activity bridge tests
    - risk: "activity-bridge.ts has 0 test coverage - critical path for COMMS-AUTO-001"
      location: "src/lib/server/activity-bridge.ts"
      severity: high
      category: testing
      evidence: |
        Searched for *activity*.test.ts: No files found
        Searched for *bridge*.test.ts: No files found
        This file contains 5 exported functions that create activities from emails/calls/notes.
        Any bug here would cause silent activity loss.
      mitigation_checked: |
        - tests/unit/ directory has auth, components, lib, schemas - no activity-bridge
        - tests/integration/activities/ has activity-logging.spec.ts but it tests ActivityLogger, not activity-bridge
        - activity-logging.spec.ts mocks db.insert so doesn't test actual bridge functions
      suggested_fix: |
        Create tests/unit/lib/activity-bridge.spec.ts with:
        - Test createEmailSentActivity success/failure paths
        - Test createEmailOpenedActivity deduplication
        - Test createEmailClickedActivity with link tracking
        - Test createCallLoggedActivity with all optional fields
        - Test createNoteAddedActivity entity type selection
    
    # TIGER 5: No quick-log tests
    - risk: "quick-log server function and component have 0 test coverage"
      location: "src/lib/server/quick-log.ts, src/components/domain/communications/quick-log-dialog.tsx"
      severity: medium
      category: testing
      evidence: |
        Searched for *quick-log*.test.ts: No files found
        Server function validates input, checks auth, creates 2 records.
        UI component has keyboard shortcuts and form validation.
      mitigation_checked: |
        - No mock for createQuickLog in any test file
        - No component tests for QuickLogDialog
      suggested_fix: |
        Create:
        - tests/unit/lib/quick-log.spec.ts - server function tests
        - tests/unit/components/quick-log-dialog.spec.tsx - component tests
        - Test Cmd+L shortcut behavior
        - Test form validation
        - Test type switching (call/note/meeting)
  
  elephants:
    # ELEPHANT 1: No unsubscribe/privacy check before activity creation
    - risk: "Activity bridge creates records even for unsubscribed contacts"
      severity: medium
      evidence: |
        email-tracking.ts has isTrackingAllowed() but it returns true always:
          export async function isTrackingAllowed(_contactId: string): Promise<boolean> {
            // TODO: Implement when communication preferences are added (DOM-COMMS-005)
            return true;
          }
        
        Activity creation doesn't check this - email opens/clicks create activities regardless.
        GDPR concern: tracking opted-out users could be a compliance issue.
      suggested_fix: |
        1. Implement isTrackingAllowed() with actual preference check
        2. Call it before creating activities in recordEmailOpen/recordEmailClick
        3. Add source metadata field: trackingConsent: true/false
  
  paper_tigers:
    # PAPER TIGER 1: Fire-and-forget tracking seems risky
    - risk: "recordEmailOpen/Click use fire-and-forget (.catch) - looks like errors are lost"
      reason: "Actually OK - user experience prioritized over tracking"
      location: "src/routes/api/track/open.$emailId.ts:22-24"
      evidence: |
        Code: recordEmailOpen(emailId).catch((err) => { console.error(...) });
        
        This is intentional defensive design:
        - Tracking should never block the user's click/view
        - Errors are logged via console.error
        - User still sees the pixel/gets redirected
        - Activity might not be created, but that's acceptable degradation
    
    # PAPER TIGER 2: sourceRef is UUID but might not exist
    - risk: "sourceRef references email_history.id but no FK constraint - orphan references possible"
      reason: "Intentional design - soft reference allows flexibility"
      location: "drizzle/schema/activities.ts:89"
      evidence: |
        sourceRef: uuid("source_ref"), // No .references()
        
        This is acceptable because:
        - Activities are append-only audit logs
        - We don't want cascade deletes affecting audit trail
        - The reference is informational, not relational
        - Migration 0020 comments this explicitly
  
  checklist_gaps:
    - category: "scalability"
      items_failed:
        - "Works at 10x/100x load: No - tracking endpoints lack rate limiting"
        - "Batch processing considered: campaign job has batching, but tracking endpoints don't"
    
    - category: "testing"
      items_failed:
        - "Unit test coverage: activity-bridge.ts has 0%"
        - "Unit test coverage: quick-log.ts has 0%"
        - "Integration test plan: activity-logging.spec.ts doesn't test bridge functions"
    
    - category: "error-handling"
      items_failed:
        - "Transaction safety: quick-log multi-table writes not wrapped"
    
    - category: "permissions"
      items_failed:
        - "Permission matrix complete: activity.create missing"
```

---

## Detailed Analysis

### 1. Missing Permission (TIGER)

**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/quick-log.ts`

The quick-log server function attempts to use `PERMISSIONS.activity?.create` but this permission does not exist. The fallback to `customer.read` means:
- Any user who can read customers can create activity logs
- This is overly permissive for audit trail creation

**Current permissions.ts:**
```typescript
activity: {
  read: 'activity.read',
  export: 'activity.export',
  // create is MISSING
}
```

### 2. Transaction Safety (TIGER)

**File:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/quick-log.ts`

Lines 85-100 perform two separate database inserts without transaction wrapping:

```typescript
// Insert 1 - activity
const [activity] = await db
  .insert(activities)
  .values({...})
  .returning();

// Insert 2 - scheduled_calls (conditional)
if (type === "call" && customerId) {
  await db.insert(scheduledCalls).values({...});
}
```

If Insert 1 succeeds but Insert 2 fails, we have inconsistent state.

### 3. Rate Limiting Gap (TIGER)

**Files:** 
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/routes/api/track/open.$emailId.ts`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/routes/api/track/click.$emailId.$linkId.ts`

These public endpoints have no rate limiting. While `recordEmailOpen` checks `alreadyOpened` to prevent duplicate activity creation, every request still hits the database to check this.

### 4. Test Coverage (TIGER)

Critical business logic in activity-bridge.ts and quick-log.ts has no test coverage. The existing `activity-logging.spec.ts` tests the ActivityLogger class, not the bridge functions.

### 5. Privacy Compliance (ELEPHANT)

The `isTrackingAllowed()` function is stubbed to always return `true`:

```typescript
export async function isTrackingAllowed(_contactId: string): Promise<boolean> {
  // TODO: Implement when communication preferences are added (DOM-COMMS-005)
  return true;
}
```

This means activity tracking happens regardless of user consent preferences.

---

## Recommended Actions

### Immediate (Before Launch)

1. **Add activity.create permission** - 30 min
   - Update permissions.ts
   - Add to appropriate roles
   - Update quick-log.ts to use it properly

2. **Wrap quick-log in transaction** - 15 min
   - Simple refactor using existing transaction pattern

3. **Add basic rate limiting to tracking endpoints** - 2 hours
   - IP-based limiting at minimum
   - Consider existing middleware patterns

### Short-term (Sprint)

4. **Create activity-bridge tests** - 4 hours
   - Unit tests for all 5 functions
   - Mock database layer

5. **Create quick-log tests** - 2 hours
   - Server function tests
   - Component tests

### Medium-term (Backlog)

6. **Implement isTrackingAllowed()** - 4 hours
   - Connect to communication preferences
   - Add to email tracking flow
   - Consider GDPR implications
