# Operations Maintainer Sprint 88: Automation Job Failure Feedback

## Status

Closed in commit-ready state.

## Issue 1: Job Progress Used Raw Failure Metadata

### Problem

`useJobProgress` read `metadata?.error?.message` from failed automation jobs and passed it to both the `onError` callback and toast description. Automation job metadata can be written by varied background workers, so database, runtime, provider, or stack-shaped details should not flow directly into operator feedback.

### Workflow Spine

Automation job progress hook
-> `getJobStatus`
-> automation job metadata
-> status-change effect
-> safe failure formatter
-> `onError` callback and failed-job toast.

### Touched Domains

- Automation job progress hook.
- Operations feedback helper.
- Focused automation job feedback contract tests.

### Business Value Protected

Background jobs support exports, imports, notifications, and other operational workflows. Operators need useful failure descriptions when available, but not infrastructure or runtime internals from job metadata.

### Scope Constraints

- Do not change polling intervals, query keys, read normalization, active-job behavior, status transitions, callbacks, dismissal behavior, server functions, schemas, or job metadata persistence.
- Preserve safe job-authored failure messages.
- Suppress unsafe metadata messages before toast and callback delivery.

### Changes

- Added `job-progress-feedback.ts` with `formatAutomationJobFailureMessage`.
- Routed failed-job `onError` and toast description through the helper.
- Added focused coverage for safe metadata, unsafe metadata, missing metadata, and hook wiring.

### Standards Checked

- Domain ownership: automation job failure copy is now owned by the automation-jobs hook module.
- Hook -> server function -> schema/database -> query key/cache policy: preserved; only failed status feedback formatting changed.
- Query/cache policy: no query keys, polling intervals, stale times, invalidations, or active-job cache behavior changed.
- Tenant isolation/data integrity: no server function, database write, organization predicate, inventory behavior, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: failed job toasts and callback errors no longer receive raw metadata messages.
- Reviewability: one helper, one hook call site, one focused test file, and this closeout.

### Smells Removed

- Direct `metadata?.error?.message` extraction in the automation job progress hook.
- Missing source contract for automation job failure metadata feedback.

### Deferred

- Failed job detail pages or richer per-job remediation UI remain outside this hook-feedback slice.
- Browser QA was not selected because this is formatter/source-contract behavior with no intended layout or interaction change.

### Gates

- Passed: focused automation job feedback contract, `bun run test:vitest tests/unit/automation-jobs/job-progress-feedback-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `formatAutomationJobFailureMessage(job.metadata)` wiring and removed `metadata?.error?.message`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the standing maintainer goal. Serialized gates remain retired for unrelated operations-feedback slices.

### Residual Risk

Low for `useJobProgress` failure feedback. Moderate across background jobs because individual workers may still write inconsistent metadata shapes.
