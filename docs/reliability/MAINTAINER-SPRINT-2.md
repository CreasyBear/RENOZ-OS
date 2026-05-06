# Reliability Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Bulk Action Default Failure Messages Were Unsafe

### Problem

`executeBulkAction` supports domain-owned `formatError` callbacks, and current products, suppliers, and communications callers use them. The shared helper still defaulted to raw rejected `Error.message` when a caller omitted `formatError`. That made future bulk workflows easy to ship with database, constraint, stack, or runtime text inside row-level failure summaries.

### Workflow Spine

Bulk action caller
-> `executeBulkAction`
-> per-row mutation
-> rejected row result
-> failure summary
-> operator toast.

### Touched Domains

- Shared bulk action result helper.
- Products, suppliers, and communications bulk-action source contract.
- Reliability maintainer closeout docs.

### Business Value Protected

Bulk operations are high-leverage operator workflows across campaigns, products, suppliers, and future operational tables. A safe default keeps one missing formatter from turning a batch failure summary into leaked implementation detail.

### Scope Constraints

- Do not change current domain formatters, caller behavior, result shape, summary formatting, selected-row behavior, mutation hooks, query invalidation, server functions, schemas, or database writes.
- Preserve caller-provided `formatError` as the preferred domain-specific contract.

### Changes

- Added `BULK_ACTION_FAILURE_MESSAGE`.
- Added `formatBulkActionFailureMessage` for helper-owned fallback copy.
- Reused the shared unsafe mutation-message detector for default bulk failure messages.
- Changed `executeBulkAction` to use the safe default formatter only when the caller does not provide `formatError`.
- Added focused coverage for unsafe default suppression, safe validation-style messages, summarized fallback output, and caller formatter precedence.

### Standards Checked

- Domain ownership: caller-owned formatters remain the primary contract; the shared helper now owns only its fallback.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is a client-side result helper used after existing mutations settle.
- Tenant isolation/data integrity: unchanged; no server/database behavior changed.
- Query/cache contract: unchanged; current callers keep their existing invalidation behavior.
- Honest UI states/operator-safe errors: improved; unformatted bulk failures no longer expose unsafe raw rejection text.
- Reviewability: bounded diff across one shared helper, one focused test file, and this closeout.

### Smells Removed

- Raw `result.reason.message` fallback inside `executeBulkAction`.
- `"Unknown error"` fallback copy that did not tell operators what to do next.
- Missing direct tests for the shared bulk action default failure path.

### Deferred

- Existing domain callers should continue using domain-specific `formatError`; this helper fallback is a guardrail, not a replacement for domain copy.
- Browser QA remains deferred because this changes fallback message formatting only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/lib/bulk-action-results.test.ts tests/unit/communications/communications-mutation-errors.test.ts tests/unit/suppliers/supplier-mutation-errors.test.ts tests/unit/products/product-page-action-errors.test.ts` (4 files, 22 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw default failure handling, safe fallback copy, and preserved caller `formatError` usage.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, operator-safe errors, meaningful tests, risk-selected evidence, and reviewable diffs.

### Residual Risk

Low for default bulk failure safety. Moderate for domain-specific copy quality in future callers because the shared fallback is intentionally generic.
