---
status: pending
priority: p2
issue_id: "014"
tags: [code-review, email-templates, i18n, formatting]
dependencies: []
---

# Formatting Utilities Ignore Org Locale Settings

## Problem Statement

The formatting utilities in `src/lib/email/format.ts` hardcode `"en-US"` as the default locale, ignoring the organization's configured locale settings. The org context has `locale`, `currency`, `dateFormat`, and `timezone` settings that aren't being used.

**Why it matters:** Australian organizations will see US-formatted dates and currency symbols. Multi-national organizations can't customize email formatting per their regional preferences.

## Findings

**File:** `src/lib/email/format.ts` (lines 37-52)

```typescript
export function formatCurrency(
  amount: number | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  const {
    currency = "USD",       // Should use org settings
    placeholder = "$0.00",
    locale = "en-US",       // Should use org settings
  } = options;
```

**Organization settings available but unused:**
```typescript
// From context.tsx
export interface OrgEmailSettings {
  timezone?: string | null;     // e.g., "Australia/Sydney"
  locale?: string | null;       // e.g., "en-AU"
  currency?: string | null;     // e.g., "AUD"
  dateFormat?: string | null;   // e.g., "DD/MM/YYYY"
  timeFormat?: "12h" | "24h" | null;
}
```

**Discovered by:** architecture-strategist agent

## Proposed Solutions

### Solution A: Create Context-Aware Formatting Hook (Recommended)
Add a hook that wraps format utilities with org settings.

```typescript
// New: src/lib/email/hooks/use-org-format.ts
export function useOrgFormat() {
  const { settings } = useOrgEmail();

  return {
    formatCurrency: (amount: number | null) =>
      formatCurrency(amount, {
        currency: settings.currency ?? "USD",
        locale: settings.locale ?? "en-US"
      }),
    formatDate: (date: Date | string | null) =>
      formatDate(date, {
        locale: settings.locale ?? "en-US"
      }),
  };
}
```

**Pros:** Clean API, templates use hooks naturally
**Cons:** Adds new abstraction
**Effort:** Medium
**Risk:** Low

### Solution B: Pass Settings Explicitly in Templates
Templates call `useOrgEmail()` and pass settings to format functions.

**Pros:** Explicit, no new hooks
**Cons:** Verbose, repetitive
**Effort:** Small
**Risk:** Low

### Solution C: Change Format Function Defaults
Make format functions accept settings object directly.

**Pros:** Simple
**Cons:** Doesn't solve the hook ergonomics
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

**Affected files:**
- `src/lib/email/format.ts`
- All template files using format utilities

**Format functions affected:**
- `formatCurrency()`
- `formatDate()`
- `formatNumber()`
- `formatPercent()`

## Acceptance Criteria

- [ ] Format utilities respect org locale settings
- [ ] Templates render dates/currency in org's preferred format
- [ ] Australian org sees "25/01/2025" not "01/25/2025"
- [ ] Australian org sees "$299.00 AUD" not "$299.00"

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-25 | Created | Discovered during email library review |

## Resources

- `src/lib/email/format.ts` - current implementation
- `src/lib/email/context.tsx` - OrgEmailSettings interface
