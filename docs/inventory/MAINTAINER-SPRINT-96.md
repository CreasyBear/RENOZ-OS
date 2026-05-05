# Inventory Maintainer Sprint 96

This sprint follows Sprint 95's typed bulk receive failure contract. The target is trace accuracy: the stock-in workflow trace must describe the current bulk PO receiving behavior, including serialized preflight, typed row failures, and cache invalidation.

Status: Closed after Issue 1.

## Business Value

Maintainers use workflow traces to decide where to make changes. If the stock-in trace omits the current bulk serialized receiving path, future work can reintroduce stale assumptions about receipt safety, retry behavior, or cache refresh surfaces.

## Workflow Spine

Bulk PO receive launch
-> selected PO/product detail reads
-> serialized entry and client validation
-> bulk receive server preflight
-> per-PO `receiveGoods` delegation
-> typed row failure recovery
-> cache invalidation.

## Architecture Constraints

- Keep this sprint to documentation and a guard test.
- Do not change runtime behavior.
- Tie the trace to live source evidence so future drift is caught.
- Preserve the existing stock-in trace scope and product receive wrapper guards.

## Issue Ledger

### 1. Stock-In Trace Did Not Describe Current Bulk PO Receiving Contracts

Problem:

- Recent sprints changed bulk receiving materially: loading gates, serialized entry, duplicate serial preflight, typed row failures, and serial-review recovery.
- `docs/code-traces/02-inventory-stock-in.md` still treated bulk PO receipt as a thin wrapper line item.
- The trace did not document the bulk cache invalidation surfaces or the `errors[]` row-code contract.

Workflow protected:

trace lookup -> correct receiving path selection -> safe bulk receive maintenance.

Implemented slice:

- Updated the stock-in trace date and bulk PO entry point.
- Added `bulkReceiveGoodsSchema` to the authoritative contract table.
- Documented the bulk receiving UI loading/serial validation behavior.
- Added a bulk PO receipt sequence diagram.
- Documented batch serial preflight before `receiveGoods` delegation.
- Documented typed row failures, `invalid_serial_state`, and the message-only `errorsById` limitation.
- Documented single and bulk PO receipt cache invalidation surfaces.
- Added a guard test that ties the trace to live server preflight and hook invalidation strings.

Out of scope:

- Runtime code changes.
- Reworking the broader code-trace standard.
- Adding a browser QA artifact.

Closeout:

- Touched domains: inventory stock-in trace, inventory trace guard test, inventory sprint evidence.
- Workflow protected: bulk PO receiving trace -> server preflight understanding -> row-code recovery understanding -> cache invalidation understanding.
- Business value protected: future maintainers get an accurate map of how battery stock enters inventory through bulk PO receiving.
- Architecture standards checked: no route, container, hook, server, schema, database, query key, cache, transaction, inventory finance, or UI runtime changes; the trace now reflects the route/container/hook/server/cache flow.
- Tenant isolation and data integrity checked: no predicates or writes changed; trace explicitly documents server auth and batch serial preflight before per-PO mutation.
- Query/cache contract checked: trace now documents single PO and bulk PO invalidation surfaces, including status counts, receiving summary, per-PO detail/items/receipts, inventory, and product surfaces.
- Smells removed: operational trace omitted current bulk serialized receiving behavior and row-code recovery contract.
- Smells deferred: trace still describes `receiveGoods` at a high level rather than line-by-line; `errorsById` remains message-only; browser QA not applicable.
- Gates run: focused trace/bulk receive tests (`4` files, `14` tests); focused ESLint; full lint; reliability guards; inventory + procurement + supplier + purchase-order unit suites (`109` files, `343` tests); TypeScript.
- Gates skipped: browser QA, because this was documentation plus source-guard coverage with no runtime UI change.
- Goal adaptations: declined. The standing maintainer goal already covers architecture cleanliness, workflow traceability, serialized lineage continuity, meaningful tests, and evidence-based closeout.
- Residual risk: other traces may now be less current than the stock-in trace; future maintainer sprints should update them when runtime contracts change.
