---
status: pending
priority: p2
issue_id: EMAIL-TPL-008
tags: [code-review, data-integrity, email-templates]
dependencies: []
---

# Type-Safe Formatting Helpers for Templates

## Problem Statement

Templates lack centralized, type-safe formatting helpers for currency, dates, addresses, and phone numbers. This leads to inconsistent formatting and potential runtime errors with null values.

**Impact**: MEDIUM - Inconsistent display, potential errors.

## Findings

### Evidence

1. **No shared formatters** exist for email templates
2. **Inconsistent patterns**:
   - Some templates: `$${amount}` (missing locale formatting)
   - Some templates: `new Date(date).toLocaleDateString()`
   - Some templates: Raw date strings

3. **Null handling missing**:
   ```typescript
   // Crashes if date is null
   formatDate(order.deliveryDate)
   ```

### Agent Source
- data-integrity-guardian: "Type-safe formatting needed"
- pattern-recognition-specialist: "Centralize formatting utilities"

## Proposed Solutions

### Option A: Dedicated Email Formatters (Recommended)
Create `src/lib/email/format.ts` with null-safe helpers.

**Pros**:
- Email-specific (e.g., no interactive elements)
- Null-safe by design
- Consistent across all templates

**Cons**: Duplicates some app formatters
**Effort**: Small
**Risk**: Low

### Option B: Extend Existing App Formatters
Add email-safe variants to existing `src/lib/format.ts`.

**Pros**: Single source of truth
**Cons**: May not exist, different contexts (HTML vs React)
**Effort**: Small
**Risk**: Low

## Recommended Action

Option A - Create dedicated email formatters with null safety.

## Technical Details

### Formatter File
```typescript
// src/lib/email/format.ts

/**
 * Format currency for email display
 * Returns formatted string or placeholder if null
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: { currency?: string; placeholder?: string } = {}
): string {
  const { currency = "USD", placeholder = "$0.00" } = options;

  if (amount == null) return placeholder;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format date for email display
 * Returns formatted string or placeholder if null
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: { style?: "short" | "medium" | "long"; placeholder?: string } = {}
): string {
  const { style = "medium", placeholder = "N/A" } = options;

  if (date == null) return placeholder;

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return placeholder;

  const styles = {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
  };

  return d.toLocaleDateString("en-US", styles[style]);
}

/**
 * Format phone number for display
 */
export function formatPhone(
  phone: string | null | undefined,
  placeholder = ""
): string {
  if (!phone) return placeholder;

  // Strip non-digits
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone; // Return as-is if not standard format
}

/**
 * Format address for email display (multiline safe)
 */
export function formatAddress(
  address: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  } | null | undefined,
  placeholder = ""
): string {
  if (!address) return placeholder;

  const parts = [
    address.street,
    [address.city, address.state, address.zip].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : placeholder;
}
```

### Usage in Templates
```tsx
import { formatCurrency, formatDate, formatAddress } from "../format";

export function Invoice({ order }: Props) {
  return (
    <Section>
      <Text>Order Date: {formatDate(order.createdAt)}</Text>
      <Text>Total: {formatCurrency(order.total)}</Text>
      <Text>Ship to:</Text>
      <Text style={{ whiteSpace: "pre-line" }}>
        {formatAddress(order.shippingAddress, "Address not provided")}
      </Text>
    </Section>
  );
}
```

## Acceptance Criteria

- [ ] `formatCurrency()` with locale support and null safety
- [ ] `formatDate()` with style options and null safety
- [ ] `formatPhone()` with standard formatting
- [ ] `formatAddress()` for multiline address display
- [ ] All helpers return placeholder on null/undefined
- [ ] Unit tests for edge cases (null, invalid dates, etc.)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | From data-integrity-guardian review |

## Resources

- Intl.NumberFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
