# Communications Maintainer Sprint 47: Communications Query Key Catalog Boundary

## Status

Closed and commit-ready.

## Problem

`src/lib/query-keys.ts` was still large at 2,058 lines after the prior support
catalog extraction. The communications section kept campaign, template,
signature, scheduled email, scheduled call, contact preference, customer
communications, email history, inbox, email suppression, email analytics,
domain verification, and email preview cache contracts inline in the global
aggregate.

That made the global query-key file continue to act as a cross-domain cache
monolith, and it forced communications cache ownership to be reviewed inside a
shared adapter instead of inside a communications-owned catalog.

## Workflow Spine Protected

Communications reads and invalidation -> communications hooks ->
public `queryKeys.communications` adapter -> extracted
`communicationsQueryKeys` catalog -> exact TanStack query tuples -> unchanged
cache invalidation and read behavior.

## Touched Domains

- Shared query-key aggregate adapter.
- Communications query-key catalog implementation.
- Campaign query-key contract tests.
- Communications activity, query-normalization, domain-remediation, and
  read-state contract coverage.

## Business Value Protected

Communications cache identity protects operator workflows for campaigns,
customer communications, scheduled calls, scheduled emails, inbox work,
suppression checks, email analytics, domain verification, and email previews.
This slice reduces shared cache surface area without changing those workflows or
their invalidation keys.

## Scope Constraints

- No caller syntax changed; callers still use `queryKeys.communications.*`.
- No query tuple shape changed.
- No server function, hook, route, schema/database, or UI behavior changed.
- No suppression, processing, analytics, verification, or preview behavior
  changed.
- No broader query-key catalog migration was attempted.

## Changes

- Added `src/lib/query-key-catalog/communications.ts` as the communications
  cache catalog owner.
- Replaced the inline `queryKeys.communications` aggregate section with the
  extracted catalog adapter.
- Added a contract test that pins the public adapter identity to
  `communicationsQueryKeys`.
- Added representative tuple assertions for campaign roots, scheduled call
  lists, and suppression checks.
- Removed aggregate self-references from the communications cache catalog.

## Standards Checked

- Domain ownership: communications cache contracts now live in a
  communications-owned catalog.
- Route -> hook -> server function -> schema/database flow: unchanged; only the
  shared query-key owner moved.
- Tenant isolation: unchanged; no data access or authorization path changed.
- Transactional inventory and finance integrity: not applicable to this
  communications cache slice.
- Query/cache contracts: public adapter identity and representative tuple
  shapes are pinned by tests.
- Honest UI states: unchanged; no UI state or rendering branch changed.
- Operator-safe errors: unchanged; no mutation or error boundary behavior
  changed.
- Reviewable diff: one catalog extraction, one aggregate adapter replacement,
  and a focused contract-test addition.

## Smells Removed

- Reduced `src/lib/query-keys.ts` from 2,058 lines to 1,962 lines.
- Removed the inline communications catalog from the global query-key monolith.
- Removed `queryKeys.communications` self-reference coupling inside
  communications query-key construction.
- Added a direct communications cache boundary that can be reviewed without
  scanning unrelated query-key domains.

## Smells Deferred

- `src/lib/query-keys.ts` still owns remaining inline catalogs for domains such
  as financials, dashboard, reports, customers, orders, and warranty.
- Large server monoliths remain outside this communications slice.
- Large frontend workflow components remain outside this communications slice.
- Query-key extraction is still incremental; more catalogs should move behind
  stable public adapters in future slices.

## Gates

- Focused ESLint:
  `./node_modules/.bin/eslint src/lib/query-keys.ts src/lib/query-key-catalog/communications.ts tests/unit/communications/campaign-query-key-contract.test.tsx tests/unit/communications/activity-cache-contract.test.tsx tests/unit/communications/domain-remediation.test.ts --report-unused-disable-directives`
  - Passed.
- Focused communications tests:
  `./node_modules/.bin/vitest run tests/unit/communications/campaign-query-key-contract.test.tsx tests/unit/communications/activity-cache-contract.test.tsx tests/unit/communications/domain-remediation.test.ts tests/unit/communications/query-normalization-wave4c.test.tsx tests/unit/communications/query-normalization-wave4d.test.tsx tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/inbox-read-state.test.tsx tests/unit/communications/email-preview-modal-read-state.test.tsx`
  - Passed, 8 files / 35 tests.
- Full source lint:
  `npm run lint`
  - Passed.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Full unit suite:
  `npm run test:unit`
  - Passed, 766 files / 2,543 tests.

## Goal Adaptation

No standing goal change. The sprint continues the current product-owner goal:
small domain-sliced monolith reduction, stable workflow protection, explicit
ownership boundaries, and evidence-backed closeout.

## Residual Risk

Low behavior risk because the public adapter name and representative tuple
shapes are pinned, and no runtime caller path changed. Medium architecture risk
remains because the global query-key aggregate is still large and multiple
non-communications catalogs remain inline.
