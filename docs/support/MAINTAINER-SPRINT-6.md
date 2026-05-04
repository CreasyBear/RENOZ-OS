# Support Maintainer Sprint 6

This sprint continues the issue detail ownership cleanup after Sprint 5 extracted related context. The aim is to give RMA remedy-readiness display a focused support/RMA boundary before changing issue actions or adding new support behavior.

Status: Closed after Issue 1.

## Business Value

Support operators use issue remedy context to decide whether a battery fault can move into an RMA, whether the RMA path is blocked, or whether prior returns already exist. That display carries support recovery, order context, and RMA closeout truth. It should not be hidden inside the general issue detail presenter.

## Workflow Spine

Support issue detail route
-> `IssueDetailContainer`
-> `useIssueDetail`
-> issue read model with `rmaReadiness`
-> `IssueRemedyCard`
-> source order, RMA readiness state, blocked reason, suggested reason, and prior RMA links.

## Architecture Constraints

- Keep this sprint support-domain only.
- Do not change issue hooks, RMA hooks, server functions, schemas, database access, cache keys, invalidation, or mutation behavior.
- Preserve current route/search/navigation behavior for source order and prior RMA links.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests for ready, blocked, and linked RMA readiness states.

## Issue Ledger

### 1. Issue Remedy Card Ownership

Problem:

- `issue-detail-view.tsx` still owned RMA readiness rendering after the customer sidebar and related tab were extracted.
- Remedy readiness is a high-stakes support/RMA boundary: it tells an operator whether to create an RMA, why an RMA is blocked, or whether prior returns already exist.
- Leaving this inside the page presenter keeps support recovery truth coupled to unrelated overview, SLA, escalation, action, and detail cards.

Workflow protected:

Issue detail route -> `IssueDetailContainer` -> `useIssueDetail` `rmaReadiness` -> remedy card -> source order link, readiness label, blocked reason, suggested reason, prior RMA links.

Planned slice:

- Extract the RMA remedy-readiness card into `IssueRemedyCard`.
- Keep existing source order and prior RMA navigation unchanged.
- Remove remedy rendering and related imports from `issue-detail-view.tsx`.
- Add focused component tests for ready, blocked, and linked readiness states.

Out of scope:

- Changing RMA readiness calculation.
- Changing issue action policy or Create RMA affordance behavior.
- Changing RMA mutation/cache/server behavior.
- Redesigning the issue detail page.

Closeout:

- Touched domains: support issue detail UI, support/RMA remedy-readiness presentation, support UI tests, support sprint evidence.
- Workflow protected: issue detail route -> `IssueDetailContainer` -> `useIssueDetail` `rmaReadiness` -> `IssueRemedyCard` -> source order, readiness label, blocked reason, suggested reason, and prior RMA links.
- Business value protected: operators can still distinguish RMA-ready, blocked, and already-linked support issues while reviewing source order and prior return context for lithium-ion battery recovery work.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; RMA readiness calculation unchanged; query/cache and mutation contracts unchanged; issue detail now delegates remedy display to a focused support/RMA component.
- Tenant isolation and data integrity checked: no server query, tenant predicate, schema, mutation, inventory transaction, finance artifact, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, stale-time, optimistic update, rollback, or cache policy changed.
- Smells removed: RMA remedy-readiness rendering and prior RMA link mapping removed from `issue-detail-view.tsx`; related link and date formatting imports no longer leak into the page presenter; ready/blocked/linked remedy states now have focused UI coverage.
- Smells deferred: `issue-detail-view.tsx` still owns issue actions, details, SLA, escalation, description, and resolution cards; Create RMA action affordance remains a separate action-policy surface; DB-backed RMA readiness calculation tests remain outside this presentational slice.
- Verification: focused remedy/sidebar/related component tests passed; targeted eslint passed; `tsc --noEmit` passed after correcting the test fixture to the real `source_order_missing` blocked reason enum; full support unit suite passed 33 files / 139 tests; `git diff --check` passed.
- Gates skipped: browser QA skipped because this was a behavior-preserving presentational extraction with no route, layout intent, server, or mutation change.
- Goal adaptation: no standing goal change. This continues the active maintainer goal by reducing high-stakes support/RMA context ownership inside the issue detail monolith.
- Residual risk: the issue detail page is cleaner but still owns action and sidebar cards. The next support slice should extract the action card or add focused tests around Create RMA affordance/policy interaction before changing support issue behavior.

## Sprint Closeout Audit

Completion audit:

- Objective: extract issue RMA remedy-readiness display from the issue detail presenter without changing behavior.
- Deliverables checked: sprint artifact, `IssueRemedyCard`, issue detail integration, focused remedy card tests, targeted lint, typecheck, support unit suite, and diff whitespace gate.
- Evidence inspected: `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-remedy-card.tsx`, `src/components/domain/support/issues/issue-related-links.tsx`, `tests/unit/support/issue-remedy-card.test.tsx`, and `docs/support/MAINTAINER-SPRINT-6.md`.

Touched domains: support issue detail presentation, support/RMA remedy-readiness presentation, support UI tests.

Workflow protected: issue detail read model -> `rmaReadiness` -> remedy card -> source order link, readiness label, blocked reason, suggested reason, prior RMA navigation.

Business value protected: RENOZ support operators retain fast, explicit recovery context when deciding whether a battery issue can proceed to RMA or is already tied to prior return work.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- domain ownership: remedy-readiness display now has a focused support/RMA component owner
- UI honesty: ready, blocked, and linked RMA readiness states have focused coverage

Smells removed:

- RMA remedy-readiness rendering embedded in the issue detail presenter
- prior RMA mapping and remedy artifact subtitle formatting hidden inside a broad page component
- test fixture drift caught and corrected against the schema enum for blocked RMA reasons

Smells deferred:

- issue action card remains inside `issue-detail-view.tsx`
- overview detail cards remain inside `issue-detail-view.tsx`
- RMA readiness read-model calculation remains covered only by existing server/read-model tests outside this slice

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/issue-remedy-card.test.tsx tests/unit/support/issue-related-tab.test.tsx tests/unit/support/issue-customer-context-sidebar.test.tsx` passed 3 files / 8 tests
- `./node_modules/.bin/vitest run tests/unit/support/issue-remedy-card.test.tsx` passed 1 file / 3 tests after the schema fixture correction
- `./node_modules/.bin/eslint src/components/domain/support/issues/issue-detail-view.tsx src/components/domain/support/issues/issue-remedy-card.tsx src/components/domain/support/issues/issue-related-links.tsx tests/unit/support/issue-remedy-card.test.tsx` passed
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `./node_modules/.bin/vitest run tests/unit/support` passed 33 files / 139 tests
- `git diff --check` passed

Gates skipped: browser QA skipped because this extraction preserved layout and navigation semantics. Manual QA should be run when the issue detail action/remedy area gets a visual or workflow behavior pass.

Goal adaptations made or declined: no goal text change. The sprint keeps applying the standing process: small support-domain slice, explicit workflow spine, evidence-based closeout, and residual risk.

Residual risk: `IssueRemedyCard` now owns display, but `ActionsCard` still owns the Create RMA affordance and workflow buttons inside the page presenter. That should be the next issue-detail ownership candidate.
