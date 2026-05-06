# Operations Maintainer Sprint 77: Schedule Site Visit Submit Error State

## Status

Closed in commit-ready state.

## Issue 1: Schedule Site Visit Creation Only Reported Submit Failures Through Toasts

### Problem

The project-scoped site-visit create dialog showed mutation failures inside the form through `submitError`, while the schedule create dialog only showed a toast. If scheduling failed, the operator was left in the dialog with no durable error state after the toast disappeared.

### Workflow Spine

Schedule calendar
-> `ScheduleVisitCreateDialog`
-> `scheduleVisitFormSchema`
-> shared site-visit create form helper
-> `useCreateSiteVisit`
-> `createSiteVisit`
-> `site_visits`
-> site-visit cache invalidation.

### Touched Domains

- Jobs schedule site-visit creation.
- Site-visit mutation/source contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Scheduling is an operator workflow, not a one-shot form. When creation fails because a project is missing or the server rejects the create request, the operator now gets a persistent inline error in the dialog and can repair the form without relying on a transient toast.

### Scope Constraints

- Do not change create mutation behavior, payload shaping, server validation, database writes, project scoping, activity logging, cache invalidation, or success navigation.
- Do not consolidate the project and schedule dialogs.
- Do not change installer directory behavior or assignment fallback.

### Changes

- Added local `submitError` state to `ScheduleVisitCreateDialog`.
- Rendered shared `FormErrorSummary` inside the schedule create form.
- Set durable errors for missing project and formatted create mutation failures.
- Clear submit errors on open, close, and before new submit attempts.
- Extended the site-visit mutation contract test to require persistent submit feedback on schedule create.

### Standards Checked

- Domain ownership: unchanged. Schedule dialog owns schedule-specific feedback state; site-visit payload/schema ownership remains shared.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: UI feedback only; downstream contracts unchanged.
- Tenant isolation/data integrity: not touched.
- Safe mutation/cache contracts: not touched.
- Honest UI states: improved. Schedule create failures now remain visible after the toast.
- Operator-safe errors: preserved through `formatSiteVisitMutationError`.
- Reviewability: the diff is bounded to one dialog, one source contract test, and this closeout.

### Smells Removed

- Toast-only schedule-create submit failure.
- Missing persistent feedback for blocked schedule project selection.
- Divergence from the project create dialog's `submitError` feedback pattern.

### Deferred

- Browser QA was not run because this is a bounded form feedback change covered by source contract and type/lint gates.
- Broader dialog consolidation remains deferred until there is a product or maintenance reason to merge UI structure.
- True unassigned scheduling remains a separate schema/server product decision.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/site-visits-mutation-contract.test.ts tests/unit/jobs/site-visit-create-form.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, meaningful tests, and sprint closeout.

### Residual Risk

Low. This aligns failure feedback between create surfaces without changing create semantics. Remaining risk is only visual verification of the alert in the live dialog, deferred because the change uses the shared form error component.
