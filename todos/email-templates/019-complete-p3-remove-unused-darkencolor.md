---
status: pending
priority: p3
issue_id: "019"
tags: [code-review, email-templates, dead-code, cleanup]
dependencies: []
---

# Remove Unused darkenColor Function

## Problem Statement

The `darkenColor()` function in `src/lib/email/context.tsx` is exported but **never used anywhere in the codebase**. It should be removed to reduce maintenance burden.

**Why it matters:** Dead code increases maintenance burden and cognitive load. YAGNI principle suggests removing it until actually needed.

## Findings

**File:** `src/lib/email/context.tsx` (lines 249-261)

```typescript
/**
 * Generate a darker variant of a hex color
 * Useful for text on colored backgrounds
 */
export function darkenColor(hex: string, percent: number): string {
  const color = hex.replace("#", "");
  // ... 13 lines of implementation
}
```

**Usage search result:** Zero usages in codebase

**Discovered by:** code-simplicity-reviewer agent

## Proposed Solutions

### Solution A: Delete Function (Recommended)
Remove the function and its export.

**Pros:** Reduces dead code
**Cons:** Would need to re-add if needed later (trivial)
**Effort:** Small
**Risk:** Low

### Solution B: Keep for API Completeness
Keep alongside `lightenColor` for symmetric API.

**Pros:** Complete color manipulation API
**Cons:** Still dead code
**Effort:** None
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Files to modify:**
- `src/lib/email/context.tsx` - remove function
- `src/lib/email/index.ts` - remove export

## Acceptance Criteria

- [ ] `darkenColor` function removed
- [ ] Export removed from barrel file
- [ ] No build errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- `src/lib/email/context.tsx:249-261`
