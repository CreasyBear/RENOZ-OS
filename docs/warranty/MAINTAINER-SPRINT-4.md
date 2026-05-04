# Warranty Maintainer Sprint 4

This sprint continues warranty-domain ownership cleanup after service linkage, claims history, and support handoff moved out of the warranty detail presenter. The target is warranty commercial lineage and covered items: the operator needs reliable customer, owner, product, serial, entitlement, policy, coverage, and covered-item context.

Status: Closed after Issue 1.

## Business Value

Warranty details and covered items are where RENOZ operators confirm what battery asset is covered, who bought or owns it, which commercial delivery activated it, and which serialized items are under warranty. If this display is hard to reason about, support, warranty, and remedy work becomes slower and lineage mistakes become easier.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model
-> `WarrantyLineageSections`
-> operator-visible commercial lineage, entitlement source, serial links, support handoff, and covered items.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, mutations, support issue creation behavior, certificates, claims, extensions, or activity loading.
- Preserve current copy, field labels, link targets, search anchors, expiry badge behavior, covered-items table columns, and fallback states.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests for entitlement-backed warranty lineage and legacy/manual fallback states.

## Issue Ledger

### 1. Warranty Lineage Display Boundary

Problem:

- `warranty-detail-view.tsx` still owns warranty details field mapping, source entitlement display, product/serial links, notes/cycle conditional fields, support handoff placement, and covered-items table rendering.
- This code expresses the commercial and serialized lineage of a warranty, but it is mixed with alerts, header metrics, tabs, certificates, extensions, claims, service linkage, and activity timelines.
- Covered-item serial links and legacy/manual fallback states should be testable without rendering the whole page.

Workflow protected:

Warranty detail route -> warranty read model -> lineage sections -> customer/owner/product/serial/policy/source entitlement/covered-items display.

Planned slice:

- Extract warranty details and covered-items rendering into `WarrantyLineageSections`.
- Keep `WarrantySupportActions` placement inside the details section.
- Preserve existing copy, labels, link targets, search values, expiry badge thresholds, and fallback states.
- Add focused component tests for entitlement-backed details/covered items and legacy/manual fallback states.

Out of scope:

- Changing warranty entitlement server logic.
- Changing inventory browser search behavior.
- Changing support issue handoff behavior beyond preserving placement.
- Changing warranty alerts, certificates, claims, extensions, service linkage, or activity UI.

Closeout:

- Touched domains: warranty detail UI, warranty commercial lineage display, warranty covered-items display, warranty support-action placement, warranty component tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model -> `WarrantyLineageSections` -> commercial customer, owner, product, serial, policy, source entitlement, support handoff, and covered-items context.
- Business value protected: operators still see the same customer, owner, product, serial, policy, delivery entitlement, registration/expiry, cycle, notes, support action, and covered-item information while the commercial/serialized lineage surface now has a focused owner and tests.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; inventory browser search behavior unchanged; support handoff behavior unchanged; lineage display now lives in a focused warranty component; direct shared detail-view imports avoid widening shared barrel coupling in the extracted component.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, warranty mutation, inventory transaction, finance artifact, support issue mutation, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed.
- Smells removed: warranty details field mapping removed from `warranty-detail-view.tsx`; covered-items table rendering removed from the presenter; support action placement moved with the lineage section; entitlement-backed and legacy/manual display states now have focused coverage.
- Smells deferred: `warranty-detail-view.tsx` remains sizeable and still owns alert lifecycle, header metrics, coverage timeline, certificate dialog wiring, extension dialog wiring, and activity/system-history tabs; browser QA remains deferred because this was behavior-preserving extraction.
- Verification: focused lineage-section tests passed; targeted eslint passed; warranty suite passed 15 files / 67 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because this extraction preserved copy, link targets, search values, field labels, table columns, and fallback behavior while changing code ownership and tests.
- Goal adaptation: no standing goal text change. This continues the active maintainer goal by protecting warranty commercial/serialized lineage and shrinking the monolithic warranty detail presenter.
- Residual risk: warranty detail is down to roughly 850 lines but still owns alert generation, metrics, coverage timeline, certificate state, extension wiring, and activity tabs. The next warranty sprint should prioritize alert/certificate honesty or header/coverage summary extraction based on product risk.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty details and covered-items lineage display from the warranty detail presenter without changing behavior.
- Deliverables checked: sprint artifact, lineage component module, warranty detail integration, focused component tests, targeted lint, warranty unit suite, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-lineage-sections.tsx`, `src/components/domain/warranty/views/warranty-support-actions.tsx`, `tests/unit/warranty/warranty-lineage-sections.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-4.md`.

Touched domains: warranty detail presentation, warranty commercial lineage display, warranty covered-items display, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty read model -> lineage sections -> customer, owner, product, serial, policy, entitlement source, support handoff, and covered items.

Business value protected: RENOZ operators retain the same commercial and serialized battery coverage context while future changes can reason about that context outside the rest of the warranty detail page.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- cross-domain contracts: inventory browser serial search and support issue handoff behavior preserved
- domain ownership: commercial lineage and covered-items display now have a focused warranty view module
- UI honesty: legacy/manual warranties do not invent entitlement source, order, shipment, or serial context; missing owner and missing covered items remain explicit

Smells removed:

- warranty detail field mapping embedded in `warranty-detail-view.tsx`
- covered-items table embedded in `warranty-detail-view.tsx`
- entitlement-backed and legacy/manual lineage states lacked focused component coverage
- covered-item serial browser links lacked focused coverage

Smells deferred:

- warranty alert construction still lives in the page presenter
- header metric and coverage timeline rendering still live in the page presenter
- certificate and extension dialog wiring still lives in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-lineage-sections.test.tsx` passed 1 file / 2 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-lineage-sections.tsx tests/unit/warranty/warranty-lineage-sections.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 15 files / 67 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing product-owner goal remains correct; this sprint applies it to warranty commercial lineage, covered battery assets, and serialized context continuity.

Residual risk: warranty detail remains an operator surface with alert generation, header/coverage state, certificate state, extension wiring, and activity tabs still local. The next sprint should move only if the selected slice protects real operator trust, not just line count.
