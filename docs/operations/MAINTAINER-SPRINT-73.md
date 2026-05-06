# Operations Maintainer Sprint 73: Explicit Jobs Route Imports

## Status

Closed in commit-ready state.

## Issue 1: Active Jobs Routes Still Imported Through The Broad Jobs Component Barrel

### Problem

After the time-tracking and job-template ownership cleanups, the remaining active route imports from `@/components/domain/jobs` were schedule and my-tasks routes. The actual component owners already had explicit modules (`jobs/schedule`, `jobs/technician`, `jobs/my-tasks`), so the broad root barrel hid ownership and made it easier for future work to add mixed-domain exports back into a file that no longer represented a coherent UI boundary.

### Workflow Spine

Schedule hub/calendar/timeline routes
-> `jobs/schedule` components
-> schedule hooks/server functions/schemas.

My tasks route
-> `jobs/technician` schedule view and `jobs/my-tasks` kanban view
-> site visit and task hooks/server functions/schemas.

### Touched Domains

- Schedule routes.
- My tasks route.
- Jobs component module boundary.
- Existing time/template boundary tests.
- New jobs component barrel boundary test.
- Operations maintainer closeout docs.

### Business Value Protected

Schedule and my-tasks are high-frequency operator workflows for field execution. Direct imports make the route-to-component ownership easier to trace and reduce the chance of future changes landing in a mixed root barrel instead of the module that actually owns the workflow.

### Scope Constraints

- Do not change schedule, my-tasks, technician, or kanban behavior.
- Do not touch hooks, server functions, schemas, query keys, route search schemas, inventory, finance, or serialized lineage.
- Do not remove subdomain barrels such as `jobs/schedule`, `jobs/technician`, `jobs/projects`, or `jobs/installers`.
- Keep this as a route import and boundary cleanup only.

### Changes

- Updated `/my-tasks` to import `TechnicianDashboard` from `@/components/domain/jobs/technician`.
- Updated schedule hub/calendar/timeline routes to import schedule components from `@/components/domain/jobs/schedule`.
- Deleted the now-unused root `src/components/domain/jobs/index.ts` component barrel.
- Added a focused boundary test that keeps active routes on explicit jobs component modules.
- Updated existing time-tracking and job-template boundary tests to treat the root jobs component barrel as intentionally absent.

### Standards Checked

- Domain ownership: strengthened. Active routes now point at the exact schedule, technician, or my-tasks owner.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: route-to-component ownership changed; downstream contracts were not changed.
- Tenant isolation/data integrity: not touched.
- Safe mutation/cache contracts: not touched.
- Honest UI states: not touched.
- Transactional inventory and finance integrity: not touched.
- Reviewability: the diff is bounded to route imports, one deleted barrel, tests, and this closeout.

### Smells Removed

- Broad `@/components/domain/jobs` route imports.
- Root jobs component barrel mixing projects, schedule, technician, site visits, installers, job templates, and time-tracking ownership.
- Boundary tests depending on a broad barrel file after prior slices had already made the active modules explicit.

### Deferred

- Route-by-route imports from subdomain barrels can still be made more granular if a future slice finds a meaningful ownership benefit.
- The jobs hook/server barrels remain separate concerns and were not evaluated in this UI component boundary slice.
- Schedule/my-tasks UX and error-state quality remain future product-maintenance targets.

### Gates

- Passed: `bun test tests/unit/jobs/jobs-component-barrel-boundary.test.ts tests/unit/jobs/time-tracking-boundary-contract.test.ts` - 2 files, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/jobs-template-dead-surface-contract.test.ts` - 1 file, 1 test.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this is a bounded import-boundary cleanup covered by focused source contracts plus type/lint gates.

### Goal Adaptation

Declined. The standing maintainer goal already requires clear ownership, reviewable boundaries, meaningful evidence, and sprint closeout.

### Residual Risk

Low. Typecheck proves no hidden source imports depend on the deleted root jobs component barrel. The remaining risk is broader architectural consistency in hook/server barrels, which should be handled separately and only when tied to an active workflow.
