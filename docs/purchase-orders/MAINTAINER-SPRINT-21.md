# Purchase Orders Maintainer Sprint 21

## Slice

Purchase order cost, allocation, and receipt tab read warnings should use purchase-order owned read feedback instead of rendering raw query error messages.

## Business Value

Purchase orders connect supplier procurement, receiving, landed cost, warehouse intake, and product margin truth. Operators need cost and receipt warnings to be honest without exposing database, tenancy, or implementation details.

## Workflow Spine

```text
purchase order detail tabs
  -> usePurchaseOrderCosts / useAllocatedCosts / usePurchaseOrderReceipts
  -> purchase-order and receipt server reads
  -> schema/database tenant scope
  -> queryKeys.purchaseOrders / goods receipt cache policy
  -> tab unavailable/degraded alerts
```

## Triage Findings

- `POCostsTab` rendered `costsError?.message` and `allocationError?.message` directly in unavailable/degraded alerts.
- `POReceiptsTab` rendered `error?.message` directly in unavailable/degraded alerts.
- The hooks already use `normalizeReadQueryError`; the unsafe boundary was in tab presentation.

## Implementation

- Added `po-read-error-messages.ts` with surface-specific purchase-order read fallbacks.
- Routed costs, allocation, and receipts alerts through the helper.
- Added a focused read feedback contract test covering helper behavior and source wiring.

## Closeout

Touched domains: purchase-orders, procurement/receiving.

Workflow protected: purchase order landed-cost and receipt history read states.

Business value: supplier cost and goods-receipt workflows keep safe, consistent recovery copy when read paths fail or are stale.

Standards checked: tab -> hook -> server read -> schema/database -> query/cache policy, tenant-sensitive read feedback, honest degraded/unavailable UI states, meaningful tests, reviewable diff.

Smells removed: raw purchase order cost/allocation/receipt `error?.message` display.

Deferred: no cost allocation math, receiving mutation, inventory valuation, or cache invalidation behavior changed.

Verification: `bun run test:vitest tests/unit/purchase-orders/purchase-order-tabs-read-feedback-contract.test.ts tests/unit/purchase-orders/query-normalization-wave3d-consumers.test.tsx`, `bun run typecheck`, `bun run lint`, targeted purchase-order tab raw-message scan, `git diff --check`.

Goal adaptation: none.

Residual risk: no browser QA yet; this is a read feedback boundary change with no intended layout or data-flow change.
