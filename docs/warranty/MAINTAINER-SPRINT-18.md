# Warranty Maintainer Sprint 18

This sprint shifts from warranty detail cleanup to the adjacent claim-detail workflow. The target is claim SLA alert orchestration: response and resolution SLA prompts should be isolated from the large claim detail presenter.

Status: Closed after Issue 1.

## Business Value

Warranty claims are support commitments. Breached or at-risk SLAs tell operators where customer follow-through is in danger. Those prompts must remain visible, dismissible, and route operators to the SLA tab without hiding inside a large mixed-responsibility claim detail view.

## Workflow Spine

Claim detail route
-> `WarrantyClaimDetailContainer`
-> claim read model and SLA status models
-> `WarrantyClaimDetailAlertsSection`
-> visible SLA alerts and dismissals
-> controlled SLA-tab navigation callback.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, claim actions, claim tabs, sidebar content, claim progress, SLA copy, alert IDs, dismissal hook behavior, or mutation behavior.
- Preserve response SLA breached/at-risk alerts, resolution SLA breached/at-risk alerts, visible alert filtering, max three visible alerts, dismiss behavior, and View SLA action behavior.
- Preserve page-owned tab state by passing a callback for SLA navigation.
- Treat this as a behavior-preserving claim alert orchestration extraction.
- Add focused tests for response breach, response at-risk, resolution breach, resolution at-risk, dismissed filtering, View SLA action, and dismissal callback.

## Issue Ledger

### 1. Warranty Claim SLA Alert Boundary

Problem:

- `warranty-claim-detail-view.tsx` is 792 lines and still owns SLA alert construction, alert IDs, dismissal filtering, and alert rendering.
- SLA alert behavior is an operator-risk contract but is not independently protected.
- Claim detail is beginning to repeat the same smell already removed from warranty detail: page-level orchestration mixed with alert rules and local dismissal persistence.

Workflow protected:

Claim detail route -> claim/SLA read models -> SLA alert section -> operator navigation to SLA tab.

Planned slice:

- Extract `WarrantyClaimDetailAlertsSection`.
- Preserve alert copy, alert IDs, dismissal filtering, and View SLA behavior.
- Add focused tests around the extracted section.

Out of scope:

- Changing claim header, progress, sidebar, tabs, claim overview, SLA panel, action timeline, server read models, mutations, query keys, cache policy, tenant enforcement, or database behavior.

Closeout:

- Touched domains: warranty claim detail presentation, warranty claim SLA alert orchestration, warranty component tests, warranty sprint evidence.
- Workflow protected: claim detail route -> `WarrantyClaimDetailContainer` -> claim read model and SLA status models -> `WarrantyClaimDetailAlertsSection` -> response/resolution SLA alerts and dismissals -> controlled SLA-tab navigation callback.
- Business value protected: operators still see response and resolution SLA breached/at-risk prompts, can dismiss them by stable alert ID, and can navigate directly to the SLA tab from alert actions.
- Architecture standards checked: no route, hook behavior, server function, schema, database, query key, cache invalidation, tenant enforcement, mutation implementation, claim actions, claim tabs, sidebar content, progress UI, SLA copy, alert IDs, or dismissal TTL/localStorage behavior changed.
- Tenant/data/cache implications: none changed. This was a client presentation/orchestration extraction only; claim reads, SLA status derivation, tenant scope, and mutation/cache behavior remain on existing paths.
- Smells removed: `warranty-claim-detail-view.tsx` no longer imports alert primitives or dismissal helpers, builds SLA alerts inline, filters dismissed alerts, caps visible alerts, or renders the alert action surface directly. The file is down from 792 to 687 lines, and SLA alert behavior now has focused tests.
- Smells deferred: `warranty-claim-detail-view.tsx` still owns header/sidebar composition, progress state, overview tab composition, SLA tab composition, and action timeline assembly.
- Gates run: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-claim-detail-alerts-section.test.tsx`; `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-claim-detail-view.tsx src/components/domain/warranty/views/warranty-claim-detail-alerts-section.tsx tests/unit/warranty/warranty-claim-detail-alerts-section.test.tsx`; `./node_modules/.bin/vitest run tests/unit/warranty`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`.
- Gates skipped: browser QA, because this was a behavior-preserving client alert-orchestration extraction with focused tests and no route/server/data changes.
- Goal adaptations: declined. The standing product-owner goal and bounded sprint closeout format still fit this slice.
- Residual risk: claim detail remains large and mixed. The next claim-detail slice should target header/sidebar or SLA tab ownership only if a concrete behavior change needs it; otherwise, broader product debt should be reprioritized across support/RMA/inventory.
