# Warranty Maintainer Sprint 19

This sprint shifts warranty maintenance from presentation cleanup to serialized lineage integrity in claim submission. The target is warranty claim creation, where the claim record and `warranty_claimed` serialized lineage event were not protected by the same transaction.

Status: Closed after Issue 1.

## Business Value

Warranty claims are customer-facing battery support commitments. When a warranty is tied to a product serial, submitting a claim must also anchor that physical battery in serialized lineage. RENOZ should not create a serial-backed claim while silently losing the `warranty_claimed` event.

## Workflow Spine

```text
submit warranty claim
  -> warranty claim server function
  -> warranty/customer/product/policy read
  -> claim insert and optional SLA tracking
  -> canonical serialized item resolution with auto-upsert disabled
  -> warranty_claimed serialized lineage event
  -> notification trigger and serialized mutation response
```

## Architecture Constraints

- Keep this sprint inside the warranty claim server boundary.
- Preserve existing route, container/page, hook, schema, database tables, mutation envelope, query keys, and cache contracts.
- Preserve claim number generation, claimant resolution, SLA tracking, notification payload shape, and activity logging behavior.
- Do not change entitlement provisioning, warranty bulk import, claim status transitions, RMA, picking, or jobs in this sprint.
- Treat warranty claim submission as a support workflow, not a source-of-stock workflow; do not auto-create canonical serialized records from claim submission.

## Issue Ledger

### 1. Warranty Claim Serialized Lineage Was Best Effort

Problem:

- `createWarrantyClaim` created the claim and optional SLA tracking in a database transaction.
- After that transaction committed, it looked up the serialized item with `findSerializedItemBySerial(db, ...)`.
- If the serialized item was missing, the code skipped `addSerializedItemEvent`.
- Because lineage ran outside the claim transaction, a serial-backed claim could be committed without the `warranty_claimed` lineage event.

Workflow protected:

claim submit -> claim insert/SLA tracking -> canonical serialized item resolution -> `warranty_claimed` lineage event -> notification/mutation response.

Implemented slice:

- Moved serialized item resolution and the `warranty_claimed` event write into the existing claim creation transaction.
- Disabled auto-upsert for the warranty claim serialized lookup with `allowAutoUpsert: false`.
- Added an operator-safe `ValidationError` when the warranty serial cannot resolve to a canonical serialized item before claim submission.
- Added focused source contract coverage to prevent reverting to post-transaction, best-effort lineage.

Out of scope:

- Warranty entitlement delivery nullable serialized item ids.
- Warranty bulk import's best-effort lineage write.
- Warranty claim notification delivery mechanics.
- Warranty claim status changes and resolution workflows.
- Browser QA, because this was a server-side transaction invariant with no UI behavior change.

Closeout:

- Touched domains: warranty claim server flow, warranty claim serialization guard test, warranty sprint evidence.
- Workflow protected: submit warranty claim -> claim insert/SLA tracking -> canonical serialized item resolution -> `warranty_claimed` lineage event -> notification and mutation response.
- Business value protected: serial-backed customer support claims cannot be created while silently losing the serialized battery lineage event.
- Architecture standards checked: route, container/page, hook, schema, database tables, mutation envelope, query keys, cache contracts, claimant resolution, SLA tracking, notification payload, and activity logging behavior were unchanged; only the server transaction boundary now owns serialized lineage.
- Tenant isolation and data integrity checked: org-scoped warranty lookup and serialized item lookup remain unchanged; unresolved serials block before the claim transaction can commit.
- Query/cache contract checked: no cache changes; existing warranty claim mutation identity remains unchanged.
- Smells removed: post-transaction warranty claim serialized lookup; optional `if (serializedItem)` lineage write; claim-submission auto-upsert fallback.
- Smells deferred: warranty entitlement delivery still permits nullable serialized item ids, warranty bulk import still treats lineage as best effort, and jobs serialized lookup paths remain unaudited.
- Gates run: focused warranty claim tests (`4` files, `16` tests); focused ESLint; full warranty unit suite (`31` files, `119` tests); TypeScript; full lint; reliability guards; diff checks.
- Gates skipped: browser QA, because this was a server-side transaction invariant with no UI behavior change.
- Goal adaptations: declined. The standing maintainer goal already covers serialized lineage continuity, transactional integrity, tenant isolation, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: legacy warranties with product serials but no canonical serialized item record now require repair before claim submission; entitlement provisioning, bulk import, and jobs still need serialized lineage hardening.
