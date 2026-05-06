# Customers Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Duplicate Dismissal Feedback and Tenant Guard

### Problem

Duplicate dismissal is live in `DuplicatesContainer`. The container surfaced raw mutation failures to operators, and the server function wrote a dismissal audit row without first proving both customer IDs belonged to the current organization and were active customers. That combined an operator-safe feedback smell with a tenant/data-integrity gap in a customer audit workflow.

### Workflow Spine

Customers duplicates route
-> `DuplicatesContainer`
-> `DuplicateDetection`
-> `useDismissDuplicate`
-> `dismissDuplicatePair`
-> tenant-scoped customer pair validation
-> `customerMergeAudit` dismissal audit write
-> duplicate query invalidation
-> operator-safe dismissal failure toast.

### Touched Domains

- Customer duplicate dismissal container.
- Customer duplicate scan server function.
- Customer mutation feedback tests.
- Customer maintainer closeout docs.

### Business Value Protected

Duplicate dismissal keeps the customer list clean without merging distinct accounts. The audit trail must not record arbitrary or cross-tenant customer IDs, and operators should get safe recovery copy when a dismissal fails.

### Scope Constraints

- Do not change duplicate scan SQL, match scoring, merge history reads, duplicate query keys, invalidation, success copy, merge navigation, undo messaging, or presenter behavior.
- Preserve the dismissal audit write, but gate it behind current-tenant active-customer validation.
- Keep this as duplicate dismissal integrity and feedback only; do not implement merge wizard or undo recovery.
- Serialized gates are retired from routine closeout evidence; do not run them for this customer slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added duplicate dismissal validation that rejects identical customer IDs.
- Added tenant-scoped active-customer lookup for both dismissed customer IDs before writing `customerMergeAudit`.
- Added a `NotFoundError` when either customer cannot be resolved inside the current organization.
- Routed duplicate dismissal failure toasts through `formatCustomerMutationError`.
- Added source coverage for sanitized duplicate dismissal feedback and tenant-scoped audit-write preconditions.

### Standards Checked

- Domain ownership: duplicate dismissal feedback uses the customer mutation formatter; duplicate dismissal integrity remains in the customer duplicate scan server function.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint changes dismissal validation and failure copy while leaving scan/read/cache behavior unchanged.
- Query/cache policy: `useDismissDuplicate` still invalidates `queryKeys.customers.duplicates.all()` on success.
- Tenant isolation/data integrity: strengthened. The server now checks both customer IDs against `customers.organizationId = ctx.organizationId` and `deletedAt IS NULL` before inserting the dismissal audit row.
- UI states/error handling: unsafe raw dismissal messages are suppressed; domain fallback copy is used for dismissal failures.
- Reviewability: the diff is limited to one server precondition, one container catch block, focused tests, and this closeout note.

### Smells Removed

- Raw duplicate dismissal `error.message` toast.
- Dismissal audit writes that accepted unverified customer IDs.
- Missing same-customer validation for duplicate dismissal.
- Missing regression coverage for dismissal tenant preconditions and feedback wiring.

### Deferred

- Duplicate merge wizard routing still opens the first customer detail and remains a product workflow gap.
- Undo merge recovery remains intentionally unavailable with explanatory copy.
- Rollback, communications, and export feedback still have separate operator-feedback debt.
- Browser QA remains deferred because no route layout or interaction structure changed.

### Gates

- Passed: focused customer mutation feedback/integrity test, `./node_modules/.bin/vitest run tests/unit/customers/customer-mutation-errors.test.ts` - 1 file, 7 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 46 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for duplicate dismissal formatter wiring, removed raw duplicate dismissal toast fallback, and tenant-scoped active-customer validation before audit insertion.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy and server-precondition behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or repair scripts.
- Skipped: serialized gates because they are retired from routine closeout evidence and this slice did not touch serialized lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, operator-safe errors, mutation/cache contracts, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for duplicate dismissal integrity and feedback. Duplicate merge/undo workflows still need product ownership; the next customer slice should target rollback, communications, or export feedback debt.
