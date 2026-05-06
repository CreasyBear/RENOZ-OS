# Communications Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Template Mutation Failure Copy

### Problem

Email template create, update, delete, clone, and restore-version failures still used generic `getUserFriendlyMessage(error as Error)` or broad "Failed to ..." toasts. Version restore also rethrew broad failure copy after the toast. That left template management behind the communications-owned mutation feedback contract and risked exposing backend, database, stack, or server details during reusable outbound communication setup.

### Workflow Spine

Communications templates route
-> `TemplatesPage`
-> `useTemplatesPage`, `TemplatesList`, and `TemplateEditor`
-> template mutation hooks
-> communications template server functions
-> template schema/database records and version history
-> template query keys
-> communications-owned template mutation formatter
-> operator-safe create, update, delete, clone, and restore failure copy.

### Touched Domains

- Communications template editor.
- Communications templates page handlers.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Reusable email templates support sales, ordering, support, warranty, RMA, dealer, and customer follow-up. Operators should be able to create, update, delete, clone, and restore templates with safe recovery copy when the mutation fails, without seeing raw database constraints, stack traces, or server internals.

### Scope Constraints

- Do not change template routes, list rendering, editor layout, formatting toolbar behavior, variable insertion, preview rendering, server functions, schemas, tenant predicates, success copy, read-state query normalization, template versioning behavior, or template persistence behavior.
- Preserve the existing cache policy: create/delete/clone invalidate templates; update invalidates templates, detail, and versions when applicable; restore invalidates template queries.
- Keep this as template mutation failure feedback only.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added template fallbacks for create, update, clone, and restore while preserving existing save/delete fallbacks.
- Routed template editor create and update failures through `formatCommunicationTemplateMutationError`.
- Routed template page delete, clone, and restore failures through `formatCommunicationTemplateMutationError`.
- Replaced restore-version rethrow text with the same safe formatter output used for the toast.
- Added focused coverage for unsafe template restore fallback suppression and source-level template formatter wiring.

### Standards Checked

- Domain ownership: template mutation feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing template mutations fail.
- Query/cache policy: unchanged. No invalidation, rollback, stale-time, detail key, list key, or version key behavior changed.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, template persistence, version history, or render behavior changed.
- UI states/error handling: strengthened. Template mutation failures no longer expose raw mutation messages.
- Reviewability: the diff is limited to formatter fallbacks, editor/page failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for template create and update failures.
- Broad unformatted template delete, clone, and restore page failures.
- Broad restore-version rethrow copy after a failed mutation.
- Missing template create/update/clone/restore coverage in the communications mutation feedback contract.

### Deferred

- Template read-state copy still displays normalized read-query messages and can be reviewed separately as a query-state slice.
- Email preview, communication preferences, suppression dialogs, quick log, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 10 tests.
- Passed: targeted source scan for template formatter wiring and removed raw template mutation failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 54 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, repair scripts, serial lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer process already covers domain ownership, operator-safe errors, query/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for template mutation failure feedback. Remaining communications feedback risk is broader: read-state copy and other communications action surfaces still need their own domain review.
