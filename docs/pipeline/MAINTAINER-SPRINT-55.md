# Pipeline Maintainer Sprint 55

## Status

Closed in commit-ready state.

## Issue 1: Activity List Count Failure Used Generic Server Error

### Problem

`listActivities` validates that the count query returned a row before calculating pagination. If that impossible-but-guarded branch fired, it threw a generic `Error('Failed to fetch activity count')` instead of a typed, operator-safe server error.

### Workflow Spine

Activity list read
-> activity hook
-> pipeline activity server function
-> tenant-scoped activity filters
-> count query evidence
-> safe typed count failure
-> paginated activity read
-> centralized activity query keys unchanged.

### Touched Domains

- Pipeline opportunity activity list server workflow.
- Pipeline read-state source contract.
- Pipeline activity query-key contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Pipeline activity history supports follow-up discipline. If a read guard fails, the server should fail with safe, typed copy rather than a generic internal exception string.

### Scope Constraints

- Do not change list inputs, filters, pagination defaults, count conversion, activity ordering, query keys, UI read state, activity writes, or server module ownership.
- Keep this as read-path failure hardening inside `listActivities`.

### Changes

- Imported `ServerError` into the pipeline server module.
- Replaced the generic activity count `Error` with a typed `ServerError`.
- Extended the pipeline read-state source contract to protect the safe activity count failure branch.

### Standards Checked

- Domain ownership: activity list behavior remains in the pipeline server activity section; extraction is deferred.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook, query key, UI read state, filters, and pagination stayed unchanged; server read failure branch improved.
- Tenant isolation/data integrity: activity reads still use `buildActivityBaseWhere(ctx.organizationId)` and optional filters.
- Query/cache contract: unchanged; activity hooks still use centralized query keys.
- Honest UI states/operator-safe errors: count-row guard now fails through typed safe server copy.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Generic `throw new Error('Failed to fetch activity count')` in the activity list read path.

### Deferred

- Activity server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- Other pipeline read count guards still deserve a broader read-path audit; this sprint only touches activity list count failure.
- Browser QA remains deferred because this source-covered slice changes a guarded server failure branch only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-read-state-contract.test.ts tests/unit/pipeline/pipeline-activity-query-key-contract.test.ts tests/unit/pipeline/activity-mutation-feedback-contract.test.ts` (3 files, 8 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for typed count failure, removed generic throw, tenant filters, and query-key coverage.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, honest read states, operator-safe errors, query-key contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for the activity list count failure branch. Moderate for broader pipeline read-path consistency because other count/read guard branches remain in the monolithic pipeline server module.
