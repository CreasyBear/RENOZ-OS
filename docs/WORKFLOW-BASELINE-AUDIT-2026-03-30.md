# Workflow Baseline Audit: Customer + Sales Order Creation/Editing

**Status:** COMPLETE  
**Date:** 2026-03-30  
**Scope:** Customer create, draft sales order create, draft sales order edit, post-confirmation sales order edit  
**Related:** [Workflow Audit and Remediation Process](./WORKFLOW-AUDIT-REMEDIATION-PROCESS.md), [01 - Create customer](./code-traces/01-customer-create.md), [03 - Create order](./code-traces/03-order-create.md), [Form Audit](./design-system/FORM-AUDIT.md)

## Summary

This baseline audit reviewed four workflow journeys already present in the repo:

1. `Customer create` via `CustomerWizard`
2. `Draft sales order create` via `OrderCreationWizard`
3. `Draft sales order edit` via `OrderEditDialog`
4. `Post-confirmation sales order edit` via `AmendmentRequestDialogContainer`

The main pattern behind current frustration is not one single bug. It is a combination of:

- non-atomic writes in customer creation
- duplicated and step-gated validation in order creation
- a mismatch between what the draft order detail surface suggests is editable and what is actually editable
- a multi-stage amendment flow that can partially succeed and then strand the user in recovery mode
- thin workflow-level test coverage compared with the number of validation and mutation boundaries involved

## Audit Method

### Rubric

Scores use `1-5`, where:

- `5` = strong / low-friction / low-risk
- `3` = acceptable but noticeably fragile
- `1` = high-friction / high-risk / likely source of user frustration

Rubric dimensions:

- completion success
- validation friction
- recovery clarity
- data integrity risk
- concurrency/versioning risk
- user effort to recover

### Verification Performed

- Code audit of route -> form -> hook -> server function -> persistence -> recovery path for all four journeys
- Existing targeted tests run successfully:
  - `tests/unit/customers/customer-create-error-handling.test.ts`
  - `tests/unit/orders/order-create-page-idempotency.test.tsx`
  - `tests/unit/orders/order-write-contracts.test.ts`
- Local dev server booted successfully with `npm run dev`

### Environment Notes

- The local app boots, but this audit did not complete an authenticated browser walkthrough.
- Result: this baseline is code-backed and test-backed, with local runtime validation limited to app startup.
- Dev server emitted route-tree warnings unrelated to the audited workflows.

## Journey Inventory

### 1. Customer Create

**Entry point:** [`src/routes/_authenticated/customers/new.tsx`](../src/routes/_authenticated/customers/new.tsx)  
**Core UI:** [`src/components/domain/customers/customer-wizard/index.tsx`](../src/components/domain/customers/customer-wizard/index.tsx)  
**Server create:** [`src/server/functions/customers/customers.ts`](../src/server/functions/customers/customers.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 3 | Core customer row create is solid, but related contacts/addresses can fail after success. |
| Validation friction | 4 | Basic-step validation is focused and reasonably clear. |
| Recovery clarity | 3 | Duplicate field errors map back well; partial related failure redirects to edit. |
| Data integrity risk | 2 | Customer create is atomic, but related records are not. |
| Concurrency/versioning risk | 4 | Low concurrency surface for this flow. |
| User effort to recover | 3 | Partial failures require a second workflow in edit mode. |

**Golden path**

`/customers/new` -> complete basic details -> optionally add contacts and addresses -> create customer row -> create related records -> navigate to customer detail

**Happy path**

`/customers/new` -> submit with routine validation issue such as duplicate email -> field error maps back to details step -> fix field -> resubmit

**Unhappy path**

`/customers/new` -> customer row inserts successfully -> one or more contacts or addresses fail -> toast shows partial failure -> user is redirected to edit page to repair related data

**Evidence**

- Customer row is created first, then contacts and addresses are created one by one in separate best-effort loops in [`src/routes/_authenticated/customers/new.tsx`](../src/routes/_authenticated/customers/new.tsx) lines 173-232.
- Partial related-record failure is explicitly handled as `PARTIAL_RELATED_CREATE_FAILURE` and redirects to edit in [`src/routes/_authenticated/customers/new.tsx`](../src/routes/_authenticated/customers/new.tsx) lines 234-257.
- The wizard preserves draft state and skips UI recovery after that partial-failure redirect in [`src/components/domain/customers/customer-wizard/index.tsx`](../src/components/domain/customers/customer-wizard/index.tsx) lines 83-106 and [`src/components/domain/customers/customer-wizard/submission-state.ts`](../src/components/domain/customers/customer-wizard/submission-state.ts) lines 62-76.
- The customer server mutation itself is atomic and permission-gated in [`src/server/functions/customers/customers.ts`](../src/server/functions/customers/customers.ts) lines 575-633.
- Existing tests cover duplicate-email mapping and partial-failure draft preservation in [`tests/unit/customers/customer-create-error-handling.test.ts`](../tests/unit/customers/customer-create-error-handling.test.ts) lines 9-57.

**Assessment**

- The primary frustration is not field validation.
- The primary frustration is saga shape: users can “succeed” and still be left with repair work.

### 2. Draft Sales Order Create

**Entry point:** [`src/routes/_authenticated/orders/-create-page.tsx`](../src/routes/_authenticated/orders/-create-page.tsx)  
**Core UI:** [`src/components/domain/orders/creation/order-creation-wizard.tsx`](../src/components/domain/orders/creation/order-creation-wizard.tsx)  
**Form hook:** [`src/hooks/orders/use-order-creation-form.ts`](../src/hooks/orders/use-order-creation-form.ts)  
**Server create:** [`src/server/functions/orders/order-write.ts`](../src/server/functions/orders/order-write.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 3 | Create path is robust and idempotent, but validation feels heavily gated. |
| Validation friction | 2 | There are multiple overlapping validation layers before and during submit. |
| Recovery clarity | 2 | Generic message-to-step routing is heuristic and coarse. |
| Data integrity risk | 4 | Server recomputes totals and uses idempotent request identity. |
| Concurrency/versioning risk | 4 | Low concurrency during create; idempotency is a strength. |
| User effort to recover | 2 | Step bouncing and blocking messages increase effort. |

**Golden path**

`/orders/create` -> select customer -> add products -> adjust pricing -> confirm shipping -> create order -> navigate to detail

**Happy path**

Open order create from a customer context with preselected customer via `?customerId=` -> create order -> repeated submit within the same page session reuses the same `clientRequestId`

**Unhappy path**

User edits quantities, discounts, or address fields -> hits step-level blocks before submit -> gets pushed back to a coarse step inferred from error text rather than a precise failing control

**Evidence**

- The page supports customer-context preselection and generates a stable `clientRequestId` per page session in [`src/routes/_authenticated/orders/-create-page.tsx`](../src/routes/_authenticated/orders/-create-page.tsx) lines 28-83.
- Submit payload construction can silently omit incomplete addresses in [`src/hooks/orders/use-order-creation-form.ts`](../src/hooks/orders/use-order-creation-form.ts) lines 113-191.
- Client business-rule validation is duplicated in [`src/hooks/orders/use-order-creation-form.ts`](../src/hooks/orders/use-order-creation-form.ts) lines 197-232.
- Draft persistence is explicitly disabled in [`src/hooks/orders/use-order-creation-form.ts`](../src/hooks/orders/use-order-creation-form.ts) lines 238-260.
- The wizard adds another blocking layer via `getBlockingStep`, `validateStep`, `canNavigateToStep`, and message-based step routing in [`src/components/domain/orders/creation/order-creation-wizard.tsx`](../src/components/domain/orders/creation/order-creation-wizard.tsx) lines 824-1052.
- The server revalidates customer existence, order-number uniqueness, and totals reconciliation in [`src/server/functions/orders/order-write.ts`](../src/server/functions/orders/order-write.ts) lines 51-140.
- `createOrder` is idempotent via `clientRequestId`, and current test coverage confirms the page reuses the same request identity in [`tests/unit/orders/order-create-page-idempotency.test.tsx`](../tests/unit/orders/order-create-page-idempotency.test.tsx) lines 98-120.

**Assessment**

- The biggest issue here is not data correctness.
- The biggest issue is “blocky” interaction design caused by duplicated validation and step gating.

### 3. Draft Sales Order Edit

**Entry point:** order detail -> `Edit Order`  
**Detail orchestration:** [`src/components/domain/orders/containers/use-order-detail-container-actions.ts`](../src/components/domain/orders/containers/use-order-detail-container-actions.ts)  
**Edit UI:** [`src/components/domain/orders/cards/order-edit-dialog.tsx`](../src/components/domain/orders/cards/order-edit-dialog.tsx)  
**Items tab:** [`src/components/domain/orders/tabs/order-items-tab.tsx`](../src/components/domain/orders/tabs/order-items-tab.tsx)  
**Header update:** [`src/server/functions/orders/order-write.ts`](../src/server/functions/orders/order-write.ts)  
**Line-item mutations:** [`src/hooks/orders/use-orders.ts`](../src/hooks/orders/use-orders.ts), [`src/server/functions/orders/order-line-items.ts`](../src/server/functions/orders/order-line-items.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 2 | Header edits are supported, but item-level expectations are not met from the main draft detail surface. |
| Validation friction | 4 | Header edit form itself is straightforward. |
| Recovery clarity | 2 | Version conflicts return a refresh-and-retry error, with no stronger UI recovery. |
| Data integrity risk | 3 | Version checks and draft-only editing protect integrity. |
| Concurrency/versioning risk | 2 | Strict expected-version checks are correct but easy to trip. |
| User effort to recover | 2 | Users expecting item edits must switch mental models or leave the surface. |

**Golden path**

Draft order detail -> open `Edit Order` -> change header fields such as customer, due date, notes, or status -> save

**Happy path**

Draft order detail -> review line items in the items tab -> make header changes in the edit dialog -> return to detail

**Unhappy path**

User expects to edit draft line items from the detail surface -> items tab is read-only -> edit dialog only covers header fields -> any real line-item edit requires another path that is not visible from the audited draft detail surface

**Evidence**

- The detail container only submits header-level fields from the edit dialog in [`src/components/domain/orders/containers/use-order-detail-container-actions.ts`](../src/components/domain/orders/containers/use-order-detail-container-actions.ts) lines 76-94.
- The edit dialog exposes only `customerId`, `orderNumber`, `status`, `dueDate`, `internalNotes`, and `customerNotes` in [`src/components/domain/orders/cards/order-edit-dialog.tsx`](../src/components/domain/orders/cards/order-edit-dialog.tsx) lines 70-147.
- The order items tab is a read-only table with no edit controls in [`src/components/domain/orders/tabs/order-items-tab.tsx`](../src/components/domain/orders/tabs/order-items-tab.tsx) lines 151-240.
- Inference from the audited detail surface: draft line-item edits are not exposed in the canonical draft detail UI.
- Line-item mutation hooks do exist in [`src/hooks/orders/use-orders.ts`](../src/hooks/orders/use-orders.ts) lines 305-363, and the server supports add/update/delete with `expectedOrderVersion` plus `draft` status enforcement in [`src/server/functions/orders/order-line-items.ts`](../src/server/functions/orders/order-line-items.ts) lines 86-340.
- `updateOrderSchema` and line-item mutation schemas all require version tokens in [`src/lib/schemas/orders/orders.ts`](../src/lib/schemas/orders/orders.ts) lines 150-155 and 263-292.
- Header updates fail fast on stale versions in [`src/server/functions/orders/order-write.ts`](../src/server/functions/orders/order-write.ts) lines 301-303 and 423-426.

**Assessment**

- This is the clearest expectation gap in the audit.
- The repo supports line-item mutation primitives, but the audited draft detail UI does not present a clear, canonical item-edit workflow.

### 4. Post-Confirmation Sales Order Edit

**Entry point:** order detail -> `Request Amendment`  
**Core UI:** [`src/components/domain/orders/amendments/amendment-request-dialog-container.tsx`](../src/components/domain/orders/amendments/amendment-request-dialog-container.tsx)  
**Server apply path:** [`src/server/functions/orders/order-amendments.ts`](../src/server/functions/orders/order-amendments.ts)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completion success | 3 | There is a supported path for post-confirmation changes. |
| Validation friction | 2 | Picked/shipped constraints and multi-stage states add friction. |
| Recovery clarity | 2 | Request, approval, and apply can fail independently. |
| Data integrity risk | 4 | Version checks and picked-quantity guards are strong. |
| Concurrency/versioning risk | 2 | Amendment apply can fail if the order changed since request. |
| User effort to recover | 2 | Recovery after mid-chain failure is manual and stateful. |

**Golden path**

Confirmed order -> open amendment dialog -> request amendment -> approve -> apply -> return to updated order

**Happy path**

Use `request-only` mode when approval needs to happen later -> amendment is created and submitted without immediate apply

**Unhappy path**

Request succeeds -> approval or apply fails -> user remains in a partially-completed state and must understand whether they now have a pending amendment, an approved-but-not-applied amendment, or a version conflict

**Evidence**

- The UI explicitly chains `request -> approve -> apply` in sequence when `mode !== "request-only"` in [`src/components/domain/orders/amendments/amendment-request-dialog-container.tsx`](../src/components/domain/orders/amendments/amendment-request-dialog-container.tsx) lines 121-168.
- The amendment flow stores step-local errors like `Request failed`, `Approval failed`, and `Apply failed` instead of collapsing them into one recovery model in [`src/components/domain/orders/amendments/amendment-request-dialog-container.tsx`](../src/components/domain/orders/amendments/amendment-request-dialog-container.tsx) lines 127-168.
- Server apply blocks on order version drift in [`src/server/functions/orders/order-amendments.ts`](../src/server/functions/orders/order-amendments.ts) lines 431-434.
- Server apply blocks quantity reductions below `qtyPicked` and tells the user to unpick first in [`src/server/functions/orders/order-amendments.ts`](../src/server/functions/orders/order-amendments.ts) lines 506-527.
- Applying an amendment mutates line items, totals, order version, and amendment status in one transaction in [`src/server/functions/orders/order-amendments.ts`](../src/server/functions/orders/order-amendments.ts) lines 457-635.

**Assessment**

- This flow is functionally richer than draft editing, but it is cognitively heavier.
- The strongest frustration source is recovery after mid-chain failure, not lack of rules.

## Ranked Issue Matrix

Scoring:

- Severity to task completion: `1-5`
- Frequency likelihood: `1-5`
- Data inconsistency risk: `1-5`
- Fix leverage: `1-5`
- **Priority score:** sum of the four dimensions, max `20`

| Rank | Issue | Type | Severity | Frequency | Integrity | Leverage | Score | Evidence |
|------|-------|------|----------|-----------|-----------|----------|-------|----------|
| 1 | Customer create is non-atomic across customer row vs contacts/addresses, so users can succeed and still have repair work | Broken resilience / data integrity gap | 4 | 4 | 5 | 4 | 17 | [`new.tsx`](../src/routes/_authenticated/customers/new.tsx), [`customers.ts`](../src/server/functions/customers/customers.ts), [`submission-state.ts`](../src/components/domain/customers/customer-wizard/submission-state.ts) |
| 2 | Draft order detail suggests editability, but the canonical UI only edits header fields while line items remain read-only | Missing capability / expectation gap | 5 | 4 | 2 | 5 | 16 | [`order-edit-dialog.tsx`](../src/components/domain/orders/cards/order-edit-dialog.tsx), [`order-items-tab.tsx`](../src/components/domain/orders/tabs/order-items-tab.tsx), [`use-orders.ts`](../src/hooks/orders/use-orders.ts) |
| 3 | Order create validation is duplicated across schema, local business-rule checks, step guards, and error-to-step heuristics | Over-restrictive validation | 4 | 5 | 2 | 5 | 16 | [`use-order-creation-form.ts`](../src/hooks/orders/use-order-creation-form.ts), [`order-creation-wizard.tsx`](../src/components/domain/orders/creation/order-creation-wizard.tsx), [`order-write.ts`](../src/server/functions/orders/order-write.ts) |
| 4 | Amendment flow can partially succeed across request, approval, and apply, leaving recovery state unclear | Broken recovery model | 4 | 3 | 4 | 4 | 15 | [`amendment-request-dialog-container.tsx`](../src/components/domain/orders/amendments/amendment-request-dialog-container.tsx), [`order-amendments.ts`](../src/server/functions/orders/order-amendments.ts) |
| 5 | Draft/header edits and line-item edits both require strict version tokens, but there is little workflow-level guidance beyond “refresh and try again” | Concurrency/recovery friction | 3 | 4 | 4 | 3 | 14 | [`orders.ts`](../src/lib/schemas/orders/orders.ts), [`order-write.ts`](../src/server/functions/orders/order-write.ts), [`order-line-items.ts`](../src/server/functions/orders/order-line-items.ts) |
| 6 | Workflow-level test coverage is thin relative to the number of state transitions and recovery branches | Missing verification | 3 | 4 | 3 | 4 | 14 | [`tests/unit/orders/order-write-contracts.test.ts`](../tests/unit/orders/order-write-contracts.test.ts), [`tests/unit/orders/order-create-page-idempotency.test.tsx`](../tests/unit/orders/order-create-page-idempotency.test.tsx), [`tests/unit/customers/customer-create-error-handling.test.ts`](../tests/unit/customers/customer-create-error-handling.test.ts) |
| 7 | Order creation disables draft persistence entirely, so cancel or interruption still risks lost work despite the wizard complexity | Missing resilience | 3 | 3 | 2 | 4 | 12 | [`use-order-creation-form.ts`](../src/hooks/orders/use-order-creation-form.ts) |

## Top 5 Blockers

### 1. Draft order item editing is not presented as a real workflow

Users can inspect items from the main draft detail surface, but not actually edit them there. That is the clearest mismatch with expectations behind “editing items always fails.”

### 2. Order creation is over-gated before the server ever gets a chance to help

The flow validates in the schema, then again in `validateOrderCreationForm`, then again in `getBlockingStep`, then again at server submit. That creates a “blocky” experience even when the server-side model is sound.

### 3. Customer creation can end in partial success

The user can complete the wizard successfully, yet still be forced into edit mode because contacts or addresses failed afterward. That is recoverable, but emotionally it feels like the system broke after success.

### 4. Amendment recovery is multi-state and under-explained

If request succeeds but approve or apply fails, the user must reason about amendment state, order version, and picked quantities. That is a legitimate workflow constraint, but the recovery model is heavy.

### 5. Version conflicts are technically correct but UX-thin

`expectedVersion` and `expectedOrderVersion` are good integrity controls. The current user-facing recovery, though, is mostly “refresh and try again,” which will feel brittle in active multi-user flows.

## Prioritized Remediation Backlog

### Fix Now

- Add a canonical draft line-item editing path from the draft order detail surface.
  - Minimum acceptable outcome: explicit add/edit/remove controls for draft line items, wired to existing line-item mutation hooks.
  - If not implemented immediately, the UI should at least clearly signpost that items are not editable here and where to edit them.
- Simplify order-create validation layering.
  - Keep server reconciliation as source of truth.
  - Collapse duplicate client checks where possible.
  - Replace coarse step-level blocking with field- and section-level guidance.
- Reduce customer-create partial-success pain.
  - Best fix: move related record creation into one orchestrated transactional workflow where feasible.
  - If atomicity is not practical, improve partial-success messaging and make the redirect-to-edit state more explicit.

### Next

- Improve stale-version recovery for draft order edit and line-item mutation flows.
  - Surface a clearer “order changed since you opened it” recovery state.
  - Offer reload/retry UX instead of just a raw conflict message.
- Improve amendment failure recovery.
  - Distinguish request-created, approval-failed, and apply-failed states in the UI.
  - Show whether the user now has a pending or approved amendment to resume.
- Revisit order-create interruption resilience.
  - Consider lightweight local draft save, especially given the wizard length and validation density.

### Later

- Add stronger workflow observability for create/edit/amendment funnels.
  - Track step exits, validation drop-offs, conflict frequency, and amendment apply failures.
- Tighten permission consistency for order create/update surfaces.
  - This is lower on immediate user-friction impact than the items above, but worth aligning with other domains.
- Expand consistency work across adjacent forms once the four audited workflows are stabilized.

## Coverage Gaps

Current coverage is strongest at contract boundaries, not workflow behavior.

### Present Coverage

- Customer create error mapping and partial-failure recovery: [`tests/unit/customers/customer-create-error-handling.test.ts`](../tests/unit/customers/customer-create-error-handling.test.ts)
- Order create request identity reuse: [`tests/unit/orders/order-create-page-idempotency.test.tsx`](../tests/unit/orders/order-create-page-idempotency.test.tsx)
- Order write schema contracts: [`tests/unit/orders/order-write-contracts.test.ts`](../tests/unit/orders/order-write-contracts.test.ts)

### Missing Coverage

- Customer create integration test for customer row success + related record failure + redirect to edit
- Order create interaction tests for:
  - step gating
  - pricing validation
  - manual vs inherited shipping address behavior
- Draft order detail tests proving what is and is not editable from the canonical surface
- Workflow tests for line-item mutation UI once a canonical draft item-edit path exists
- Amendment tests covering:
  - request success + approval failure
  - request success + apply failure
  - picked-quantity guard UX
  - version conflict after amendment request creation

## Commands Run

```bash
npx vitest run tests/unit/orders/order-write-contracts.test.ts \
  tests/unit/customers/customer-create-error-handling.test.ts \
  tests/unit/orders/order-create-page-idempotency.test.tsx
```

Result: `3` test files passed, `7` tests passed.

## Bottom Line

The highest-leverage next step is not a broad rewrite. It is to remove the mismatch between what users expect to edit and what the workflow actually supports:

1. make draft order item editing explicit and canonical
2. reduce order-create validation layering
3. harden customer create against partial-success frustration

Those three changes would remove the biggest sources of friction surfaced by this baseline.
