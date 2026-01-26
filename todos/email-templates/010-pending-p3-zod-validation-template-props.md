---
status: pending
priority: p3
issue_id: EMAIL-TPL-010
tags: [code-review, data-integrity, email-templates]
dependencies: [EMAIL-TPL-003]
---

# Zod Validation for Template Props

## Problem Statement

Template props rely on TypeScript types only, which don't exist at runtime. Malformed data from database or API can cause rendering errors without clear error messages.

**Impact**: LOW - Runtime safety improvement.

## Findings

### Evidence

1. **No runtime validation** on template render
2. **Current pattern**:
   ```typescript
   // TypeScript helps at compile time only
   interface Props { customerName: string; }
   export function Template(props: Props) { ... }
   ```

3. **Risk**: If `props.customerName` is `undefined` at runtime, renders as "undefined"

### Agent Source
- data-integrity-guardian: "Consider Zod validation for props"
- code-simplicity-reviewer: "YAGNI - only if problems occur"

## Proposed Solutions

### Option A: Zod Schemas for Critical Templates Only
Add validation to high-volume templates (orders, invoices).

**Pros**:
- Catches errors early
- Better error messages
- Transforms (defaults, coercion)

**Cons**: Overhead, more code
**Effort**: Small per template
**Risk**: Low

### Option B: Full Zod Coverage
Validate all template props.

**Pros**: Consistent safety
**Cons**: May be overkill
**Effort**: Medium
**Risk**: Low

### Option C: Skip for Now (Recommended for P3)
TypeScript + default values may be sufficient.

**Pros**: No extra code
**Cons**: Less runtime safety
**Effort**: None
**Risk**: Medium if data quality issues exist

## Recommended Action

Option C initially, upgrade to Option A if runtime errors occur.

## Technical Details

### If Implementing Validation
```typescript
// src/lib/email/templates/orders/confirmation.schema.ts
import { z } from "zod";

export const orderConfirmationSchema = z.object({
  customerName: z.string().default("Valued Customer"),
  orderNumber: z.string(),
  total: z.number().default(0),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.number(),
  })).default([]),
  shippingAddress: z.object({
    street: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zip: z.string().nullable(),
  }).nullable(),
});

export type OrderConfirmationProps = z.infer<typeof orderConfirmationSchema>;
```

### Render Wrapper
```typescript
// src/lib/email/render.ts
import { render } from "@react-email/render";

export function renderTemplate<T>(
  Template: React.FC<T>,
  props: T,
  schema?: z.ZodSchema<T>
): string {
  const validatedProps = schema ? schema.parse(props) : props;
  return render(<Template {...validatedProps} />);
}
```

## Acceptance Criteria

- [ ] Decide if validation is needed based on runtime errors
- [ ] If yes: Add schemas to order/invoice templates first
- [ ] Render wrapper validates props before rendering
- [ ] Clear error messages for invalid props

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From data-integrity-guardian review |

## Resources

- Zod: https://zod.dev
