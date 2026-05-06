# Operations Maintainer Sprint 68: Site Visit Mutation Contracts

## Status

Closed in commit-ready state.

## Issue 1: Site Visit Mutations Had Weak Project Boundaries And Raw Feedback

### Problem

Site visits are the scheduling and field-execution spine for RENOZ Energy project work, but several read and mutation paths accepted only a visit id after the route had already established a project boundary. Final writes updated by visit id only, project joins and customer lookups were not consistently organization-scoped, schedule caches were not invalidated uniformly, and operator-facing failures still surfaced generic or raw server messages.

### Workflow Spine

Jobs site visit workflow
-> project visit route, project detail Gantt, schedule calendar, technician tasks, visit detail, sign-off and create dialogs
-> `useSiteVisit`, `useCreateSiteVisit`, `useUpdateSiteVisit`, `useRescheduleSiteVisit`, `useDeleteSiteVisit`, `useCancelSiteVisit`, `useCheckIn`, `useCheckOut`, `useCustomerSignOff`
-> `getSiteVisit`, `getSiteVisits`, `getPastDueSiteVisits`, create/update/reschedule/delete/cancel/check-in/check-out/sign-off server functions
-> `siteVisits`, `projects`
-> `queryKeys.siteVisits.*`
-> tenant- and project-scoped site visit reads/writes with safe mutation feedback and schedule-aware cache invalidation.

### Touched Domains

- Jobs site visit schemas.
- Jobs site visit TanStack Query hooks.
- Jobs site visit server functions.
- Project visit detail route and project detail Gantt rescheduling.
- Schedule calendar and schedule create dialog.
- Technician my-tasks execution route.
- Site visit create/cancel/sign-off UI.
- Jobs mutation error formatting.
- Focused jobs contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Site visits coordinate installation, commissioning, service, warranty, and inspection work. This slice protects the schedule and field-execution workflow from cross-project drift, stale cache states, and confusing operator feedback when an action fails.

### Scope Constraints

- Do not redesign the schedule calendar, technician dashboard, visit detail page, or sign-off form.
- Keep query key shapes unchanged.
- Keep create/update/reschedule/check-in/check-out/sign-off business rules intact.
- Do not broaden into installer eligibility, route authorization policy, geolocation capture, or visit-number allocation beyond the mutation contract.

### Changes

- Added `formatSiteVisitMutationError` with action-specific create/update/reschedule/delete/cancel/check-in/check-out/sign-off fallbacks and safe server-code messages.
- Exported the site visit mutation formatter through the jobs hook barrel.
- Added scoped site visit input schemas and optional `projectId` to update, reschedule, check-in, check-out, and customer sign-off contracts.
- Passed route or resolved project ids into site visit detail, check-in, check-out, reschedule, cancel, and sign-off mutations.
- Scoped single-visit reads by optional project id when the route provides it.
- Centralized site visit mutation cache invalidation across detail, project visits, installer visits, list views, and schedule/past-due views.
- Changed delete/cancel hooks to use server-returned visit identity for cache cleanup instead of caller-only ids.
- Scoped project joins in site visit list and past-due reads to the active organization.
- Scoped project customer lookups to the active organization.
- Scoped final update/delete writes by visit id, organization id, and optional project id.
- Made delete return visit identity and fail if the scoped final delete does not affect a row.
- Incremented visit versions on cancel, check-in, check-out, and customer sign-off writes.
- Replaced raw/generic site visit mutation feedback in create, reschedule, cancel, check-in, check-out, and sign-off surfaces.
- Added focused contract coverage for safe feedback, project scope propagation, server predicates, cache invalidation, and removed raw feedback.

### Standards Checked

- Domain ownership: site visit scheduling/execution concerns remain inside jobs site visit schemas, hooks, server functions, routes, and domain UI.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for visit detail, schedule, technician, Gantt, cancel, and sign-off paths.
- Tenant isolation/data integrity: strengthened. Reads, joins, project customer lookups, and final writes now carry organization scope, with optional project predicates where route context exists.
- Safe mutation/cache contracts: strengthened. Site visit mutations now use a shared invalidation helper that reaches schedule and past-due views.
- Honest UI states: read-state behavior was preserved; mutation failures now use safer, action-specific operator messages.
- Transactional inventory and finance integrity: not touched; this slice does not mutate stock, costs, invoices, or payments.
- Reviewability: the diff is limited to site visit contracts, callers that already perform visit mutations, one formatter extension, one focused test, and this closeout note.

### Smells Removed

- Site visit final writes by visit id only.
- Project title joins without organization-scoped project joins.
- Project customer lookup by project id only.
- Delete/cancel cache invalidation without server-returned project/installer identity.
- Schedule create/reschedule paths depending on caller-side cache patches to compensate for weak mutation invalidation.
- Raw or generic site visit mutation errors in operator workflows.
- Unstable derived `visits` dependency in the my-tasks route.

### Deferred

- Installer assignment still needs an eligibility and organization-membership contract review.
- Visit number generation still uses count-plus-one and deserves a concurrency-safe allocation slice.
- Check-in/check-out notes and location semantics deserve a field-execution UX/data review.
- Browser QA remains a follow-up if the schedule or technician screens get layout/interaction changes.

### Gates

- Passed: `bun test tests/unit/jobs/site-visits-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/site-visits-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx tests/unit/root-input-normalization-sweep.test.ts` - 3 files, 86 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice is a focused site visit mutation contract change covered by targeted tests plus type/lint gates.
- Skipped: browser QA because no layout or successful interaction flow was redesigned; route project propagation, server predicates, and cache policy are covered by focused tests.

### Goal Adaptation

Made. Sprint closeout no longer treats serialized lineage as a standing gate when the slice does not touch serialized inventory lineage. The invariant remains in the maintainer goal for domains that actually mutate or read serialized lineage.

### Residual Risk

Medium. Site visit mutation boundaries are safer, but installer eligibility, visit number allocation, and field-execution data semantics remain business-critical follow-up slices.
