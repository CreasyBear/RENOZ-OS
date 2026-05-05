# Reports Maintainer Sprint 8

## Status

Closed after Issue 1.

## Issue 1: Procurement Custom-Report Creation Failure Feedback

### Problem

Procurement report custom-report creation still showed generic `Failed to create custom report` copy. This sat outside the scheduled-report formatter work and left one report-page mutation path without operator-safe, domain-specific feedback.

### Workflow Spine

`/reports/procurement`
-> `ProcurementReportsPage`
-> custom report dialog action
-> `handleCreateCustomReport`
-> `useCreateCustomReport`
-> `createCustomReport` server function
-> `createCustomReportSchema` / custom reports database
-> centralized custom-report query keys
-> safe failure toast.

### Touched Domains

- Reports/procurement custom reports.
- Reports mutation error formatting.
- Maintainer process documentation for retired gate expectations.

### Business Value Protected

Procurement operators can trust custom-report creation failures as actionable application feedback instead of a generic dead end or a leaked internal failure. This keeps reporting work from becoming another support/debugging interruption during ordering and supplier operations.

### Scope Constraints

- Touched only procurement custom-report creation failure feedback.
- Did not change custom report schemas, definitions, columns, server functions, query keys, cache invalidation, execution behavior, or scheduling behavior.
- Did not broaden to custom report update/delete/execute UI because this page only owns custom report creation.

### Changes

- Added `formatCustomReportMutationError` beside the reports mutation formatters.
- Routed procurement custom-report creation failures through the formatter.
- Added a source contract covering the formatter, procurement page create path, custom-report hook/cache policy, server tenant scope, and schema.

### Standards Checked

- Domain ownership: custom-report mutation feedback stays in `src/hooks/reports`.
- Route/page -> action -> hook -> server/schema -> query key spine: protected by the contract test.
- Query/cache policy: unchanged; `useCreateCustomReport` still sets detail cache and invalidates custom-report lists.
- Tenant isolation: unchanged; server create path still writes `organizationId: ctx.organizationId` after `withAuth`.
- Inventory/finance integrity: no inventory, serial, or finance writes touched.
- UI state: failed custom-report creation now produces explicit operator-safe feedback.
- Error handling: unsafe database/internal messages stay behind fallback copy.
- Diff reviewability: one formatter helper, one procurement call site, one contract, one sprint note.

### Gates Run

- Focused reports feedback contracts: `./node_modules/.bin/vitest run tests/unit/reports/custom-report-feedback-contract.test.ts tests/unit/reports/scheduled-report-management-feedback-contract.test.ts tests/unit/reports/generated-report-feedback-contract.test.ts` passed, 3 files / 10 tests.
- Full reports unit suite: `./node_modules/.bin/vitest run tests/unit/reports` passed, 8 files / 24 tests.
- TypeScript: `bun run typecheck` passed.
- ESLint: `bun run lint` passed.
- Targeted source scan for formatter usage, generic custom-report failure removal, discarded `catch {}` removal, custom-report hook/cache policy, server tenant scope, and schema spine passed.
- Diff hygiene: `git diff --check` passed.

### Gates Skipped

- Browser QA skipped because this is source-covered toast feedback with no layout or render-state change.

### Smells Removed

- Generic procurement custom-report creation failure toast.
- `catch {}` path that discarded the mutation error.

### Deferred

- Custom report update/delete/execute feedback remains outside this page-level creation slice.
- Success toast copy remains unchanged.

### Goal Adaptation

- Adopted the maintainer-process adjustment that serialized gates are retired as routine sprint evidence and should only be reopened for deliberate serialized-lineage or inventory-identity work.

### Residual Risk

- Remaining risk is contained to adjacent custom-report actions not touched by this slice: update, delete, and execute feedback may still need their own reports-domain pass.
