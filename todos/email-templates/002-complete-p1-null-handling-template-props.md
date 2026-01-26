---
status: pending
priority: p1
issue_id: EMAIL-TPL-002
tags: [code-review, data-integrity, email-templates]
dependencies: []
---

# Null Handling Gaps in Template Props

## Problem Statement

Template components don't defensively handle null/undefined props, resulting in literal "null" or "undefined" strings rendered in emails. This causes embarrassing customer-facing issues like "Dear null" or "Order #undefined".

**Impact**: HIGH - Visible to customers, damages brand perception.

## Findings

### Evidence

1. **warranty-expiring.tsx**: Props typed but no runtime guards
2. **String templates**: `variables[key] || ''` handles undefined but not explicit null
3. **Midday pattern**: Always provides defaults via `const { name = "there" } = props`

### Example Bug
```typescript
// If customerName is null (from database NULL):
<Text>Dear {customerName}</Text>
// Renders: "Dear null"
```

### Agent Source
- data-integrity-guardian: "Runtime null handling gaps"
- pattern-recognition-specialist: "Adopt Midday's default value patterns"

## Proposed Solutions

### Option A: Default Values in Destructuring (Recommended)
```typescript
const {
  customerName = "Valued Customer",
  orderNumber = "",
  amount = 0
} = props;
```

**Pros**: Clean, TypeScript-friendly, follows Midday pattern
**Cons**: Must apply to every template
**Effort**: Small per template
**Risk**: Low

### Option B: Wrapper Component with Null Coalescing
Create `<SafeText value={x} fallback="default" />` component.

**Pros**: Centralized, impossible to forget
**Cons**: More verbose templates, another abstraction
**Effort**: Medium
**Risk**: Low

### Option C: Zod Transform at Render Time
Validate and transform props before rendering.

**Pros**: Type-safe, catches issues early
**Cons**: Performance overhead, complex
**Effort**: Medium
**Risk**: Medium

## Recommended Action

Option A - Use default values consistently in all templates.

## Technical Details

### Affected Files
- All files in `src/components/email-templates/`
- All files in `src/lib/email/templates/` (future)

### Pattern to Apply
```typescript
// Before
export function OrderConfirmation({ customerName, orderNumber, total }: Props) {
  return <Text>Hi {customerName}, your order #{orderNumber} for ${total}</Text>;
}

// After
export function OrderConfirmation(props: Props) {
  const {
    customerName = "Valued Customer",
    orderNumber = "N/A",
    total = 0,
  } = props;

  return <Text>Hi {customerName}, your order #{orderNumber} for ${formatCurrency(total)}</Text>;
}
```

## Acceptance Criteria

- [ ] All template components use destructuring with defaults
- [ ] No template can render literal "null" or "undefined"
- [ ] Shared `formatCurrency`, `formatDate` helpers handle null
- [ ] Unit tests verify null prop handling

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From data-integrity-guardian review |

## Resources

- Midday example: `_reference/.midday-reference/packages/email/emails/invoice.tsx`
