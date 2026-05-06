# Pipeline Maintainer Sprint 54

## Status

Closed in commit-ready state.

## Issue 1: Activity Writes Trusted Empty Mutation Results

### Problem

Pipeline activity update, complete, and delete workflows verified tenant ownership before writing, but the final write/delete result was trusted. Updates returned `result[0]` without checking it existed, and delete returned success without proving the row was deleted.

### Workflow Spine

Activity mutation
-> activity mutation hook
-> pipeline activity server function
-> tenant-scoped activity lookup
-> tenant-scoped update/delete
-> returned-row evidence
-> centralized activity/opportunity/unified-activity cache invalidation unchanged.

### Touched Domains

- Pipeline opportunity activity server workflow.
- Pipeline activity mutation feedback/source contract.
- Pipeline activity mutation cache contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Activity history drives sales follow-up and support context. Operators should not receive successful mutation responses unless the activity write or delete actually affected the tenant-scoped row.

### Scope Constraints

- Do not change activity inputs, schemas, hook signatures, cache invalidation, UI feedback copy, activity list/timeline reads, opportunity stage behavior, or server module ownership.
- Keep this as returned-row evidence hardening inside the existing activity mutation server functions.

### Changes

- Added returned-row evidence checks to `updateActivity`.
- Added returned-row evidence checks to `completeActivity`.
- Added delete returned-row evidence to `deleteActivity`.
- Throw the existing `NotFoundError` if the final tenant-scoped write/delete does not return a row.
- Extended the activity mutation feedback source contract to protect the returned-row evidence pattern.

### Standards Checked

- Domain ownership: activity mutation behavior remains in the pipeline activity server section; extraction is deferred.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook/cache/UI contracts stayed unchanged; server write evidence improved.
- Tenant isolation/data integrity: all final writes still use `buildActivityByIdWhere(id, ctx.organizationId)` and now prove the write/delete affected a row.
- Query/cache contract: unchanged; activity mutations still invalidate activities, follow-ups, opportunity detail, timeline, and unified activity keys through centralized query keys.
- Honest UI states/operator-safe errors: missing final write evidence now fails through `NotFoundError`, which the activity formatter maps to safe copy.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Activity update returned `result[0]` without existence evidence.
- Activity completion returned `result[0]` without existence evidence.
- Activity delete returned success without delete evidence.

### Deferred

- Activity server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- `listActivities` count still throws a generic server error when the count query returns no row; deferred to a read-path hardening slice.
- Browser QA remains deferred because this source-covered slice changes server write evidence only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/activity-mutation-feedback-contract.test.ts tests/unit/pipeline/activity-mutation-cache-contract.test.ts tests/unit/pipeline/pipeline-activity-query-key-contract.test.ts` (3 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for activity returned-row evidence, tenant predicates, formatter coverage, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, data integrity, safe mutation/cache contracts, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Low for activity mutation returned-row evidence. Moderate for broader pipeline activity ownership because activity reads and writes still live inside the monolithic pipeline server module.
