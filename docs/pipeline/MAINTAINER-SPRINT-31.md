# Pipeline Maintainer Sprint 31

## Status

Closed in commit-ready state.

## Issue 1: Delete Quote Mutation Lived In The Quote Read Hook Module

### Problem

`useDeleteQuote` was implemented in `use-quotes.ts`, while the other quote write hooks live in `use-quote-mutations.ts`. That mixed read and write concerns and left the delete quote cache policy outside the quote mutation contract tests.

### Workflow Spine

Quote detail action
-> `useDeleteQuote`
-> `deleteQuote` server function
-> quote list/detail and Pipeline metrics cache refresh
-> quote detail/list UI.

### Touched Domains

- Pipeline quote read hooks.
- Pipeline quote mutation hooks.
- Pipeline hook barrel exports.
- Pipeline quote mutation tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Deleting a quote affects quote visibility and Pipeline metrics. Keeping delete with the quote mutation hooks makes the write-side cache contract easier to audit and helps prevent quote read hooks from accumulating mutation policy.

### Scope Constraints

- Do not change delete quote server behavior, mutation input/output, query key definitions, invalidation breadth, quote detail UI, routing, read query fallbacks, or operator-facing error messages.
- Preserve the public `useDeleteQuote` export from `@/hooks/pipeline`.
- Do not run or list serialized gates; this slice does not touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Changes

- Moved `useDeleteQuote` from `use-quotes.ts` to `use-quote-mutations.ts`.
- Removed mutation imports and the `deleteQuote` server import from the quote read hook module.
- Added `invalidateDeletedQuoteCaches(queryClient, quoteId)` to name the delete quote refresh contract.
- Updated the Pipeline hooks barrel so `useDeleteQuote` is still exported from `@/hooks/pipeline`.
- Extended source and hook tests to cover delete quote ownership and invalidations.

### Standards Checked

- Domain ownership: quote reads and quote writes are separated more cleanly.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: quote detail still calls the same public hook; hook ownership and cache policy improved; server function, schema, database, routing, and UI stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicate, auth boundary, organization scope, database write implementation, inventory transaction, or finance path touched.
- Query/cache contract: preserved exact quote list, quote detail, and Pipeline metrics invalidation after quote delete.
- Honest UI states/operator-safe errors: unchanged; quote detail delete feedback still flows through the existing mutation formatter.
- Reviewability: bounded diff across quote hook modules, barrel export, focused tests, and this closeout.

### Smells Removed

- Mutation hook living in the quote read hook module.
- Read hook module importing `useMutation`, `useQueryClient`, and the delete quote server function.
- Missing focused test coverage for delete quote invalidation behavior.

### Deferred

- Quote generation and send invalidation breadth remain preserved rather than re-evaluated.
- The delete quote server function still lives in `pipeline.ts`; moving server functions into a quote-owned module is a broader server-boundary slice.
- Browser QA remains deferred because this source-covered slice changes hook ownership and tests, not UI rendering or interaction behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `useDeleteQuote` ownership and removed mutation imports from `use-quotes.ts`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, cache contracts, tests, and reviewable diffs.

### Residual Risk

Low for hook ownership and delete quote cache policy. Moderate for broader quote server modularity because the delete quote server function still lives in the larger Pipeline server module.
