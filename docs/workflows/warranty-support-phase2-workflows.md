# Warranty Support Workflows

## Purpose
This document describes the practical operator flow after the bounded warranty/support work through Phases 1 to 5B.

It is the workflow companion to:
- [Support / Issue / RMA B2B2C Design](../architecture/support-issue-rma-b2b2c.md)
- [Warranty Entitlements Rollout](../reliability/warranty-entitlements-rollout.md)

## Workflow 1: Delivered Order Creates Coverage
1. A shipment is marked `delivered`.
2. Delivery-time provisioning creates `warranty_entitlements`.
3. Each warranty-eligible delivered unit becomes one entitlement row.
4. Entitlements land in one of these states:
   - `pending_activation`
   - `needs_review`
   - `activated`
   - `voided`

### Operator expectation
- `pending_activation` means the coverage record is ready to become an owned warranty.
- `needs_review` means coverage was preserved, but evidence or policy resolution still needs human review.

## Workflow 2: Review and Activate Entitlement
1. Open `/support/warranty-entitlements`.
2. Filter the queue as needed.
3. Use `Review Details` to inspect:
   - purchased-via customer
   - source order
   - source shipment
   - coverage unit
   - policy state
   - owner activation state
4. If owner details are known and activation is allowed, choose `Activate Warranty`.
5. Capture owner-of-record details.
6. Submit activation.

### Result
- A `warranty_owner_record` is created.
- A `warranty` is created from the entitlement.
- A `service_owner` and `service_system` may be created or reused.
- `warranties.sourceEntitlementId` becomes the authoritative activation link.
- `warranties.serviceSystemId` becomes the installed-system anchor when linkage is clear.
- Ambiguous linkage creates a `service_linkage_review` instead of guessing.

## Workflow 3: Warranty Detail Becomes the Support Hub
1. Open a warranty detail page.
2. Review:
   - `Purchased Via`
   - `Current Owner`
   - `Owner Snapshot`
   - `Source Entitlement`
   - `Service System`
   - service linkage status
3. Use the warranty as the hub for:
   - `Create Support Issue`
   - `File Warranty Claim`
   - system-history review
   - ownership-transfer follow-up

### Operator expectation
- Warranty detail stays warranty-first in navigation.
- System truth is visible without collapsing commercial customer and current owner into one concept.

## Workflow 4: Support Landing Starts Intake From Real Anchors
1. Open `/support`.
2. Choose the strongest entry path:
   - `Start from Serial`
   - `Start from Warranty`
   - `Start from Order`
   - `Start from Customer`
3. If you are not creating a new issue yet, jump into the queue instead:
   - `All Issues`
   - `Overdue SLA`
   - `Escalated`
   - `My Issues`

### Operator expectation
- Support landing should feel like a workflow launch point, not a loose button strip.
- Serial is the default path because real support work often starts from hardware or a symptom, not a pristine warranty record.

## Workflow 5: Issue Intake Resolves Context Before Submit
1. Open `/support/issues/new`.
2. Start from one anchor:
   - serial
   - warranty
   - order
   - customer
3. Add supporting anchors only when they help.
4. Review the `Resolved Context` summary before submit.
5. If anchors conflict, the form blocks creation and explains why.
6. Submit once:
   - title is present
   - no conflict exists

### Result
- Issue anchors are stored structurally, not buried in human notes.
- The issue description stays human-readable.
- Conflicting commercial / warranty / serial / service anchors are rejected instead of silently normalized.

## Workflow 6: Issue Detail Is the Triage Workspace
1. Open an issue detail page.
2. Review:
   - description
   - SLA / escalation state
   - commercial customer
   - source order
   - source shipment
   - linked warranty
   - service system
   - current owner
3. Use the `Related` tab in this order:
   - same service system
   - same serialized item
   - linked warranty / order / shipment / RMAs
   - customer-wide context
4. Use the actions sidebar to move the issue forward.

### Operator expectation
- Issue detail is the main triage workspace for active support work.
- Customer-wide history remains useful, but it is intentionally secondary to serial and system context.

## Workflow 7: Issue Detail to RMA
1. Open the issue detail.
2. Review:
   - structured diagnosis / disposition
   - next action
   - RMA readiness
   - repeat-fault / prior-return context
3. If the commercial order is resolved safely, `Create RMA` is enabled.
4. If linkage is incomplete, the action stays blocked and explains why.
5. RMA creation still uses the order-centric write path, but the issue detail now acts as the readiness and handoff workspace.

### Operator expectation
- Issue detail is where the operator decides whether the issue ends with information, monitoring, claim, field action, or return.
- RMA creation should feel like a guided next step, not a leap into an unrelated workflow.

## Workflow 8: Receive and Execute the Remedy
1. Open the RMA detail page.
2. Confirm receipt / inspection state.
3. Review the selected resolution and execution state.
4. Choose `Execute Remedy`.
5. Complete the appropriate path:
   - refund
   - credit note
   - replacement draft order
   - repair / no action
6. Submit the execution action.

### Result
- `processed` means the remedy actually executed, not merely that an operator clicked forward.
- Financial or order artifacts are linked back to the RMA.
- Blocked execution remains visible as blocked instead of silently appearing complete.

## Workflow 9: Issue Closeout Stays Operator-Owned
1. After remedy execution completes, return to the linked issue.
2. Confirm the remedy artifact summary and any remaining follow-up.
3. Close or update the issue explicitly.

### Operator expectation
- Remedy completion should be obvious on the issue, but the system does not auto-close the issue.
- Support ownership remains explicit until a person finishes the loop.

## Workflow 10: Warranty Claim Path Stays Claimant-Aware
1. Open the warranty detail.
2. Choose `File Warranty Claim`.
3. Select who is making the claim:
   - `Retailer / Installer`
   - `Owner of Record`
   - `Internal Team`
   - `Other`
4. If the claim is direct, provide a channel bypass reason.
5. Submit the claim.

### Result
- `customerId` stays as the commercial account anchor.
- claimant fields store the actual claimant.
- claim notifications use claimant-aware recipient logic.

## Common Review States
### `needs_review` because serial capture is missing
- Coverage still exists.
- The delivered unit can be reviewed and, if appropriate, activated.
- The review step should confirm beneficiary details and shipment evidence.

### `needs_review` because policy is unresolved
- Coverage is visible.
- Activation should wait until the product resolves to a warranty policy.

### Service linkage review pending
- Warranty coverage may already exist.
- Installed-system linkage is intentionally paused until an operator resolves the ambiguity.

## Typical User Activities Checklist
### Support / Ops
- review the entitlement queue daily
- activate eligible entitlements
- resolve service linkage reviews
- start new issues from serial, warranty, order, or customer context
- work the issue queue with lineage-aware filters
- use issue detail as the anchor-first triage page

### Claims Team
- filter claims by `Purchased Via`
- filter claims by `Claim Path`
- filter claims by `Claimant Role`
- verify direct claims include a bypass reason

### Returns Team
- start from issue detail when support triggered the return
- confirm source order context is safe
- create RMA only once commercial truth is unambiguous
- execute the remedy from the RMA detail once receipt and inspection are complete
- close the linked issue explicitly after remedy completion

## Known Transitional Boundaries
- historical service-system migration is handled externally to this repository
- RMA creation remains order-centric by design
- broader workmanship/site support modeling is still deferred
- browser-driven workflow QA should still be completed before calling the support flow fully dogfooded

## Deferred Next Steps
- broader reverse-logistics workflow beyond receive / execute / closeout
- direct order-detail exposure of support-driven return workflows
- broader service-subject / site graph
