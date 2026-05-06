# Operations Maintainer Sprint 75: Project Site Visit Form Schema Ownership

## Status

Closed in commit-ready state.

## Issue 1: Project Site Visit Creation Duplicated The Visit-Type Form Schema

### Problem

The project-scoped site-visit create dialog carried a local Zod schema with its own hard-coded visit-type enum. The schedule create dialog already used the shared jobs site-visit form schema. That split made the two create surfaces vulnerable to enum drift and hid schema ownership inside a UI component.

### Workflow Spine

Project detail or project task dialog
-> `SiteVisitCreateDialog`
-> `projectSiteVisitFormSchema`
-> `scheduleVisitFormSchema`
-> `siteVisitTypeSchema`
-> `useCreateSiteVisit`
-> `createSiteVisitSchema`
-> `createSiteVisit`
-> `site_visits`
-> centralized site-visit cache invalidation.

### Touched Domains

- Jobs project site-visit creation.
- Jobs site-visit schema module.
- Site-visit mutation/source contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Project teams and schedulers create the same operational object from different entry points. Keeping visit-type validation under the shared jobs schema prevents one path from accepting stale or divergent visit types and makes future scheduling/product changes easier to apply once.

### Scope Constraints

- Do not change create mutation behavior, server validation, database writes, activity logging, installer assignment, project scoping, or cache invalidation.
- Do not change schedule-create UI behavior.
- Do not consolidate the two dialog components in this slice.
- Do not add new visit types or change visit-type labels.

### Changes

- Added `projectSiteVisitFormSchema`, derived from `scheduleVisitFormSchema.omit({ projectId: true })`.
- Exported `ProjectSiteVisitFormInput` for project-scoped form ownership.
- Removed the local project dialog Zod schema and hard-coded visit-type enum.
- Updated the project dialog to use the shared `projectSiteVisitFormSchema`.
- Extended the site-visit mutation contract test to guard shared schema ownership and reject reintroduced local visit-type enums.

### Standards Checked

- Domain ownership: strengthened. Jobs schema module now owns both schedule-scoped and project-scoped site-visit create form schemas.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: only the UI form schema owner changed; mutation, server, database, and cache contracts were preserved.
- Tenant isolation/data integrity: not touched.
- Safe mutation/cache contracts: not touched.
- Honest UI states/operator-safe errors: preserved from Sprint 74; no behavior change.
- Reviewability: the diff is bounded to one schema module, one dialog import/schema reference, one source contract test, and this closeout.

### Smells Removed

- Local `createSiteVisitFormSchema` inside the project dialog.
- Hard-coded duplicate visit-type enum in a UI component.
- Divergent schema ownership between the two site-visit create surfaces.

### Deferred

- The project and schedule create dialogs still duplicate UI structure and submission assembly; consolidating that requires a larger component-boundary slice.
- True unassigned site visits remain deferred to a schema/server product decision.
- Browser QA was not run because there was no intended UI behavior or route-loading change.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/site-visits-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already requires clear schema ownership, reviewable boundaries, meaningful tests, and sprint closeout.

### Residual Risk

Low. The risk is mostly remaining UI duplication between create dialogs, not schema drift. A future slice can extract shared submission/form assembly if the duplication starts blocking behavior work.
