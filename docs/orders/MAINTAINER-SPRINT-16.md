# Maintainer Sprint 16: Fulfillment Serialized Reads Do Not Auto-Upsert

Sprint 16 closes the shared serialized lookup fallback left behind after the shipment, RMA, and picking fail-closed sprints. The target is order fulfillment/support read paths that had been changed to fail on missing serialized records but still allowed the shared legacy auto-upsert fallback by default.

Status: Closed after Issue 1.

## Business Value

Shipping, reopening, returning, and creating RMAs are not source-of-stock workflows. They should prove that a canonical serialized battery record already exists instead of creating one as a side effect of fulfillment or support correction.

## Workflow Spine

```text
order fulfillment/support action
  -> order server function
  -> org-scoped serialized item read
  -> canonical serialized record required with auto-upsert disabled
  -> shipment/RMA/return lineage and state transition
```

## Architecture Constraints

- Keep this slice inside orders fulfillment and RMA server boundaries.
- Preserve existing route, container/page, hook, schema, database, mutation envelope, query key, and cache contracts.
- Do not change inventory receiving, RMA receive, or other source-of-stock upsert behavior.
- Do not introduce a backfill workflow in this sprint.

## Issue Ledger

### 1. Fulfillment Serialized Reads Still Allowed Auto-Upsert

Problem:

- Prior sprints changed shipment finalization, shipment reopen, returned shipment status, and RMA create to throw when serialized reads return `null`.
- Those call sites still relied on the default `findSerializedItemBySerial` behavior.
- The shared helper can auto-create canonical serialized records on a legacy inventory fallback unless callers opt out.
- That meant fulfillment/support actions could still create canonical serialized records rather than requiring them as preconditions.

Workflow protected:

shipment finalization/reopen/return and RMA create -> canonical serialized item read -> lineage/state mutation.

Implemented slice:

- Added `allowAutoUpsert: false` to shipment mark-shipped serialized reads.
- Added `allowAutoUpsert: false` to shipment reopen serialized reads.
- Added `allowAutoUpsert: false` to returned shipment serialized reads.
- Added `allowAutoUpsert: false` to RMA create serialized lineage reads.
- Extended focused source guards so these reads stay explicit.

Out of scope:

- RMA receive upsert behavior, which is a recovery/source-of-stock workflow.
- Inventory receiving, adjustments, transfers, and supplier receive upsert behavior.
- A repair/backfill command for missing canonical serialized records.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: orders shipment finalization, orders shipment status, RMA create, order serialization guard tests, orders sprint evidence.
- Workflow protected: shipment finalization/reopen/return and RMA create -> canonical serialized item read with auto-upsert disabled -> serialized lineage/state mutation.
- Business value protected: fulfillment and support correction actions cannot manufacture canonical battery records while advancing shipment or RMA state.
- Architecture standards checked: route, container/page, hook, schema, database, mutation envelope, query keys, cache contracts, and mutation response shapes were unchanged.
- Tenant isolation and data integrity checked: org-scoped serialized lookups remain unchanged; unresolved canonical records now block without auto-creating records.
- Query/cache contract checked: no cache changes; existing fulfillment/RMA mutation identities remain unchanged.
- Smells removed: implicit shared auto-upsert fallback in shipment finalization, shipment reopen, returned shipment status, and RMA create.
- Smells deferred: source-of-stock upsert paths remain by design; legacy canonical-record repair/backfill workflow is still needed.
- Gates run: focused order serialization tests (`4` files, `17` tests); focused ESLint; full orders unit suite (`34` files, `126` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: legacy records without canonical serialized items now block more fulfillment/support paths until a repair/backfill workflow exists.
