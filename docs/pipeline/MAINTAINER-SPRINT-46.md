# Pipeline Maintainer Sprint 46

## Status

Closed in commit-ready state.

## Issue 1: Quote Version Write Transactions Had Weak Tenant Evidence

### Problem

After Sprint 45, `quote-versions.tsx` was reduced to quote create and restore writes. Those transactions still had two weak spots: next-version-number queries filtered only by opportunity id, and opportunity value updates filtered only by opportunity id without returned-row evidence. The surrounding reads were tenant scoped, but the writes themselves should carry the tenant invariant.

### Workflow Spine

Quote create/restore
-> quote mutation hook
-> quote version write server module
-> tenant-scoped opportunity/source-version reads
-> tenant-scoped next-version calculation
-> quote version insert
-> tenant-scoped opportunity value update with returned-row evidence
-> quote version/opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline quote version create and restore server workflows.
- Pipeline quote write source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote create and restore update opportunity commercial value. Those writes affect pipeline value, weighted value, follow-up decisions, and customer quote revision history, so tenant scope and update evidence need to be explicit at the write boundary.

### Scope Constraints

- Do not change quote create inputs, restore inputs, totals math, version numbering behavior, inserted quote version shape, opportunity value semantics, mutation hooks, query keys, cache invalidation, UI behavior, PDF generation, or send behavior.
- Keep this as write-contract hardening inside the existing quote version write owner.
- Serialized gates remain retired infrastructure for this unrelated pipeline quote write slice.

### Changes

- Added organization predicates to create and restore next-version-number queries.
- Added organization predicates to create and restore opportunity value updates.
- Added returned-row evidence to both opportunity value updates and fail with `NotFoundError` if the expected row is not updated.
- Added a source contract covering tenant-scoped version numbering and opportunity update evidence.

### Standards Checked

- Domain ownership: quote create and restore remain in the focused quote version write server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hooks and cache invalidation stayed unchanged; write contracts improved.
- Tenant isolation/data integrity: next-version queries and opportunity value updates now carry explicit organization predicates inside the transaction.
- Query/cache contract: unchanged; create/restore still invalidate quote versions and opportunity detail through the centralized helper.
- Honest UI states/operator-safe errors: unchanged at the UI layer; unexpected missing update evidence fails with the existing domain `NotFoundError`.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Next-version-number queries relying only on opportunity id.
- Opportunity value updates relying only on opportunity id.
- Opportunity update writes without returned-row evidence inside create/restore transactions.

### Deferred

- `quote-versions.tsx` still combines create and restore writes; split only if a future behavior slice needs separate write ownership.
- Browser QA remains deferred because this source-covered slice changes server-side write predicates only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-write-contract.test.ts tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 3 files, 8 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote write tenant predicates and returned-row evidence.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and current process already cover tenant isolation, safe mutation contracts, cache contracts, meaningful tests, retired routine serialized gates, and reviewable diffs.

### Residual Risk

Low for quote create/restore tenant predicates and opportunity update evidence. Moderate for deeper quote write concurrency guarantees because this sprint preserves existing version-number allocation semantics rather than introducing locking or database constraints.
