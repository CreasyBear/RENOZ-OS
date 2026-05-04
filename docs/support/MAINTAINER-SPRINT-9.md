# Support Maintainer Sprint 9

This sprint continues the issue detail ownership cleanup after Sprint 8 extracted header action mapping. The aim is to move the remaining overview, alert, and detail display cards out of the page presenter so `IssueDetailView` behaves more like a shell.

Status: Closed after Issue 1.

## Business Value

Support issue detail is the operator's battery support workbench. Description, resolution, SLA, escalation, and details cards should be easy to reason about independently because they carry operational truth about fault context, resolution decisions, service urgency, escalation state, and issue metadata.

## Workflow Spine

Support issue detail route
-> `IssueDetailContainer`
-> `useIssueDetail`
-> issue read model
-> `IssueOverviewTab`, `IssueAlerts`, and `IssueDetailsCard`
-> operator-visible support issue display states.

## Architecture Constraints

- Keep this sprint support-domain only.
- Do not change issue hooks, server functions, schemas, database access, cache keys, invalidation, mutation behavior, action policy, or dialogs.
- Preserve current copy, alert conditions, SLA projection, resolution labels, escalation details, and issue metadata display.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests for overview display, alert conditions, and details card fallback states.

## Issue Ledger

### 1. Issue Display Card Ownership

Problem:

- `issue-detail-view.tsx` still owned description, resolution, SLA, escalation, alert, and details card rendering.
- These cards are presentational, but they are important operator truth surfaces and should not be mixed with route shell, tab layout, dialog wiring, context sidebar, and action policy orchestration.
- Alert conditions and empty/fallback states deserve focused coverage before future visual or workflow changes.

Workflow protected:

Issue detail route -> `IssueDetailContainer` -> `useIssueDetail` read model -> display cards -> description, resolution, SLA, escalation, alerts, assignee, dates, and issue type.

Planned slice:

- Extract overview cards into `IssueOverviewTab`.
- Extract alert rendering into `IssueAlerts`.
- Extract metadata side card into `IssueDetailsCard`.
- Keep existing copy, labels, conditional rendering, and data mapping unchanged.
- Add focused component tests for overview, alert, and detail states.

Out of scope:

- Changing SLA calculation or status projection.
- Changing issue resolution schema or labels.
- Changing escalation workflow behavior.
- Redesigning the issue detail page.

Closeout:

- Touched domains: support issue detail UI, support overview/detail display cards, support alert presentation, support UI tests, support sprint evidence.
- Workflow protected: issue detail route -> `IssueDetailContainer` -> `useIssueDetail` read model -> `IssueOverviewTab`, `IssueAlerts`, and `IssueDetailsCard` -> operator-visible display states.
- Business value protected: operators still see the same description, resolution, SLA, escalation, alert, assignee, date, and issue type information while the page presenter is now much closer to a shell.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; SLA and resolution data mapping unchanged; action policy and dialogs unchanged; query/cache and mutation contracts unchanged; display-card ownership now lives in a focused support component file.
- Tenant isolation and data integrity checked: no server query, tenant predicate, schema, mutation, inventory transaction, finance artifact, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, stale-time, optimistic update, rollback, or cache policy changed.
- Smells removed: description, resolution, SLA, escalation, alert, and metadata card rendering removed from `issue-detail-view.tsx`; empty description, SLA breach alert, escalation alert, resolution labels, escalation reason, and unassigned detail fallback now have focused coverage.
- Smells deferred: `issue-detail-view.tsx` still owns header status/type badge composition, tab layout, sidebar layout, and dialog wiring; `TYPE_LABELS` remains local to the page because the header still uses it; browser QA remains deferred until behavior or layout changes.
- Verification: focused display/header/action tests passed; targeted eslint passed; `tsc --noEmit` passed; full support unit suite passed 36 files / 150 tests; `git diff --check` passed.
- Gates skipped: browser QA skipped because this was a behavior-preserving extraction with no route, layout intent, server, or mutation change.
- Goal adaptation: no standing goal change. This continues the active maintainer goal by turning a large support page presenter into a mostly compositional shell with focused display-card tests.
- Residual risk: support issue detail cleanup is now materially improved. Further work should be triaged against other business-critical domains before extracting the remaining header badge/tab/dialog shell code.

## Sprint Closeout Audit

Completion audit:

- Objective: extract issue overview, alert, and details card rendering from the issue detail presenter without changing behavior.
- Deliverables checked: sprint artifact, `IssueOverviewTab`, `IssueAlerts`, `IssueDetailsCard`, issue detail integration, focused display-card tests, targeted lint, typecheck, support unit suite, and diff whitespace gate.
- Evidence inspected: `src/components/domain/support/issues/issue-detail-view.tsx`, `src/components/domain/support/issues/issue-display-cards.tsx`, `tests/unit/support/issue-display-cards.test.tsx`, and `docs/support/MAINTAINER-SPRINT-9.md`.

Touched domains: support issue detail presentation, support display cards, support alert display, support UI tests.

Workflow protected: issue detail read model -> display cards -> description, resolution, SLA status, escalation details, alerts, assignee, dates, and issue type.

Business value protected: RENOZ support operators retain the same battery support diagnosis and urgency context while the code is easier to reason about and test.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- domain ownership: overview/detail/alert display now has a focused support component owner
- UI honesty: empty description, breached SLA, escalated issue, unassigned issue, resolved issue, and resolution-detail states have focused coverage

Smells removed:

- overview cards embedded in the issue detail presenter
- alert composition embedded in the issue detail presenter
- details metadata card embedded in the issue detail presenter
- display-card fallback states lacked focused coverage

Smells deferred:

- header status/type badge composition remains in `issue-detail-view.tsx`
- tab/sidebar/dialog composition remains in `issue-detail-view.tsx`
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/support/issue-display-cards.test.tsx tests/unit/support/issue-header-actions.test.tsx tests/unit/support/issue-actions-card.test.tsx` passed 3 files / 11 tests
- `./node_modules/.bin/eslint src/components/domain/support/issues/issue-detail-view.tsx src/components/domain/support/issues/issue-display-cards.tsx tests/unit/support/issue-display-cards.test.tsx` passed
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `./node_modules/.bin/vitest run tests/unit/support` passed 36 files / 150 tests
- `git diff --check` passed

Gates skipped: browser QA skipped because this extraction preserved UI copy and behavior while changing only code ownership.

Goal adaptations made or declined: no goal text change. The sprint follows the standing process: small support-domain slice, workflow spine protected, focused tests, broader gates, and explicit residual risk.

Residual risk: `IssueDetailView` is 265 lines and now mostly composes focused support components. The next maintainer sprint should not automatically keep splitting support; first triage whether inventory, warehouse, warranty, RMA integration, finance closeout, or another operator workflow now carries higher business risk.
