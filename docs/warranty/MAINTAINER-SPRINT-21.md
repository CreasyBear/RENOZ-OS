# Warranty Maintainer Sprint 21

This sprint follows Sprint 20's delivery-entitlement linkage into warranty bulk import. The target is CSV bulk registration, where serial-backed imported warranties wrote serialized lineage after the row transaction in a swallowed best-effort block.

Status: Closed after Issue 1.

## Business Value

Bulk import is how historical or external warranty records enter RENOZ. If an imported row includes a battery serial, the imported warranty should either be created with the `warranty_registered` serialized lineage event or fail that row with evidence the operator can repair and retry.

## Workflow Spine

```text
bulk register warranties from CSV
  -> row-level import loop
  -> warranty and warranty item insert transaction
  -> canonical serialized item resolution with auto-upsert disabled
  -> warranty_registered serialized lineage event
  -> created row summary or failed row report
```

## Architecture Constraints

- Keep this sprint inside the warranty bulk import server boundary.
- Preserve existing route, container/page, hook, schema, database tables, mutation envelope, query keys, cache contracts, preview validation, notification behavior, and row-by-row partial failure contract.
- Do not change claim submission, entitlement provisioning, warranty activation, shipment delivery, jobs, or UI import surfaces in this sprint.
- Treat serial-backed bulk registration as an import workflow, not a source-of-stock workflow; do not auto-create canonical serialized records from warranty import.

## Issue Ledger

### 1. Bulk Warranty Import Treated Serialized Lineage As Best Effort

Problem:

- `bulkRegisterWarrantiesFromCsv` inserted warranty and warranty item rows inside a row transaction.
- After the row transaction committed, it attempted serialized item lookup and `warranty_registered` event creation using `db`.
- The lineage block swallowed errors and did not fail the row.
- A serial-backed warranty could therefore appear in import success output without the serialized lineage event.

Workflow protected:

bulk CSV row -> warranty/warranty item transaction -> canonical serialized item resolution -> `warranty_registered` event -> created row summary.

Implemented slice:

- Moved serial lookup and `warranty_registered` event creation into the row transaction.
- Disabled auto-upsert for warranty bulk import serialized lookups with `allowAutoUpsert: false`.
- Added an operator-safe `ValidationError` when a serial-backed row cannot resolve a canonical serialized item.
- Moved `createdWarranties`, notification input, and policy counters to update only after the row transaction succeeds.
- Added focused source contract coverage to prevent reverting to post-transaction best-effort lineage.

Out of scope:

- Preview validation and CSV parsing.
- Notification sending after successful row import.
- Claim submission, already closed in Sprint 19.
- Delivery entitlement provisioning, already closed in Sprint 20.
- Jobs serialized lookup behavior.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: warranty bulk import server flow, warranty bulk import serialization guard test, warranty sprint evidence.
- Workflow protected: bulk warranty import row -> warranty and warranty item insert -> canonical serialized item resolution -> `warranty_registered` lineage event -> created or failed row result.
- Business value protected: serial-backed imported warranty rows cannot be reported as created while silently losing serialized battery lineage.
- Architecture standards checked: route, container/page, hook, schema, database tables, mutation envelope, query keys, cache contracts, preview validation, post-import notification behavior, and row-by-row partial failure semantics were preserved.
- Tenant isolation and data integrity checked: org-scoped import writes and serialized item lookup remain unchanged; unresolved serials fail only the affected row before its transaction commits.
- Query/cache contract checked: no cache changes; existing bulk import mutation response shape remains unchanged.
- Smells removed: post-transaction serialized lineage write; swallowed lineage errors; optional `if (serializedItem)` lineage write; import auto-upsert fallback; success counters updated before lineage proof.
- Smells deferred: jobs serialized lookup paths remain unaudited; legacy warranties with product serials but no canonical serialized items require repair before row import succeeds.
- Gates run: focused warranty serialization tests (`4` files, `12` tests); focused ESLint; full warranty unit suite (`33` files, `121` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: bulk-import users may now see row failures for serials that previously imported without lineage; a repair/backfill path for legacy canonical serialized records remains needed.
