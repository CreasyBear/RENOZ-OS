# Jobs Maintainer Sprint 17: Site Visit Detail Read Feedback

## Status

Closed in commit-ready state.

## Issue 1: Site Visit Detail Rendered Raw Read Messages

### Problem

The site visit execution route rendered `error?.message || 'Not found'` for hard visit-detail failures and `projectTasksError.message` for task warning banners. `useSiteVisit` and `useProjectTasks` already normalize read failures, but the route still trusted arbitrary error objects at the display boundary.

### Workflow Spine

Project site visit route
-> `SiteVisitDetailPage`
-> `useSiteVisit` / `useProjectTasks`
-> site visit and task server functions
-> Jobs schemas/database
-> centralized site visit and project task query keys
-> Jobs read-feedback helpers
-> operator-facing hard error or task warning.

### Touched Domains

- Jobs project site visit execution route.
- Jobs project read-error helpers.
- Focused Jobs read-feedback tests.

### Business Value Protected

Site visits support RENOZ Energy service/project execution. Installers and operators need safe recovery copy when a visit or its tasks cannot load, without seeing database, tenant-policy, or runtime details on the execution page.

### Scope Constraints

- Do not change route params, navigation, check-in/check-out/sign-off mutations, task filtering, project/customer/user lookups, server functions, schemas, query keys, stale times, or cache invalidations.
- Preserve normalized not-found copy from `useSiteVisit`.
- Reuse the existing project task read helper for task warning banners.

### Changes

- Added `PROJECT_SITE_VISIT_DETAIL_READ_FALLBACK_MESSAGE` and `getProjectSiteVisitDetailReadErrorMessage`.
- Routed the hard site-visit detail error through the new helper.
- Routed the site-visit task warning through `getProjectTasksReadErrorMessage`.
- Added focused coverage for normalized not-found copy, unsafe raw suppression, task-warning reuse, and route wiring.

### Standards Checked

- Domain ownership: site visit detail and project-task read copy now lives in the Jobs project read helper.
- Route -> page -> hook -> server function -> schema/database -> query key/cache policy: preserved; only display formatting changed.
- Query/cache policy: no query keys, stale times, invalidations, or cache contracts changed.
- Tenant isolation/data integrity: no server functions, permissions, organization/project scoping, database writes, inventory behavior, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: hard visit failures and task warning banners no longer trust arbitrary error messages.
- Reviewability: one helper extension, one route import/call-site update, one focused test file, and this closeout.

### Smells Removed

- Direct `error?.message` rendering in the site visit hard-error state.
- Direct `projectTasksError.message` rendering in the site visit task warning.
- Missing source contract for the site visit detail read boundary.

### Deferred

- The route remains a relatively large page component with data fetching and handlers colocated; broader container extraction is a future architecture slice.
- Browser QA was not selected because this is formatter/source-contract behavior with no intended layout or interaction change.

### Gates

- Passed: focused site visit detail and related project site visits/tasks read feedback contracts, `bun run test:vitest tests/unit/jobs/site-visit-detail-read-feedback-contract.test.ts tests/unit/jobs/project-site-visits-read-feedback-contract.test.ts tests/unit/jobs/project-tasks-read-feedback-contract.test.ts` - 3 files, 7 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for direct `error?.message` and `projectTasksError.message` usage in the site visit detail route.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the standing maintainer goal. Serialized gates remain retired for unrelated read-feedback slices.

### Residual Risk

Low for site visit detail read feedback. Moderate for long-term maintainability because the site visit execution route still owns data fetching, action handlers, and presentation in one file.
