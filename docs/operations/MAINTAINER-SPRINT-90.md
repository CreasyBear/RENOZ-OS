# Operations Maintainer Sprint 90: Canonical Permission Boundary

## Status

Closed and commit-ready.

## Problem

Several authorization boundaries used optional-chained permission constants with
raw string fallbacks, for example:

`PERMISSIONS.job?.read ?? 'customer.read'`

That pattern makes permission drift quiet. If a permission domain is renamed,
deleted, or partially migrated, TypeScript may not catch the mistake and the
runtime can fall back to the wrong domain or to authentication-only behavior.
The worst examples were jobs functions falling back to customer permissions, but
the same pattern existed across pipeline/opportunity, support/RMA, documents,
and API token creation.

## Workflow Spine Protected

Route or caller -> server function -> `withAuth({ permission })` -> canonical
`PERMISSIONS` matrix -> role permission check -> tenant-scoped server function
query/mutation.

## Touched Domains

- Jobs: tasks, task kanban, checklists, time, and materials.
- Pipeline/opportunities: opportunity CRUD, activities, quotes, validity,
  conversion, win/loss reasons, and quote versions.
- Support/RMA: support issue delete and RMA cancel permission boundary.
- Documents/settings: document template read/update/reset permission boundary.
- Settings/API tokens: API token creation permission boundary.
- Admin UI: admin navigation card permission constants.
- Auth/reliability tests: permission source contract.

## Business Value Protected

Authorization mistakes in RENOZ-V3 can expose or block operational workflows
that matter to the business: job execution, sales pipeline control, support/RMA
closeout, document template governance, and API token creation. This sprint
makes permission drift fail loudly in code review/typecheck instead of quietly
falling back to a different business domain.

## Scope Constraints

- No role-permission matrix entries changed.
- No user roles, routes, schemas, database queries, tenant filters, cache keys,
  or UI behavior changed intentionally.
- No new authorization model was introduced.
- This sprint only replaces optional/fallback permission expressions with
  direct canonical constants and adds source coverage to keep them from
  returning.

## Changes

- Replaced `PERMISSIONS.<domain>?.<action> ?? '<raw permission>'` with direct
  `PERMISSIONS.<domain>.<action>` across jobs, pipeline/opportunity,
  support/RMA, and document template server functions.
- Replaced optional `PERMISSIONS.settings?.read/update` checks with direct
  settings constants.
- Replaced raw `withAuth({ permission: "api_token.create" })` with
  `PERMISSIONS.apiToken.create`.
- Replaced admin feature-card raw permission strings with constants from the
  permission matrix.
- Added `tests/unit/auth/permission-source-contract.test.ts` to reject:
  - optional-chained permission constants at auth boundaries
  - raw string fallbacks from canonical permission constants
  - raw permission strings passed to server-function `withAuth`

## Standards Checked

- Domain ownership: permission truth remains centralized in
  `src/lib/auth/permissions.ts`.
- Route -> server function -> schema/database -> query/cache policy: behavior is
  unchanged; this slice tightens the auth boundary before the existing server
  functions run.
- Tenant isolation: unchanged and protected by preserving `withAuth` as the
  entrypoint that also sets `app.organization_id`.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Operator-safe errors: unchanged. Permission failures still flow through the
  existing `PermissionDeniedError` path.
- Reviewable diff: mechanical permission-boundary replacement plus one focused
  source contract and closeout docs.

## Smells Removed

- Removed job server-function fallbacks to customer permissions.
- Removed pipeline/opportunity fallbacks to colon-form raw permission strings.
- Removed support/RMA fallbacks to raw `support:delete`.
- Removed optional settings permission constants that could become undefined.
- Removed one raw server-function API token permission string.
- Removed raw admin navigation permission strings.

## Smells Deferred

- Documentation examples in `src/lib/server/protected.ts` still use literal
  permission strings for explanatory examples. They are not executable
  auth-boundary code.
- This sprint does not audit whether every existing role should have each
  permission. It only makes the permission references canonical and
  compile-checked.
- Broader permission product design, such as whether jobs and pipeline need more
  granular role boundaries, remains separate product/security work.

## Gates

- Focused permission source contract:
  `./node_modules/.bin/vitest run tests/unit/auth/permission-source-contract.test.ts`
  - Passed, 1 file / 3 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/routes/_authenticated/admin/admin-page.tsx src/server/functions/settings/api-tokens.ts src/server/functions/pipeline/opportunity-detail-extended.ts src/server/functions/pipeline/quote-pdf.tsx src/server/functions/pipeline/quote-comparison.ts src/server/functions/pipeline/quote-version-reads.ts src/server/functions/pipeline/pipeline.ts src/server/functions/pipeline/win-loss-reasons.ts src/server/functions/pipeline/quote-versions.tsx src/server/functions/pipeline/quote-version-restore.ts src/server/functions/pipeline/quote-validity.ts src/server/functions/pipeline/quote-send.ts src/server/functions/pipeline/opportunity-conversion.ts src/server/functions/documents/document-templates.ts src/server/functions/jobs/job-tasks.ts src/server/functions/jobs/checklists.ts src/server/functions/orders/rma.ts src/server/functions/jobs/job-time.ts src/server/functions/jobs/job-materials.ts src/server/functions/jobs/job-tasks-kanban.ts src/server/functions/support/issues.ts tests/unit/auth/permission-source-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Broader unit/build gates:
  - Skipped. The slice is a compile-time authorization-reference cleanup with a
    source contract and no runtime workflow behavior, route loading, schema,
    query/cache, inventory, finance, or build-boundary changes.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
removing authorization drift smells across high-value operational domains and
pinning the stronger pattern with a source contract.

## Residual Risk

Low application behavior risk because the canonical permission values already
exist and typecheck proves each domain/action. Medium product/security risk
remains around permission granularity and role design, which was intentionally
not changed in this mechanical boundary cleanup.
