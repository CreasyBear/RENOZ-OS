# Maintainer Sprint 42 - Warranty Analytics Export Feedback

## Slice

Sprint 41 hardened warranty analytics read states. The same report page still handled CSV/JSON export mutation failures with `error.message`, bypassing the warranty mutation formatter used by the rest of the warranty domain.

## Workflow Spine Protected

`/reports/warranties`
-> `WarrantyAnalyticsPage`
-> `useExportWarrantyAnalytics`
-> `exportWarrantyAnalytics` server function and schema
-> warranty analytics server reads
-> generated CSV/JSON browser download
-> operator-safe export failure toast.

## Business Value Protected

Warranty analytics exports support reporting on battery warranty exposure, claim costs, SLA performance, cycle-count behavior, and extension economics. When export fails, operators should get clear retry guidance without raw server, database, or transport wording.

## Touched Domains

- Warranty analytics report page.
- Warranty hooks barrel export for the existing mutation formatter.
- Warranty analytics export feedback tests.
- Warranty sprint evidence.

## Change

- Added route-local warranty analytics export failure copy for permission, auth, and rate-limit failures.
- Routed export mutation failures through `formatWarrantyMutationError`.
- Exported the existing warranty mutation formatter from the warranty hooks barrel so report pages can use the same domain feedback boundary as warranty hooks.
- Added a focused source contract for the export page/hook/server/schema mutation spine.

## Standards Checked

- Domain ownership: the page owns export toast copy; the existing warranty formatter owns safe mutation message selection; the export hook/server/schema are unchanged.
- Route -> container -> hook -> server flow: `/reports/warranties` still calls `useExportWarrantyAnalytics`, which calls `exportWarrantyAnalytics`, which validates `exportWarrantyAnalyticsSchema` and builds CSV/JSON from analytics server reads.
- Query/cache policy: no query keys or cache behavior changed; export remains a mutation with no cache contract.
- Tenant isolation/data integrity: no analytics server reads, organization predicates, financial calculations, CSV/JSON generation, or database writes changed.
- UI states/error handling: export failures now use warranty-domain safe copy instead of arbitrary thrown error text.
- Reviewability: the diff is limited to the page feedback boundary, a barrel export, one source contract, and this closeout note.

## Smells Removed

- Removed raw `error.message` export failure toast from the warranty analytics page.
- Removed ad hoc export fallback copy that was inconsistent with warranty mutation feedback.

## Deferred

- PDF/Excel export through generated reports still swallows failures quietly and should be a separate reports mutation-feedback slice.
- Warranty analytics chart presenters still live under `components/domain/support`, which remains a domain-boundary smell.
- Browser QA remains deferred.

## Gates

- Focused warranty analytics export feedback, mutation formatter, and analytics normalization tests: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-analytics-export-feedback-contract.test.ts tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/query-normalization-wave3-analytics.test.tsx` passed, 3 files and 9 tests.
- Warranty unit suite: `./node_modules/.bin/vitest run tests/unit/warranty` passed, 48 files and 142 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Source scans: confirmed the warranty analytics page routes export failures through `formatWarrantyAnalyticsExportError`, the raw `toast.error(error.message || 'Failed to export analytics data.')` path is absent, and the export page/hook/server/schema spine remains intact.
- Serialized/reliability gates: skipped by current maintainer direction; this slice does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.
- Browser QA: skipped because this is toast-copy mutation-feedback behavior with source and unit coverage.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. This is a bounded warranty-domain mutation-feedback cleanup using the current domain-triggered gate policy.

## Residual Risk

PDF/Excel generated-report failures are still swallowed quietly and should be handled in a separate reports mutation-feedback slice. Browser QA remains unrun.
