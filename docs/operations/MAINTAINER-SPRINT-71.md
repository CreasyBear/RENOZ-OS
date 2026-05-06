# Operations Maintainer Sprint 71: Project Time Tracking Boundary Cleanup

## Status

Closed in commit-ready state.

## Issue 1: Project Time Tracking Still Depended On A Legacy Jobs Time Surface

### Problem

Sprint 70 fixed the active project sidebar's project-scoped time contract, but the UI still imported `ActiveTimer` and `TimeEntryDialog` from `src/components/domain/jobs/time`. That directory also contained an unused `JobTimeTab` with stale behavior and raw console error handling. The project domain already had equivalent `projects/time-tracking` components, so the repo was carrying two time-tracking component surfaces with unclear ownership.

### Workflow Spine

Project detail sidebar
-> project sidebar `TimeCard`
-> `projects/time-tracking` `ActiveTimer` and `TimeEntryDialog`
-> `useJobTimeEntries`, `useStartTimer`, `useStopTimer`, `useCreateManualEntry`
-> project-scoped job time server contract and query keys.

### Touched Domains

- Project time-tracking UI components.
- Jobs domain barrel docs/comments.
- Form inventory reference docs.
- Jobs query-normalization test mocks.
- Focused time-tracking boundary contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Project time tracking is now owned by the project domain instead of straddling an abandoned legacy jobs surface. That makes future project labor-cost and field-operations work easier to reason about and reduces the chance of fixing or extending a dead component by mistake.

### Scope Constraints

- Do not change time-tracking behavior or the Sprint 70 project/job resolver.
- Do not redesign the timer or manual entry dialog.
- Do not touch job templates, scheduling, site visits, inventory, or finance.
- Do not harden the unused legacy `JobTimeTab`; remove the dead surface instead.

### Changes

- Repointed project sidebar `TimeCard` to import `ActiveTimer` and `TimeEntryDialog` from `../time-tracking`.
- Deleted the unused `src/components/domain/jobs/time` files, including the dead `JobTimeTab`.
- Updated jobs/projects barrel comments so time tracking is described as consolidated under `projects/time-tracking`.
- Cleaned migration-era comments from project time-tracking component headers.
- Removed the deleted legacy dialog from `docs/reference/form-inventory.md`.
- Updated query-normalization test mocks to target the project-domain time components.
- Added a focused boundary contract test that prevents source imports from drifting back to `components/domain/jobs/time`.

### Standards Checked

- Domain ownership: strengthened. Project time-tracking UI is now project-domain owned.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: behavior is unchanged from Sprint 70; the UI component ownership boundary is cleaner.
- Tenant isolation/data integrity: not changed; no server function, schema, database write, or cache data contract changed in this slice.
- Safe mutation/cache contracts: preserved from Sprint 70.
- Honest UI states: preserved; the active project sidebar still renders the same loading/error/timer/manual entry states.
- Transactional inventory and finance integrity: not touched.
- Reviewability: the diff is deletion-heavy and bounded to time-tracking UI ownership, docs, and focused tests.

### Smells Removed

- Active project UI importing from a legacy jobs time directory.
- Duplicate `ActiveTimer` and `TimeEntryDialog` component surfaces.
- Unused `JobTimeTab` with stale raw console error behavior.
- Stale comments saying time tracking still needed consolidation.
- Reference docs pointing at a deleted legacy form.

### Deferred

- Job templates remain a separate legacy support surface and still need their own project-template ownership slice.
- The underlying time data model still depends on legacy job assignments, as documented in Sprint 70.
- Browser QA remains unnecessary unless the timer/dialog UI is visually changed.

### Gates

- Passed: `bun test tests/unit/jobs/time-tracking-boundary-contract.test.ts tests/unit/jobs/project-time-tracking-contract.test.ts` - 2 files, 4 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/query-normalization-wave4b-admin.test.tsx` - 1 file, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this is a bounded ownership cleanup with deletion-focused coverage plus type/lint gates.

### Goal Adaptation

Declined. The standing maintainer goal and updated sprint process already cover domain ownership, reviewable boundaries, safe contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low. The deleted time surface had no active imports. Future risk is mainly that job-template legacy support still sits under the jobs domain and should be addressed in a separate slice.
