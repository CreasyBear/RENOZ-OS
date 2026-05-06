# Operations Maintainer Sprint 61: Prune Dead Jobs Template Checklist UI

## Status

Closed in commit-ready state.

## Issue 1: Migrated Checklist UI Remained In Legacy Jobs Templates

### Problem

The legacy `src/components/domain/jobs/templates` barrel still exported checklist UI components after the checklist components had been migrated into the projects domain. Those old files were not referenced by live routes or containers, duplicated the project checklist components, and still contained stale raw error-handling patterns.

### Workflow Spine

Jobs template component ownership workflow
-> `src/components/domain/jobs/templates/index.ts`
-> active job template settings components
-> `/settings/job-templates`
-> `JobTemplateList`, `JobTemplateFormDialog`
-> jobs template hooks/server functions/query keys.

Project checklist UI ownership workflow
-> `src/components/domain/jobs/projects/checklists`
-> project-domain checklist cards and apply dialog
-> project detail/checklist workflows.

### Touched Domains

- Jobs template component barrel.
- Legacy jobs template checklist files.
- Project checklist ownership guard.
- Focused jobs dead-surface tests.
- Operations maintainer closeout docs.

### Business Value Protected

The jobs component tree has less stale UI to scan and fewer misleading exports for future work to reuse. Checklist UI ownership is clearer: template settings keep template components, while project checklist UI lives under projects.

### Scope Constraints

- Do not change `/settings/job-templates`, active job template list/form components, jobs hooks, server functions, query keys, schemas, cache behavior, or project checklist runtime behavior.
- Keep `JobTemplateList` and `JobTemplateFormDialog` exports intact for the settings route.
- Limit the slice to deleting unreferenced legacy checklist UI and guarding the barrel boundary.

### Changes

- Deleted legacy `jobs/templates/job-checklist-tab.tsx`.
- Deleted legacy `jobs/templates/checklist-item-card.tsx`.
- Deleted legacy `jobs/templates/apply-checklist-dialog.tsx`.
- Removed those exports from `jobs/templates/index.ts`.
- Added focused coverage that keeps migrated checklist UI out of the legacy jobs templates barrel while confirming active job template exports remain.

### Standards Checked

- Domain ownership: project checklist UI remains under `jobs/projects/checklists`; job template settings exports only template settings components.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged for live job-template and project-checklist workflows.
- Tenant isolation/data integrity: unchanged. No server functions, permissions, tenant predicates, database writes, or cache keys changed.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: no live UI behavior changed; stale unused UI with unsafe feedback patterns was removed.
- Reviewability: the diff deletes 777 lines of dead UI and adds one focused guard test.

### Smells Removed

- Dormant legacy job checklist tab.
- Dormant legacy checklist item card.
- Dormant legacy apply checklist dialog.
- Legacy `jobs/templates` exports for migrated project checklist UI.
- Unused raw checklist error-handling code.

### Deferred

- Live project checklist workflows still deserve a separate feedback/read-state hardening pass if scans show raw errors there.
- Broader jobs project surfaces still have many route-local mutation messages and should be handled in smaller workflow slices.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/jobs-template-dead-surface-contract.test.ts tests/unit/jobs/job-template-settings-contract.test.ts` - 2 files, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice deleted unreferenced UI without changing live route behavior, server behavior, schema/database, query key shape, cache invalidation, inventory behavior, or financial behavior.
- Skipped: browser QA because no live UI behavior changed.

### Goal Adaptation

Declined. The standing maintainer goal already covers modularity, domain ownership, reviewable diffs, and leaving the repo easier to reason about.

### Residual Risk

Low. Typecheck and source scans found no live consumers. Remaining jobs checklist feedback work belongs to live project-domain components, not the deleted legacy template files.
