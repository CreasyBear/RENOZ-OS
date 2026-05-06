# Pipeline Maintainer Sprint 50

## Status

Closed in commit-ready state.

## Issue 1: Quote PDF Opportunity Update Lacked Evidence

### Problem

After Sprint 49, quote PDF generation had safe storage/signing failures and signed URL evidence before persistence. The final opportunity update still wrote `quotePdfUrl` without returned-row evidence, and the activity log was started before that update was known to have succeeded.

### Workflow Spine

Generate quote PDF
-> quote mutation hook
-> quote PDF server module
-> tenant-scoped quote/opportunity/customer/address reads
-> PDF render
-> storage upload
-> signed URL evidence check
-> generated document upsert
-> tenant-scoped opportunity PDF URL update with returned-row evidence
-> activity log after attachment evidence
-> document and quote cache invalidation unchanged.

### Touched Domains

- Pipeline quote PDF generation server workflow.
- Pipeline quote PDF source contract.
- Pipeline quote mutation feedback contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote PDFs are customer-facing sales documents. Operators should not see a generated-document/activity trail that implies a quote PDF was attached to an opportunity unless the opportunity record actually accepted the PDF URL update under the current tenant.

### Scope Constraints

- Do not change quote PDF inputs, PDF layout, storage path generation, filename generation, checksum calculation, generated document conflict target, quote mutation cache invalidation, quote send orchestration, UI copy, or storage/signing error copy.
- Keep this as final persistence evidence hardening inside the existing quote PDF owner.

### Changes

- Added returned-row evidence to the tenant-scoped opportunity `quotePdfUrl` update.
- Throw `NotFoundError` if the opportunity update no longer matches the current tenant/opportunity.
- Moved quote PDF activity logging after opportunity attachment evidence.
- Extended the quote PDF source contract to protect update evidence and activity-log ordering.

### Standards Checked

- Domain ownership: quote PDF generation remains in the focused quote PDF server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hooks and cache invalidation stayed unchanged; server persistence evidence improved.
- Tenant isolation/data integrity: opportunity PDF URL update remains tenant scoped and now proves that the row was updated before returning success.
- Query/cache contract: unchanged; quote PDF mutations still invalidate document, pipeline, and quote-version caches through centralized query keys.
- Honest UI states/operator-safe errors: a missing opportunity during the final update fails through existing `NotFoundError` semantics instead of silently returning a successful PDF attachment.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Quote PDF opportunity URL update trusted without returned-row evidence.
- Quote PDF activity log fired before opportunity attachment evidence.

### Deferred

- Generated document upsert still trusts returned `regenerationCount` fallback for activity text; deferred because the upsert conflict path already returns optional evidence and the business-critical attachment write is now explicit.
- External storage and database persistence still do not have compensating cleanup across failure boundaries; deferred to a broader document-generation reliability slice.
- Browser QA remains deferred because this source-covered slice changes server-side persistence ordering only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-pdf-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote PDF update evidence, activity-log ordering, tenant predicates, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, operator-safe errors, safe mutation/cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for quote PDF opportunity attachment evidence. Moderate for deeper PDF persistence atomicity because storage upload and generated-document upsert can still succeed before a later database failure without an automatic cleanup/repair workflow.
