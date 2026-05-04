# Maintainer Sprint 1: Support, RMA, and Warranty Ownership

This sprint applies the maintainer process from `docs/reference/maintainer-sprint-process.md` to support-owned issue, RMA, warranty, and remedy workflows.

Status: triaged; no implementation slices closed yet.

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
- `docs/inventory/MAINTAINER-SPRINT-1.md`: closed inventory/RMA return-to-stock evidence and deferred support risks.

## Triage Findings

### What Is Solid

- RMA create now uses `PERMISSIONS.support.create` in live code.
- RMA update and process now use `PERMISSIONS.support.update` in live code.
- RMA receive uses `PERMISSIONS.inventory.receive` and the location contract is already trace guarded.
- `processRma` now routes through `executeRmaRemedy` inside a transaction instead of merely storing metadata.
- Existing tests cover RMA receive location selection, RMA receive dialog interaction, mutation invalidation, remedy execution dialog affordances, read-model shaping, support query normalization, issue anchors, and RMA execution state.

### What Is Fragile

- RMA traces 14, 15, and 18 still describe old bare-auth and metadata-only behavior.
- `updateRmaSchema` still allows `inspectionNotes`, `resolution`, and `resolutionDetails`, creating two write paths beside `receiveRma` and `processRma`.
- Bulk approve still needs permission posture revalidation against single approve.
- Remedy execution has high business stakes and spans support, orders, finance, inventory, and replacement workflows.
- Warranty, issue, and RMA read paths are broad enough that stale traces can mislead future maintainers.

### What Needs Revalidation

- Whether `bulkApproveRma` should require the same `PERMISSIONS.support.update` contract as `approveRma`.
- Whether `updateRma` should stop accepting `inspectionNotes`, `resolution`, and `resolutionDetails` once dedicated workflow RPCs own those fields.
- Whether traces 14/15/18 match current server behavior, mutation envelopes, cache invalidation, and remedy side effects.
- Whether process-remedy execution has enough tests for refund, credit, replacement, repair, and blocked states.
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
- `bulkApproveRma` needs revalidation in live code and trace coverage.

Proposed slice:

> Verify and align bulk approve permission posture with single approve, then guard it.

Out of scope:

- changing approval policy or role definitions
- redesigning bulk RMA list UI

### 4. Remedy Execution Evidence

Business value: refunds, credits, replacements, repairs, and no-action closeout must be honest operational states, not labels that imply side effects which did not happen.

Evidence:

- `processRma` calls `executeRmaRemedy`.
- Tests exist for remedy dialog affordances and RMA execution state, but trace coverage is stale.
- Remedy execution touches support, orders, finance, replacement, and issue state.

Proposed slice:

> Map process-remedy execution by resolution type and identify the smallest missing test for blocked or side-effectful remedy state.

Out of scope:

- adding new remedy types
- integrating external payment/accounting providers beyond existing code

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
