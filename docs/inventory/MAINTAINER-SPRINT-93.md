# Inventory Maintainer Sprint 93

This sprint follows Sprint 92's loading-state guard in bulk receiving. The target is the server-side counterpart to Sprint 91: direct bulk receive requests must not partially process a batch that contains duplicate same-product serials.

Status: Closed after Issue 1.

## Business Value

Serialized battery receiving must be safe even when a request bypasses the UI. The client now catches duplicate same-product serials across selected POs, but the server still owned the final integrity boundary. A self-contradictory batch should fail affected rows before any receipt mutation runs for those rows.

## Workflow Spine

Bulk receive mutation
-> selected purchase-order detail reads
-> product serialization reads
-> receipt item preparation
-> batch serial preflight
-> per-PO `receiveGoods` delegation
-> receipt, inventory, cost-layer, movement, and product-cost updates.

## Architecture Constraints

- Keep this sprint to the bulk receive server mutation and a small supplier-domain helper.
- Preserve `receiveGoods` as the authoritative per-PO transactional receipt mutation.
- Preserve tenant predicates, transaction boundaries, inventory finance behavior, mutation payload shape, query/cache invalidation, and client wizard behavior.
- Ensure the duplicate batch preflight runs before any `receiveGoods` delegation.

## Issue Ledger

### 1. Bulk Receive Server Could Partially Process Duplicate Same-Product Serials

Problem:

- Sprint 91 blocked duplicate same-product serials in the bulk receiving dialog.
- `bulkReceiveGoods` still processed POs sequentially when called directly.
- If the same product serial appeared across two selected POs, the first PO could receipt successfully and the second could fail later inside `receiveGoods` because the serial already existed in inventory.
- That left a self-contradictory request with avoidable partial side effects.

Workflow protected:

bulk receive request -> serial validation -> safe preflight -> per-PO receipt mutation.

Implemented slice:

- Added `bulk-receive-serial-preflight.ts` in the supplier server boundary.
- Added normalized same-product duplicate detection across prepared bulk receive serial lines.
- Refactored `bulkReceiveGoods` to prepare valid PO receipt payloads before delegating to `receiveGoods`.
- Blocks affected POs from mutation when batch-level duplicate serial failures are found.
- Leaves unaffected prepared POs eligible for the existing sequential `receiveGoods` flow.
- Updated stale server comments that said serialized products could not be bulk received.
- Added helper coverage for cross-PO duplicate detection and different-product allowance.
- Added a source contract test that verifies the preflight call appears before `receiveGoods` delegation.

Out of scope:

- Replacing the per-PO sequential `receiveGoods` delegation.
- Changing the bulk mutation response shape.
- Client cache invalidation behavior.
- Browser QA.

Closeout:

- Touched domains: supplier bulk receive server mutation, supplier server serial preflight helper, supplier unit tests, inventory sprint evidence.
- Workflow protected: bulk receive request -> PO/product read preparation -> batch duplicate serial preflight -> per-PO receiveGoods mutation -> inventory/finance side effects.
- Business value protected: direct/API bulk receiving can no longer partially receipt a batch because the same serialized battery was entered twice for the same product.
- Architecture standards checked: server helper owns batch preflight; `receiveGoods` still owns transactional per-PO receipt, inventory movement, cost layer, valuation, and product-cost updates; no route, UI, hook, schema, database, query key, or cache contract changes.
- Tenant isolation and data integrity checked: existing organization-scoped product reads and per-PO `receiveGoods` tenant/transaction guards remain; the new preflight only blocks invalid prepared payloads before mutation.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or mutation cache contracts changed.
- Smells removed: bulk server duplicate serial validation depended on later per-PO side effects to expose a batch-level contradiction; server comments still claimed serialized products could not be bulk received.
- Smells deferred: full transactional all-or-nothing bulk receive remains out of scope; browser QA remains deferred because this is a server preflight; the broader receiving-domain folder split remains unresolved.
- Gates run: focused supplier/purchase-order serial tests (`4` files, `16` tests); focused ESLint; full lint; reliability guards; procurement + purchase-order + supplier + inventory unit suites (`108` files, `339` tests); TypeScript.
- Gates skipped: browser QA, because the changed behavior is server-side preflight covered by helper and source-contract tests.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, server-side data integrity, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: bulk receive still processes unaffected prepared POs sequentially rather than as one all-or-nothing transaction; that behavior is deliberate compatibility for the current partial-failure contract.
