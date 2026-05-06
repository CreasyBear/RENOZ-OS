# Pipeline Maintainer Sprint 47

## Status

Closed in commit-ready state.

## Issue 1: Quote Restore Lived With Quote Create

### Problem

After Sprint 46, `quote-versions.tsx` was a compact write module, but it still owned both quote creation and quote restoration. Restore is a distinct commercial workflow: it copies a previous immutable version, validates same-opportunity ownership, writes a new version, and updates opportunity value from the restored source.

### Workflow Spine

Restore quote version
-> quote mutation hook
-> quote restore server module
-> tenant-scoped source-version and opportunity reads
-> tenant-scoped next-version calculation
-> quote version insert from source version
-> tenant-scoped opportunity value update with returned-row evidence
-> quote version/opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline quote version restore server workflow.
- Pipeline quote version create server module.
- Pipeline quote mutation hooks and tests.
- Pipeline quote write source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators restore older quote revisions when commercial terms need to roll back or branch from prior work. Giving restore its own server owner makes that audit path easier to reason about without reading quote creation math.

### Scope Constraints

- Do not change restore inputs, restore result shape, restoration notes, source-version validation, next-version behavior, inserted quote version shape, opportunity value semantics, mutation hooks, query keys, cache invalidation, UI behavior, create behavior, PDF generation, or send behavior.
- Keep this as server ownership extraction only; tenant hardening from Sprint 46 is preserved.
- Serialized gates remain retired infrastructure for this unrelated pipeline quote write slice.

### Changes

- Added `quote-version-restore.ts` as the server owner for `restoreQuoteVersion`.
- Removed restore schema, validation, and source-version restore logic from `quote-versions.tsx`.
- Updated `use-quote-mutations.ts` and mutation test mocks to import restore from the focused module.
- Updated the quote write source contract to protect create/restore ownership and tenant-scoped write evidence in both modules.

### Standards Checked

- Domain ownership: quote creation and quote restoration now have separate write owners.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hook behavior and cache invalidation stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: Sprint 46 tenant predicates and returned-row evidence are preserved in the restore module.
- Query/cache contract: unchanged; restore still invalidates quote versions and opportunity detail through the centralized helper.
- Honest UI states/operator-safe errors: unchanged.
- Reviewability: bounded diff across one new restore server module, one hook import, one source contract update, and this closeout.

### Smells Removed

- Restore source-version validation and copy logic embedded in create ownership.
- Create module importing restore schema and `ValidationError`.
- Mutation hook importing restore from the create module.

### Deferred

- `quote-versions.tsx` still owns quote creation and quote total helpers. Rename or further extraction is deferred unless a future create-specific slice needs it.
- Browser QA remains deferred because this source-covered slice changes server ownership only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-write-contract.test.ts tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 3 files, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote restore ownership and tenant predicates.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and current process already cover domain ownership, tenant isolation, safe mutation contracts, cache contracts, meaningful tests, retired routine serialized gates, and reviewable diffs.

### Residual Risk

Low for quote restore ownership. Moderate for quote creation naming because the remaining `quote-versions.tsx` file is effectively the create owner, but renaming it would widen import churn and is not needed for this slice.
