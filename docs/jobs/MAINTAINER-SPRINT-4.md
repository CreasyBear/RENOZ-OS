# Jobs Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Project Notes Warning Surfaced Raw Read Errors

### Problem

The project notes hook normalizes read failures with the shared read-path policy, and the notes tab correctly distinguishes unavailable notes from cached notes. The warning copy still rendered arbitrary `error.message` values, which could expose database, tenant, or runtime details inside a project detail workflow.

### Workflow Spine

Project detail route
-> project notes tab
-> `useNotes`
-> `listNotes` server function
-> project note schema/database
-> `queryKeys.projectNotes.byProjectFiltered(...)`
-> notes unavailable or cached-notes warning.

### Touched Domains

- Jobs/project notes read feedback.
- Shared projects read-feedback helper.
- Project notes read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Project notes capture meetings, site observations, client feedback, and execution context. When notes fail to load, operators should get clear recovery copy while cached notes remain visible, without seeing internal query or persistence details.

### Scope Constraints

- Do not change notes server functions, schemas, tenant checks, query keys, cache invalidation, note mutation feedback, tab layout, note filters, or dialog behavior.
- Preserve the cached-notes degradation behavior from existing query-normalization tests.
- Do not run or list serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectNotesReadErrorMessage`.
- Routed the project notes warning message through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project-notes read-feedback contract test.

### Standards Checked

- Domain ownership: project notes read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useNotes` still normalizes reads and uses centralized project note query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; notes query key and note mutation invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one tab, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the project notes warning.
- Inline fallback copy inside the notes tab instead of domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project notes warnings.

### Deferred

- Other project detail surfaces still need separate read-feedback slices: files, BOM/materials, site visits, task tabs, schedule, documents, and alerts.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-notes-read-feedback-contract.test.ts tests/unit/jobs/project-list-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx` (3 files, 17 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project notes `error.message` fallback.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, read/query contracts, honest UI states, operator-safe errors, meaningful tests, and reviewable diffs. The serialized-gates retirement remains in effect.

### Residual Risk

Low for project notes read feedback. Moderate for the broader project detail area because several sibling cached-read warning surfaces still render raw messages and should be handled as later small slices.
