---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, simplicity, sprint-review]
dependencies: []
---

# Over-Engineered Context System

## Problem Statement

`OrgDocumentProvider` wraps every template to pass 6 values, but templates already receive organization as a prop. The context adds indirection without clear benefit.

## Findings

**Source:** Code Simplicity Reviewer Agent

**Current Pattern:**
```tsx
// Every template wrapped in provider
<OrgDocumentProvider organization={org}>
  <QuotePdfTemplate organization={org} ... /> {/* org passed twice */}
</OrgDocumentProvider>
```

**Context provides:**
- organization, primaryColor, secondaryColor
- locale, currency, contrastColor

**All derived from `organization` prop anyway.**

## Proposed Solutions

### Option A: Keep context but document rationale
**Pros:** No changes needed
**Cons:** Complexity remains
**Effort:** None
**Risk:** None

The context enables nested components to access branding without prop drilling. This is valid for deep component trees.

### Option B: Simplify to direct props
**Pros:** Simpler mental model
**Cons:** More prop drilling
**Effort:** Medium (4 hours)
**Risk:** Low

Pass `{ organization, primaryColor, currency, locale }` directly to components.

## Recommended Action

_To be filled during triage_

## Technical Details

**File:** `src/lib/documents/context.tsx`
**Used by:** All PDF templates and components

## Acceptance Criteria

- [ ] Decision made on keep vs simplify
- [ ] If simplified: Props passed directly
- [ ] If kept: Add documentation on why context is needed

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-26 | Created | Sprint review finding |

## Resources

- `src/lib/documents/context.tsx`
