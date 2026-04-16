# Support Issue + RMA Operations Stage Record

**Purpose:** Preserve the planning record for the issue-resolution and RMA-operations stage now that the work is in the repo.

**Review lenses used:** `plan-ceo-review`, `plan-eng-review`

**Recommended stage name:** Phase 5A — Issue Resolution + RMA Operations

**Status:** Implemented across Phase 5A and Phase 5B

> Historical note: this file started as the forward plan after Phase 4. It is now a stage record, not the current roadmap.

---

## 1. Executive Conclusion

This stage is now part of the shipped baseline.

Issue resolution and RMA operations were the right next step after Phase 4, and the repo now reflects that direction.

Why:
- Phases 1 to 4 now cover coverage creation, activation, service linkage, claim truth, and issue intake/triage.
- The biggest remaining product gap is the operator path from:
  - issue diagnosis
  - to issue outcome
  - to return/remedy decision
  - to RMA execution

The current CRM is now good at both:
- opening the right issue with the right context
- driving that issue through explicit resolution and remedy execution

---

## 2. Current State Trace-Through

### What is strong now
- warranty detail is a good warranty-first hub
- support landing has clear intake entry points
- issue intake is anchor-first and structurally correct
- issue detail is an anchor-first triage page
- issue queue filters support missing/present lineage states
- service systems and current-owner context exist in-repo

### What still feels unfinished
- issue resolution is still mostly status-based, not outcome-based
- RMA readiness is visible, but not yet rich enough to guide an operator through next steps
- issue-to-RMA handoff is safer than before, but still feels like a bridge into another workflow rather than one coherent support operation
- repeat-failure / previous-return context is not yet strong enough at decision time

---

## 3. The Real Product Problem

The next operator problem is not:

- "How do I open an issue?"

It is:

- "Now that I understand the issue, what exactly should happen next?"

Operators need the CRM to help answer:
- Is this resolved without a return?
- Is this a field/service fix vs a commercial remedy?
- Is an RMA appropriate?
- Is the issue tied to a previous return or repeat fault?
- Is the order / serial / system context strong enough to authorize the return path?

That is why the next stage should be resolution-and-remedy focused.

---

## 4. Product Recommendation

Build a bounded **Issue Resolution + RMA Operations** stage with four goals:

1. make issue outcomes explicit
2. make RMA readiness and blockers first-class
3. make issue-to-RMA handoff feel native
4. make repeat-fault / prior-return context visible at decision time

Do **not** use this stage to redesign every RMA screen or build a generalized site/service-subject graph.

---

## 5. Phase 5A Scope

## 5.1 Issue Resolution Model

Add explicit resolution/disposition structure to issues so closing an issue means more than changing status.

Recommended additions:
- `resolutionCategory`
  - `information_only`
  - `configuration_fix`
  - `field_service_required`
  - `warranty_claim`
  - `rma_required`
  - `monitoring_only`
  - `no_fault_found`
- `resolutionSummary`
- `diagnosisNotes`
- `nextActionType`
  - `none`
  - `follow_up`
  - `create_rma`
  - `create_claim`
  - `dispatch_service`
- `resolvedBy`
- `resolvedAt`

### Product rule
- `resolved` status should not be the only support outcome signal.
- the operator should have to choose what kind of resolution happened.

## 5.2 RMA Readiness Becomes First-Class

Create a shared readiness model returned with issue detail and queue reads:
- `canCreateRma`
- `blockedReason`
- `requiredAnchorsMissing`
- `eligibleOrderId`
- `eligibleOrderLineSummary`
- `serializedReturnHints`
- `hasPriorRmaForSameSerial`

### Operator effect
- the issue detail should explain whether an RMA is:
  - ready now
  - blocked
  - risky because this is a repeated return/fault

## 5.3 Better Issue-to-RMA Handoff

Keep the order-centric RMA write contract for now, but make the support handoff much cleaner.

Improve:
- stronger prefill from issue context
- clearer banner/state in order detail when arriving from issue context
- back-link from RMA to originating issue
- better success path from issue -> order -> RMA -> back to issue/RMA detail

### Explicit non-goal
- do not rewrite the underlying RMA persistence model in this stage

## 5.4 Repeat Fault / Return Context

At issue detail and RMA decision time, surface:
- previous issues on the same serial
- previous issues on the same service system
- previous RMAs on the same serial / order
- last known resolution category

This should answer:
- "Is this the first occurrence or a repeat?"
- "Have we already returned or replaced this unit?"

## 5.5 Queue Support for Resolution Work

Extend the queue beyond intake/triage filters to support active resolution work:
- unresolved diagnosis
- RMA-ready
- RMA-blocked
- repeat fault suspected
- resolved without disposition completeness

This is the operator-manager layer missing today.

---

## 6. Architecture Recommendation

## 6.1 Do Not Build a General Remedy Engine Yet

Avoid:
- polymorphic remedy subjects
- generalized workflow engines
- service-subject graphs in this stage

Those are oceans, not lakes.

## 6.2 Add a Shared Resolution/Readiness Resolver

Recommended shared server module:
- `src/server/functions/support/_shared/issue-resolution-context.ts`

Responsibilities:
- compute RMA readiness
- detect missing anchors for remedy paths
- fetch prior issue / RMA context for same serial/system
- shape operator-facing next-action data

This should be reused by:
- issue detail
- issue list enrichment
- order-detail issue-origin banners
- future RMA-origin back-links

## 6.3 Data Shape Direction

Likely schema additions:
- issue resolution/disposition columns
- optional `originIssueId` on RMAs if not already represented elsewhere
- supporting indexes for same-serial / same-system / same-order lookups

---

## 7. UX Direction

The UI should feel like **closing the loop**, not opening another maze.

### Issue detail
Add a dedicated resolution section:
- diagnosis
- disposition
- next action
- RMA readiness
- repeat-history warnings

### RMA launch
The `Create RMA` path should:
- explain what will happen next
- show why it is blocked when blocked
- preserve the originating issue context visibly

### Queue
Resolution queues should make it easy to spot:
- issues waiting on diagnosis
- issues ready for return flow
- issues blocked by missing lineage
- repeated serial/system failures

---

## 8. Files Most Likely To Change

### Support core
- `src/server/functions/support/issues.ts`
- `src/server/functions/support/_shared/issue-anchor-resolution.ts`
- new shared resolution/readiness resolver in `src/server/functions/support/_shared/`
- `src/lib/schemas/support/issues.ts`
- `drizzle/schema/support/issues.ts`

### Issue UI
- `src/components/domain/support/issues/issue-detail-view.tsx`
- `src/components/domain/support/issues/issue-detail-container.tsx`
- `src/routes/_authenticated/support/issues/issues-page.tsx`
- `src/components/domain/support/issues/issue-filter-config.ts`

### RMA / order handoff
- `src/components/domain/orders/containers/order-detail-container.tsx`
- `src/components/domain/support/rma/rma-create-dialog.tsx`
- `src/components/domain/support/rma/rma-detail-view.tsx`

### Docs / traces
- support workflow docs
- `docs/code-traces/14-rma-create.md`
- a new issue-resolution trace

---

## 9. Test Plan

### Resolution model
- issue cannot be marked fully resolved without required disposition fields
- resolution category and next action persist correctly

### RMA readiness
- issue detail shows ready vs blocked states correctly
- missing order/serial lineage yields explicit blocker copy
- repeated serial/system return history surfaces where expected

### Handoff
- issue-originated RMA create preserves issue context
- order detail banner clearly explains issue-origin flow
- RMA retains or exposes originating issue linkage

### Queue
- new resolution/work queues round-trip through URL state
- repeat-fault and RMA-blocked views filter correctly

### Verification
- `npm run typecheck`
- `vitest run tests/unit/support`
- targeted tests for resolution readiness and issue->RMA handoff
- browser dogfood once browse tooling is healthy

---

## 10. Anti-Patterns To Avoid

- do not reopen issue-intake architecture work unless a real gap appears
- do not redesign the whole RMA domain in one phase
- do not hide RMA blockers inside generic disabled buttons without explanation
- do not push remedy truth back into freeform notes or metadata
- do not make customer-wide history outrank serial/system history at remedy time

---

## 11. Recommendation Summary

### What to do next

Build **Phase 5A: Issue Resolution + RMA Operations**.

### Why this is the right next stage

It completes the support loop on top of the now-correct intake and triage model.

### What stays deferred

- full RMA lifecycle redesign
- site/workmanship service-subject expansion
- system-first global navigation
- deeper ownership-transfer product work
