# Pipeline Maintainer Sprint 17

## Status

Closed in commit-ready state.

## Issue 1: Quote Version History Read State Used Local Failed-Load Copy

### Problem

`QuoteVersionHistoryPresenter` displayed local `Failed to load version history.` copy for read failures. Pipeline did not yet have a domain-owned read-error helper, so read-state cleanup had no local pattern to follow.

### Workflow Spine

Quote version history
-> `useQuoteVersions` / comparison read hooks
-> quote read server function
-> Pipeline read-state formatter
-> operator-safe unavailable copy.

### Touched Domains

- Pipeline quote version history read state.
- Pipeline read-error message helper.
- Pipeline read-state/read-error contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote history helps operators recover prior quote state and review pricing changes. If the read path fails, the UI should communicate temporary unavailability and recovery instead of dead-end failed-load copy.

### Scope Constraints

- Do not change quote history layout, comparison behavior, restore behavior, hooks, server functions, schemas, database predicates, query keys, cache policy, loading state, or empty state.
- Keep this as quote version history read-state copy only. Other Pipeline read states remain separate slices.

### Changes

- Added `PIPELINE_READ_MESSAGES.quoteVersionHistory`.
- Added `formatPipelineReadError`.
- Added a Pipeline read-error barrel.
- Routed quote version history read failures through the new Pipeline read formatter.
- Added focused read-error and read-state source contracts.

### Standards Checked

- Domain ownership: Pipeline read-state copy now has a local formatter and message map.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked quote history presenter read state; hooks, server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; quote history query behavior stayed unchanged.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for quote version history read failures.
- Reviewability: bounded diff across one helper, one presenter, focused tests, and this closeout.

### Smells Removed

- Local hardcoded `Failed to load version history.` copy.
- Missing Pipeline-owned read-state helper for future bounded read-state cleanup.

### Deferred

- Pipeline board/list/detail/documents read-state copy remains separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes read-state copy, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-read-error-messages.test.ts tests/unit/pipeline/pipeline-read-state-contract.test.ts` - 2 files, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, domain ownership, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for quote version history read-state copy. Moderate across Pipeline because board/list/detail/documents read states still need separate bounded cleanup.
