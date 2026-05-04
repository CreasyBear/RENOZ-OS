# Warranty Maintainer Sprint 17

This sprint continues warranty-domain ownership cleanup after sidebar composition moved out of the warranty detail presenter. The target is alert orchestration: warranty alert building, dismissal filtering, and action routing should live behind a focused component instead of inline page logic.

Status: Closed after Issue 1.

## Business Value

Warranty alerts are operator intervention prompts. Expired warranties, expiring coverage, and disabled expiry reminders need honest visibility and predictable actions: extend warranty, review claims, or re-enable alerts. The page presenter should not own the alert rules, dismissal filtering, and action routing directly.

## Workflow Spine

Warranty detail route
-> `WarrantyDetailContainer`
-> warranty read model
-> `WarrantyDetailAlertsSection`
-> alert builder, dismissal persistence, visible alert filter, and alert action routing
-> existing extend-dialog, claims-tab, and notification callbacks.

## Architecture Constraints

- Keep this sprint warranty-domain only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, header actions, coverage summary, dialogs, tab shell, sidebar content, alert copy/rules, dismissal hook behavior, or mutation behavior.
- Preserve alert ordering, max three visible alerts, dismissal filtering, extend action, review-claims action, and enable-alerts action.
- Preserve page-owned tab state by passing a callback for claims review navigation.
- Treat this as a behavior-preserving alert orchestration extraction.
- Add focused tests for visible alert rendering, dismissed alert filtering, three-alert cap, extend action, review-claims action, enable-alerts action, and dismissal callback.

## Issue Ledger

### 1. Warranty Alert Orchestration Boundary

Problem:

- `warranty-detail-view.tsx` still imports `useAlertDismissals`, builds warranty alerts, filters dismissed alerts, caps visible alerts, and wires alert actions.
- Alert behavior is a user-facing intervention contract but is only indirectly covered through utility/component tests.
- This keeps page orchestration mixed with warranty alert rules and local UI persistence.

Workflow protected:

Warranty detail route -> warranty read model -> alert orchestration -> operator action prompts for extension, claim review, and expiry reminders.

Planned slice:

- Extract `WarrantyDetailAlertsSection`.
- Preserve existing alert builder inputs, dismissal filtering, three-alert cap, and action wiring.
- Add focused tests around the extracted alert section.

Out of scope:

- Changing alert copy, alert IDs, alert rules, dismissal TTL/localStorage behavior, tab state ownership, child alert UI internals, server read models, mutations, query keys, cache policy, tenant enforcement, or database behavior.

Closeout:

- Touched domains: warranty detail presentation, warranty alert orchestration, warranty component tests, warranty sprint evidence.
- Workflow protected: warranty detail route -> `WarrantyDetailContainer` -> warranty read model -> `WarrantyDetailAlertsSection` -> alert builder, dismissal persistence, visible alert filter, and action routing -> existing extend-dialog, claims-tab, and notification callbacks.
- Business value protected: operators still see expired, expiring, and disabled-reminder prompts with the same action routing. Dismissed alerts remain hidden, only the first three visible alerts render, extension actions still open the extension dialog, claim-review actions still move to claims, and enable-alerts actions still toggle opt-out off.
- Architecture standards checked: no route, hook behavior, server function, schema, database, query key, cache invalidation, tenant enforcement, mutation implementation, alert copy/rules, dismissal TTL/localStorage behavior, tab shell, sidebar content, dialog, coverage summary, or child alert UI internals changed.
- Tenant/data/cache implications: none changed. This was a client presentation/orchestration extraction only; warranty reads, tenant scope, and mutation/cache behavior stay on existing paths.
- Smells removed: `warranty-detail-view.tsx` no longer imports `useAlertDismissals`, builds warranty alerts, filters dismissed alerts, caps visible alerts, or wires raw alert actions. The page presenter is down to 209 lines, and alert orchestration has focused tests.
- Smells deferred: `warranty-detail-view.tsx` still owns top-level page grid composition, active tab state, coverage summary placement, and coordination between extracted header/sidebar/alerts/tabs/dialog components.
- Gates run: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-detail-alerts-section.test.tsx`; `./node_modules/.bin/eslint src/components/domain/warranty/views/warranty-detail-view.tsx src/components/domain/warranty/views/warranty-detail-alerts-section.tsx tests/unit/warranty/warranty-detail-alerts-section.test.tsx`; `./node_modules/.bin/vitest run tests/unit/warranty`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`.
- Gates skipped: browser QA, because this was a behavior-preserving client alert-orchestration extraction with focused tests and no route/server/data changes.
- Goal adaptations: declined. The standing product-owner goal and bounded sprint closeout format still fit this slice.
- Residual risk: the remaining page presenter is mostly composition glue. Future warranty work should pause broad extraction unless a concrete behavior slice needs it; the next higher-value target may be a different warranty workflow or another domain with worse business debt.
