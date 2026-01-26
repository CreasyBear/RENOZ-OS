---
status: pending
priority: p1
issue_id: "011"
tags: [code-review, email-templates, typescript, documentation]
dependencies: []
---

# useOrgEmail Documentation Mismatch

## Problem Statement

The `useOrgEmail()` hook in `src/lib/email/context.tsx` has JSDoc that says `@throws Error if used outside of OrgEmailProvider` but the implementation **silently returns defaults** instead of throwing. This creates a misleading API contract.

**Why it matters:** Developers relying on the documented throwing behavior may write code expecting exceptions that never occur. In production, emails could be sent with default branding when organization branding should be required.

## Findings

**File:** `src/lib/email/context.tsx` (lines 119-146)

```typescript
/**
 * @throws Error if used outside of OrgEmailProvider  // <-- DOCUMENTATION LIE
 */
export function useOrgEmail(): OrgEmailContextValue {
  const context = useContext(OrgEmailContext);
  if (!context) {
    // Return defaults for non-org contexts (dev preview, system emails)
    return {
      branding: DEFAULT_BRANDING,
      settings: DEFAULT_SETTINGS,
      // ...
    };
  }
  return context;
}
```

The `useOrgEmailOptional()` hook exists but is never used - it was meant for the fallback-to-defaults use case.

**Discovered by:** kieran-typescript-reviewer agent

## Proposed Solutions

### Solution A: Update Documentation to Match Behavior (Recommended)
Remove the `@throws` JSDoc since the function doesn't throw.

**Pros:** Quick fix, matches current behavior
**Cons:** Silent fallback to defaults could mask configuration errors
**Effort:** Small
**Risk:** Low

### Solution B: Create Strict Mode Hook
Add `useOrgEmailStrict()` that throws when outside context, keep current hook behavior.

**Pros:** Gives both options, explicit API
**Cons:** Adds another hook, more surface area
**Effort:** Small
**Risk:** Low

### Solution C: Add Strict Option Parameter
Add optional `{ strict: true }` parameter to throw instead of returning defaults.

**Pros:** Single hook, configurable behavior
**Cons:** Overloaded API
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected files:**
- `src/lib/email/context.tsx`

**Components affected:**
- All email components using `useOrgEmail()`

## Acceptance Criteria

- [ ] Documentation matches implementation behavior
- [ ] Clear guidance on when to use strict vs fallback mode
- [ ] Templates that REQUIRE org branding use appropriate hook

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- File: `src/lib/email/context.tsx:119-146`
- Related: `useOrgEmailOptional()` (unused hook at line 152)
