# Warranty Maintainer Sprint 16

This sprint continues warranty-domain ownership cleanup after the tab shell moved out of the warranty detail presenter. The target is sidebar composition: summary cards, service-system status, notification settings, and certificate status should be explicit sidebar content instead of inline page assembly.

Status: Closed after Issue 1.

## Business Value

The warranty sidebar is the operator's persistent context rail. It carries summary facts, ownership/service linkage, alert opt-out controls, and certificate availability. Keeping that rail isolated makes the desktop aside and mobile sheet content share one tested contract.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty and certificate status read models
-> `WarrantyDetailSidebarContent`
-> summary, service system, notification settings, and certificate status cards
-> existing transfer, opt-out, and certificate retry callbacks.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, header actions, alerts, coverage summary, dialogs, tab shell, child card internals, or mutation behavior.
- Preserve desktop sidebar content and mobile sheet sidebar content because both consume the same rendered content.
- Preserve transfer ownership callback, opt-out callback, opt-out loading state, certificate status, certificate loading, certificate error, and certificate retry behavior.
- Treat this as a behavior-preserving sidebar presentation extraction.
- Add focused tests for card rendering, warranty prop pass-through, transfer callback pass-through, notification callback pass-through, certificate state pass-through, and retry callback pass-through.

## Issue Ledger

### 1. Warranty Sidebar Content Boundary

Problem:

- `warranty-detail-view.tsx` still assembles sidebar content inline.
- The same content is used in the desktop aside and mobile header sheet, so the page owns duplicated-context composition indirectly.
- Sidebar controls carry operator trust risk: opt-out loading, certificate status, certificate errors, transfer ownership, and warranty summary must remain wired consistently.

Workflow protected:

Warranty detail route -> warranty and certificate read models -> sidebar content -> summary, service system, notification, and certificate cards.

Planned slice:

- Extract `WarrantyDetailSidebarContent`.
- Preserve all child card props and callback wiring.
- Add focused tests for the extracted sidebar content.

Out of scope:

- Changing child card internals, mobile sheet behavior, desktop aside behavior, header actions, tabs, alerts, dialogs, coverage summary, server read models, mutations, query keys, cache policy, tenant enforcement, or database behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty sidebar presentation, warranty component tests, warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty and certificate status read models -> `WarrantyDetailSidebarContent` -> summary, service-system, notification settings, and certificate status cards -> existing transfer, opt-out, and certificate retry callbacks.
- Business value protected: desktop aside and mobile sidebar sheet still share one sidebar content contract. Operators keep the same summary, ownership/service linkage, alert opt-out, and certificate status controls with the same loading/error/callback wiring.
- Architecture standards checked: no route, hook, server function, schema, database, query key, cache invalidation, tenant enforcement, mutation implementation, header action, alert, coverage summary, dialog, tab shell, or child card internals changed.
- Tenant/data/cache implications: none changed. This was a client presentation extraction only; warranty/certificate reads, tenant scope, and mutation/cache behavior stay on existing paths.
- Smells removed: `warranty-detail-view.tsx` no longer assembles the sidebar rail inline. The page presenter is down to 223 lines, and sidebar child-card wiring has focused coverage.
- Smells deferred: `warranty-detail-view.tsx` still owns alert creation/dismissal/navigation, top-level page grid composition, coverage summary placement, and dialog/tab/header/sidebar coordination.
- Gates run: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-detail-sidebar-content.test.tsx`; `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-detail-sidebar-content.tsx tests/unit/warranty/warranty-detail-sidebar-content.test.tsx`; `./node_modules/.bin/vitest run tests/unit/warranty`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`.
- Gates skipped: browser QA, because this was a behavior-preserving client presentation extraction with focused prop/callback tests and no route/server/data changes.
- Goal adaptations: declined. The standing product-owner goal and bounded sprint closeout format still fit this slice.
- Residual risk: alert assembly/navigation remains the largest page-owned workflow behavior. A future slice could extract alert orchestration or stop the page from owning alert actions directly.
