# Warranty Maintainer Sprint 1

This sprint starts warranty-domain ownership cleanup after support issue detail became materially easier to reason about. The target is service linkage context: the warranty detail surface must honestly show whether a battery asset is attached to the canonical service-system and ownership graph.

Status: Closed after Issue 1.

## Business Value

Warranty detail is where RENOZ operators decide whether an asset is covered, who owns it now, what service system it belongs to, and whether a support or remedy path can be trusted. Service linkage is the bridge from commercial entitlement to installed battery lineage, so it should have a focused owner and tests instead of living inside a monolithic page presenter.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model
-> `WarrantyServiceMissionControl` and `WarrantyServiceSystemCard`
-> operator-visible service linkage, owner, review, and system-history context.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, mutations, certificates, claims, extensions, or activity loading.
- Preserve current copy, link targets, status labels, pending-review fallbacks, ownership transfer action, and service-system history display.
- Treat this as a behavior-preserving presentational extraction.
- Add focused tests for linked, pending-review, and unlinked service linkage states.

## Issue Ledger

### 1. Service Linkage Context Boundary

Problem:

- `warranty-detail-view.tsx` owns service linkage status mapping, sidebar service-system card rendering, and overview mission-control rendering.
- This code expresses a warranty-to-service-system invariant, but it is mixed with tab layout, alert logic, claim tables, certificate state, extension dialogs, and activity timelines.
- Pending review and unlinked states need focused coverage because they tell an operator whether warranty ownership and system history can be trusted.

Workflow protected:

Warranty detail route -> `WarrantyDetailContainer` -> warranty read model -> service linkage context -> owner/system/review/history display.

Planned slice:

- Extract service linkage status presentation into a warranty-owned component module.
- Extract sidebar service-system context into `WarrantyServiceSystemCard`.
- Extract overview mission-control context into `WarrantyServiceMissionControl`.
- Keep current copy, link targets, fallback states, and transfer action behavior unchanged.
- Add focused component tests for status presentation, linked service systems, pending reviews, and unlinked states.

Out of scope:

- Changing warranty linkage server logic.
- Changing service-system routes or review workflows.
- Changing ownership transfer mutations or cache invalidation.
- Changing claims, certificates, extensions, or warranty activity behavior.

Closeout:

- Touched domains: warranty detail UI, warranty service linkage presentation, warranty service-system sidebar context, warranty overview mission-control context, warranty component tests, and warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model -> `WarrantyServiceSystemCard` / `WarrantyServiceMissionControl` -> operator-visible service linkage, current owner, service system, pending review, and system-history context.
- Business value protected: operators can still see whether a warranty is linked to the canonical installed battery service-system graph, who owns it, what history exists, and what review or system action comes next, while the monolithic warranty detail presenter now delegates this invariant to focused warranty-owned components.
- Architecture standards checked: route/container/hook/server/schema/database boundaries unchanged; service linkage display now has a focused component boundary; pure status/reason mapping lives outside the component file to satisfy fast-refresh rules; service links use `buttonVariants` rather than `Button asChild` with router links, matching the existing UI guard.
- Tenant isolation and data integrity checked: no server query, tenant predicate, organization scope, database write, ownership mutation, inventory transaction, finance artifact, or serialized lineage persistence logic changed.
- Query/cache contract checked: no query key, invalidation, optimistic update, rollback, stale-time, or cache policy changed.
- Smells removed: service linkage status mapping removed from `warranty-detail-view.tsx`; sidebar service-system card removed from the presenter; overview mission-control rendering removed from the presenter; linked, pending-review, unlinked, owner, review, and history display states now have focused coverage; custom-router-link button composition avoids the known `Button asChild` audit risk in this slice.
- Smells deferred: `warranty-detail-view.tsx` remains large and still owns warranty alerts, header metrics, coverage timeline, details tab, support actions, claims table, certificate dialog wiring, extension dialog wiring, and activity tabs; global shared `Button asChild` behavior remains covered by existing guard tests and was not changed; browser QA remains deferred because this was behavior-preserving extraction with no route or visual redesign.
- Verification: focused service-linkage tests passed; targeted eslint passed; warranty unit suite passed 12 files / 58 tests; `Button asChild` UI guard tests passed 2 files / 3 tests; `tsc --noEmit` passed; `git diff --check` passed.
- Gates skipped: browser QA skipped because the slice preserved existing copy, link targets, and layout intent while changing code ownership and adding focused tests.
- Goal adaptation: no standing goal text change. This sprint follows the active maintainer goal by selecting a business-critical warranty lineage invariant, extracting a focused domain boundary, and closing with explicit evidence.
- Residual risk: warranty detail is improved but still a 1k+ line operator surface. The next warranty sprint should triage claims history, certificate/error state, alert/coverage state, or support-action handoff based on the next highest business risk rather than continuing extraction mechanically.

## Sprint Closeout Audit

Completion audit:

- Objective: extract warranty service linkage context from the monolithic warranty detail presenter without changing behavior.
- Deliverables checked: sprint artifact, service-linkage component module, service-linkage utility module, warranty detail integration, focused component tests, targeted lint, warranty unit suite, UI `Button asChild` guard tests, typecheck, and diff whitespace gate.
- Evidence inspected: `src/components/domain/warranty/views/warranty-detail-view.tsx`, `src/components/domain/warranty/views/warranty-service-linkage.tsx`, `src/components/domain/warranty/views/warranty-service-linkage-utils.ts`, `tests/unit/warranty/warranty-service-linkage.test.tsx`, and `docs/warranty/MAINTAINER-SPRINT-1.md`.

Touched domains: warranty detail presentation, warranty service linkage presentation, warranty UI tests, and maintainer sprint documentation.

Workflow protected: warranty read model -> service linkage presentation -> current owner, service system, pending linkage review, and system-history context.

Business value protected: RENOZ operators retain the same warranty-to-installed-system context needed to support battery assets and trust ownership lineage, while future changes can reason about that context outside the rest of the warranty detail page.

Architecture standards checked:

- route/container boundary: no route, container, or tab behavior changed
- hook/server/schema/database boundary: no hooks, server functions, schemas, database reads, or side effects changed
- query/cache contract: no query keys, invalidation, mutation, optimistic update, or rollback behavior changed
- domain ownership: service linkage display now has a focused warranty view module and a pure utility module
- UI honesty: linked, pending-review, unlinked, missing-owner mapping, pending-review next step, missing system fallback, current owner fallback, and system-history preview states have focused coverage

Smells removed:

- service linkage presentation helpers embedded in `warranty-detail-view.tsx`
- sidebar service-system rendering embedded in `warranty-detail-view.tsx`
- overview mission-control rendering embedded in `warranty-detail-view.tsx`
- router links wrapped by `Button asChild` in the extracted service-linkage slice

Smells deferred:

- warranty alert construction still lives in the page presenter
- warranty details/support-action rendering still lives in the page presenter
- claims table and claim action state still live in the page presenter
- activity/system-history tab composition still lives in the page presenter
- browser QA remains deferred until a visual or workflow behavior pass

Verification:

- `./node_modules/.bin/vitest run tests/unit/warranty/warranty-service-linkage.test.tsx` passed 1 file / 4 tests
- `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-service-linkage.tsx src/components/domain/warranty/views/warranty-service-linkage-utils.ts tests/unit/warranty/warranty-service-linkage.test.tsx` passed
- `./node_modules/.bin/vitest run tests/unit/warranty` passed 12 files / 58 tests
- `./node_modules/.bin/vitest run tests/unit/button-aschild-link-audit.test.ts tests/unit/ui/button-as-child.test.tsx` passed 2 files / 3 tests
- `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit` passed
- `git diff --check` passed

Gates skipped: browser QA skipped because this was a behavior-preserving extraction with focused unit coverage and no route, server, cache, mutation, or layout redesign.

Goal adaptations made or declined: declined goal changes. The standing goal remains correct; this sprint applies it to warranty service-system lineage and repo modularity.

Residual risk: warranty detail is still large after dropping the service-linkage boundary. Claims history, certificate unavailable states, alert lifecycle, and support-action handoff remain candidates for future warranty-domain sprints.
