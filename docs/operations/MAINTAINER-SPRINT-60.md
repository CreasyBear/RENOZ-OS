# Operations Maintainer Sprint 60: Job Template Mutation Feedback And Tenant Writes

## Status

Closed in commit-ready state.

## Issue 1: Job Template Mutations Failed Silently And Final Writes Lacked Tenant Predicates

### Problem

The `/settings/job-templates` workflow swallowed duplicate, create, update, and delete mutation failures with `catch {}` blocks while comments claimed the hook handled error toasts. The hooks did not. The server also verified template access before update/delete, but the final update/delete statements only filtered by template id instead of carrying the organization predicate into the write.

### Workflow Spine

Job template settings workflow
-> `/settings/job-templates`
-> `JobTemplatesSettingsPage`
-> `JobTemplateList`, `JobTemplateFormDialog`
-> `useJobTemplates`, `useCreateJobTemplate`, `useUpdateJobTemplate`, `useDeleteJobTemplate`
-> `listJobTemplates`, `createJobTemplate`, `updateJobTemplate`, `deleteJobTemplate`
-> `jobTemplates`, `checklistTemplates`, `slaConfigurations`, `products`
-> `queryKeys.jobTemplates.templates()` and `queryKeys.jobTemplates.template(templateId)`
-> safe mutation feedback, tenant-scoped writes, and cache invalidation.

### Touched Domains

- Settings/job templates route.
- Jobs template list and form dialog.
- Jobs hooks barrel and mutation feedback helper.
- Jobs server functions for template update/delete.
- Focused jobs settings contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators now get visible, safe feedback when job template create, update, duplicate, or delete actions fail. Final job template update/delete writes also retain the tenant predicate, reducing cross-tenant blast radius and making the server contract easier to audit.

### Scope Constraints

- Do not change job template form fields, list layout, create payload shape, checklist/SLA/product validation, query key shape, cache invalidation, or success behavior.
- Keep create/update/delete hooks focused on mutation/cache contracts; UI call sites own the user-facing toast copy for this slice.
- Limit server changes to carrying organization scope into final update/delete write predicates.

### Changes

- Added `formatJobTemplateMutationError`.
- Routed duplicate failures in `/settings/job-templates` through safe jobs-owned copy.
- Routed create/update failures in `JobTemplateFormDialog` through safe jobs-owned copy.
- Routed delete failures in `JobTemplateList` through safe jobs-owned copy.
- Exported the formatter from the jobs hook barrel.
- Added `jobTemplates.organizationId = ctx.organizationId` to final update and delete write predicates.
- Added focused coverage for formatter safety, UI feedback wiring, tenant-scoped writes, and job template cache keys.

### Standards Checked

- Domain ownership: job-template mutation copy now lives in the jobs hook domain.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and preserved for job template list/create/update/delete/duplicate.
- Tenant isolation/data integrity: strengthened. Update/delete writes now include the organization predicate in the final write, not only in the preflight access check.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: strengthened. Mutation failures no longer fail silently.
- Reviewability: the diff is limited to jobs mutation feedback, tenant predicates, one focused test, and this closeout note.

### Smells Removed

- Bare `catch {}` in job template duplicate handling.
- Bare `catch {}` in job template create/update handling.
- Bare `catch {}` in job template delete handling.
- Incorrect comments claiming mutation hooks handled error toasts.
- Final job template update/delete writes filtered only by template id.
- Missing job-template mutation feedback contract.

### Deferred

- Job template read-state display still passes normalized read errors through a generic `ErrorState`; a future jobs read-copy slice could add a jobs-owned read formatter if needed.
- Checklist application mutation feedback in job detail surfaces remains separate jobs workflow work.
- Job template success feedback remains unchanged.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/job-template-settings-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/query-normalization-wave4b-admin.test.tsx` - 1 file, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change job template schema shape, form layout, create payload semantics, query key shape, cache invalidation, inventory behavior, or financial behavior.
- Skipped: browser QA because the intended UI behavior change is error feedback only and is covered by source contracts; no layout or interaction flow changed.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, tenant isolation, operator-safe errors, mutation/cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Medium-low. Job template mutation failures are now visible and final writes are tenant-scoped. The remaining risk is broader jobs template/read/checklist UX polish outside this narrow settings mutation slice.
