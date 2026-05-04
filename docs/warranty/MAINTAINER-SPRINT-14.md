# Warranty Maintainer Sprint 14

This sprint continues warranty-domain ownership cleanup after dialog orchestration moved out of the warranty detail presenter. The target is the overview tab stack: quick answer context, service mission control, lineage sections, and extension history should be an explicit overview component instead of inline page composition.

Status: Closed after Issue 1.

## Business Value

The overview tab is the operator's first operational read on a warranty: coverage timing, service linkage health, commercial/product lineage, covered serial context, and extension history. Keeping that stack isolated makes it easier to protect warranty truth without making the main page presenter own every panel contract.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model and extension read model
-> `WarrantyDetailOverviewTab`
-> quick answer, service mission control, lineage, and extension history panels
-> existing extension retry and open-dialog callbacks.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, claims tab behavior, activity panels, header actions, dialogs, sidebar cards, alerts, or mutation behavior.
- Preserve overview tab visibility, quick answer props, service mission control props, lineage props, extension history props, extension retry, and extend-dialog open behavior.
- Treat this as a behavior-preserving overview presentation extraction.
- Add focused tests for overview child prop wiring, extension state pass-through, retry callback pass-through, and extend-dialog open callback behavior.

## Issue Ledger

### 1. Warranty Overview Tab Boundary

Problem:

- `warranty-detail-view.tsx` still owns the full overview panel stack inline inside the tab shell.
- The overview panels are core warranty truth surfaces but their composition is hidden among claims tab wiring, activity panels, sidebar content, alerts, and dialogs.
- This makes future warranty behavior changes harder to review because page orchestration and overview domain presentation remain interleaved.

Workflow protected:

Warranty detail route -> warranty and extension read models -> overview panel stack -> quick answer, service linkage, lineage, and extension history.

Planned slice:

- Extract the overview tab content into `WarrantyDetailOverviewTab`.
- Preserve all current child props and callback wiring.
- Add focused tests around the extracted overview component.

Out of scope:

- Changing tab labels, tab state, claims count badge, claims history, activity panels, alerts, dialogs, header actions, sidebar content, service linkage internals, lineage internals, quick answer internals, or extension history internals.
- Changing server read models, mutation implementations, query keys, cache policy, tenant enforcement, or database behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty overview presentation, warranty component tests, warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty and extension read models -> `WarrantyDetailOverviewTab` -> quick answer, service mission control, lineage sections, and extension history -> existing extension retry and open-dialog callbacks.
- Business value protected: operators still land on the same overview truth stack for coverage timing, service linkage, commercial/product lineage, serial continuity, and extension history. Extension retry and open-extension behavior remain wired through the container-owned callbacks.
- Architecture standards checked: no route, hook, server function, schema, database, query key, cache invalidation, tenant enforcement, mutation implementation, claims tab, activity panel, alert, dialog, header action, sidebar card, or child panel internals changed.
- Tenant/data/cache implications: none changed. This was a client presentation extraction only; warranty and extension read models, tenant scope, and cache behavior remain on existing paths.
- Smells removed: `warranty-detail-view.tsx` no longer owns the overview panel stack inline. The page presenter is down to 272 lines, and overview composition has focused tests for panel wiring and extension callback behavior.
- Smells deferred: `warranty-detail-view.tsx` still owns active tab state, tab list composition, claims tab wiring, alert-driven tab navigation, sidebar content assembly, and activity panel placement.
- Gates run: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-detail-overview-tab.test.tsx`; `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-detail-overview-tab.tsx tests/unit/warranty/warranty-detail-overview-tab.test.tsx`; `./node_modules/.bin/vitest run tests/unit/warranty`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`.
- Gates skipped: browser QA, because this was a behavior-preserving client presentation extraction with focused prop/callback coverage and no route/server/data changes.
- Goal adaptations: declined. The standing product-owner goal and bounded sprint closeout format still fit this slice.
- Residual risk: claims tab routing, tab list badge/error behavior, sidebar composition, and alert-driven tab navigation remain in the page presenter. The next slice should target one of those responsibilities with focused tests rather than broadening into server/cache behavior.
