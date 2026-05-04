# Warranty Maintainer Sprint 15

This sprint continues warranty-domain ownership cleanup after the overview stack moved out of the warranty detail presenter. The target is the detail tab shell: tab labels, claims badge behavior, overview tab placement, claims tab wiring, and activity panel placement should be explicit and tested outside the page presenter.

Status: Closed after Issue 1.

## Business Value

Warranty operators need the tab shell to be honest. Claims counts should not be shown when claim history failed to load, the claims tab must preserve filing/review/resolve/open callbacks, and activity/system history panels must remain reachable without the main page owning every tab contract.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty, claims, extensions, and activity read models
-> controlled `WarrantyDetailTabs`
-> overview, claims, warranty activity, and system history panels
-> existing container-owned callbacks and mutation dialog open handlers.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, header actions, alerts, coverage summary, dialogs, sidebar cards, overview child panels, claims history internals, activity panel internals, or mutation behavior.
- Preserve controlled active tab behavior so alerts can still switch to the claims tab from the page presenter.
- Preserve claims badge hiding when claims are unavailable.
- Preserve `canFileClaim` behavior for active and expiring warranties.
- Treat this as a behavior-preserving tab-shell extraction.
- Add focused tests for tab label rendering, claims badge hide/show behavior, claims card prop wiring, controlled tab change callback, and activity panel prop wiring.

## Issue Ledger

### 1. Warranty Detail Tab Shell Boundary

Problem:

- `warranty-detail-view.tsx` still owns the tab shell and claims tab contract after overview extraction.
- Claims badge visibility is an honesty rule: failed claim reads must not present a stale count as reliable.
- Activity panel placement and claims tab wiring are mixed with header, alerts, sidebar, and dialog orchestration in the page presenter.

Workflow protected:

Warranty detail route -> warranty/claims/extensions/activity read models -> tab shell -> overview, claims, warranty activity, and system history workflows.

Planned slice:

- Extract `WarrantyDetailTabs` as a controlled component.
- Preserve current child props, tab labels, badge behavior, and activity panel placement.
- Add focused tests for the extracted tab shell.

Out of scope:

- Changing alert behavior, active tab state ownership, claims history internals, activity panel internals, overview internals, sidebar content, header actions, dialogs, server read models, mutations, query keys, cache policy, tenant enforcement, or database behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty tab-shell presentation, warranty component tests, warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty, claims, extensions, and activity read models -> controlled `WarrantyDetailTabs` -> overview, claims, warranty activity, and system history panels -> existing container-owned callbacks and dialog open handlers.
- Business value protected: operators still see the same overview, claims, warranty activity, and system history tabs. Claims counts remain hidden when claims are unavailable, avoiding a false sense of claim-history certainty. Claims filing/review/resolve/open callbacks and activity callbacks remain wired through the same container contracts.
- Architecture standards checked: no route, hook, server function, schema, database, query key, cache invalidation, tenant enforcement, mutation implementation, alert behavior, coverage summary, dialogs, sidebar cards, overview internals, claims history internals, or activity panel internals changed.
- Tenant/data/cache implications: none changed. This was a client presentation extraction only; warranty/claims/extensions/activity reads, tenant scope, and mutation/cache behavior stay on existing paths.
- Smells removed: `warranty-detail-view.tsx` no longer owns the tab shell, claims count badge rule, claims card prop shaping, or activity panel placement. The page presenter is down to 239 lines, and tab-shell behavior has focused coverage.
- Smells deferred: `warranty-detail-view.tsx` still owns alert dismissal and alert-driven tab navigation, sidebar content assembly, coverage summary placement, and top-level page grid composition.
- Gates run: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-detail-tabs.test.tsx`; `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-detail-tabs.tsx tests/unit/warranty/warranty-detail-tabs.test.tsx`; `./node_modules/.bin/vitest run tests/unit/warranty`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`.
- Gates skipped: browser QA, because this was a behavior-preserving client presentation extraction with focused controlled-tab, claims honesty, and prop/callback tests and no route/server/data changes.
- Goal adaptations: declined. The standing product-owner goal and bounded sprint closeout format still fit this slice.
- Residual risk: alert assembly/navigation and sidebar composition remain in the page presenter. The next slice should target one of those responsibilities with tests around alert actions or sidebar card wiring.
