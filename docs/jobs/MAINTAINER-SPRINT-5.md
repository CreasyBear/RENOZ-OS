# Jobs Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Project Files Warning Surfaced Raw Read Errors

### Problem

The project files hook normalizes read failures with the shared read-path policy, and the files tab already distinguishes unavailable files from cached files. The warning copy still rendered arbitrary `error.message` values, which could leak database, tenant, or runtime details inside project file management.

### Workflow Spine

Project detail route
-> project files tab
-> `useFiles`
-> `listFiles` server function
-> project file schema/database
-> `queryKeys.projectFiles.byProjectFiltered(...)`
-> files unavailable or cached-files warning.

### Touched Domains

- Jobs/project files read feedback.
- Shared projects read-feedback helper.
- Project files read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Project files carry documents, photos, manuals, and execution materials. When file reads fail, operators should keep any cached files visible and see safe recovery copy instead of raw persistence or runtime details.

### Scope Constraints

- Do not change file server functions, schemas, tenant checks, query keys, cache invalidation, file mutation feedback, file upload dialog behavior, filters, or tab layout.
- Preserve cached-files degradation behavior from existing query-normalization tests.
- Do not run or list serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectFilesReadErrorMessage`.
- Routed the project files warning message through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project-files read-feedback contract test.

### Standards Checked

- Domain ownership: project files read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useFiles` still normalizes reads and uses centralized project file query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; file query key and file mutation invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one tab, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the project files warning.
- Inline fallback copy inside the files tab instead of domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project files warnings.

### Deferred

- Other project detail surfaces still need separate read-feedback slices: BOM/materials, site visits, task tabs, schedule, documents, and alerts.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-files-read-feedback-contract.test.ts tests/unit/jobs/project-notes-read-feedback-contract.test.ts tests/unit/jobs/project-list-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx` (4 files, 19 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project files `error.message` fallback.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, read/query contracts, honest UI states, operator-safe errors, meaningful tests, and reviewable diffs. The serialized-gates retirement remains in effect.

### Residual Risk

Low for project files read feedback. Moderate for the broader project detail area because several sibling cached-read warning surfaces still render raw messages and should be handled as later small slices.
