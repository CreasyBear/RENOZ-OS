---
status: pending
priority: p2
issue_id: "015"
tags: [code-review, email-templates, validation, security]
dependencies: []
---

# Color Utility Functions Lack Input Validation

## Problem Statement

The color utility functions in `src/lib/email/context.tsx` don't validate that hex color inputs are valid. Since colors come from user-configurable organization settings, invalid values could produce garbage output, NaN-based colors, or broken emails.

**Why it matters:** An admin could enter an invalid color like "blue" or "#GGG" in organization settings, causing emails to render with broken styles.

## Findings

**File:** `src/lib/email/context.tsx` (lines 227-278)

```typescript
export function lightenColor(hex: string, percent: number): string {
  const color = hex.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16);  // No validation - could be NaN
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // ... calculations with potentially NaN values
```

**What happens with invalid input:**
- `lightenColor("blue", 50)` → Returns `#NaNNaNNaN`
- `lightenColor("#GGG", 50)` → Returns invalid hex
- `lightenColor("", 50)` → Returns garbage

**Discovered by:** kieran-typescript-reviewer agent

## Proposed Solutions

### Solution A: Add Validation with Fallback (Recommended)
Validate hex input and return default color if invalid.

```typescript
function isValidHex(hex: string): boolean {
  return /^#?[0-9A-Fa-f]{6}$/.test(hex);
}

export function lightenColor(hex: string, percent: number): string {
  if (!isValidHex(hex)) {
    return DEFAULT_PRIMARY_COLOR;  // Safe fallback
  }
  // ... existing calculation
}
```

**Pros:** Defensive, graceful degradation
**Cons:** Silent fallback could mask config errors
**Effort:** Small
**Risk:** Low

### Solution B: Validate at Organization Settings Save
Validate colors when admin saves settings, reject invalid values.

**Pros:** Catches errors at source
**Cons:** Doesn't help with existing bad data
**Effort:** Medium
**Risk:** Low

### Solution C: Both Validation Layers
Validate at save time AND runtime for defense in depth.

**Pros:** Most robust
**Cons:** More code
**Effort:** Medium
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected files:**
- `src/lib/email/context.tsx`

**Functions requiring validation:**
- `lightenColor()`
- `darkenColor()` (currently unused)
- `isLightColor()`
- `getContrastColor()`

## Acceptance Criteria

- [ ] Color functions handle invalid hex input gracefully
- [ ] Invalid colors produce safe fallback, not NaN/broken values
- [ ] Unit tests cover invalid input scenarios

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- `src/lib/email/context.tsx:227-278`
- Valid hex pattern: `/^#?[0-9A-Fa-f]{6}$/`
