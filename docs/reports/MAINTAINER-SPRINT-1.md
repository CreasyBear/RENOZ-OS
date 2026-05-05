# Reports Maintainer Sprint 1

This sprint picks up the generated-report failure path deferred from Warranty Sprint 42. The target is the warranty analytics PDF/Excel export action, which uses the shared reports `useGenerateReport` mutation and previously swallowed failures quietly.

Status: Closed after Issue 1.

## Business Value

Generated warranty analytics reports support internal reviews of battery warranty exposure, claim counts, SLA compliance, and management reporting. If PDF or Excel generation fails, operators need visible, safe feedback instead of a silent no-op.

## Workflow Spine

`/reports/warranties`
-> `WarrantyAnalyticsPage`
-> `WarrantyAnalyticsView`
-> PDF/Excel export action
-> `useGenerateReport`
-> `generateReport` server function and schema
-> report metrics aggregation and file upload
-> signed report URL
-> operator-safe generated-report failure toast.

## Architecture Constraints

- Keep this sprint to warranty analytics generated PDF/Excel failure feedback.
- Do not change generated report metrics, report formats, date range selection, scheduled reports, CSV/JSON warranty analytics export, server generation, file upload, signed URL creation, schemas, or report cache behavior.
- Add a reports-domain mutation formatter instead of reusing warranty mutation feedback across domain boundaries.
- Serialized gates are domain-triggered only; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. Warranty Analytics Generated Report Failure Feedback

Problem:

- The warranty analytics PDF/Excel export path caught generated-report failures with an empty handler.
- Operators could click export, get no file, and receive no explanation.

Workflow protected:

Warranty analytics route -> generated report export action -> reports hook -> generated report server function/schema -> metrics aggregation/file upload/signed URL -> safe failure toast.

Implemented slice:

- Added `formatReportsMutationError` for reports-domain mutation feedback.
- Exported the reports mutation formatter through the reports hook barrel.
- Routed warranty analytics PDF/Excel generated-report failures through route-local report-generation copy.
- Added focused source and formatter coverage for the generated-report feedback path.

Out of scope:

- Other report pages using `useGenerateReport`.
- Scheduled report create/update/delete/execute feedback.
- Generated report server behavior.
- File upload, signed URLs, report metrics, and generated document content.
- Browser QA and visual spacing.

Closeout:

- Touched domains: reports generated-report feedback, warranty analytics report action, reports tests, reports sprint evidence.
- Workflow protected: `/reports/warranties` -> `WarrantyAnalyticsPage` -> `useGenerateReport` -> `generateReport` -> `generateReportSchema` -> metrics aggregation/upload/signed URL -> safe failure toast.
- Business value protected: operators now get clear feedback when PDF/Excel warranty analytics generation fails.
- Architecture standards checked: route owns action-specific operator copy; reports formatter owns safe mutation message selection; reports hook/server/schema and warranty analytics data flow unchanged.
- Tenant isolation and data integrity checked: no organization predicate, metrics aggregation, file upload path, signed URL behavior, report payload, or database write changed.
- Query/cache contract checked: generated reports remain a mutation with no cache contract; no query keys or invalidations changed.
- Smells removed: silent generated-report failure on warranty analytics PDF/Excel export; missing reports-domain mutation formatter.
- Smells deferred: other report pages still have mixed generated-report feedback patterns; browser QA remains a future slice.
- Gates run: focused warranty analytics generated-report feedback, generate-report response, and warranty analytics export feedback contracts, 3 files / 4 tests; full reports unit suite, 4 files / 12 tests; full warranty unit suite, 48 files / 142 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this is toast-copy mutation-feedback behavior with source and unit coverage; serialized gates, because this slice does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.
- Goal adaptations: declined. The current sprint process and domain-triggered gate policy fit this slice.
- Residual risk: other report pages still have mixed generated-report feedback patterns; browser QA remains unrun.
