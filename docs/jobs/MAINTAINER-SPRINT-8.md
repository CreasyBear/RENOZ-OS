# Jobs Maintainer Sprint 8

## Status

Closed in commit-ready state.

## Issue 1: Project Alerts Warning Surfaced Raw Read Errors

### Problem

The project alerts hook normalizes read failures with the shared read-path policy and preserves project not-found semantics. The project detail view still rendered arbitrary `alertsError.message` values in the alerts warning, which could leak database, tenant, or runtime details at the top of the project detail workflow.

### Workflow Spine

Project detail route
-> project detail container/data hook
-> `useProjectAlerts`
-> `getProjectAlerts` server function
-> project alerts schema/database
-> `queryKeys.projects.alerts(projectId)`
-> alerts unavailable or cached-alerts warning.

### Touched Domains

- Jobs/project alerts read feedback.
- Shared projects read-feedback helper.
- Project alerts read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Project alerts surface scheduling, budget, task, and risk conditions before an operator enters the detail tabs. If alert reads fail, operators should see safe recovery copy and cached alerts when present, not raw persistence or runtime details.

### Scope Constraints

- Do not change alert server functions, schemas, tenant checks, query keys, cache invalidation, alert generation, detail layout, or alert presentation cards.
- Preserve project not-found semantics from existing query-normalization tests.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectAlertsReadErrorMessage`.
- Routed the project detail alert warning through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project alerts read-feedback contract test.

### Standards Checked

- Domain ownership: project alert read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useProjectAlerts` still normalizes reads and uses centralized project alert query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; alert query key and invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one detail view, one focused test, and this closeout.

### Smells Removed

- Raw `alertsError.message` rendering in the project alerts warning.
- Inline fallback copy inside the detail view instead of domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project alert warnings.

### Deferred

- Other project detail surfaces still need separate read-feedback slices: documents, task tabs, schedule, and time cards.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-alerts-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx` (2 files, 15 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project alerts `alertsError.message` fallback.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for project alerts read feedback. Moderate for the broader project detail area because several sibling cached-read warning surfaces still render raw messages and should be handled as later small slices.
