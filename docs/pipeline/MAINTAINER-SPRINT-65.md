# Pipeline Maintainer Sprint 65

## Status

Closed in commit-ready state.

## Issue 1: Pipeline Read Aggregates Still Had Generic Error Throws

### Problem

Several pipeline read aggregate guards still threw generic `Error` instances when impossible-but-guarded aggregate result rows were missing. Those branches covered opportunity list counts, opportunity list metrics, pipeline totals, velocity counts, and won-opportunity metrics. Earlier sprints hardened activity count failures; this left similar read paths inconsistent.

### Workflow Spine

Pipeline board/list/metrics route
-> pipeline read hook
-> pipeline server read function
-> tenant-scoped aggregate query
-> typed server failure code if aggregate evidence is missing
-> pipeline read formatter fallback in UI.

### Touched Domains

- Pipeline opportunity list read server workflow.
- Pipeline metrics read server workflow.
- Pipeline velocity metrics read server workflow.
- Pipeline read-state source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Pipeline list and metrics views drive commercial follow-up, forecast inspection, and sales prioritization. If a guarded aggregate path fails, operators should receive stable safe read-state fallbacks while logs carry a specific server code for diagnosis.

### Scope Constraints

- Do not change query filters, pagination, sorting, aggregate calculations, hook behavior, read formatter behavior, or UI copy.
- Keep this as operator-safe server error hardening for existing aggregate guard branches.

### Changes

- Replaced generic opportunity count failure with `ServerError('Unable to load opportunities', 500, 'PIPELINE_OPPORTUNITY_COUNT_FAILED')`.
- Replaced generic opportunity metrics failure with `ServerError('Unable to load opportunity metrics', 500, 'PIPELINE_OPPORTUNITY_METRICS_FAILED')`.
- Replaced generic pipeline totals failure with `ServerError('Unable to load pipeline metrics', 500, 'PIPELINE_METRICS_TOTALS_FAILED')`.
- Replaced generic velocity metrics failure with `ServerError('Unable to load pipeline velocity metrics', 500, 'PIPELINE_VELOCITY_METRICS_FAILED')`.
- Replaced generic won-opportunity metrics failure with `ServerError('Unable to load won opportunity metrics', 500, 'PIPELINE_WON_METRICS_FAILED')`.
- Extended the pipeline read-state contract to protect the new codes and prevent the old generic throws from returning.

### Standards Checked

- Domain ownership: unchanged; this is read-path hardening inside the current pipeline server owner.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; only server guard failures are typed.
- Tenant isolation/data integrity: unchanged; all aggregate queries keep existing tenant-scoped predicates.
- Query/cache contract: unchanged; no cache behavior changed.
- Honest UI states/operator-safe errors: improved; aggregate guard failures now use stable codes and safe operator messages.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Generic `throw new Error(...)` in opportunity list count/metrics guards.
- Generic `throw new Error(...)` in pipeline metrics totals guard.
- Generic `throw new Error(...)` in pipeline velocity/won metrics guards.

### Deferred

- Metrics and velocity read ownership remain inside the large `pipeline.ts` module; extraction remains a future focused slice.
- Browser QA remains deferred because this source-covered slice changes server error typing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-read-state-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts` (4 files, 11 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for new `ServerError` codes and removed generic read throws.
- Passed: `git diff --check`.
- Skipped: serialized gates; this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, workflow spines, meaningful tests, reviewable diffs, and closeout evidence. The Sprint 60 serialized-gate adaptation remains in force.

### Residual Risk

Low for read aggregate guard error typing. Moderate for broader pipeline metrics ownership because metrics and velocity reads still live in `pipeline.ts`.
