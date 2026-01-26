---
status: pending
priority: p1
issue_id: "012"
tags: [code-review, email-templates, error-handling, compliance]
dependencies: []
---

# Silent Database Error Fallback in renderOrgEmail

## Problem Statement

The `getOrgEmailData()` function in `src/lib/email/render-org.tsx` catches database errors and silently returns default branding. This is dangerous because:

1. Emails could be sent without proper branding (brand damage)
2. CAN-SPAM compliance requires correct sender information
3. Configuration errors in production are masked

**Why it matters:** An organization's emails could go out with generic "Your Company" branding instead of their actual branding, with no error surfaced to operators.

## Findings

**File:** `src/lib/email/render-org.tsx` (lines 105-111)

```typescript
} catch (error) {
  console.error(`Failed to fetch org email data for ${organizationId}:`, error);
  return {
    branding: DEFAULT_BRANDING,
    settings: DEFAULT_SETTINGS,
  };
}
```

The only indication of failure is a `console.error` log that's easy to miss.

**Discovered by:** kieran-typescript-reviewer agent, architecture-strategist agent

## Proposed Solutions

### Solution A: Add Strict Mode Option (Recommended)
Add `strict` option to throw instead of returning defaults.

```typescript
export interface GetOrgEmailDataOptions {
  strict?: boolean;
}

export async function getOrgEmailData(
  organizationId: string,
  options: GetOrgEmailDataOptions = {}
): Promise<OrgEmailData> {
  try {
    // ... existing logic
  } catch (error) {
    if (options.strict) {
      throw new Error(`Failed to fetch org email data: ${error}`);
    }
    console.error(...);
    return defaults;
  }
}
```

**Pros:** Backward compatible, explicit control
**Cons:** Requires opting in to strict mode
**Effort:** Small
**Risk:** Low

### Solution B: Always Throw on Database Errors
Change to always throw, let callers decide how to handle.

**Pros:** Explicit failure, no silent degradation
**Cons:** Breaking change, requires caller updates
**Effort:** Medium
**Risk:** Medium (breaking change)

### Solution C: Add Monitoring/Alerting Hook
Keep fallback but add alerting integration.

**Pros:** Non-breaking, ops visibility
**Cons:** Still sends with wrong branding
**Effort:** Medium
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected files:**
- `src/lib/email/render-org.tsx`

**Downstream impact:**
- All email sending that uses `renderOrgEmail()` or `getOrgEmailData()`
- Trigger jobs: `send-campaign.ts`, `process-scheduled-emails.ts`

## Acceptance Criteria

- [ ] Database errors don't silently produce emails with default branding
- [ ] Clear error surfacing for production monitoring
- [ ] Operators alerted when org branding fetch fails

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- File: `src/lib/email/render-org.tsx:105-111`
- CAN-SPAM compliance requires accurate sender identification
