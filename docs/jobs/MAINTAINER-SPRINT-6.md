# Jobs Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Project Materials Warning Surfaced Raw Read Errors

### Problem

The project BOM hook normalizes read failures with the shared read-path policy, and the BOM tab already distinguishes unavailable materials from cached materials. The warning copy still rendered arbitrary `error.message` values, which could leak database, tenant, or runtime details inside project material planning and execution.

### Workflow Spine

Project detail route
-> project BOM/materials tab
-> `useProjectBom`
-> `getProjectBom` server function
-> project BOM schema/database
-> `queryKeys.projects.bom(projectId)`
-> materials unavailable or cached-materials warning.

### Touched Domains

- Jobs/project BOM read feedback.
- Shared projects read-feedback helper.
- Project BOM read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Project materials track planned, ordered, received, allocated, and installed items. If BOM reads fail, operators should keep any cached materials visible and see safe recovery copy instead of raw persistence or runtime details.

### Scope Constraints

- Do not change BOM server functions, schemas, tenant checks, query keys, cache invalidation, material mutation feedback, product search, import flows, selection behavior, or tab layout.
- Preserve the unavailable/cached-materials behavior from existing query-normalization tests.
- Do not run or list serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectMaterialsReadErrorMessage`.
- Routed the project BOM warning message through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project-BOM read-feedback contract test.

### Standards Checked

- Domain ownership: project BOM read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useProjectBom` still normalizes reads and uses centralized project BOM query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; BOM query key and material mutation invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one tab, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the project materials warning.
- Inline fallback copy inside the BOM tab instead of domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project BOM warnings.

### Deferred

- Other project detail surfaces still need separate read-feedback slices: site visits, task tabs, schedule, documents, and alerts.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-bom-read-feedback-contract.test.ts tests/unit/jobs/project-bom-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx` (3 files, 9 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project materials `error.message` fallback.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, read/query contracts, honest UI states, operator-safe errors, meaningful tests, and reviewable diffs. The serialized-gates retirement remains in effect.

### Residual Risk

Low for project BOM read feedback. Moderate for the broader project detail area because several sibling cached-read warning surfaces still render raw messages and should be handled as later small slices.
