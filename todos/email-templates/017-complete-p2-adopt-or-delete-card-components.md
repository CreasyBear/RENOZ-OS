---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, email-templates, components, dead-code]
dependencies: []
---

# Adopt or Delete Unused Card/DetailRow/StatusBadge Components

## Problem Statement

The `Card`, `DetailRow`, and `StatusBadge` components in `src/lib/email/components/card.tsx` are well-designed but **completely unused** in any email template. Templates manually recreate these patterns with inline styles instead.

**Why it matters:** Either these components should be adopted (reducing code duplication) or deleted (reducing maintenance burden). Currently they're dead code that gets exported.

## Findings

**File:** `src/lib/email/components/card.tsx`

**Unused components:**
- `Card` (lines 44-125) - 82 lines
- `DetailRow` (lines 131-208) - 78 lines
- `StatusBadge` (lines 214-269) - 56 lines

**Total unused code:** ~216 lines

**What templates do instead:**
```typescript
// Templates use inline styles like this (repeated 15+ times):
<Section
  style={{
    backgroundColor: "#F9FAFB",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
  }}
>
  {/* content */}
</Section>
```

**The `Card` component provides this exact pattern with variants and customization.**

**Discovered by:** pattern-recognition-specialist agent, code-simplicity-reviewer agent

## Proposed Solutions

### Solution A: Adopt Components in Templates (Recommended)
Refactor templates to use the existing Card, DetailRow, and StatusBadge components.

**Pros:** Reduces template LOC by ~40%, consistent styling, easier maintenance
**Cons:** Requires touching all templates
**Effort:** Medium
**Risk:** Low

### Solution B: Delete Unused Components
Remove Card, DetailRow, StatusBadge since templates don't use them.

**Pros:** Eliminates dead code, reduces bundle
**Cons:** Loses well-designed abstractions
**Effort:** Small
**Risk:** Low

### Solution C: Keep as Future Investment
Leave components, plan to adopt later.

**Pros:** No immediate work
**Cons:** Continues to ship dead code
**Effort:** None
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected files:**
- `src/lib/email/components/card.tsx` (potentially delete or keep)
- All template files (if adopting)

**Templates with inline card-like patterns:**
- `welcome.tsx` (1 occurrence)
- `order-confirmation.tsx` (3 occurrences)
- `order-shipped.tsx` (3 occurrences)
- `invoice.tsx` (2 occurrences)
- `ticket-created.tsx` (2 occurrences)
- `ticket-resolved.tsx` (2 occurrences)
- `warranty-expiring.tsx` (2 occurrences)

## Acceptance Criteria

If adopting:
- [ ] All templates use Card/DetailRow/StatusBadge where appropriate
- [ ] Inline Section+style patterns replaced
- [ ] Visual appearance unchanged

If deleting:
- [ ] Components removed from card.tsx
- [ ] Exports removed from index.ts
- [ ] No build errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- `src/lib/email/components/card.tsx` - unused components
- `src/lib/email/templates/` - templates using inline patterns
