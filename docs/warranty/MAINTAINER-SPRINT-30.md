# Maintainer Sprint 30 - Bulk Import Mutation Toast Ownership

## Slice

The bulk warranty import dialog mixed two error responsibilities in one catch path. Local file-read and row-count validation belong to the dialog, but preview/register mutation failures belong to the warranty bulk-import hooks where normalized mutation errors and cache invalidation already live.

## Workflow Spine Protected

Warranty import settings route -> import settings container -> bulk import dialog -> preview/register bulk import hooks -> bulk import server functions -> warranty query invalidation -> operator toast.

## Business Value Protected

Bulk import is an operational path for registering many warranties after sales or warehouse handoff. Operators need clear feedback that distinguishes local CSV file issues from server-side parse/register failures without duplicate generic toasts.

## Change

- Removed the bulk import dialog's local `sonner` dependency.
- Split local file reading from preview mutation execution.
- Preserved inline file error handling for unreadable files and row-count limits.
- Removed duplicate generic preview/register failure toasts from the dialog.
- Kept import failure recovery behavior by returning the dialog to the preview step after register failure.
- Added a source-contract test that pins preview/register toast ownership to the bulk import hooks.

## Standards Checked

- Domain ownership: bulk import hooks own server/mutation error toasts; the dialog owns local file selection, local file-read errors, wizard state, and preview/import display.
- Route -> container -> hook flow: the settings container still dispatches preview and register through the existing hooks.
- Query/cache policy: bulk register invalidation of warranty lists is unchanged.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- Serialized lineage continuity: no import write-path logic changed; existing warranty bulk-import serialization coverage remains in the warranty suite.
- UI states: unreadable local files remain visible as inline upload errors, while backend preview/register failures surface through normalized hook toasts.
- Reviewability: the diff is limited to one dialog, one source-contract test, and this closeout note.

## Smells Removed

- Removed duplicate generic preview/register failure toasts around hook-owned mutations.
- Removed a local dialog dependency on `sonner` for mutation failure handling.
- Removed a mixed catch path that treated local file read errors and server preview errors the same way.

## Deferred

- The dialog is still large and owns multiple wizard subcomponents. A later architecture slice can extract the wizard state machine or upload/preview/import sections if behavior work needs more room.
- This does not change CSV parsing, transactional import behavior, or partial-failure result presentation.

## Gates

- Focused bulk import contract test: `bunx vitest run tests/unit/warranty/warranty-bulk-import-dialog-action-contract.test.ts tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-bulk-import-serialization.test.ts` passed, 3 files / 6 tests.
- Focused ESLint: `bunx eslint src/components/domain/warranty/dialogs/bulk-warranty-import-dialog.tsx tests/unit/warranty/warranty-bulk-import-dialog-action-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: no remaining local bulk import dialog `sonner` import or generic preview/register failure toast.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 40 files / 133 tests.
- Typecheck: `bun run typecheck` passed.
- Reliability lint: `bun run lint:reliability` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this UI/action ownership slice.

## Residual Risk

The source-contract test pins ownership boundaries by source text. That is useful for preventing duplicate toast regressions, but a future interaction test around preview failure, unreadable file handling, and register recovery would give stronger user-level coverage if this dialog is refactored.
