# Pipeline Maintainer Sprint 52

## Status

Closed in commit-ready state.

## Issue 1: Pipeline UI Mutation Failures Used Synthetic Throws After Safe Feedback

### Problem

Pipeline opportunity mutation handlers normalized failures into operator-safe toast messages, then some UI paths threw generic synthetic errors such as `Delete failed`, `Stage change failed`, or `Bulk stage change failed`. Those throws were either unhandled by the direct UI action or used as dialog/control-flow signals after user feedback had already been handled.

### Workflow Spine

Opportunity mutation failure
-> route/container action
-> domain hook or container mutation handler
-> centralized pipeline mutation formatter
-> operator-safe toast feedback
-> controlled false result when a dialog/drag interaction should stay open or revert
-> no synthetic post-feedback throw.

### Touched Domains

- Pipeline opportunity detail delete action.
- Pipeline kanban stage-change container and board interaction.
- Pipeline opportunity bulk stage-change dialog/container interaction.
- Pipeline opportunity mutation feedback source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Pipeline operators should get one clear, safe failure message and stay in a recoverable UI state. Mutation failures should not add noisy rejected promises or rely on generic thrown errors after feedback is already shown.

### Scope Constraints

- Do not change server opportunity mutation behavior, mutation schemas, query keys, cache invalidation, success toasts, confirmation copy, kanban columns, list selection, or bulk operation semantics.
- Preserve retry behavior for bulk stage changes and keep won/lost drag confirmations open when a stage mutation fails.
- Keep this as operator-facing failure-control cleanup inside pipeline UI ownership.

### Changes

- Removed the synthetic delete rethrow from the opportunity detail hook after safe delete feedback.
- Changed pipeline kanban stage mutation failure to return `false` after safe feedback instead of throwing a synthetic error.
- Changed the pipeline board to propagate `false` from failed moves and keep won/lost confirmation pending on failed confirmation.
- Changed the bulk stage dialog contract to support `false` results so it can stay open without exception control flow.
- Changed opportunity bulk stage failure to return `false` after safe feedback.
- Extended the opportunity mutation feedback source contract to reject the old synthetic throw strings and protect the controlled-result dialog contract.

### Standards Checked

- Domain ownership: opportunity mutation feedback stays in the pipeline hook/container/dialog layer; server mutations are unchanged.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: server/data/cache contracts stayed unchanged; UI action failure control improved.
- Tenant isolation/data integrity: no server query, tenant predicate, database write, inventory, finance, warranty, RMA, or document persistence code changed.
- Query/cache contract: unchanged; mutation hooks still own invalidation.
- Honest UI states/operator-safe errors: failures continue through the centralized formatter and now avoid post-feedback synthetic throws.
- Reviewability: bounded diff across three pipeline UI files, one source contract, and this closeout.

### Smells Removed

- Generic post-feedback `Delete failed` rethrow from opportunity detail delete.
- Generic post-feedback `Stage change failed` rethrow from kanban stage changes.
- Generic post-feedback `Bulk stage change failed` rethrow from bulk stage changes.
- Exception-based bulk dialog retry signaling where a typed false result is enough.

### Deferred

- Server-side opportunity mutations remain in the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- Broader browser QA remains deferred because this source-covered slice targets failure control paths and existing focused contracts.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/pipeline-kanban-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed synthetic throws, formatter use, false-result control flow, and unchanged mutation/cache contracts.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, safe mutation/cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for the targeted pipeline UI failure-control paths. Moderate for broader opportunity mutation UX because server ownership remains monolithic and several workflows still deserve deeper product-flow review.
