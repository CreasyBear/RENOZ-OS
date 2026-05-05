# Jobs Maintainer Sprint 1

This sprint starts jobs-domain maintenance at the serialized material installation boundary. The target is job material installation, where installed serials could be recorded on the material while serialized lineage was skipped when the canonical serialized item lookup failed.

Status: Closed after Issue 1.

## Business Value

Job material installation records which batteries or components were actually used on service and project work. When an operator records installed serials, RENOZ should not mark the material installed unless the physical serialized unit can also be anchored in lineage.

## Workflow Spine

```text
record material installation
  -> job material server function
  -> material/job/product tenant validation
  -> material update and serial table replacement
  -> canonical serialized item resolution with auto-upsert disabled
  -> job_material serialized lineage event
  -> activity log and mutation response
```

## Architecture Constraints

- Keep this sprint inside the jobs material server boundary.
- Preserve existing route, container/page, hook, schema, database tables, mutation envelope, query keys, cache contracts, job verification, material update shape, photo handling, and activity logging behavior.
- Do not change inventory consumption/accounting, warranty, RMA, order fulfillment, or UI installation surfaces in this sprint.
- Treat material installation as a service execution workflow, not a source-of-stock workflow; do not auto-create canonical serialized records from job material installation.

## Issue Ledger

### 1. Job Material Installation Could Skip Serialized Lineage

Problem:

- `recordMaterialInstallation` updates material install state and replaces installed serial rows inside a transaction.
- It then resolves each installed serial with `findSerializedItemBySerial`.
- If the lookup returned no serialized item, `addSerializedItemEvent` was skipped through `if (serializedItem)`.
- Installed serial state could therefore commit without the serialized lineage event that ties the physical unit to the job material.

Workflow protected:

material installation -> installed serial capture -> canonical serialized item resolution -> `job_material` lineage event -> material install response.

Implemented slice:

- Disabled auto-upsert for job material serialized lookups with `allowAutoUpsert: false`.
- Added an operator-safe `ValidationError` when an installed serial cannot resolve to a canonical serialized item.
- Moved `addSerializedItemEvent` out of the optional branch so every installed serial requires lineage.
- Added focused source contract coverage to prevent reverting to best-effort job material lineage.

Out of scope:

- Inventory consumption and job costing semantics.
- Job material reservation behavior.
- UI installation form behavior.
- Warranty, RMA, and order fulfillment lineage paths.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: jobs material installation server flow, jobs material serialization guard test, jobs sprint evidence.
- Workflow protected: record material installation -> material/job/product tenant validation -> serial table replacement -> canonical serialized item resolution -> `job_material` lineage event -> activity log/mutation response.
- Business value protected: installed battery/component serials cannot be recorded on a job while silently losing serialized lineage for the physical unit.
- Architecture standards checked: route, container/page, hook, schema, database tables, mutation envelope, query keys, cache contracts, job verification, material update shape, photo handling, and activity logging behavior were unchanged.
- Tenant isolation and data integrity checked: org-scoped material, product, job, and serialized item lookups remain unchanged; unresolved installed serials block before the material installation transaction can commit.
- Query/cache contract checked: no cache changes; existing job material mutation identity remains unchanged.
- Smells removed: optional `if (serializedItem)` job material lineage write; job material installation auto-upsert fallback.
- Smells deferred: deeper inventory consumption/accounting for installed job materials and any legacy material rows with serials but no canonical serialized items.
- Gates run: focused jobs/material tests (`3` files, `11` tests); focused ESLint; full jobs unit suite (`10` files, `139` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: legacy job material rows with installed serials but no canonical serialized items require repair before installation can be re-recorded; inventory cost/accounting behavior for job material installation remains a later domain audit.
