# STANDARDS & SCHEMA-TRACE Audit Report
**Date:** 2026-02-24

## Summary

Audit of STANDARDS.md and SCHEMA-TRACE.md compliance, plus HTTPError 500 debugging notes.

## STANDARDS Compliance

| Check | Result |
|-------|--------|
| Inline query keys in routes | 0 (compliant) |
| Direct useQuery in routes | 0 (compliant) |
| Direct useMutation in routes | 0 (compliant) |
| Hook dirs missing barrel exports | 0 (compliant) |
| Schema dirs missing barrel exports | 2: `oauth`, `integrations` |
| Heavy routes (>100 lines) | 2: financial/credit-notes (158), financial/invoices (154) |

## SCHEMA-TRACE Violations

### Raw SQL Instead of Drizzle Aggregation (§2, §9)

Prefer `count()`, `sum()`, `avg()` from Drizzle over raw `sql\`COUNT(*)\`` etc.

| File | Line(s) | Pattern |
|------|---------|---------|
| src/server/customers.ts | 135, 137 | sql\`COUNT\`, sql\`COALESCE(SUM...)\` |
| src/server/functions/inventory/inventory.ts | 2168, 2260, 2302, 2538, 2559 | sql\`COUNT(*)\`, sql\`SUM(...)\` |
| src/server/functions/inventory/valuation.ts | 521, 538, 580 | sql\`SUM(...)\` |
| src/server/functions/pipeline/win-loss-reasons.ts | 441 | sql\`COUNT(*)\` |
| src/server/functions/financial/financial-dashboard.ts | 597, 693 | sql\`COALESCE(SUM...)\` |
| src/server/functions/customers/customer-analytics.ts | 410, 1179 | sql\`COALESCE(SUM...)\` |
| src/server/functions/inventory/alerts.ts | 357, 784, 849 | sql\`COALESCE(SUM...)\` in having |
| src/routes/api/ai/cost.ts | 64, 76 | sql\`SUM(...)\` |

### Inline Record Types (§4)

SCHEMA-TRACE prefers types in `lib/schemas/{domain}/`. Many components use inline `Record<string, { label: string; color: string }>` for UI config. Lower priority; acceptable for simple config objects.

## HTTPError 500 Debugging

Error: `{"status":500,"unhandled":true,"message":"HTTPError"}`

### Likely Causes

1. **Unhandled server function exception** – createServerFn handler throws
2. **Auth failure** – withAuth() or getServerUser() throws
3. **Schema/DB mismatch** – migration changed columns, query expects old shape

### Entry Points on Authenticated Load

- `_authenticated.tsx` → `useOrganizationSettingsQuery()` → `getOrganizationSettings`
- `_authenticated.tsx` beforeLoad → Supabase `users` query

### Debugging Steps

1. **Network tab**: Find the request returning 500 (URL, payload)
2. **Server logs**: Check for stack trace when 500 occurs
3. **Reproduce**: Note which page/action triggers it
