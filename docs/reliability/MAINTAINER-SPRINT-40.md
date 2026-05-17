# Reliability Maintainer Sprint 40: Project File Image Preview Classification

## Status

Closed and commit-ready.

## Problem

`ProjectFilesGrid` had a stale TODO in the project file card path:

`const isImage = false; // TODO: Detect from mimeType when properly stored`

The `ProjectFile` schema already carries `mimeType`, and the preview dialog in
the same component already used MIME type to distinguish images and PDFs. The
grid card path had drifted from the local data contract, so uploaded site photos
and other image project files rendered as generic file icons instead of useful
visual thumbnails.

## Workflow Spine Protected

Jobs/projects file list -> `ProjectFilesGrid` presentation component ->
`ProjectFile.mimeType` schema contract -> card thumbnail classification ->
image/PDF preview classification.

## Touched Domains

- Jobs/projects file presentation.
- Project file schema usage at the UI boundary.
- Reliability/test coverage for file preview classification.

## Business Value Protected

Project files carry operational evidence: photos, drawings, reports, proposals,
contracts, warranty documents, and service/project artifacts. For RENOZ Energy,
site and product photos should be inspectable at a glance instead of hidden
behind generic icons. This makes project file galleries more useful for support,
warehouse, service, and warranty follow-up.

## Scope Constraints

- No route, container, hook, server function, schema, database query, tenant
  check, query key, cache invalidation, mutation, inventory, finance, or
  serialized-lineage behavior changed.
- File upload/storage behavior is unchanged.
- File preview dialog behavior is preserved, but now uses the same helpers as
  the card path.
- Non-image card thumbnails remain icon/extension based.
- Broken image URL fallback behavior is unchanged.

## Changes

- Added file-local `isProjectFileImage` and `isProjectFilePdf` helpers based on
  `ProjectFile.mimeType`.
- Replaced the hardcoded `isImage = false` card behavior with MIME-type image
  detection.
- Updated the preview dialog to use the same MIME-type helpers.
- Added focused render coverage proving image files render thumbnails and PDFs
  remain icon thumbnails.
- Added a source contract proving the stale TODO and hardcoded `false` branch do
  not return.

## Standards Checked

- Domain ownership: preview classification stays in the jobs project files
  presentation component that owns the rendered file cards.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This slice consumes the existing `ProjectFile`
  shape after data has loaded.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: unchanged; visual classification
  now reflects the existing schema contract.
- Mutation/cache contracts: unchanged.
- Reviewable diff: one presentation component update, one focused test, one
  closeout doc.

## Smells Removed

- Removed stale project file image-detection TODO.
- Removed hardcoded false image classification from project file cards.
- Reduced local inconsistency between card thumbnails and preview dialog logic.

## Smells Deferred

- Broken image URL fallback still hides the failed image element without
  restoring the icon thumbnail. That is a separate UI resilience slice.
- Remaining TODO markers now belong to other domains, including mobile fixtures,
  AI sidebar integration, document type handling, and reporting chart sections.
- No browser QA was run because the behavior is covered by focused component
  render tests and does not alter routing, data fetching, mutations, or layout
  structure.

## Gates

- Focused component test:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-files-grid-preview-contract.test.tsx --reporter=dot --printConsoleTrace`
  - Passed, 1 file / 3 tests in 2s.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/jobs/presentation/files/ProjectFilesGrid.tsx tests/unit/jobs/project-files-grid-preview-contract.test.tsx --report-unused-disable-directives`
  - Passed in 1s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 63s.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed in 63s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 718 files / 2337 tests in 102s.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
removing a stale TODO and aligning a UI boundary with the existing domain schema
instead of leaving project file behavior partially hardcoded.

## Residual Risk

Low application risk. The change only affects image thumbnail classification for
already-loaded project files. The main residual risk is broken image URL
fallback behavior, which remains visible and bounded for a future sprint.
