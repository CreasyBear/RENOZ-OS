# Support / Issue / RMA B2B2C Design

## Purpose
This document preserves the larger support-side architecture behind the bounded warranty, service, issue, claim, and RMA work.

Operational companions:
- [Warranty Support Workflows](../workflows/warranty-support-phase2-workflows.md)
- [Warranty Entitlements Rollout](../reliability/warranty-entitlements-rollout.md)
- [Service-System External Migration Contract](../reliability/service-system-external-migration-contract.md)
- [Service-System External Migration Runbook](../reliability/service-system-external-migration-runbook.md)
- [Support Issue + RMA Operations Stage Record](../design/SUPPORT-ISSUE-RMA-OPERATIONS-NEXT-STAGE.md)

Phase 1 delivers:
- delivery-time `warranty_entitlements`
- `warranty_entitlement -> warranty` activation
- `warranty_owner_records`

This document started as a deferred-architecture note during Phase 1. It now acts as the long-lived product-model reference for the support domain after Phases 1 to 5B.

## Product Reality
RENOZ operates in a B2B2C chain:
- RENOZ sells to a commercial customer such as retailer, installer, or distributor.
- The end owner benefits from long-term coverage.
- Support can be initiated by the end owner even when the commercial order belongs to somebody else.
- RMAs and commercial remedies still need to resolve back to the source order and channel account.

That means support cannot safely use a single `customerId` as:
- buyer
- owner
- reporter
- claimant
- remedy authority

## Issue Intake Entry Points
Issue intake now supports these entry points:
- serial number
- warranty number
- order number
- commercial customer account

The resolver now returns a ranked support context:
- commercial buyer
- source order
- activated warranty
- service system
- current owner

Still deferred:
- installer / retailer account as a distinct intake mode
- end-owner contact-led intake
- site or project-led workmanship intake

## Order Resolution Problem
The current B2B2C pain is that RMAs and claims often start from the person reporting the issue, while the real commercial order belongs to a different account.

Support resolution now works like this:
1. Try `warranty -> sourceEntitlement -> order`.
2. If no direct warranty path exists, resolve from serial back to serialized item, shipment, and order line.
3. If order context is still missing, preserve partial lineage instead of guessing.
4. Block commercial remedy creation when order linkage is still ambiguous.

This keeps support open for the end customer without allowing RMAs to float free of the commercial truth.

## Retailer-First Claimant Model
Future claims should distinguish:
- reporter
- owner of record
- default claimant
- actual claimant
- channel bypass reason

Default operating rule:
- the end customer can always report an issue
- retailer / installer is the default claimant
- RENOZ direct handling is allowed only when channel handling failed, was waived, or is impossible

This needs explicit storage, not tribal ops knowledge.

## Attachment Points
The support model now uses these explicit attachment points:

- `warranty_entitlements`
  - source order resolution anchor
  - pre-activation coverage truth
- `warranties`
  - activated owned warranty
  - customer-facing support record
- `warranty_owner_records`
  - non-CRM owner identity layer

Future support tables should attach here:
- `issues.warrantyEntitlementId`
- `issues.warrantyId`
- `issues.orderId`
- `issues.shipmentId`
- `issues.serializedItemId`
- `issues.serviceSystemId`
- `claims.warrantyId`
- `rmas.warrantyEntitlementId`
- `rmas.orderId`

## Current Implemented Model
The implemented support model now includes:
- explicit issue anchors for warranty, order, shipment, serialized item, and service system
- claimant-aware warranty claims
- bounded service-side identity:
  - service owner
  - service system
  - service linkage review
  - service-system ownership history
  - service-system activity history

This remains intentionally explicit rather than inferred from whichever `customerId` happens to be present.

## Phase 2 Sequencing
To keep blast radius controlled, split the support-side work:

- Phase 2A
  - normalize issue anchors into first-class columns
  - resolve source order context through `warranty -> entitlement -> order`
  - keep RMA creation contract stable and only improve issue-to-order handoff
- Phase 2B
  - redesign claimant storage for warranty claims
  - add explicit claimant role, claimant account, claimant snapshot, and channel bypass reason
- Phase 2C
  - remove remaining claim-side terminology drift where `customer` still means commercial account
  - make claim notifications, reporting, and analytics claimant-aware where the business meaning depends on the actual claimant
  - reuse the support anchor resolver so claim, issue, and RMA entry points resolve the same commercial truth
  - add claimant-aware filters to the warranty claims page while keeping compatibility-first commercial filters in place

This sequencing keeps the high-churn claim domain out of the first support normalization pass.

### Status
- Phase 2A is implemented.
- Phase 2B is implemented.
- Phase 2C is implemented for claim-side filtering, notifications, and terminology cleanup.
- Phase 3A is implemented as the first bounded `service` domain foundation:
  - `service_owners`
  - `service_systems`
  - `service_system_ownerships`
  - `service_linkage_reviews`
  - `warranties.serviceSystemId`
  - activation-time service linkage and ownership-transfer workflows
- Phase 3B is implemented as the hardening/integration pass:
  - deterministic linkage review resolution
  - route-backed review/system list workflows
  - claim detail service-context alignment
- Phase 3C is implemented as the warranty-first operator hub pass:
  - warranty detail now surfaces service linkage status and separate `Warranty Activity` vs `System History`
  - `service_system` is now a first-class activity entity for canonical system history
- Phase 4 is implemented as Issue Operations:
  - serial-first, warranty-first, order-first, and customer-first issue intake
  - explicit issue anchor columns
  - anchor conflict validation
  - anchor-first issue detail related context
  - lineage-aware issue queue filters and context badges
  - support landing workflow entry paths
- Phase 5A is implemented as Issue Resolution + RMA Readiness:
  - structured issue resolution and disposition
  - next-action modelling
  - explicit RMA readiness / blocker context
  - issue-to-RMA handoff hardening
- Phase 5B is implemented as Remedy Execution + RMA Completion:
  - refund, credit note, and replacement-order execution from the RMA workflow
  - execution-aware RMA detail and queueing
  - artifact-linked remedy truth on the RMA
  - explicit issue follow-through after remedy completion
- Operator workflows and rollout notes are documented separately in the workflow and rollout docs linked above.
- Activity timelines now distinguish warranty history from canonical service-system history, while preserving warranty visibility events where helpful.
- Historical service-system backfill remains an out-of-band rollout step handled outside this repository.
- The external migration tool must follow the service-domain write contract documented in the migration contract companion.
- Larger service-subject expansion, system-first global navigation, self-service transfer, and full RMA redesign work remain deferred.

## Explicitly Deferred
The following remain deferred after Phase 5B:
- broader reverse-logistics workflow beyond receive / execute / closeout
- order-detail-native support/RMA actions
- retailer-first enforcement logic beyond current claimant modeling
- ownership transfer lifecycle redesign
- service-subject / site graph
- workmanship-specific support flow redesign

## Why This Document Exists
The goal is to keep the original product intent visible while implementation lands in bounded slices.

Phase 1 established the commercial and ownership anchors.
Phases 2 to 5B used those anchors to fix B2B2C support intake, claimant truth, service linkage, issue resolution, and remedy execution without another warranty schema reset.
The next stage should build on that closed-loop baseline rather than reopening these foundations.
