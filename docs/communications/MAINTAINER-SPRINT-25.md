# Communications Maintainer Sprint 25

## Status

Closed in commit-ready state.

## Issue 1: Template Editor Submit Error Copy

### Problem

The template editor used communications-owned mutation formatters for create/update toast failures, but the form-level error summary still rendered `(createTemplate.error ?? updateTemplate.error)?.message` directly. A failed template save could therefore expose backend-shaped details in the editor even though the mutation formatter already had safe create/update recovery copy.

### Workflow Spine

Template editor workflow
-> `TemplateEditor`
-> `useCreateTemplate` / `useUpdateTemplate`
-> template create/update server functions
-> email template schema/database records
-> template query/cache invalidation
-> communications template mutation formatter
-> operator-safe form summary copy.

### Touched Domains

- Communications template editor.
- Communications mutation error source contract test.
- Communications maintainer closeout docs.

### Business Value Protected

Email templates support repeatable customer, warranty, support, order, and marketing communications. When saving a template fails, operators need stable recovery copy in the editor without database, provider, or infrastructure detail leaking into the workflow.

### Scope Constraints

- Do not change template create/update mutation behavior, editor fields, validation schema, preview behavior, variable insertion, query keys, cache invalidation, server functions, tenant predicates, schemas, or toast behavior.
- Keep this as template editor submit-error display only.
- Field-level validation error extraction is left unchanged because those messages come from the local form schema and field state, not backend mutation failures.
- Browser QA is skipped because this is copy-path behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added a formatter-owned `submitError` value for template create/update failures.
- Routed the template editor `FormErrorSummary` through `formatCommunicationTemplateMutationError`.
- Extended the communications mutation error source contract so the template editor keeps both toast and form summary failures behind communications-owned formatters.

### Standards Checked

- Domain ownership: template editor submit copy now uses the communications template mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only editor error presentation after an existing mutation fails.
- Query/cache policy: unchanged. Template list/detail invalidation and page hook behavior were not changed.
- Tenant isolation/data integrity: unchanged. Template mutations still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. The editor no longer renders raw create/update mutation error text in its form-level summary.
- Reviewability: the diff is limited to one derived submit-error expression, one form summary call site, one source contract assertion set, and this closeout note.

### Smells Removed

- Direct `(createTemplate.error ?? updateTemplate.error)?.message` rendering in the template editor.
- Split error policy where toast failures were formatter-owned but form summary failures were raw.

### Deferred

- The subject field's `rawError.message` extraction remains because it is local validation field state, not an operator-facing backend mutation error.
- Generic communications error boundary behavior remains separate because it handles render exceptions rather than mutation feedback.
- Browser QA was not run because this is submit-error copy behavior with no intended layout change.

### Gates

- Passed: focused communications mutation error contract test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 13 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 20 files, 70 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader communications suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is mutation copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Declined. This sprint applies the standing maintainer goal by tightening an operator-facing mutation feedback boundary without widening behavior.

### Residual Risk

Low for template editor submit-error copy. Remaining communications error-surface risk is concentrated in generic communications render-boundary display and a final classification pass over already-formatted form submit surfaces.
