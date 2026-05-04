# Warranty Maintainer Sprint 12

This sprint continues warranty-domain ownership cleanup after activity tab panels moved out of the warranty detail presenter. The target is header/action ownership: warranty identity, mobile sidebar access, primary claim action, extension action, and certificate header actions should be explicit, testable, and isolated from page orchestration.

Status: Closed after Issue 1.

## Business Value

The warranty header is where operators start high-risk actions: filing a claim, extending a warranty, viewing/regenerating an existing certificate, or generating a missing certificate. Header action availability must stay honest when certificate status is loading, when layout-level actions are rendered elsewhere, and when claim or extension submission is pending.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model and certificate status read model
-> `WarrantyDetailHeaderSection`
-> operator-visible warranty identity, sidebar access, claim/extension actions, and certificate actions.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, coverage summary, quick-answer strip, notification settings, claims history, extensions, service linkage, activity fetch behavior, or dialog behavior.
- Preserve current header name, subtitle fallback, status mapping, mobile sidebar trigger, layout-owned action suppression, primary action rules, extension action, certificate loading action, certificate view/regenerate actions, certificate generate action, and delete action behavior.
- Treat this as a behavior-preserving header/action presentation extraction.
- Add focused tests for identity/subtitle, primary and extension callbacks, missing-certificate generation, existing-certificate view/regenerate actions, loading lockout, layout-owned action suppression, and mobile sidebar trigger presence.

## Issue Ledger

### 1. Warranty Header Action Boundary

Problem:

- `warranty-detail-view.tsx` still owns `useWarrantyHeaderActions`, `EntityHeader`, mobile sidebar trigger state, and certificate action wiring.
- These controls carry operator trust risk: loading certificate status must not expose generate/view actions, existing certificate state must expose view/regenerate actions, missing certificate state must expose generation, and layout-owned actions must suppress duplicate header actions.
- Header action contracts are only indirectly covered through the large page presenter and shared hook.

Workflow protected:

Warranty detail route -> warranty and certificate read models -> warranty header section -> claim, extension, certificate, delete, and sidebar actions.

Planned slice:

- Extract mobile sidebar trigger, `EntityHeader`, and header action hook wiring into `WarrantyDetailHeaderSection`.
- Preserve identity copy, owner fallback, status mapping, layout action suppression, and certificate action behavior.
- Add focused tests for action wiring and suppression states.

Out of scope:

- Changing `useWarrantyHeaderActions` behavior.
- Changing layout-level `EntityHeaderActions` in the container.
- Changing certificate generation/download/regeneration implementations.
- Changing dialogs, tab list, coverage summary, quick-answer strip, alerts, claims history, extensions, service linkage, sidebar traceability, activity panels, or support handoff UI.
- Changing server read models, query keys, cache policy, tenant enforcement, or mutation behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty header/action presentation, warranty component tests, warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model and certificate status read model -> `WarrantyDetailHeaderSection` -> identity, mobile sidebar access, claim, extension, certificate, and delete actions.
- Business value protected: operators still see the warranty identity and can start claim, extension, certificate, and delete workflows from the correct header surface. Certificate actions remain honest: loading status locks certificate actions, existing certificates expose view/regenerate, missing certificates expose generate, and layout-owned actions suppress duplicates.
- Architecture standards checked: no route, container, hook behavior, server function, schema, database, query key, cache invalidation, tenant enforcement, mutation, or dialog behavior changed. The page presenter no longer owns `EntityHeader`, mobile sidebar state, or `useWarrantyHeaderActions` wiring.
- Tenant/data/cache implications: none changed. This was a client presentation extraction only; tenant isolation, warranty reads, certificate reads, and mutation/cache contracts remain on their existing paths.
- Smells removed: `warranty-detail-view.tsx` is smaller and no longer mixes page orchestration with header action assembly. Header action states now have focused coverage outside the large page presenter.
- Smells deferred: `warranty-detail-view.tsx` still owns tab list composition, claims tab wiring, overview composition, dialog orchestration, and multiple support/lineage presentation zones. These remain candidates for future bounded warranty slices.
- Gates run: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-detail-header-section.test.tsx`; `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-detail-header-section.tsx tests/unit/warranty/warranty-detail-header-section.test.tsx`; `./node_modules/.bin/vitest run tests/unit/warranty`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`; `git diff --check`.
- Gates skipped: browser QA, because this was a behavior-preserving component extraction with focused unit coverage and no route/server/data changes.
- Goal adaptations: declined. The current product-owner goal and sprint closeout format fit this slice.
- Residual risk: claims tab composition, dialog orchestration, and remaining overview/support presentation zones are still concentrated in `warranty-detail-view.tsx`; the next slice should keep reducing those page-level responsibilities without broadening into server or cache behavior unless a real invariant requires it.
