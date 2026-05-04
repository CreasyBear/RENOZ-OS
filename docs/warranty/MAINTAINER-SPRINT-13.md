# Warranty Maintainer Sprint 13

This sprint continues warranty-domain ownership cleanup after the header/action section moved out of the warranty detail presenter. The target is dialog orchestration: filing a claim, reviewing a claim, and extending a warranty should be explicit, testable, and isolated from the page presenter.

Status: Closed after Issue 1.

## Business Value

Warranty dialogs carry operator trust and business follow-through. Filing a claim starts the support/remedy path, claim review can approve, deny, or request information, and extension creates new warranty entitlement terms. The page presenter should not hide data-shaping contracts for those workflows inside a large mixed-responsibility component.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model and selected claim read model
-> `WarrantyDetailDialogs`
-> claim filing, claim review, and extension dialog contracts
-> existing mutation callbacks owned by the container.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, claims history, extension history, header actions, activity panels, sidebar cards, or mutation behavior.
- Preserve claim form warranty mapping, approval claim mapping, approval dialog conditional rendering, extension warranty mapping, open-state callbacks, submit callbacks, success callbacks, and submitting flags.
- Treat this as a behavior-preserving dialog orchestration extraction.
- Add focused tests for claim form mapping, extension mapping, approval dialog rendering, approval fallback labels, callback pass-through, and submitting state pass-through.

## Issue Ledger

### 1. Warranty Dialog Contract Boundary

Problem:

- `warranty-detail-view.tsx` still owns all modal data-shaping for claim filing, claim approval, and warranty extension.
- These mappings are high-trust operator contracts but are only indirectly protected through the larger page presenter.
- The page presenter remains harder to reason about because view layout, tab state, alerts, sidebar content, and mutation dialog contracts live together.

Workflow protected:

Warranty detail route -> warranty and selected claim read models -> dialog contract adapter -> claim filing, claim review, and extension mutations.

Planned slice:

- Extract the three warranty detail dialogs into `WarrantyDetailDialogs`.
- Preserve the existing warranty and claim object shapes passed to each dialog.
- Preserve conditional approval rendering when no claim is selected.
- Add focused tests around mapping, fallbacks, and callbacks.

Out of scope:

- Changing dialog internals.
- Changing claim history card behavior.
- Changing extension history behavior.
- Changing header actions, activity panels, sidebar summary, service linkage, lineage, coverage summary, quick answers, alerts, or notification settings.
- Changing server read models, mutation implementations, query keys, cache policy, or tenant enforcement.

Closeout:

- Touched domains: warranty detail presentation, warranty dialog orchestration, warranty component tests, warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model and selected claim read model -> `WarrantyDetailDialogs` -> claim filing, claim review, and extension dialog contracts -> existing container-owned mutation callbacks.
- Business value protected: operators still file claims, review selected claims, and extend warranties through the same dialogs with the same loading, success, open-state, and mutation callback contracts. Incomplete approval context still shows honest fallback labels instead of leaking blank customer or product names.
- Architecture standards checked: no route, hook, server function, schema, database, query key, cache invalidation, tenant enforcement, mutation implementation, dialog internals, claims history, or extension history changed. This was a client presentation adapter extraction only.
- Tenant/data/cache implications: none changed. Tenant isolation and mutation/cache behavior remain on the existing container/server paths; this slice only moved dialog prop shaping into a focused warranty component.
- Smells removed: `warranty-detail-view.tsx` no longer owns claim form, approval, and extension dialog object mapping. The page presenter is down to 290 lines and the dialog contracts now have focused coverage.
- Smells deferred: `warranty-detail-view.tsx` still owns active tab state, tab list composition, claims tab routing, overview composition, alert navigation, sidebar content assembly, and activity panel placement.
- Gates run: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-detail-dialogs.test.tsx`; `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-detail-dialogs.tsx tests/unit/warranty/warranty-detail-dialogs.test.tsx`; `./node_modules/.bin/vitest run tests/unit/warranty`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`.
- Gates skipped: browser QA, because this was a behavior-preserving client adapter extraction with mocked dialog contract tests and no route/server/data changes.
- Goal adaptations: declined. The standing product-owner goal and bounded sprint closeout format still fit this slice.
- Residual risk: tab and overview composition remain concentrated in the page presenter. The next warranty slice should likely extract the tab shell/claims tab routing or the overview stack, with focused tests around claims badge/error behavior and alert-driven tab changes.
