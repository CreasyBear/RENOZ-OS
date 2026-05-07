# Jobs Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Project Site Visits Warning Surfaced Raw Read Errors

### Problem

The project site-visits hook normalizes read failures with the shared read-path policy, and the visits tab distinguishes unavailable visits from cached visits. The warning copy still rendered arbitrary `error.message` values, which could leak database, tenant, or runtime details inside project scheduling and field execution.

### Workflow Spine

Project detail route
-> project visits tab
-> `useSiteVisitsByProject`
-> `getSiteVisits` server function
-> site visits schema/database
-> `queryKeys.siteVisits.byProject(projectId)`
-> visits unavailable or cached-visits warning.

### Touched Domains

- Jobs/project site-visits read feedback.
- Shared projects read-feedback helper.
- Project site-visits read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Site visits coordinate field work, installer scheduling, and customer commitments. If visit reads fail, operators should keep cached visits visible and see safe recovery copy instead of raw persistence or runtime details.

### Scope Constraints

- Do not change site-visit server functions, schemas, tenant checks, query keys, cache invalidation, schedule behavior, visit mutation feedback, navigation, or tab layout.
- Preserve the unavailable/cached-visits behavior from existing query-normalization tests.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectSiteVisitsReadErrorMessage`.
- Routed the project visits warning message through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project site-visits read-feedback contract test.

### Standards Checked

- Domain ownership: project visits read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useSiteVisitsByProject` still normalizes reads and uses centralized project site-visit query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; site-visit query key and mutation invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one tab, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the project site-visits warning.
- Inline fallback copy inside the visits tab instead of domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project site-visit warnings.

### Deferred

- Other project detail surfaces still need separate read-feedback slices: project alerts, documents, task tabs, schedule, and time cards.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-site-visits-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx` (2 files, 15 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project site-visits `error.message` fallback.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for project site-visits read feedback. Moderate for the broader project detail area because several sibling cached-read warning surfaces still render raw messages and should be handled as later small slices.
