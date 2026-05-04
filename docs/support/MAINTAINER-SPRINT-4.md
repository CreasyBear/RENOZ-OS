# Support Maintainer Sprint 4

This sprint follows Sprint 3's issue workflow hardening into the remaining issue detail monolith. The aim is to split customer and related-context rendering into focused support-domain ownership boundaries before adding more issue detail behavior.

Status: Closed after Issue 1.

## Business Value

Support issue detail is where operators diagnose battery faults, review customer and commercial context, decide whether RMA/warranty/service work is needed, and preserve the support history around a system or serialized item. When customer context, related context, actions, workflow state, and sidebar rendering all live in one presenter, small workflow changes become expensive and easy to regress.

## Workflow Spine

Support issue detail route
-> `IssueDetailContainer`
-> `useIssueDetail`
-> issue read model with customer/related context
-> focused issue detail presentation components
-> operator-visible customer, order, warranty, prior issue, service-system, serial, RMA, and action context.

## Architecture Constraints

- Keep this sprint support-domain only.
- Do not change issue query hooks, server functions, schemas, cache keys, or mutation behavior unless an extraction exposes a broken contract.
- Preserve current route/search/navigation behavior.
- Prefer presentational extraction with focused tests before adding new support issue behavior.
- Keep the existing issue detail layout and copy stable unless a UI state is dishonest.

## Issue Ledger

### 1. Customer Context Sidebar Ownership

Problem:

- `issue-detail-view.tsx` still owns customer sidebar rendering, compact related entity links, warranty serial links, and the larger related tab.
- Customer context has a clear ownership boundary: customer identity, recent orders, warranties, and previous issues.
- Shared related entity links are used by both the sidebar and related tab, so leaving them private to the monolith keeps future related-context cleanup coupled to the full issue detail presenter.

Workflow protected:

Issue detail route -> `IssueDetailContainer` -> `useIssueDetail` customer context -> customer context sidebar -> customer/order/warranty/prior-issue links.

Planned slice:

- Extract compact related entity and warranty link components into a focused support issue link module.
- Extract customer context sidebar and its loading/error/empty/list states into a focused component.
- Keep related tab behavior unchanged but use the shared link components.
- Add focused component tests for the sidebar boundary.

Out of scope:

- Extracting the full related tab.
- Changing customer context hook/server/read-model behavior.
- Browser redesign or layout changes.

Closeout:

- Touched domains: support issue detail UI, customer context sidebar, related entity link presentation, support UI tests, support sprint evidence.
- Workflow protected: issue detail route -> `IssueDetailContainer` -> `useIssueDetail` customer context -> `IssueCustomerContextSidebar` -> customer/order/warranty/prior-issue links.
- Business value protected: operators still see customer identity, recent orders, active warranties, serial inventory links, and prior issues, but this context now has a focused owner instead of being buried in the issue detail monolith.
- Architecture standards checked: route/container/hook/server boundaries unchanged; customer context rendering is now a presentational support component; shared compact links live in `issue-related-links.tsx`; badge variant helper lives outside the component file to satisfy fast-refresh rules.
- Tenant isolation and data integrity checked: no server query, tenant predicate, schema, mutation, or persisted data contract changed.
- Query/cache contract checked: no query key, cache invalidation, stale-time, or mutation behavior changed.
- Smells removed: customer sidebar rendering, compact related link rendering, and warranty serial link rendering no longer live inside `issue-detail-view.tsx`.
- Smells deferred: full related tab rendering remains in `issue-detail-view.tsx`; DB-backed customer context tests remain out of scope because this was a presentational extraction.
- Verification: focused `tests/unit/support/issue-customer-context-sidebar.test.tsx` passed; targeted lint passed; `tsc --noEmit` passed; full support suite passed with 31 files / 134 tests.
- Gates skipped: browser QA skipped because this was a behavior-preserving presentational extraction without layout redesign.
- Goal adaptation: no standing goal change. This continues the maintainer goal by reducing monolith ownership before more support issue behavior is added.
- Residual risk: the next support slice should extract the full related tab or DB-backed escalation/customer-context workflow tests; avoid adding more issue-detail behavior until the remaining related-context ownership is split.

## Sprint Closeout Audit

Completion audit:

- Objective: reduce issue detail monolith risk by extracting the customer context sidebar and shared compact related links without changing support workflow behavior.
- Deliverables checked: new sprint artifact, shared issue related link components, customer context sidebar component, issue detail integration, focused sidebar tests, targeted lint, typecheck, and support suite evidence.
- Evidence inspected: `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-customer-context-sidebar.tsx`, `src/components/domain/support/issues/issue-related-links.tsx`, `src/components/domain/support/issues/issue-warranty-badge-variant.ts`, and `tests/unit/support/issue-customer-context-sidebar.test.tsx`.

Touched domains: support issue detail presentation, customer context sidebar presentation, related entity link presentation, support UI tests.

Workflow protected: issue detail read-model data -> customer context sidebar -> customer, order, warranty, serial inventory, and prior issue navigation.

Business value protected: the issue detail page remains useful for support diagnosis while the customer/commercial context is now easier to reason about and test independently.

Architecture standards checked:

- route/container boundary: no route or container behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, or database behavior changed
- query/cache contract: no query keys or cache policy changed
- domain ownership: customer sidebar and compact links now have focused support issue component owners
- UI honesty: loading, error, empty, capped-list, active-warranty, and serial-link states have focused coverage

Smells removed:

- customer context sidebar rendering embedded in a 1,705-line issue detail presenter
- related entity link primitives hidden inside one monolithic file
- warranty badge helper exported from a React component file after extraction, which would violate fast-refresh lint rules

Smells deferred:

- related tab rendering still remains in `issue-detail-view.tsx`
- issue detail browser QA remains deferred until a visual/layout pass
- DB-backed customer context read-model tests remain separate from this presentational slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/issue-customer-context-sidebar.test.tsx`
- targeted eslint for `issue-detail-view.tsx`, `issue-customer-context-sidebar.tsx`, `issue-related-links.tsx`, `issue-warranty-badge-variant.ts`, and sidebar test
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/vitest run tests/unit/support` passed 31 files / 134 tests

Gates skipped: browser QA skipped because the extraction preserves layout and behavior. No server/integration gate was needed because no read/write path changed.

Goal adaptations made or declined: no standing goal change. The sprint follows the established maintainer process: small support-domain slice, workflow spine protected, tests as evidence, residual risk explicit.

Residual risk: `issue-detail-view.tsx` is down to 1,294 lines but still owns the full related tab. The next support sprint should extract related tab/context sections or add DB-backed support context tests before adding more issue-detail behavior.
