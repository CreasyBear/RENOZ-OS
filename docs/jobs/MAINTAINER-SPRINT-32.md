# Jobs Maintainer Sprint 32: Site Visit Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Site Visit Mutations Refreshed the Whole Site-Visit Cache

### Problem

Site visit mutations already returned scoped identifiers for the affected visit, project, and installer, but the shared mutation helper still invalidated `queryKeys.siteVisits.all`. The schedule calendar also repeated that root invalidation after creating a visit. That made a single scheduling edit refresh unrelated detail, list, schedule, installer, past-due, and personal-visit views as one broad cache family.

### Workflow Spine

Schedule/project visit UI
-> site visit mutation hook
-> site visit server function
-> `site_visits`
-> site visit query-key families
-> schedule, project, installer, past-due, and personal work views.

### Touched Domains

- Jobs site-visit query keys.
- Jobs site-visit mutation hooks.
- Jobs schedule calendar container.
- Jobs cache contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Scheduling and visit operations should update the operator views that can actually be affected without causing unnecessary reloads across unrelated jobs screens. RENOZ operators need the schedule, project visit list, installer assignment view, past-due queue, and personal work queue to remain honest after create, update, reschedule, cancel, check-in, check-out, sign-off, and delete flows.

### Scope Constraints

- Do not change site visit API response shape.
- Do not change server mutation behavior.
- Do not alter route structure, layout, or scheduling UI.
- Keep broader Jobs `jobs.all`, `jobCalendar.all`, and assignment invalidation debt deferred.

### Changes

- Added `siteVisits.byProjects`, `siteVisits.byInstallers`, and `siteVisits.schedules` query-key family prefixes while preserving existing key shapes.
- Replaced mutation helper root invalidation with focused refreshes for affected detail, affected project, affected installer, installer family, lists, schedules, past-due visits, and personal visits.
- Removed duplicate check-in/check-out `myVisits` invalidations because the shared helper now owns that affected view.
- Replaced the schedule calendar create-success root refresh with current schedule range plus past-due refresh.
- Added a focused site-visit cache contract and updated the existing site-visit mutation contract.

### Standards Checked

- Domain ownership: Jobs owns site visit scheduling and its query-cache policy.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: schedule container delegates mutation impact to the site-visit hook and only refreshes its local visible range after create.
- Tenant isolation/data integrity: no server access scope or database writes changed.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: existing operator-safe scheduling errors remain unchanged.
- Reviewability: one query-key family update, one hook helper update, one container cleanup, two focused contract checks.

### Smells Removed

- Root `siteVisits.all` invalidation from the shared site-visit mutation helper.
- Root `siteVisits.all` invalidation from schedule create success.
- Duplicate personal-visit invalidations in check-in/check-out hooks.

### Deferred

- Broader Jobs cache debt around `jobs.all`, `jobCalendar.all`, `jobAssignments.all`, and `jobTasks.all`.
- Old installer/date cache precision could be improved further if server mutation results later expose before/after assignment and schedule metadata.
- Browser QA was not selected because this is a cache-contract maintenance slice with no intended visual or interaction change.

### Gates

- Passed: focused Jobs site-visit cache and mutation contracts.
- Passed: focused ESLint on touched Jobs files and tests.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint applies the standing cache-contract and reviewable-diff standard locally.

### Residual Risk

Low to medium. The new installer and schedule family prefixes are narrower than the former site-visit root, but they still refresh whole installer and schedule families because the current mutation result does not expose old installer or old schedule range metadata.
