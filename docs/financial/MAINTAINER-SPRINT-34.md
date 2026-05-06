# Financial Maintainer Sprint 34: Reporting Freshness After External Payments

This sprint closes the reporting side of the Xero payment webhook work. Sprint 33 kept order and invoice detail payment ledgers fresh after external writes. The remaining risk was broader financial reporting: analytics, AR aging, and the financial exception queue could keep showing a stale cash, overdue, or reminder picture until the operator manually refreshed.

## Business Value

Xero webhooks can apply payments outside the active browser workflow. RENOZ operators need financial reporting pages to catch up without guessing whether the app is stale.

Protected value:

- cash and AR reporting reflects externally applied payments on active operator screens
- overdue invoice and reminder candidate queues age out after webhook-applied payment updates
- failed Xero sync exceptions on the financial landing page refresh with the rest of the triage queue
- reporting freshness is explicit at the route/container layer instead of buried inside shared hooks

## Workflow Spine

```text
Xero webhook
  -> payment reconciliation
  -> financial projection / order payment state
  -> reporting server reads
  -> financial hooks
  -> route-scoped query observer freshness
  -> analytics, AR aging, and financial triage surfaces
```

Touched surfaces:

- `/financial/analytics`
- `/financial/ar-aging`
- `/financial` landing triage
- financial dashboard, AR aging, payment reminder, and Xero sync hooks

## Architecture Decision

The freshness policy belongs to the active route or container, not the server function and not the centralized query key. Each reporting hook accepts an optional `refetchInterval?: number | false`, strips it out of server params, keeps query keys stable, and passes it only to React Query observer options.

This preserves the existing flow:

```text
route/page
  -> domain component
  -> hook
  -> server function
  -> schema/database
  -> centralized query key/cache policy
```

## Changes

- Added observer-level `refetchInterval` support to financial dashboard metrics, revenue by period, top customers, outstanding invoices, AR aging, and payment reminder candidate hooks.
- Applied 30 second route-scoped freshness to `/financial/analytics` reporting panels.
- Applied 30 second route-scoped freshness to `/financial/ar-aging`.
- Added a `FinancialTriage` freshness prop and routed it through overdue invoices, failed Xero syncs, and reminder candidates on the financial landing page.
- Added source contract coverage proving the polling option remains outside query keys and server read params.

## Closeout

Touched domains: Financial reporting and Xero/payment exception triage.

Workflow protected: external Xero payment webhook -> reconciled payment state -> financial reporting reads -> analytics, AR aging, and landing triage refresh.

Business value: operators get a fresher view of cash, AR, overdue invoices, reminder candidates, and failed sync exceptions without manual reloads after Xero applies payment updates.

Standards checked: route -> component -> hook -> server read -> query key/cache policy; centralized query keys; observer-only polling policy; tenant isolation unchanged; finance transaction logic unchanged; UI loading/error states unchanged.

Smells removed: stale active reporting surfaces after external payment writes; hidden cache freshness assumptions inside shared hooks.

Deferred: a push/realtime cache broadcast strategy could replace route polling later. Browser QA was skipped because this slice changes query observer freshness only, not layout or interaction behavior.

Verification:

- `./node_modules/.bin/vitest run tests/unit/financial/separation-contract.test.ts tests/unit/financial/query-key-contract.test.tsx tests/unit/finance-dashboard/query-normalization-wave6f.test.tsx tests/unit/financial/xero-payment-reconciliation-behavior.test.ts` passed, 4 files, 21 tests.
- `./node_modules/.bin/vitest run tests/unit/financial tests/unit/finance tests/unit/finance-dashboard` passed, 19 files, 79 tests.
- `bun run typecheck` passed.
- `bun run lint` passed.
- `git diff --check` passed.

Goal adaptation: accepted the updated maintainer posture that serialized gates are retired routine evidence. This slice did not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts, so no serialized gate skip is recorded.

Residual risk: active reporting routes now refresh, but inactive cached reports can still be stale until revisited or invalidated by future mutation/cache-broadcast work.
