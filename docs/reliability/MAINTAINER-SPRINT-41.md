# Reliability Maintainer Sprint 41: Project File Broken Thumbnail Fallback

## Status

Closed and commit-ready.

## Problem

Sprint 40 aligned project file cards with `ProjectFile.mimeType` so image files
render image thumbnails. The remaining resilience gap was the broken-image path:
if a project image URL failed to load, the card used direct DOM mutation to hide
the image element:

`(e.target as HTMLImageElement).style.display = 'none'`

That left the thumbnail area without the normal file icon fallback. Project file
cards should stay legible even when storage URLs expire, are removed, or fail to
load.

## Workflow Spine Protected

Jobs/projects file list -> `ProjectFilesGrid` presentation component ->
`ProjectFile.mimeType` and `fileUrl` -> image thumbnail attempt -> icon/extension
fallback when the image asset fails.

## Touched Domains

- Jobs/projects file presentation.
- Project file gallery resilience.
- Reliability/test coverage for broken thumbnail fallback behavior.

## Business Value Protected

Project files hold operational evidence: site photos, install photos, drawings,
reports, proposals, contracts, warranty documents, and support artifacts. If an
image URL breaks, operators still need a coherent file card with type and
extension context rather than an empty preview panel.

## Scope Constraints

- No route, container, hook, server function, schema, database query, tenant
  check, query key, cache invalidation, mutation, inventory, finance, or
  serialized-lineage behavior changed.
- File upload/storage behavior is unchanged.
- Successful image thumbnail behavior from Sprint 40 is preserved.
- Non-image card thumbnails remain icon/extension based.
- The preview dialog behavior is unchanged.

## Changes

- Replaced direct image `style.display` mutation with React state owned by the
  `FileCard`.
- Tracked the failed image URL so a future changed URL can try rendering again
  without a reset effect.
- Reused the existing icon/extension fallback for broken image thumbnails.
- Added focused render coverage that fires an image error and verifies the card
  falls back to the file icon thumbnail.
- Extended the source contract to prevent direct DOM hiding from returning.

## Standards Checked

- Domain ownership: thumbnail fallback stays inside the jobs project files
  presentation component that owns file cards.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This slice consumes already-loaded project file
  data only.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: improved by keeping the card
  visually informative when an image asset fails.
- Mutation/cache contracts: unchanged.
- Reviewable diff: one presentation component update, one focused test update,
  one closeout doc.

## Smells Removed

- Removed direct DOM mutation from image error handling.
- Removed blank-thumbnail behavior for broken image URLs.
- Kept thumbnail failure local to the failed URL, so a changed URL can reattempt
  image rendering.

## Smells Deferred

- The preview dialog image path still relies on the browser image element
  directly. If broken preview URLs become visible in use, that should be a
  separate dialog-focused resilience slice.
- Remaining TODO markers belong to other domains, including mobile fixtures, AI
  sidebar integration, document type handling, reporting chart sections, and
  kanban indexing.
- No browser QA was run because this behavior is covered by a focused component
  render test and does not alter routing, data fetching, mutations, or layout
  structure.

## Gates

- Focused component test:
  `./node_modules/.bin/vitest run tests/unit/jobs/project-files-grid-preview-contract.test.tsx --reporter=dot --printConsoleTrace`
  - Passed, 1 file / 4 tests in 2s.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/jobs/presentation/files/ProjectFilesGrid.tsx tests/unit/jobs/project-files-grid-preview-contract.test.tsx --report-unused-disable-directives`
  - Passed in 2s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 55s after replacing the nullable `file.fileUrl` JSX prop with a
    concrete `imageUrl` string.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed in 149s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 718 files / 2338 tests in 127s.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
turning a known residual risk into a tested UI contract: project file cards stay
useful when image assets fail.

## Residual Risk

Low application risk. The change only affects broken image thumbnail fallback
for already-loaded project files. Medium follow-up risk remains in the preview
dialog image path, which still has no explicit broken-image fallback.
