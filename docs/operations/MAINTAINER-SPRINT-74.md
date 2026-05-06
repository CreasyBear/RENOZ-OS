# Operations Maintainer Sprint 74: Honest Site Visit Installer Assignment

## Status

Closed in commit-ready state.

## Issue 1: Site Visit Create Dialogs Hid Installer Directory Failure

### Problem

The project and schedule site-visit create dialogs loaded installer choices through generic users, collapsed lookup failures into a default-only dropdown, and labeled the server fallback as `Unassigned`. The server does not create unassigned visits; when no installer ID is sent it assigns the current user. That made a high-frequency scheduling workflow look safer and more flexible than it really was.

### Workflow Spine

Schedule calendar or project detail
-> site visit create dialog
-> `useAllInstallers`
-> `listAllActiveInstallers`
-> `queryKeys.installers.allActive`
-> `useCreateSiteVisit`
-> `createSiteVisitSchema`
-> `createSiteVisit`
-> `site_visits.installer_id`
-> site visit mutation invalidation.

### Touched Domains

- Jobs schedule site-visit creation.
- Jobs project site-visit creation.
- Installer directory read hook.
- Site-visit installer option helper.
- Site-visit mutation/source contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Operators scheduling site visits now see when the installer directory is unavailable instead of mistaking a failed read for a real empty installer list. The default assignment option now says `Assign to me`, which matches the current server contract and reduces accidental misassignment.

### Scope Constraints

- Do not change site visit create server behavior, database nullability, visit status transitions, project scoping, activity logging, or cache invalidation.
- Do not add availability scoring, smart assignment, or scheduling conflict checks.
- Do not change installer profile creation or installer management workflows.
- Keep true unassigned visits out of scope because that requires a product decision and a `site_visits.installer_id` schema/database change.

### Changes

- Replaced generic `useUsers` installer filtering in both site-visit create dialogs with the jobs-domain `useAllInstallers` hook.
- Normalized `useAllInstallers` read failures with an operator-safe installer directory fallback message.
- Added a shared site-visit installer option helper that maps active installer profiles to user IDs and centralizes the current-user fallback.
- Replaced the misleading `Unassigned` option with `Assign to me`.
- Added degraded-state alerts with retry actions for installer directory failures, including a cached-data state.
- Extended the site-visit mutation contract test to protect installer directory ownership, safe read error normalization, fallback labeling, and old `useUsers`/`unassigned` regressions.

### Standards Checked

- Domain ownership: strengthened. Site-visit assignment now reads from the jobs installer directory rather than admin user listing.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved and clarified through `useAllInstallers`, `listAllActiveInstallers`, `queryKeys.installers.allActive`, `useCreateSiteVisit`, `createSiteVisitSchema`, and existing site-visit invalidation.
- Tenant isolation/data integrity: server predicates were not changed; installer and site-visit reads/mutations still use existing organization-scoped server functions.
- Safe mutation/cache contracts: create mutation and invalidation behavior were not changed.
- Honest UI states: improved. Failed installer reads are visible, retryable, and do not masquerade as an empty installer list.
- Operator-safe errors: improved. Installer directory read failures now go through `normalizeReadQueryError`.
- Reviewability: the diff is bounded to two create dialogs, one small helper, one hook normalization, one source contract test, and this closeout.

### Smells Removed

- Generic admin user lookup inside site-visit create assignment UI.
- Silent installer lookup failure collapsing into a default-only select.
- False `Unassigned` copy for a server fallback that assigns the current user.
- Duplicated installer option construction across project and schedule create dialogs.
- Raw installer directory read failures from `useAllInstallers`.

### Deferred

- True unassigned site visits remain a product/schema decision because `site_visits.installer_id` is non-null and the server currently falls back to `ctx.user.id`.
- Installer availability, capacity, territory, and conflict-aware assignment remain future scheduling quality work.
- Browser QA was not run because this slice is contract-covered and did not change route loading or layout structure beyond a bounded degraded-state alert.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/site-visits-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Made in-session before this sprint: retired the stale serialized gate package command and script index entry so the old gate pack no longer appears as standing maintainer evidence. This sprint itself did not change the standing maintainer goal text.

### Residual Risk

Medium-low. The UI is now honest about the current assignment contract, but RENOZ may still want real unassigned scheduling later. That should be handled as a deliberate schema/server/product slice, not as another UI label change.
