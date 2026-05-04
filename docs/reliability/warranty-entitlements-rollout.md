# Warranty Entitlements Rollout

## Purpose
This document is the rollout and migration note for the bounded warranty/support work through Phase 5B.

## Migrations
Applied schema migrations in this slice:
- `0030_warranty_entitlements_phase1.sql`
- `0031_issue_support_anchor_normalization.sql`
- `0032_warranty_claim_claimant_model.sql`
- `0033_service_owner_system_foundation.sql`
- `0034_issue_resolution_rma_operations.sql`
- `0035_rma_remedy_execution_completion.sql`

Phase 2C was app-layer cleanup:
- claimant-aware filters
- claimant-aware notifications
- terminology cleanup
- richer claim activity metadata

Phase 3A adds:
- service owners
- service systems
- service system ownership history
- service linkage reviews
- `warranties.serviceSystemId`

Phase 3B adds:
- deterministic linkage review resolution
- service systems list workflow

Phase 3C adds:
- `service_system` activity history
- warranty-detail service mission-control state

Phase 4 is app-layer issue-operations work on top of the existing schema slice:
- serial-first / warranty-first / order-first / customer-first issue intake
- anchor conflict validation
- anchor-first issue detail related context
- lineage-aware issue queue filters and support landing entry points

Phase 5A adds:
- structured issue resolution and disposition
- RMA readiness / blocker modelling
- issue-to-RMA handoff hardening
- explicit operator-owned support closeout

Phase 5B adds:
- real remedy execution from the RMA workflow
- refund, credit note, and replacement-order artifact creation
- execution-aware RMA detail and queues
- explicit issue follow-through after remedy completion

## Deployment Order
1. Apply migrations through `0035`.
2. Deploy app code that includes:
   - entitlement provisioning on delivery
   - entitlement activation
   - issue anchor normalization
   - claimant-aware claims
   - claimant-aware claim notifications
   - service owner/system linkage on activation
   - service linkage review routes
   - service-system ownership transfer workflow
   - service-system activity history
   - issue resolution and readiness workflows
   - remedy-execution-aware RMA detail and queues
   - refund / credit / replacement execution from RMAs
3. Verify background task registration includes the warranty notification jobs.
4. Verify the support queue pages load:
   - `/support/warranty-entitlements`
   - `/support/warranties`
   - `/support/issues`
   - `/support/claims`
   - `/support/rmas`
   - `/support/service-systems`
   - `/support/service-linkage-reviews`

## Go-Live Checks
### Entitlements
- mark a shipment as `delivered`
- verify entitlement rows are created
- verify serialized rows use serial evidence when present
- verify unresolved cases appear as `needs_review`

### Activation
- activate one entitlement
- confirm:
  - service owner created or reused
  - service system created or reused
  - owner record mirror synced
  - warranty created
  - warranty links back through `sourceEntitlementId`
  - warranty links to `serviceSystemId` when exact linkage is available
  - ambiguous matches create a service linkage review instead of guessing

### Service Systems
- open one linked warranty
- confirm warranty detail shows:
  - `Purchased Via`
  - `Current Owner`
  - `Owner Snapshot`
  - `Service System`
  - service linkage / backfill state
- confirm warranty detail shows separate `Warranty Activity` and `System History`
- open the linked service-system detail page
- confirm linked warranties, ownership timeline, and canonical system history render
- perform one ownership transfer and confirm the current owner updates without mutating the commercial customer

### Issues
- create an issue from support landing using `Start from Serial`
- create an issue from warranty detail
- confirm issue intake:
  - preserves the selected intake mode in the URL
  - shows a resolved context summary before submit
  - blocks conflicting anchors
- confirm anchors are stored structurally
- confirm the human description is not polluted with technical IDs
- confirm issue detail shows:
  - source order
  - source shipment
  - linked warranty
  - service system
  - current owner
  - same-system / same-serial related issues ahead of customer-wide context
- confirm the issues queue supports lineage-state filters for:
  - serial present / missing
  - warranty present / missing
  - order present / missing
  - service system present / missing
- confirm issue detail exposes explicit resolution state, next action, and RMA readiness
- confirm linked RMAs and completed remedy artifacts surface back on the issue detail page

### Claims
- create a channel claim
- create a direct owner claim with bypass reason
- verify claim list filters by `Purchased Via`, `Claim Path`, and `Claimant Role`

### Notifications
- verify `warranty.claim_submitted` and `warranty.claim_resolved` are handled by Trigger jobs
- verify direct claims prefer claimant email
- verify missing claimant email produces a safe no-send / partial-send outcome instead of a false success

### RMAs / Remedy Execution
- create an issue that is RMA-eligible
- launch RMA creation from issue or order context
- receive the RMA and verify at least one financial and one non-financial remedy path
- confirm:
  - `processed` is set only after execution succeeds
  - refund / credit / replacement artifacts are linked back to the RMA
  - blocked execution stays visible as blocked rather than falsely completed
  - the linked issue remains explicitly open until an operator closes it

## Historical Data Decision
Newly delivered shipments are covered by runtime provisioning.

Historical delivered shipments from before `0030` are **not** automatically backfilled by this phase.

Before go-live, choose one of:
1. Accept forward-only coverage creation for newly delivered shipments.
2. Run a deliberate historical backfill project for legacy delivered shipments.

## Backfill Guidance
If historical entitlements matter before go-live:
- treat backfill as an explicit, idempotent rollout task
- run it in controlled batches
- verify `needs_review` output instead of trying to force perfect legacy reconstruction
- avoid mixing backfill logic into normal delivery-time provisioning

Phase 3A expects historical service backfill to run outside this repository.
Use the external contract here:
- [Service-System External Migration Contract](./service-system-external-migration-contract.md)
- [Service-System External Migration Runbook](./service-system-external-migration-runbook.md)

## Known Safe Compatibility Rules
- `warranties.sourceEntitlementId` is the authoritative activation link
- `issues` read anchor columns first and metadata second
- `warranty_claims.customerId` remains the commercial account anchor
- claimant fields carry the actual claimant truth
- activity timelines remain commercially anchored for compatibility
- issue intake can still create partial-lineage issues when no explicit conflict exists

## Deferred Operational Work
- broader reverse-logistics workflow beyond receive / execute / closeout
- system-first global navigation
- full historical entitlement backfill tool or runbook execution plan
- claimant-aware reporting outside the warranty claims page
- automated post-remedy issue recommendations beyond the current explicit operator follow-through
