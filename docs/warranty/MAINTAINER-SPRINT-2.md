# Warranty Maintainer Sprint 2

This sprint continues warranty-domain ownership cleanup after service linkage moved out of the warranty detail presenter. The target is claims history: the operator needs a dependable, honest view of warranty claims and the next review, resolve, or open action.

Status: Closed after Issue 1.

## Business Value

Warranty claims are the bridge from entitlement to remedy. For RENOZ operators, this is where a battery warranty turns into review, approval, replacement, repair, credit, or closeout work. The UI must not hide unavailable claim data as "no claims," and claim actions should be isolated enough to test without the rest of the warranty page.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty claims read model
-> `WarrantyClaimsHistoryCard`
-> operator-visible loading, unavailable, empty, review, resolve, and open states.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, mutations, approval dialogs, certificates, extensions, or activity loading.
- Preserve current copy, table columns, claim type labels, status badges, cost/date formatting, pending action labels, and row/action callbacks.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests for unavailable, empty, review, resolve, and open action states.

## Issue Ledger

### 1. Claims History Boundary

Problem:

- `warranty-detail-view.tsx` still owns claim history card rendering, claim table rows, claim action-state projection, claim unavailable state, claim empty state, and claims table skeleton.
- This code expresses the warranty-to-remedy operator workflow, but it is mixed with header metrics, alerts, details, certificates, extensions, service linkage, support handoff, and activity tabs.
- The existing query-normalization tests protect "unavailable is not empty" at the page level, but the claim action and display states do not have a focused component owner.

Workflow protected:

Warranty detail route -> `WarrantyDetailContainer` -> claims read model -> claims history card -> review, resolve, open, unavailable, loading, and empty states.

Planned slice:

- Extract claim history card rendering into `WarrantyClaimsHistoryCard`.
- Move claims table skeleton into the same warranty claims-history component file.
- Keep current copy, table columns, fallback states, status/type formatting, pending labels, and callback behavior unchanged.
- Add focused component tests for unavailable, empty, review, resolve, and open states.

Out of scope:

- Changing claim server functions or query normalization.
- Changing claim approval, denial, request-info, or resolve mutations.
- Changing claim detail routing or navigation behavior.
- Changing warranty certificate, extension, service linkage, or activity UI.

Closeout:

- Touched domains: warranty detail UI, warranty claims history presentation, warranty claim action display, warranty component tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> claims read model -> `WarrantyClaimsHistoryCard` -> loading, unavailable, empty, review, resolve, and open states.
- Business value protected: operators still get the same claim count, unavailable warning, empty filing prompt, claim type/status/cost/date table, and review/resolve/open actions while the warranty-to-remedy surface now has a focused owner and tests.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; claim query normalization and mutation contracts unchanged; claim history rendering now lives in a focused warranty component; status/type/cost/date display remains sourced from existing warranty claim utilities.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, claim mutation, inventory transaction, finance artifact, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed.
- Smells removed: claim history card rendering removed from `warranty-detail-view.tsx`; claim table row/action projection removed from the presenter; claims table skeleton moved with the component that owns it; unavailable, empty, review, resolve, and pending-open states now have focused coverage.
- Smells deferred: `warranty-detail-view.tsx` remains large and still owns warranty alerts, details/support-action rendering, covered-items table, certificate dialog wiring, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused claims-history tests passed; targeted eslint passed; warranty unit suite passed 13 files / 63 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved existing copy, table columns, action labels, and callback behavior while changing code ownership and tests.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by protecting a warranty-to-remedy workflow and shrinking the monolithic warranty detail presenter.
- Residual risk: warranty detail is down to roughly 1,059 lines but still owns warranty details/support handoff, alert lifecycle, covered items, certificate state, extension wiring, and activity tabs. The next sprint should choose the next highest-risk workflow, with support-action handoff or alert/certificate state as likely candidates.

## Sprint Closeout Audit

Completion audit:

- Objective: extract claims history rendering and action-state projection from the warranty detail presenter without changing behavior.
- Deliverables checked: sprint artifact, claims-history component module, warranty detail integration, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-claims-history-card.tsx`, `tests/unit/warranty/warranty-claims-history-card.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-2.md`.

Touched domains: warranty detail presentation, warranty claims history presentation, warranty claim action display, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty claims read model -> claims history card -> loading, unavailable, empty, review, resolve, and open states.

Business value protected: RENOZ operators retain honest claim availability and action affordances for warranty remedy work while the code becomes easier to test and change.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- domain ownership: claims-history display now has a focused warranty view module
- UI honesty: unavailable claims do not render as empty; empty filing prompt remains explicit; review, resolve, and pending-open states have focused coverage

Smells removed:

- claims history card embedded in `warranty-detail-view.tsx`
- claim row status/type/action projection embedded in `warranty-detail-view.tsx`
- claims table skeleton embedded at the bottom of `warranty-detail-view.tsx`
- claim action and unavailable/empty states lacked focused component coverage

Smells deferred:

- warranty alert construction still lives in the page presenter
- warranty details/support-action rendering still lives in the page presenter
- covered-items rendering still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- certificate and extension dialog wiring still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-claims-history-card.test.tsx` passed 1 file / 5 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-claims-history-card.tsx tests/unit/warranty/warranty-claims-history-card.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 13 files / 63 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to warranty claims/remedy modularity.

Residual risk: warranty detail remains a large operator surface. Support issue handoff is the next strongest business slice because it carries warranty/customer/product/order/shipment/serial context into support issue creation.
