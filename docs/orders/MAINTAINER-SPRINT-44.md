# Orders Maintainer Sprint 44

## Slice

The Orders mutation client error helper should not carry a raw-looking `error.message || fallback` display pattern after normalization.

## Business Value

Order and shipment mutations sit on critical sales, fulfillment, and warehouse workflows. The normalizer already sanitizes stored mutation messages; this slice makes the display helper reflect that contract clearly so future order UI does not reintroduce raw operator-facing fallbacks.

## Workflow Spine

```text
order/shipment mutation
  -> normalizeOrderMutationError / normalizeShipmentMutationError
  -> OrderMutationClientError / ShipmentMutationClientError
  -> getClientErrorMessage
  -> order UI toast/dialog feedback
```

## Triage Findings

- `getClientErrorMessage` still used `error.message || fallback` even though `error.message` had already been sanitized by `formatMutationClientMessage`.
- The pattern made the helper look like a raw message leak and kept it in the repo debt scan.
- No server function, schema, query key, cache invalidation, inventory, or finance behavior needed to change.

## Implementation

- Read the normalized message once, trim it, and return it when present.
- Preserve kind-specific fallback copy when the normalized error message is empty.
- Added a source contract assertion to prevent `error.message ||` from returning to the Orders mutation helper.

## Closeout

Touched domains: orders.

Workflow protected: order and shipment mutation feedback normalization.

Business value: critical order/fulfillment feedback remains operator-safe and easier for maintainers to audit.

Standards checked: hook/helper ownership, mutation feedback contract, operator-safe errors, meaningful tests, reviewable diff.

Smells removed: raw-looking `error.message ||` fallback pattern in the Orders mutation client helper.

Deferred: broader Orders raw-message scans outside this helper remain separate domain slices.

Verification: `bun run test:vitest tests/unit/orders/order-client-contracts.test.ts`, `bun run typecheck`, `bun run lint`, targeted Orders mutation helper raw-pattern scan, `git diff --check`.

Goal adaptation: none.

Residual risk: low; this is a behavior-preserving helper cleanup around an already-normalized message.
