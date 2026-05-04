# Maintainer Sprint 1: Support, RMA, and Warranty Ownership

This sprint applies the maintainer process from `docs/reference/maintainer-sprint-process.md` to support-owned issue, RMA, warranty, and remedy workflows.

Status: Closed after Issues 1, 2, 3, 4, and 5; remaining support/RMA/warranty risks move to a future sprint.

## Business Value

Support, RMA, and warranty workflows are where RENOZ Energy protects customer trust after the sale. If the app is unclear about warranty entitlement, issue context, RMA eligibility, returned stock, remedies, refunds, credits, replacements, or closeout state, operators can promise the wrong thing, lose battery lineage, or create finance and inventory mismatches.

This sprint should make RENOZ-V3 easier to use as the system of record for support recovery: what failed, which battery/customer/order it belongs to, what remedy is allowed, what was executed, and what inventory/finance/document state changed.

## Workflow Spine

```text
warranty / customer / order / serial context
  -> support issue
  -> diagnosis + remedy readiness
  -> RMA request / approval / receive
  -> remedy execution
  -> inventory / finance / replacement / credit / refund / support closeout
```

## Current Pattern Map

Intended flow:

```text
route
  -> container/page
  -> domain component
  -> hook
  -> server function
  -> schema/database
  -> query key/cache policy
```

Observed support/RMA paths:

- Routes: `src/routes/_authenticated/support/*`, order detail RMA launch surfaces, warranty claim/detail surfaces.
- Components: `src/components/domain/support/issues/*`, `src/components/domain/support/rma/*`, `src/components/domain/warranty/*`.
- Hooks: `src/hooks/support/*`, `src/hooks/warranty/*`, adjacent order hooks for RMA launch.
- Server: `src/server/functions/support/*`, `src/server/functions/orders/rma.ts`, `src/server/functions/orders/_shared/rma-*`, `src/server/functions/warranty/*`.
- Schemas: `src/lib/schemas/support/*`, warranty schemas and server validators.
- Database: support issues, return authorizations, RMA line items, warranty entitlements, warranties, orders, payments, credit notes, inventory movement/cost-layer tables.
- Tests: `tests/unit/support/*`, `tests/unit/warranty/*`, adjacent inventory/order/financial tests.

## Source References

- `docs/architecture/support-issue-rma-b2b2c.md`: support issue and RMA architecture context.
- `docs/workflows/warranty-support-phase2-workflows.md`: warranty/support workflow notes.
- `docs/code-traces/12-warranty-claim-create.md`: warranty claim create trace.
- `docs/code-traces/13-rma-receive-inventory.md`: RMA return-to-stock trace.
- `docs/code-traces/14-rma-create.md`: RMA create trace.
- `docs/code-traces/15-rma-process-resolution.md`: RMA process/remedy trace.
- `docs/code-traces/18-rma-field-update.md`: non-workflow RMA update trace.
- `docs/code-traces/21-rma-approval-workflow.md`: single and bulk RMA approval trace.
- `docs/inventory/MAINTAINER-SPRINT-1.md`: closed inventory/RMA return-to-stock evidence and deferred support risks.

## Triage Findings

### What Is Solid

- RMA create now uses `PERMISSIONS.support.create` in live code.
- RMA update and process now use `PERMISSIONS.support.update` in live code.
- Single and bulk RMA approval now use `PERMISSIONS.support.update` in live code.
- RMA receive uses `PERMISSIONS.inventory.receive` and the location contract is already trace guarded.
- `processRma` now routes through `executeRmaRemedy` inside a transaction instead of merely storing metadata.
- Existing tests cover RMA receive location selection, RMA receive dialog interaction, mutation invalidation, remedy execution dialog affordances, read-model shaping, support query normalization, issue anchors, and RMA execution state.

### What Is Fragile

- RMA trace freshness now has guards, but future behavior changes still need trace updates in the same slice.
- `updateRmaSchema` now rejects `inspectionNotes`, `resolution`, and `resolutionDetails`, so receipt inspection and remedy resolution have dedicated workflow owners.
- Bulk approval permission parity now has source and trace guards.
- Remedy execution has high business stakes and spans support, orders, finance, inventory, and replacement workflows; schema/state evidence is guarded, while DB-backed side-effect integration remains deferred.
- Warranty, issue, and RMA read paths are broad enough that stale traces can mislead future maintainers.

### What Needs Revalidation

- Whether bulk approval should invalidate linked order details if order detail renders approval state.
- Whether future direct `updateRma` callers need migration guidance for receipt inspection and remedy resolution edits.
- Whether future RMA trace changes continue to match server behavior, mutation envelopes, cache invalidation, and remedy side effects.
- Whether process-remedy execution needs DB-backed side-effect integration for refund, credit, replacement, repair, and blocked states.
- Whether support issue closure clearly reflects RMA/remedy execution state for operators.

## Issue Ledger

### 1. RMA Trace Reality And Permission Contract

Business value: operators and maintainers should trust the RMA traces when changing support recovery workflows; stale traces around permissions and remedy execution are dangerous because they understate current protection and side effects.

Evidence:

- `docs/code-traces/14-rma-create.md` says `createRma` uses bare `withAuth()`, but live code uses `withAuth({ permission: PERMISSIONS.support.create })`.
- `docs/code-traces/15-rma-process-resolution.md` says `processRma` uses bare `withAuth()` and is metadata-only, but live code uses `PERMISSIONS.support.update` and calls `executeRmaRemedy` in a transaction.
- `docs/code-traces/18-rma-field-update.md` says `updateRma` uses bare `withAuth()`, but live code uses `PERMISSIONS.support.update`.

Proposed slice:

> Refresh RMA create/process/update traces against current code and add a focused contract guard for current RMA permission and remedy ownership.

Likely files:

- `docs/code-traces/14-rma-create.md`
- `docs/code-traces/15-rma-process-resolution.md`
- `docs/code-traces/18-rma-field-update.md`
- `tests/unit/support/rma-workflow-trace-contract.test.ts`

Out of scope:

- changing RMA server behavior
- changing remedy execution behavior
- changing UI copy

### 2. RMA Field Update Boundary

Business value: operators should not have two ways to mutate receipt inspection or remedy resolution state, because dual paths make support closeout harder to reason about and can bypass workflow-specific readiness checks.

Evidence:

- `updateRmaSchema` accepts `inspectionNotes`, `resolution`, and `resolutionDetails`.
- `receiveRma` owns inspection state during receipt.
- `processRma` owns resolution and remedy execution.
- `docs/code-traces/18-rma-field-update.md` already calls this out as dual-path drift.

Proposed slice:

> Decide whether `updateRma` should reject workflow-owned fields or explicitly document them as admin-only, then add a contract test.

Out of scope:

- editing RMA line items
- changing RMA status transitions
- replacing `processRma`

### 3. RMA Bulk Approval Permission Parity

Business value: bulk operators should not be able to approve RMAs with weaker authority than single-RMA approval.

Evidence:

- `approveRma` uses `PERMISSIONS.support.update`.
- `bulkApproveRma` now uses `PERMISSIONS.support.update` and has trace coverage.

Proposed slice:

> Verify and align bulk approve permission posture with single approve, then guard it.

Out of scope:

- changing approval policy or role definitions
- redesigning bulk RMA list UI

### 4. Remedy Execution Evidence

Business value: refunds, credits, replacements, repairs, and no-action closeout must be honest operational states, not labels that imply side effects which did not happen.

Evidence:

- `processRma` calls `executeRmaRemedy`.
- Tests now cover remedy dialog affordances, RMA execution state, read-model artifact projection, and resolution-specific schema/state evidence.
- Remedy execution touches support, orders, finance, replacement, and issue state.

Proposed slice:

> Map process-remedy execution by resolution type and identify the smallest missing test for blocked or side-effectful remedy state.

Out of scope:

- adding new remedy types
- integrating external payment/accounting providers beyond existing code

### 5. RMA Remedy Artifact Transaction Contract

Business value: refund, credit, and replacement remedies are business-closeout actions. They should create or reuse canonical artifact links inside the remedy execution path so operators can trust that processed RMA state means a real local refund payment, credit note, or replacement draft exists.

Workflow invariant: received RMA -> `processRma` support-update permission -> transaction-scoped `executeRmaRemedy` -> artifact-producing resolution branch -> canonical artifact ID returned to `buildCompletedRmaExecutionState` -> RMA read model projects artifact truth.

Affected files:

- `src/server/functions/orders/_shared/rma-remedy-execution.ts`
- `tests/unit/support/rma-remedy-execution-transaction.test.ts`
- `docs/support/MAINTAINER-SPRINT-1.md`

Out of scope:

- changing remedy execution server behavior
- adding a real database integration harness
- changing external payment/accounting settlement behavior
- changing RMA receive, approval, or field update behavior
- changing operator UI copy

Focused tests:

```bash
./node_modules/.bin/vitest run tests/unit/support/rma-remedy-execution-transaction.test.ts
```

Closeout criteria:

- refund remedy test proves a refund payment artifact is inserted and returned as canonical execution evidence
- credit remedy test proves a credit note artifact is inserted and returned as canonical execution evidence
- replacement remedy test proves a zero-priced replacement draft and line item are inserted and returned as canonical execution evidence
- over-refund or blocked artifact setup does not insert fake artifact truth
- focused tests, support tests, lint, typecheck, and diff check pass or skipped gates are recorded

## Recommended First Implementation Slice

Start with Issue 1: RMA Trace Reality And Permission Contract.

Why:

- It is trace-first and low blast radius.
- It corrects stale maintainer evidence before behavior work.
- It protects high-stakes support/RMA closeout semantics.
- It will expose whether Issue 2 or Issue 3 should be implemented first.

Lifecycle:

```text
Triage: stale RMA auth/remedy traces
Issue: RMA trace reality and permission contract
Architect: RMA UI/hook -> server functions -> schema/database -> query/cache -> trace
Implement: trace corrections + focused source contract guard
Remediate: remove stale bare-auth and metadata-only claims
Verify: focused contract test + diff check + targeted lint
Closeout: business value, standards, smells, gates, residual risk
```

## Gates For First Slice

Focused:

```bash
./node_modules/.bin/vitest run tests/unit/support/rma-workflow-trace-contract.test.ts
./node_modules/.bin/eslint tests/unit/support/rma-workflow-trace-contract.test.ts
git diff --check
```

Broader if the slice touches code:

```bash
./node_modules/.bin/vitest run tests/unit/support
env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit
```

## Closeout Template

```text
Touched domains:
Workflow protected:
Business value:
Standards checked:
Smells removed:
Deferred:
Verification:
Goal adaptation:
Residual risk:
```

## Sprint Rule

Do not implement any issue until the slice has:

1. a business value statement,
2. a workflow invariant,
3. affected files,
4. explicit out-of-scope boundaries,
5. focused tests,
6. closeout criteria.

## Closeout Log

### Issue 1: RMA Trace Reality And Permission Contract

Touched domains: RMA create trace, RMA process/remedy trace, RMA update trace, RMA workflow contract tests.

Workflow protected: order/support context -> `createRma` with support-create permission -> RMA receive with inventory receive permission -> `processRma` with support-update permission -> local remedy artifact execution -> RMA execution state.

Business value: maintainers can trust the RMA traces before changing support recovery behavior; the docs now reflect that creation and processing are permissioned and that processing executes local refund, credit, or replacement artifacts instead of merely writing labels.

Standards checked:

- refreshed `docs/code-traces/14-rma-create.md` to show `PERMISSIONS.support.create`
- refreshed `docs/code-traces/15-rma-process-resolution.md` to show `PERMISSIONS.support.update` and `executeRmaRemedy`
- refreshed `docs/code-traces/18-rma-field-update.md` to show `PERMISSIONS.support.update`
- added a source/trace guard for RMA workflow permission and remedy execution ownership
- left `updateRma` dual field ownership as Issue 2 instead of mixing behavior changes into a trace slice

Smells removed:

- stale bare-auth claims in RMA create/process/update traces
- stale metadata-only remedy closeout claim in the RMA process trace
- stale process trace implying refund, credit, and replacement side effects did not happen locally

Deferred:

- future direct `updateRma` callers still need to use `receiveRma` or `processRma` for workflow-owned fields
- DB-backed bulk approval mixed-status coverage remains deferred to Issue 3/approval follow-up
- database-backed process integration by resolution type remains future coverage

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-workflow-trace-contract.test.ts`
- `./node_modules/.bin/eslint tests/unit/support/rma-workflow-trace-contract.test.ts`
- `git diff --check`

Goal adaptation: no goal change; this starts the Support/RMA/Warranty sprint with a trace-first contract correction before behavior changes.

Residual risk: this slice makes maintainer evidence match current code, but it does not prove remedy execution correctness against a real database. Issue 2 settles the `updateRma` field-boundary problem separately.

### Issue 2: RMA Field Update Boundary

Touched domains: RMA support schema, RMA update trace, RMA workflow trace guard, RMA mutation contract tests.

Workflow protected: general RMA header patch -> strict `updateRmaSchema` -> `updateRma` support-update permission -> RMA detail/list cache refresh, with inspection state reserved for `receiveRma` and remedy resolution reserved for `processRma`.

Business value: operators and future maintainers no longer have two write paths for receipt inspection or remedy closeout state, reducing the chance that support recovery appears complete without the receipt/remedy workflow actually running.

Standards checked:

- made `updateRmaSchema` strict for general header fields only
- documented workflow-owned update fields in `rmaWorkflowOwnedUpdateFieldValues`
- rejected `inspectionNotes`, `resolution`, `resolutionDetails`, and `status` on general RMA updates
- refreshed `docs/code-traces/18-rma-field-update.md` from drift warning to current contract
- updated the RMA trace guard to keep update trace/schema ownership aligned
- left status transitions, RMA line items, and remedy execution behavior unchanged

Smells removed:

- `updateRma` could previously mutate receipt inspection in parallel with `receiveRma`
- `updateRma` could previously mutate remedy resolution details in parallel with `processRma`
- the field update trace still described this dual-path drift as unresolved

Deferred:

- optimistic locking for concurrent RMA header edits
- migration guidance if future direct `updateRma` callers need inspection or remedy state edits
- database-backed remedy execution coverage by resolution type remains Issue 4

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-field-update-boundary.test.ts tests/unit/support/rma-workflow-trace-contract.test.ts tests/unit/support/use-rma-mutations.test.tsx`
- `./node_modules/.bin/eslint src/lib/schemas/support/rma.ts tests/unit/support/rma-field-update-boundary.test.ts tests/unit/support/rma-workflow-trace-contract.test.ts`
- `git diff --check`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this followed the support sprint rule by closing a small field-boundary smell before broader RMA approval/remedy work.

Residual risk: the schema now protects workflow ownership, but it does not add optimistic locking or prove every future caller chooses the right workflow RPC for inspection and remedy edits.

### Issue 3: RMA Bulk Approval Permission Parity

Touched domains: RMA approval server functions, RMA approval trace, code-trace index, RMA approval permission tests.

Workflow protected: RMA list selection or single detail action -> approval hook -> `approveRma` / `bulkApproveRma` -> support-update permission -> requested-to-approved transition -> RMA list/detail cache refresh.

Business value: bulk operators can no longer approve RMAs with weaker authority than single-RMA approval, which protects support recovery decisions from bypassing role policy when operators work at list scale.

Standards checked:

- aligned `bulkApproveRma` with `approveRma` on `PERMISSIONS.support.update`
- added `docs/code-traces/21-rma-approval-workflow.md` covering single and bulk approval trust boundary, sequence, contracts, persistence, cache policy, and drift
- updated `docs/code-traces/README.md` so the new trace is discoverable
- added a guard that checks single and bulk approval permission parity against the server source
- guarded the approval trace permission/cache contract
- left approval policy, role definitions, receive/process behavior, and bulk-list UI unchanged

Smells removed:

- `bulkApproveRma` previously used bare `withAuth()` while `approveRma` required `PERMISSIONS.support.update`
- RMA approval workflow lacked an explicit trace despite being a state transition that unlocks inventory receipt

Deferred:

- DB-backed integration for mixed requested/non-requested bulk approval batches
- possible order-detail cache invalidation for bulk approval if order detail surfaces approval state
- broader role-policy review across other support bulk actions

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-approval-permission-contract.test.ts tests/unit/support/rma-workflow-trace-contract.test.ts tests/unit/support/use-rma-mutations.test.tsx`
- `./node_modules/.bin/eslint src/server/functions/orders/rma.ts tests/unit/support/rma-approval-permission-contract.test.ts`
- `git diff --check`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this is a small support workflow permission-parity slice under the existing sprint.

Residual risk: permission parity is guarded, but there is still no DB-backed mixed-batch integration test and bulk approval still uses broad RMA detail invalidation rather than exact updated-id cache updates.

### Issue 4: Remedy Execution Evidence

Touched domains: RMA remedy process trace, remedy process schema, RMA execution state helpers, RMA execution read-model projection tests.

Workflow protected: RMA received state -> `processRmaSchema` resolution-specific payload -> `processRma` support-update permission -> transactional `executeRmaRemedy` -> completed artifact link or blocked received-state execution.

Business value: operators can distinguish real remedy execution from labels. Refund, credit, and replacement paths require the evidence needed to create local artifacts, while repair/no-action stay explicit no-artifact closeouts and blocked execution does not invent artifact truth.

Standards checked:

- refreshed `docs/code-traces/15-rma-process-resolution.md` with resolution-specific artifact evidence and canonical artifact-link ownership
- added a guard for refund, credit, and replacement schema requirements
- added a guard that repair and no-action remain explicit no-artifact remedies
- added a guard that completed execution state projects artifact links through `buildRmaExecutionSummary`
- added a guard that blocked execution keeps the RMA in `received` with no artifact IDs
- left external payment/accounting sync and DB-backed artifact creation behavior unchanged

Smells removed:

- remedy evidence was spread across dialog/read-model/state tests without a single contract test tying resolution payloads to artifact truth
- process trace did not explicitly state that artifact IDs on the RMA row are canonical proof of execution

Deferred:

- DB-backed process integration per resolution type
- blocked execution UI coverage beyond current dialog/state helpers
- external payment/accounting settlement visibility for locally created refund/credit artifacts

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-remedy-execution-evidence.test.ts tests/unit/support/rma-execution-state.test.ts tests/unit/support/rma-read-model.test.ts tests/unit/support/rma-execute-remedy-dialog.test.tsx tests/unit/support/rma-workflow-trace-contract.test.ts`
- `./node_modules/.bin/eslint tests/unit/support/rma-remedy-execution-evidence.test.ts`
- `git diff --check`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no goal change; this closes the support sprint's trace/evidence remedy slice while leaving database integration as explicit residual risk.

Residual risk: this proves schema/state/read-model contracts without a real database; refund, credit, and replacement artifact creation still need DB-backed integration coverage before treating remedy execution as fully protected.

### Issue 5: RMA Remedy Artifact Transaction Contract

Touched domains: support/RMA remedy execution, order payments/refunds, financial credit notes, replacement order drafts, RMA execution evidence tests.

Workflow protected: received RMA -> `processRma` -> transaction-scoped `executeRmaRemedy` -> refund/credit/replacement artifact branch -> canonical artifact ID returned to completed RMA execution state -> read model can project artifact truth.

Business value: maintainers now have focused evidence that artifact-producing remedies return real local artifact links from the remedy execution path. Refunds, credits, and replacements are less likely to regress into labels that mark an RMA processed without durable artifact evidence.

Standards checked:

- added a focused mocked-transaction test for refund remedy artifact creation and canonical `refundPaymentId`
- added an over-refund guard proving blocked refund setup does not insert fake artifact truth
- added a focused mocked-transaction test for credit note creation, applied-credit payment-status refresh, and canonical `creditNoteId`
- added a focused mocked-transaction test for zero-priced replacement draft/line creation, search outbox enqueue, and canonical `replacementOrderId`
- kept `executeRmaRemedy`, `processRma`, server schemas, database tables, and UI behavior unchanged

Smells removed:

- artifact-producing remedy execution had schema/read-model guards but no focused test that the transaction branch returns canonical artifact IDs after creating local artifacts
- replacement remedy behavior lacked a focused guard that replacement orders stay zero-priced drafts with returned RMA line items
- over-refund blocking relied on lower-level payment tests rather than direct RMA remedy artifact-path evidence

Deferred:

- true DB-backed process integration per resolution type remains deferred because the repo currently has only unit/mocked transaction patterns, not a dedicated integration harness
- external payment/accounting settlement visibility remains outside the local artifact contract
- support issue closeout UI coverage around blocked remedy execution remains a future operator-surface hardening slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/rma-remedy-execution-transaction.test.ts`
- `./node_modules/.bin/eslint tests/unit/support/rma-remedy-execution-transaction.test.ts`
- `./node_modules/.bin/vitest run tests/unit/support`
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`

Goal adaptation: no standing goal change. This follows the support sprint posture by hardening the RMA remedy closeout contract without widening behavior.

Residual risk: the new evidence is stronger than pure schema/source guards but still not a real database integration test. A future sprint should introduce or reuse a DB-backed harness before claiming full remedy execution protection across refund, credit, and replacement side effects.

## Sprint Closeout Audit

Completion audit:

- Objective: make support/RMA/warranty recovery workflows more trustworthy by aligning stale maintainer traces with live code, clarifying RMA field ownership, enforcing approval permission parity, and strengthening remedy execution evidence for refund, credit, replacement, repair, no-action, and blocked states.
- Deliverables checked: issue ledger, issue closeout logs, RMA code traces, source/trace guards, schema/state/read-model tests, transaction-boundary artifact tests, support unit suite evidence, typecheck evidence, and residual-risk notes.
- Evidence inspected: `src/server/functions/orders/rma.ts`, `src/server/functions/orders/_shared/rma-remedy-execution.ts`, `src/server/functions/orders/_shared/rma-execution-state.ts`, `src/server/functions/orders/_shared/rma-read-model.ts`, `src/lib/schemas/support/rma.ts`, `docs/code-traces/14-rma-create.md`, `docs/code-traces/15-rma-process-resolution.md`, `docs/code-traces/18-rma-field-update.md`, `docs/code-traces/21-rma-approval-workflow.md`, and the support tests listed in each issue.

Touched domains: support/RMA workflow ownership, RMA traces, RMA permissions, RMA update schema, RMA approval, remedy execution state, order refunds, financial credit notes, replacement order drafts, RMA read-model artifact projection.

Workflow protected: support/order/warranty context -> RMA creation or approval -> RMA receive -> dedicated remedy execution -> local refund, credit, replacement, repair, no-action, or blocked state -> RMA execution summary and artifact projection.

Business value protected: operators and maintainers can better trust that support recovery state means what it says. RMA creation/update/process/approval permission posture is documented and guarded, workflow-owned fields cannot be patched through the generic update path, bulk approval no longer weakens authority, and processed remedy state is tied to canonical local artifact evidence.

Architecture standards checked:

- domain ownership: support/RMA owns receipt, approval, and remedy workflow contracts while order/finance artifacts remain explicit adjacent-domain side effects
- route/container boundary: UI route behavior was not changed; this sprint hardened server/schema/read-model/test contracts under existing surfaces
- hook boundary: existing RMA mutation hooks stayed compatible while server/source contracts were guarded
- server function boundary: `createRma`, `updateRma`, `approveRma`, `bulkApproveRma`, and `processRma` permission and workflow responsibilities are now trace-guarded
- schema/database boundary: generic RMA update schema rejects receipt/remedy-owned fields; remedy artifact IDs on the RMA row remain canonical execution truth
- query/cache contract: existing RMA mutation invalidation was not widened; bulk approval exact-cache identity remains a deferred cache precision question
- tenant isolation: changed server behavior retained existing organization-scoped queries and authenticated permission checks
- inventory/finance integrity: receive inventory behavior was not changed; refund, credit, and replacement side effects now have stronger local artifact contract evidence
- UI honesty: blocked remedy execution keeps the RMA received with no fake artifact IDs, and completed execution summaries project only persisted artifact links

Smells removed:

- stale RMA traces claimed bare auth and metadata-only processing despite stronger live code
- `updateRma` could mutate workflow-owned inspection and remedy fields in parallel with receipt/process workflows
- bulk RMA approval previously had weaker permission posture than single approval
- remedy evidence was spread across schema, dialog, read-model, and state helpers without focused artifact contract evidence
- replacement remedy behavior lacked a focused guard for zero-priced draft order creation from returned lines

Smells deferred:

- no real DB-backed process integration harness exists for refund, credit, replacement, repair, no-action, blocked, or mixed bulk approval states
- external payment/accounting settlement visibility remains outside the local artifact contract
- optimistic locking for concurrent RMA header edits remains deferred
- support issue closeout UI around blocked or completed remedy state needs future operator-surface QA
- bulk approval still uses broad invalidation where exact updated-id cache updates may be possible

Verification:

- Issue 1 focused trace contract tests, lint, and diff check recorded above
- Issue 2 focused field-boundary, trace, mutation-hook tests, lint, diff check, and typecheck recorded above
- Issue 3 focused approval permission, trace, mutation-hook tests, lint, diff check, and typecheck recorded above
- Issue 4 focused remedy evidence, execution state, read-model, dialog, trace tests, lint, diff check, and typecheck recorded above
- Issue 5 focused transaction-boundary test, lint, full support suite, and typecheck recorded above

Gates skipped: browser QA was skipped because this sprint hardened support/RMA server, schema, trace, read-model, and transaction-boundary contracts without changing UI behavior. True DB-backed integration coverage was not added because the repo currently uses unit/mocked transaction patterns and does not have a dedicated integration harness.

Goal adaptations made or declined: no standing goal change. This sprint confirms support/RMA/warranty is a high-stakes recovery domain where artifact truth, workflow-owned fields, permission parity, and trace freshness need the same maintainer discipline as fulfillment and inventory.

Residual risk: Support Sprint 1 is closed as a trace/schema/contract hardening sprint, not as complete support recovery certification. The next support sprint should either introduce DB-backed RMA remedy integration evidence or move to operator-facing blocked/completed remedy UX, depending on whether infrastructure or user friction is the larger constraint at that point.
