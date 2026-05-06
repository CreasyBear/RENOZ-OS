# Operations Maintainer Sprint 72: Job Template Settings Component Ownership

## Status

Closed in commit-ready state.

## Issue 1: Job Template Settings UI Was Exported Through The Broad Jobs Barrel

### Problem

The active `/settings/job-templates` route managed real field-operations template workflows, but it imported `JobTemplateList` and `JobTemplateFormDialog` through the broad `@/components/domain/jobs` barrel. Those components also lived under the vague legacy path `src/components/domain/jobs/templates`, even after checklist UI had already moved out of that surface. The result was a fuzzy ownership boundary: settings template UI looked like temporary legacy support even though the workflow is active and business-relevant.

### Workflow Spine

`/settings/job-templates`
-> `JobTemplateList`, `JobTemplateFormDialog`
-> `useJobTemplates`, `useCreateJobTemplate`, `useUpdateJobTemplate`, `useDeleteJobTemplate`
-> `listJobTemplates`, `createJobTemplate`, `updateJobTemplate`, `deleteJobTemplate`
-> `jobTemplates`
-> `queryKeys.jobTemplates.templates()` and `queryKeys.jobTemplates.template(templateId)`.

### Touched Domains

- Settings job templates route.
- Jobs job-template settings components.
- Jobs component barrel.
- Query normalization tracker docs.
- Focused job template contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Job templates speed up repeatable operational work: installations, inspections, services, and commissioning workflows can be started with consistent task/checklist defaults. This slice makes that active settings surface explicit and removes a broad import path that made ownership harder to reason about.

### Scope Constraints

- Do not change job-template form fields, validation, mutation behavior, query keys, server functions, schemas, or cache policy.
- Do not move job template hooks/server functions out of the jobs domain.
- Do not touch project checklist UI, project creation template consumption, scheduling, inventory, or finance.
- Do not broaden into a project-template product redesign.

### Changes

- Moved active job-template settings components from `src/components/domain/jobs/templates` to `src/components/domain/jobs/job-templates`.
- Updated `/settings/job-templates` to import directly from `@/components/domain/jobs/job-templates`.
- Removed job-template settings exports from the broad jobs component barrel.
- Updated component header references to the actual `use-job-templates-config` hook module.
- Updated the query-normalization tracker path for the moved form dialog.
- Updated focused contracts to assert the old `jobs/templates` source path stays empty and the settings route does not import template UI through the broad jobs barrel.

### Standards Checked

- Domain ownership: strengthened. Active job-template settings UI now has an explicit `jobs/job-templates` module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: route/component ownership changed; hook/server/schema/query-key contracts were inspected and left intact.
- Tenant isolation/data integrity: not changed; server functions and tenant-scoped write predicates were not edited.
- Safe mutation/cache contracts: preserved from prior job-template hardening.
- Honest UI states: preserved; list/form read and mutation states were not redesigned.
- Transactional inventory and finance integrity: not touched.
- Reviewability: the diff is a bounded component move plus import/docs/test updates.

### Smells Removed

- Active settings route importing job-template UI through the broad jobs barrel.
- Vague legacy `jobs/templates` path carrying active settings components.
- Jobs component barrel exporting settings-specific template components.
- Reference tracker path pointing at the old component location.

### Deferred

- Product naming remains "job templates"; deciding whether these become "project templates" is a product/model slice, not a file move.
- Project create/task dialogs still consume job-template hooks directly; their UX and template semantics remain separate follow-up opportunities.
- The jobs component barrel still serves active schedule/my-task routes; reducing that broader barrel is a future route-by-route cleanup.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/jobs-template-dead-surface-contract.test.ts tests/unit/jobs/job-template-settings-contract.test.ts tests/unit/jobs/query-normalization-wave4b-admin.test.tsx` - 3 files, 12 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this is a bounded component ownership move covered by focused contracts plus type/lint gates.

### Goal Adaptation

Declined. The standing maintainer goal and sprint process already require clear ownership, reviewable boundaries, route-to-query-cache traceability, meaningful tests, and evidence-based closeout.

### Residual Risk

Low. The active route and tests now point at the explicit job-template module. Remaining risk is product semantics: whether RENOZ wants job templates to become project templates should be decided deliberately, not hidden inside a path cleanup.
