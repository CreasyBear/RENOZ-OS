# Support Maintainer Sprint 5

This sprint continues the issue detail monolith cleanup after Sprint 4 extracted customer context. The aim is to give related issue context a focused owner before adding more support behavior.

Status: Closed after Issue 1.

## Business Value

Support operators use the related tab to understand whether a battery issue is isolated or part of a wider service-system, serialized-item, order, shipment, warranty, RMA, or customer-history pattern. If that view is hard to test and mixed into the full issue detail presenter, the operator can lose lineage context during future workflow changes.

## Workflow Spine

Support issue detail route
-> `IssueDetailContainer`
-> `useIssueDetail`
-> issue read model with related context
-> `IssueRelatedTab`
-> linked warranty/order/shipment, serial, service-system, RMA, and customer-wide context.

## Architecture Constraints

- Keep this sprint support-domain only.
- Do not change issue query hooks, server functions, schemas, database access, cache keys, or mutation behavior.
- Preserve current route/search/navigation behavior.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests around the related context boundary before closing the slice.

## Issue Ledger

### 1. Related Tab Ownership

Problem:

- `issue-detail-view.tsx` still owned the full related tab after customer sidebar extraction.
- The related tab mixes several support concerns: warranty/order/shipment links, serialized lineage, service-system history, linked RMAs, and customer-wide fallback context.
- Keeping that logic in the page presenter makes future support issue changes more fragile and hides the anchor-first lineage rule.

Workflow protected:

Issue detail route -> `IssueDetailContainer` -> `useIssueDetail` related context -> related tab -> anchor-first lineage context -> customer-wide fallback context.

Planned slice:

- Extract the full related tab into `IssueRelatedTab`.
- Keep shared related entity links from Sprint 4.
- Remove duplicate related rendering from `issue-detail-view.tsx`.
- Add focused tests for full related context and empty anchor-history state.

Out of scope:

- Changing related-context hook/server/read-model behavior.
- Changing query keys or cache invalidation.
- Redesigning the visual layout.
- Adding DB-backed read-model tests.

Closeout:

- Touched domains: support issue detail UI, related context presentation, shared component import boundaries, support UI tests, support sprint evidence.
- Workflow protected: issue detail route -> `IssueDetailContainer` -> `useIssueDetail` related context -> `IssueRelatedTab` -> warranty/order/shipment/serial/service-system/RMA/customer context.
- Business value protected: operators still see anchor-first service-system and serialized-item context before broader customer history, with linked warranty, order, shipment, serial, and RMA context intact.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; `issue-detail-view.tsx` now delegates related-context rendering to `IssueRelatedTab`; shared links remain in `issue-related-links.tsx`; shared UI imports avoid the broad barrel where it pulled unrelated server code into presentational tests.
- Tenant isolation and data integrity checked: no server query, tenant predicate, schema, mutation, transactional inventory, finance, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, stale-time, optimistic update, or cache policy changed.
- Smells removed: full related tab rendering and customer-wide related sections removed from `issue-detail-view.tsx`; direct `@/components/shared` barrel imports removed from this support issue slice; related-context behavior now has focused component tests.
- Smells deferred: `issue-detail-view.tsx` still owns overview, action, remedy, details, SLA, and escalation card rendering; DB-backed related-context read-model tests remain separate; browser visual QA remains deferred because layout behavior was preserved.
- Verification: focused related/sidebar component tests passed; targeted eslint passed; `tsc --noEmit` passed with the larger heap setting; full support unit suite passed 32 files / 136 tests; `git diff --check` passed.
- Gates skipped: browser QA skipped because this was a behavior-preserving presentational extraction without route, layout, or mutation changes.
- Goal adaptation: no standing goal change. This sprint continues the repo-maintainer posture by reducing monolith ownership and documenting residual risk before future support behavior.
- Residual risk: the related tab still relies on the existing read model shape without DB-backed coverage here. The next support slice should target remaining issue-detail cards or add server/read-model tests for related context before more behavior is added.

## Sprint Closeout Audit

Completion audit:

- Objective: extract related-context rendering from the issue detail monolith without changing support issue behavior.
- Deliverables checked: new sprint artifact, `IssueRelatedTab`, issue detail integration, focused related tab tests, targeted lint, typecheck, support suite, and diff whitespace gate.
- Evidence inspected: `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-related-tab.tsx`, `src/components/domain/support/issues/issue-related-links.tsx`, `tests/unit/support/issue-related-tab.test.tsx`, and `docs/support/MAINTAINER-SPRINT-5.md`.

Touched domains: support issue detail presentation, related context presentation, shared component import boundaries, support UI tests.

Workflow protected: issue detail read-model data -> related tab -> linked warranty, order, shipment, serialized item, service system, linked RMA, and customer-wide fallback navigation.

Business value protected: the support operator can still diagnose whether a lithium-ion battery issue is isolated or part of repeated service-system, serial, RMA, warranty, order, or customer history.

Architecture standards checked:

- route/container boundary: no route or container behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, or database access changed
- query/cache contract: no query keys, invalidations, or mutation contracts changed
- domain ownership: related tab now has a focused support issue component owner
- UI honesty: full context and no anchor-linked history states have focused coverage

Smells removed:

- related tab rendering embedded in the issue detail presenter
- duplicate customer-wide related section helpers left behind after extraction
- broad shared barrel import that pulled unrelated server communication dependencies into a presentational component test

Smells deferred:

- remaining issue detail cards are still local to `issue-detail-view.tsx`
- related-context server/read-model behavior is not covered by this presentational test
- browser QA is still needed when the issue detail page gets a visual pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/issue-related-tab.test.tsx tests/unit/support/issue-customer-context-sidebar.test.tsx` passed 2 files / 5 tests
- `./node_modules/.bin/eslint src/components/domain/support/issues/issue-detail-view.tsx src/components/domain/support/issues/issue-related-tab.tsx src/components/domain/support/issues/issue-related-links.tsx tests/unit/support/issue-related-tab.test.tsx` passed
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `./node_modules/.bin/vitest run tests/unit/support` passed 32 files / 136 tests
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving presentational extraction and did not change route behavior, layout intent, or mutation flow.

Goal adaptations made or declined: no goal text change. The sprint strengthens the active goal by enforcing a clearer support-domain component boundary and evidence-based closeout.

Residual risk: the page presenter is smaller but still not complete as a domain shell. Continue with remaining card extraction or related-context read-model tests before adding new support issue functionality.
