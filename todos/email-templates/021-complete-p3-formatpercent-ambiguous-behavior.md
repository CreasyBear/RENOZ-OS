---
status: pending
priority: p3
issue_id: "021"
tags: [code-review, email-templates, api-design, formatting]
dependencies: []
---

# formatPercent Has Ambiguous Auto-Detection Behavior

## Problem Statement

The `formatPercent()` function in `src/lib/email/format.ts` attempts to auto-detect whether a value is a decimal (0-1) or percentage (0-100). This "magic" behavior is confusing and will cause bugs.

**Why it matters:** `formatPercent(1)` returns "100%" but `formatPercent(1.5)` returns "2%". This inconsistency will confuse developers and produce unexpected output.

## Findings

**File:** `src/lib/email/format.ts` (lines 309-318)

```typescript
export function formatPercent(value: number | null | undefined, placeholder = "0%"): string {
  if (value == null || isNaN(value)) return placeholder;
  // If value is between 0 and 1, treat as decimal
  const percent = value <= 1 && value >= 0 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}
```

**Problem cases:**
- `formatPercent(0.5)` → "50%" ✓ (treated as decimal)
- `formatPercent(1)` → "100%" (treated as decimal - is this intended?)
- `formatPercent(1.5)` → "2%" (NOT treated as decimal - inconsistent!)
- `formatPercent(50)` → "50%" ✓ (treated as percentage)

The boundary at exactly 1 creates ambiguity.

**Discovered by:** kieran-typescript-reviewer agent

## Proposed Solutions

### Solution A: Make Behavior Explicit (Recommended)
Add explicit option to indicate input type.

```typescript
export function formatPercent(
  value: number | null | undefined,
  options: { isDecimal?: boolean; placeholder?: string } = {}
): string {
  const { isDecimal = false, placeholder = "0%" } = options;
  if (value == null || isNaN(value)) return placeholder;
  const percent = isDecimal ? value * 100 : value;
  return `${Math.round(percent)}%`;
}
```

**Pros:** Explicit, no magic behavior
**Cons:** Breaking change for existing callers
**Effort:** Small
**Risk:** Medium (breaking change)

### Solution B: Remove Auto-Detection, Always Treat as Percentage
Remove the 0-1 detection, always expect percentage values.

```typescript
export function formatPercent(value: number | null | undefined, placeholder = "0%"): string {
  if (value == null || isNaN(value)) return placeholder;
  return `${Math.round(value)}%`;
}
```

**Pros:** Simple, predictable
**Cons:** Callers with decimal values must multiply first
**Effort:** Small
**Risk:** Medium (breaking change)

### Solution C: Add formatDecimalAsPercent
Keep current function, add new explicit function.

```typescript
export function formatDecimalAsPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}
```

**Pros:** Non-breaking, adds clarity
**Cons:** Two functions for similar purpose
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected file:**
- `src/lib/email/format.ts`

**Current callers:**
Need to audit all callers to understand expected behavior before changing.

## Acceptance Criteria

- [ ] formatPercent behavior is predictable and documented
- [ ] No magic auto-detection causing confusion
- [ ] Existing callers updated if behavior changes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- `src/lib/email/format.ts:309-318`
