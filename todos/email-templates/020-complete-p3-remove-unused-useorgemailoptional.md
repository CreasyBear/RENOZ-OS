---
status: pending
priority: p3
issue_id: "020"
tags: [code-review, email-templates, dead-code, cleanup]
dependencies: []
---

# Remove Unused useOrgEmailOptional Hook

## Problem Statement

The `useOrgEmailOptional()` hook in `src/lib/email/context.tsx` is exported but **never used anywhere in the codebase**. It was designed for "components that work both inside and outside org context" but no component uses it.

**Why it matters:** The main `useOrgEmail()` hook already returns defaults when outside context, making this hook redundant.

## Findings

**File:** `src/lib/email/context.tsx` (lines 152-154)

```typescript
/**
 * Optional hook that returns null if outside context
 * Useful for components that work both inside and outside org context
 */
export function useOrgEmailOptional(): OrgEmailContextValue | null {
  return useContext(OrgEmailContext);
}
```

**Usage search result:** Zero usages in codebase

**Redundancy:** The main `useOrgEmail()` already handles the "outside context" case by returning defaults, making this hook unnecessary.

**Discovered by:** code-simplicity-reviewer agent

## Proposed Solutions

### Solution A: Delete Hook (Recommended)
Remove the hook and its export.

**Pros:** Reduces API surface, eliminates confusion
**Cons:** None - no consumers
**Effort:** Small
**Risk:** Low

### Solution B: Keep for Future Use
Might be useful for components that need to detect if they're in org context.

**Pros:** Potentially useful API
**Cons:** Currently dead code
**Effort:** None
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Files to modify:**
- `src/lib/email/context.tsx` - remove hook
- `src/lib/email/index.ts` - remove export

## Acceptance Criteria

- [ ] `useOrgEmailOptional` hook removed
- [ ] Export removed from barrel file
- [ ] No build errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- `src/lib/email/context.tsx:152-154`
