# Pipeline Maintainer Sprint 20

## Status

Closed in commit-ready state.

## Issue 1: Quote Hook Read Fallbacks Were Still Inline

### Problem

Quote history UI now uses Pipeline-owned read-error copy, but `use-quotes` still inlined fallback copy for quote version lists, detail reads, comparisons, expiring/expired quote alerts, and quote validity stats. That kept quote read normalization split between hook literals and the Pipeline message map.

### Workflow Spine

Quote read hooks
-> quote-version read server functions
-> `requireReadResult` / `normalizeReadQueryError`
-> Pipeline read-state message map
-> quote history/detail/alert read states.

### Touched Domains

- Pipeline quote read hooks.
- Pipeline read-error message helper.
- Pipeline read-state/read-error contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote history, comparisons, and expiry alerts protect pricing continuity and recovery work. Centralized hook fallback copy keeps quote read failures consistent with the operator-facing quote read states.

### Scope Constraints

- Do not change quote query keys, query options, server functions, schemas, comparison behavior, expiry filters, result shapes, cache policy, mutations, invalidation, loading behavior, or UI rendering.
- Keep this as quote hook read-normalization copy only. Activity and extended opportunity detail read hooks remain separate bounded slices.

### Changes

- Added Pipeline read fallback copy for quote version detail, not-found, comparison, expiring quotes, expired quotes, and quote validity stats.
- Reused `PIPELINE_READ_MESSAGES.quoteVersionHistory` for quote version list read normalization.
- Routed `use-quotes` read normalization fallbacks through `PIPELINE_READ_MESSAGES`.
- Extended focused source contracts so `use-quotes` cannot reintroduce literal `fallbackMessage` copy.

### Standards Checked

- Domain ownership: quote hook read-normalization copy now lives in the Pipeline read-error helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved the quote hook -> read-error contract; server functions, schemas, database predicates, query keys, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; query keys, stale times, enabled conditions, invalidation, and result contracts stayed unchanged.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved by removing duplicated hook fallback copy that could drift from quote read-state copy.
- Reviewability: bounded diff across one helper, one hook file, focused tests, and this closeout.

### Smells Removed

- Inline quote version list, detail, not-found, comparison, expiring quote, expired quote, and quote validity fallback strings inside Pipeline quote hooks.
- Missing source contract preventing hook-level literal `fallbackMessage` copy from returning in `use-quotes`.

### Deferred

- Pipeline activity and extended opportunity detail hook read fallbacks remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes hook fallback constants, not layout or browser interaction.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-read-error-messages.test.ts tests/unit/pipeline/pipeline-read-state-contract.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for literal quote hook `fallbackMessage` read copy in `use-quotes`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for the targeted quote hook fallback copy. Moderate across Pipeline because activity and extended opportunity detail read hooks still hold inline read fallback strings and should be cleaned in separate bounded slices.
