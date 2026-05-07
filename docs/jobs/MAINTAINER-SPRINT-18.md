# Jobs Maintainer Sprint 18: Project Task Lineage

## Status

Closed in commit-ready state.

## Issue 1: Site Visit Tasks Used Installer-Only Job Assignment Fallbacks

### Problem

`createTask` used project-linked job carriers for project-level tasks, but the site-visit task path looked for any job assignment in the tenant with the same installer. If found, the task could inherit a job assignment unrelated to the site visit's project. If not found, the fallback created an `SV-*` job assignment without `migratedToProjectId`, leaving project lineage split between the task's `siteVisitId` and an unrelated legacy job carrier.

### Workflow Spine

Project detail / site visit execution
-> project task mutation
-> `createTask`
-> site visit and project verification
-> project-linked legacy job carrier
-> `job_tasks.project_id` / `job_tasks.site_visit_id`
-> project task query and cache policy.

### Touched Domains

- Jobs project task server function.
- Jobs project task mutation source contract.
- Jobs maintainer closeout docs.

### Business Value Protected

RENOZ Energy uses project and site-visit tasks to coordinate occasional service/project work around battery installs, support, and follow-up. A task created from a site visit should remain attached to the correct project, not to a coincidental installer job from another customer or project.

### Scope Constraints

- Do not change task schemas, task UI, mutation hooks, query keys, cache invalidations, permissions, activity logging transport, project task list behavior, site visit execution UI, or database schema.
- Keep the legacy `jobId` carrier because the current task schema still requires it.
- Use existing project and site visit verification helpers for tenant-scoped reads.

### Changes

- Replaced `getOrCreateProjectPlaceholderJob` with `getOrCreateProjectTaskJob`.
- Routed site-visit task creation through the project-linked carrier using `migratedToProjectId`.
- Persisted `job_tasks.project_id` for site-visit-created tasks as well as project-level tasks.
- Removed installer-only fallback lookup and ad hoc `SV-*` job assignment creation.
- Extended the project task mutation source contract to protect project lineage and reject the removed workaround.

### Standards Checked

- Domain ownership: project task lineage remains in the Jobs server function where task creation is resolved.
- Route -> page -> hook -> server function -> schema/database -> query key/cache policy: preserved; only the server-side carrier resolution and inserted project id changed.
- Tenant isolation/data integrity: strengthened. Site visits and projects are verified inside the authenticated organization before task insertion, and task rows now keep direct project lineage.
- Query/cache policy: unchanged. Existing project task mutation hooks and invalidation behavior remain intact.
- UI states/error handling: unchanged. Existing operator-safe mutation formatting remains in place.
- Reviewability: one server helper/path cleanup, one focused source-contract expansion, and this closeout note.

### Smells Removed

- Installer-only job assignment fallback for site-visit tasks.
- `SV-*` ad hoc job assignment creation without project migration lineage.
- Stale placeholder/temporary-workaround comments in a task creation path.
- Site-visit-created tasks missing direct `projectId` persistence.

### Deferred

- A schema-level `site_visit_id` or purpose-specific task carrier on job assignments remains a future migration slice.
- Project task ordering across legacy carriers remains outside this slice.
- Browser QA was not selected because this is a server-lineage fix with no intended UI change.

### Gates

- Passed: focused project task mutation/read contracts.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted the current maintainer process update that serialized gates are retired and no longer part of routine closeout evidence.

### Residual Risk

Low to moderate. New site-visit tasks now keep project lineage, but the legacy requirement for a `jobId` carrier still exists until the task model can become fully project/site-visit native.
