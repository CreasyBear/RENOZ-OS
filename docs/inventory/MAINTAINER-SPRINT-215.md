# Inventory Maintainer Sprint 215: Finance Close Readiness RMA Shipment Links

Status: closed and commit-ready.

## Problem

The live finance integrity gate failed with `shipment_link_not_shipped_or_returned: 6`.

Initial evidence pointed at shipment `O-00034-S01`: six serialized items had historical `shipment_item_serials` links while their current serialized item status was `available` or `allocated`, not `shipped` or `returned`.

Investigation showed this was not a failed shipment-finalization transition. The linked shipment rows were historical outbound links, and the mismatched serials had later `rma_received` lineage events that legitimately returned the same serials to inventory. One serial was later allocated again after the RMA receive. The hard gate was treating historical shipment linkage as if it must always match the current serialized item status.

## Workflow Spine Protected

```text
serialized outbound shipment
  -> shipment_item_serials historical link
  -> serialized_item_events lineage
  -> RMA receive / inventory restoration
  -> finance close readiness
  -> inventory valuation finance-integrity summary
  -> release hard gate script
```

## Touched Domains

- Finance close readiness.
- Inventory valuation finance-integrity summary.
- Serialized shipment/RMA lineage interpretation.
- Release hard gate script.
- Finance integrity regression tests.
- Inventory sprint evidence.

## Business Value Protected

Finance close readiness should block true inventory and serialized lineage corruption, not legitimate RMA returns. This slice keeps period-close and do-not-ship gates strict while allowing returned battery assets to re-enter stock without leaving the business in a false blocked state.

## Root Cause

The finance integrity predicate counted every `shipment_item_serials` row whose serialized item current status was not `shipped` or `returned`.

That predicate ignored that `shipment_item_serials` is historical lineage. After an RMA receive, the current serialized item status may become `available`, `quarantined`, or later `allocated`, while the original shipment link remains valid evidence of the outbound shipment.

The corrected predicate still catches non-shipped current status, but exempts historical shipment links superseded by a later `serialized_item_events.event_type = 'rma_received'` event for the same serialized item.

## Changes

- Updated `scripts/run-finance-integrity-gates.mjs`.
- Updated `src/server/functions/financial/_shared/financial-close-readiness.ts`.
- Updated `src/server/functions/inventory/valuation.ts`.
- Added `tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts`.
- Preserved existing gate names and response field names to avoid widening UI, hook, or release-script blast radius.

## Standards Checked

- Domain ownership: finance close readiness and inventory valuation now share the same RMA-aware shipment-link interpretation.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a read-model and release-gate predicate correction only.
- Tenant isolation: preserved in server read models by scoping `shipment_item_serials`, `serialized_items`, and `serialized_item_events` to the same organization. The global release script remains intentionally cross-tenant.
- Transactional integrity: unchanged; no writes, mutations, inventory movement, cost-layer, payment, document, or shipment-finalization behavior changed.
- Serialized lineage: improved by treating `shipment_item_serials` as historical evidence and `serialized_item_events` as the source of later RMA receipt truth.
- Query/cache contract: unchanged; no query keys, invalidation, stale-time policy, or hook contract changed.
- Operator-safe states: finance readiness no longer blocks on legitimate RMA-restocked serials.
- Reviewable diff: limited to the duplicated finance integrity predicate, one source-boundary regression test, and this closeout note.

## Smells Removed

- Removed false positive finance gate failures for shipment links superseded by RMA receipt.
- Aligned the release script, finance close-readiness read model, and inventory valuation summary around the same lineage predicate.
- Added a regression contract so future edits do not remove the RMA receipt exemption from one copy while leaving others behind.

## Smells Deferred

- The finance integrity SQL remains duplicated across the release script, finance read model, and inventory valuation read model.
- A future slice should consider a shared SQL/query owner for finance integrity predicates, but not at the cost of dragging app-only TypeScript into operational scripts.
- The field name `shipmentLinkNotShippedOrReturned` remains slightly imprecise after the RMA-aware correction; renaming it would widen UI/schema/API blast radius and was deferred.
- Bundle splitting remains deferred after the production build warning about chunks larger than 500 kB.

## Verification

- Live diagnostic query before the fix: current predicate reported `6`; RMA-aware predicate reported `0`.
- `npm run test:vitest -- tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts tests/unit/financial/query-key-contract.test.tsx tests/unit/inventory/wms-stock-semantics-contract.test.ts` passed, 3 files / 10 tests.
- `./node_modules/.bin/eslint src/server/functions/financial/_shared/financial-close-readiness.ts src/server/functions/inventory/valuation.ts tests/unit/financial/finance-integrity-shipment-link-rma-contract.test.ts --report-unused-disable-directives` passed.
- `npm run reliability:finance-gates` passed against Supabase: all hard gates `0`.
- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 765 files / 2534 tests.
- `npm run build` passed with the known large-chunk warning and native `bcrypt` trace reminder.
- `npm run reliability:document-gates` passed against Supabase.
- `npm run reliability:release-gates` passed outside the sandbox, 2/2 gates.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by converting an audit finding into a bounded finance/inventory integrity fix with live gate evidence.

## Residual Risk

Low risk for this slice because no data mutation or workflow write path changed, and the original database-backed finance gate now passes. Medium residual architecture risk remains in the duplicated finance integrity SQL and the broader large-module hotspots identified by the audit.
