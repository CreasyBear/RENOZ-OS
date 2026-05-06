# Pipeline Maintainer Sprint 13

## Status

Closed in commit-ready state.

## Issue 1: Bulk Operations Dialog Duplicated Parent Mutation Feedback

### Problem

`OpportunityBulkOperationsDialog` caught `onConfirm` failures and displayed raw thrown error messages. The parent list container already owns bulk-stage mutation feedback, so the dialog could duplicate toasts and leak implementation-shaped errors thrown by the parent. The corresponding order bulk dialog already uses the cleaner pattern: parent owns user-facing errors, dialog stays open for retry.

### Workflow Spine

Opportunities list
-> bulk operations dialog
-> parent `onConfirm`
-> bulk stage mutation hook
-> opportunity server function
-> parent-owned operator-safe toast feedback.

### Touched Domains

- Pipeline opportunity bulk operations dialog feedback ownership.
- Pipeline opportunity feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Bulk stage changes should fail once, with one safe message owned by the mutation container. Duplicate or raw dialog toasts make high-volume sales updates harder to trust and retry.

### Scope Constraints

- Do not change dialog layout, selected-stage behavior, parent mutation payloads, server functions, schemas, database predicates, query keys, cache invalidation, or parent success/failure copy.
- Keep this as dialog feedback ownership only. Activity feedback and read-state copy remain separate slices.

### Changes

- Removed dialog-level raw mutation error toast.
- Converted invalid-stage fallback from a thrown error to inline `stageError` state.
- Kept the catch block to leave the dialog open while parent-owned feedback handles mutation failures.
- Extended the opportunity mutation feedback contract to assert the dialog no longer imports or calls `toastError`.

### Standards Checked

- Domain ownership: bulk mutation feedback remains in the parent list container, where the mutation hook is invoked.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked list container -> bulk dialog -> parent `onConfirm` -> bulk-stage mutation hook; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; mutation invalidation stayed in the existing hook.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved by removing duplicate/raw dialog toasts and keeping inline validation for invalid stage selection.
- Reviewability: bounded diff across one dialog, one focused test, and this closeout.

### Smells Removed

- Raw thrown bulk operation error toast in the dialog.
- Duplicate feedback ownership between parent list container and child dialog.
- Throw-based invalid-stage validation inside the dialog confirm flow.

### Deferred

- Activity logging/follow-up feedback and documents/read-state copy remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes feedback ownership and validation handling, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe errors, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for bulk operation feedback ownership. Remaining Pipeline feedback risk is mostly activity/follow-up actions and read-state copy, which should be handled in separate bounded slices.
