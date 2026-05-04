# Service-System External Migration Contract

## Purpose
This document defines the contract for any **external** legacy migration or backfill tool that populates the `service` domain for already-activated warranties.

The CRM no longer owns or monitors historical service backfill execution.
Instead, external tooling must write data that matches the in-repo service model and its operator workflows.

Operational companion:
- [Service-System External Migration Runbook](./service-system-external-migration-runbook.md)

## Scope
This contract covers external tooling that needs to:
- link legacy activated warranties into `service_systems`
- create canonical `service_owners`
- create current `service_system_ownerships`
- create `service_linkage_reviews` when exact linkage is not safe

This contract does **not** cover:
- entitlement creation for historical delivered shipments
- RMA redesign
- claimant model changes
- self-service ownership transfer
- generic data-repair tooling for unrelated domains

## Canonical Business Truth
The repo assumes these truths remain stable:
- `customers` is the commercial/channel account layer
- `warranties.sourceEntitlementId` is the activation lineage anchor when present
- `warranties.serviceSystemId` is the canonical installed-system link
- current beneficial owner is resolved from `service_system_ownerships`
- `warranty_owner_records` is a compatibility mirror, not the canonical service-domain source of truth
- ambiguity must create a review queue item, not a guessed linkage

## Inputs
An external migration candidate should be a legacy warranty row that is:
- activated
- in-scope for service linkage
- not already cleanly linked to a `serviceSystemId`

At minimum, the tool should load:
- `warranties`
  - `id`
  - `organizationId`
  - `serviceSystemId`
  - `customerId`
  - `sourceEntitlementId`
  - `ownerRecordId`
- `warranty_owner_records`
  - owner name
  - owner email
  - owner phone
  - owner address
  - owner notes
- source commercial/order context where available
  - `orders`
  - `customers`
  - `projects`
  - `warranty_entitlements`

## Required Outputs
For each candidate, the tool must produce exactly one of these outcomes:

1. `link_existing`
- the warranty is linked to an existing `service_system`
- no ambiguity remains

2. `create_new`
- a new canonical `service_owner` and/or `service_system` is created
- a current ownership row is opened
- the warranty is linked to the new system

3. `review_created`
- no automatic link is made
- a `service_linkage_review` row is created for operator resolution

4. `skipped`
- the warranty was already cleanly linked
- or the row is intentionally left untouched by migration policy

## Matching Rules
The migration must stay conservative.

Allowed:
- exact normalized owner matching
- exact normalized site-address matching
- exact source-order lineage matching
- exact project linkage matching
- explicit operator resolution through `service_linkage_reviews`

Not allowed:
- fuzzy name matching
- fuzzy address matching
- “best guess” owner merge
- auto-linking across conflicting owner/project/order signals

### Owner matching
Preferred exact match rules:
1. exact normalized email
2. exact normalized phone + exact normalized full name

If neither matches exactly, create a new `service_owner` rather than guessing.

### System matching
A system may be reused only when the candidate is exact and non-conflicting.
Strong anchors include:
- same `organizationId`
- same exact normalized site address
- same source order where present
- same project where present
- same commercial customer when expected

If multiple systems satisfy the rules, create a review instead of picking one.

If owner evidence conflicts with the candidate system’s current owner and the conflict is not explicitly resolvable, create a review instead of reassigning ownership automatically.

## Required Writes By Outcome
### Outcome: `link_existing`
Required writes:
- update `warranties.serviceSystemId`

Optional but recommended:
- ensure `warranty_owner_records` still matches the current system owner if your migration is also correcting owner truth
- emit warranty/service activities if you want an audit trail, though the app does not require migration-specific activity rows

### Outcome: `create_new`
Required writes:
1. create or reuse `service_owners`
2. create `service_systems`
3. create one current `service_system_ownerships` row
4. update `warranties.serviceSystemId`

Recommended fields for `service_systems`:
- `organizationId`
- `displayName`
- `siteAddress`
- `normalizedSiteAddressKey`
- `commercialCustomerId`
- `sourceOrderId`
- `projectId`

Recommended fields for `service_system_ownerships`:
- `organizationId`
- `serviceSystemId`
- `serviceOwnerId`
- `startedAt`
- `transferReason` only if relevant

Compatibility rule:
- if the migration materially changes owner truth, update or create the linked `warranty_owner_record` so the compatibility mirror does not drift

### Outcome: `review_created`
Required writes:
- insert `service_linkage_reviews`

Required review fields:
- `organizationId`
- `status = 'pending'`
- `reasonCode`
- `sourceWarrantyId`
- `sourceEntitlementId` when present
- `sourceOrderId` when present
- `projectId` when present
- `commercialCustomerId` when present
- `candidateSystemIds`
- `snapshot`

Use `reasonCode` values that the app already understands:
- `multiple_system_matches`
- `conflicting_owner_match`
- `backfill_manual_review`

Recommended `snapshot` fields:
- `ownerName`
- `ownerEmail`
- `ownerPhone`
- `normalizedSiteAddressKey`
- `siteAddress`
- `notes`

### Outcome: `skipped`
No write is required beyond your own external audit trail.

## Idempotency Rules
The external tool must be idempotent at the warranty level.

Minimum expectations:
- never create duplicate current ownership rows for the same system
- never create duplicate review rows for the same unresolved warranty/context pair
- never overwrite an existing clean `warranties.serviceSystemId` unless explicitly running a repair path

Practical guidance:
- treat `warranty.id` as the unit of work
- checkpoint externally
- reruns should either no-op or create the same deterministic review outcome

## Activity / Audit Expectations
The app does **not** require migration-run tables or backfill-monitor tables.

Optional:
- write `activities` rows for `warranty` and/or `service_system`

If you write activities:
- `service_system` should be used only when a real canonical system event occurred
- do not log fake `created` events when the tool only linked an existing system
- keep metadata focused on stable entity context:
  - `customerId`
  - `orderId`
  - `serviceSystemId`
  - `serviceSystemDisplayName`
  - `currentOwnerId`
  - `currentOwnerName`

Do not rely on repo-owned backfill metadata fields or in-app backfill monitoring.

## Operator Workflow Expectations
After migration, the CRM expects operators to work through:
- warranty detail
- service system detail
- service linkage review queue

That means the external tool should leave the app in one of these clean states:
- warranty linked to a service system
- warranty blocked by a visible pending linkage review
- warranty intentionally untouched and still clearly unlinked

The app no longer expects:
- `service_backfill_runs`
- `service_backfill_run_items`

## Minimal Acceptance Checklist
For a migrated warranty, confirm:
- `warranties.serviceSystemId` is set when linkage is unambiguous
- `service_system_ownerships` has exactly one current row per linked system
- current owner resolves correctly on warranty detail
- service system detail opens and shows linked warranties
- ambiguous cases appear in `service_linkage_reviews`
- no fuzzy auto-linking occurred

## Recommended Rollout Shape
1. Dry-run externally and classify outcomes per warranty:
   - `link_existing`
   - `create_new`
   - `review_created`
   - `skipped`
2. Run in small batches by organization or warranty ID range.
3. Verify app behavior on:
   - one exact-linked warranty
   - one created-system warranty
   - one review-created warranty
4. Only widen rollout once operators confirm review queue behavior feels correct.

The concrete execution steps and example SQL live in the companion runbook:
- [Service-System External Migration Runbook](./service-system-external-migration-runbook.md)

## Repo Boundary
This repository owns:
- runtime activation linkage
- service system detail and history
- service linkage review workflows
- ownership transfer workflows

This repository does **not** own:
- historical migration execution
- historical migration checkpointing
- historical migration monitoring dashboards
- historical migration run persistence
