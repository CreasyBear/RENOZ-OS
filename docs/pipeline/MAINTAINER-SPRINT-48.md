# Pipeline Maintainer Sprint 48

## Status

Closed in commit-ready state.

## Issue 1: Quote Create Opportunity Read Was Outside The Transaction

### Problem

After Sprint 47, `quote-versions.tsx` owned only quote creation. The create workflow still read the opportunity before opening the transaction, then used that pre-read probability inside the transaction while creating the quote version and updating opportunity value. It also trusted the quote version insert returned a row.

### Workflow Spine

Create quote version
-> quote mutation hook
-> quote create server module
-> quote totals calculation
-> transaction-scoped opportunity read
-> tenant-scoped next-version calculation
-> quote version insert with returned-row evidence
-> tenant-scoped opportunity value update with returned-row evidence
-> quote version/opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline quote version create server workflow.
- Pipeline quote write source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Creating a quote version changes opportunity commercial value and weighted pipeline value. Keeping the opportunity read, version allocation, quote insert, and opportunity update inside one transaction makes the quote create workflow easier to trust and audit.

### Scope Constraints

- Do not change create inputs, totals math, version numbering behavior, inserted quote version shape, opportunity value semantics, mutation hooks, query keys, cache invalidation, UI behavior, restore behavior, PDF generation, or send behavior.
- Keep this as transactional create hardening inside the existing quote create owner.

### Changes

- Moved the create opportunity lookup into the existing quote create transaction.
- Added returned-row evidence for the quote version insert.
- Preserved Sprint 46 tenant predicates and opportunity update returned-row evidence.
- Extended the quote write source contract to protect quote version insert evidence.

### Standards Checked

- Domain ownership: quote creation remains in the focused quote create server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hooks and cache invalidation stayed unchanged; server transaction boundary improved.
- Tenant isolation/data integrity: opportunity read, version-number query, quote insert, and opportunity value update now occur inside the same transaction with explicit organization predicates where applicable.
- Query/cache contract: unchanged; create still invalidates quote versions, opportunity detail, and opportunity lists through centralized helpers.
- Honest UI states/operator-safe errors: unchanged at the UI layer; missing opportunity still uses `NotFoundError`, and missing insert evidence fails with a generic server error.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Pre-transaction opportunity read feeding transaction-scoped commercial value update.
- Quote version insert trusted without returned-row evidence.

### Deferred

- `quote-versions.tsx` file naming remains historical; renaming is deferred because compatibility/import churn would not improve the create workflow itself.
- Browser QA remains deferred because this source-covered slice changes server-side transaction structure only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-write-contract.test.ts tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` (3 files, 9 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote create transaction boundary, tenant predicates, returned-row evidence, and quote cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Made. Sprint closeout evidence now omits the closed serialized gate pack for this non-serial pipeline slice instead of treating it as a standing skipped gate. The standing objective still applies: transaction integrity, tenant isolation, safe mutation contracts, cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for quote create transaction evidence. Moderate for deeper version-number concurrency guarantees because this sprint preserves existing allocation semantics rather than introducing a database uniqueness constraint or retry strategy.
