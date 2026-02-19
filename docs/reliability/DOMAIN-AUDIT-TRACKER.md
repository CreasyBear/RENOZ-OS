# Domain Audit Tracker

Track audit + remediation execution domain-by-domain.

**Legend**
- `Not Started`
- `In Audit`
- `In Remediation`
- `Hardened`
- `Monitoring`

---

## Domain Status

| Domain | Status | Owner | P0 | P1 | P2 | P3 | Notes |
|---|---|---|---:|---:|---:|---:|---|
| Orders | Monitoring | TBD | 0 | 0 | 2 | 3 | Core blocking issues addressed; monitor search-param/dialog behavior |
| Customers | In Remediation | TBD | 0 | 0 | 2 | 3 | Route/edit paths stable; draft and pattern consistency debt remains |
| Products | In Remediation | TBD | 0 | 1 | 2 | 0 | Route-typing and dead-control hardening in progress across product screens |
| Suppliers | In Remediation | TBD | 0 | 1 | 0 | 1 | List edit path fixed to route-based edit |
| Communications | In Remediation | TBD | 0 | 1 | 0 | 1 | OAuth callback flow hardened against duplicate processing |
| Pipeline | In Remediation | TBD | 0 | 1 | 1 | 0 | Silent edit no-op hardened; canonical edit surface still missing |
| Projects | In Remediation | TBD | 0 | 1 | 1 | 0 | URL edit/tab intent now consumed on detail route |
| Inventory | In Remediation | TBD | 0 | 0 | 1 | 1 | Dead action affordances in locations page hardened |
| Procurement / Purchase Orders | In Remediation | TBD | 0 | 1 | 1 | 0 | Dead edit-intent route removed; receiving dialog URL state still needs state-machine pass |
| Financial | In Remediation | TBD | 0 | 1 | 1 | 0 | Invoice status normalization hardened for nullable legacy rows |
| Support | In Remediation | TBD | 0 | 0 | 1 | 1 | Claims route navigation typing hardened; continue transition consistency sweep |
| Mobile | In Remediation | TBD | 0 | 0 | 1 | 1 | Removed dead transfer quick-link and wired settings nav action |
| Admin / Settings | In Audit | TBD | 0 | 0 | 1 | 1 | Route references validated in this pass; continue dialog/edit consistency sweep |

---

## Current Sprint Focus

- Primary: `Customers`
- Secondary: `Products`

---

## Findings Log Template

Copy this block per finding:

```md
### [DOMAIN]-[###] Title
- Severity: P0|P1|P2|P3
- Status: Open | Fixed | Waived
- User Impact: ...
- File: `path/to/file.tsx:line`
- Root Cause: ...
- Fix: ...
- Regression Test: ...
- Commit/PR: ...
```

---

## Reliability Gates (Per Domain)

- [ ] Entry points mapped
- [ ] Route mountability verified
- [ ] Edit model consistency verified
- [ ] No render-time side effects
- [ ] Draft/submit reliability verified
- [ ] Cache invalidation/refetch validated
- [ ] P0/P1 resolved

---

## Orders Findings (Seeded)

### ORD-001 Route tree drift after route moves
- Severity: P0
- Status: Fixed
- User Impact: Environment-dependent route behavior; URL changes with missing UI in some builds.
- File: `src/routeTree.gen.ts`
- Root Cause: Route files moved to flat patterns while generated tree referenced stale files.
- Fix: Regenerated route tree and verified route imports/parents match current filesystem.
- Regression Test: Validate moved route files appear in generated imports and parent route is `AuthenticatedRoute`.
- Commit/PR: Pending

### ORD-002 Non-draft `?edit=true` silently no-ops
- Severity: P1
- Status: Fixed
- User Impact: User lands on edit-intent URL and sees no dialog, no explanation.
- File: `src/components/domain/orders/containers/order-detail-container.tsx`
- Root Cause: Search param opened edit state but dialog render was gated to draft status only.
- Fix: Added explicit guard: show feedback, close dialog state, clean URL search.
- Regression Test: Open `/orders/:id?edit=true` for non-draft order and verify explicit feedback + URL cleanup.
- Commit/PR: Pending

### ORD-003 Wizard draft flow fragility under restore/discard
- Severity: P1
- Status: Fixed
- User Impact: Stuck saving indicators, restore/discard confusion, blocked progression.
- File: `src/hooks/_shared/use-form-draft.ts`, `src/components/domain/orders/creation/order-creation-wizard.tsx`
- Root Cause: Timer races and immediate re-save after restore/discard.
- Fix: Added timer cancellation, autosave suppression snapshots, and state guards.
- Regression Test: Restore draft, discard draft, type change, and verify no stuck `Saving draft...`.
- Commit/PR: Pending

### ORD-004 Search-param dialog routing remains complex
- Severity: P2
- Status: Open
- User Impact: Future regressions likely in `?edit`, `?pick`, `?ship` interactions.
- File: `src/components/domain/orders/containers/order-detail-container.tsx`
- Root Cause: Multiple URL-driven dialog modes in one container with interdependent close behavior.
- Fix: Extract dialog state machine into dedicated hook with explicit transition table and tests.
- Regression Test: table-driven transitions for each search param and order status combination.
- Commit/PR: Pending

### ORD-005 Mixed action surfaces (route vs modal) for fulfillment/edit workflows
- Severity: P3
- Status: Open
- User Impact: Inconsistent mental model across Orders entry points.
- File: `src/routes/_authenticated/orders/fulfillment.tsx`, `src/components/domain/orders/containers/order-detail-container.tsx`
- Root Cause: Different orchestration surfaces use similar actions with different state ownership.
- Fix: Standardize action orchestration contract per Reliability Standards §1.1.
- Regression Test: workflow matrix from list/detail/fulfillment to final state.
- Commit/PR: Pending

---

## Customers Findings

### CUS-001 Duplicate draft engines increase divergence risk
- Severity: P2
- Status: Open
- User Impact: Inconsistent draft behavior between customer form and customer wizard.
- File: `src/components/domain/customers/customer-wizard/use-customer-wizard-draft.ts`, `src/hooks/_shared/use-form-draft.ts`
- Root Cause: Customer wizard uses a bespoke draft hook while shared forms use `useFormDraft`.
- Fix: Unify wizard draft flow on shared draft infrastructure (or shared core primitive).
- Regression Test: restore/discard parity tests between customer form and customer wizard.
- Commit/PR: Pending

### CUS-002 Edit flow is route-driven but still scattered across multiple navigation helpers
- Severity: P2
- Status: Open
- User Impact: Higher chance of route literal drift and inconsistent behavior over time.
- File: `src/hooks/customers/use-customer-detail.ts`, `src/hooks/customers/use-customer-navigation.ts`, `src/components/domain/customers/customers-list-container.tsx`
- Root Cause: Repeated string-literal route usage in multiple layers.
- Fix: Centralize customer navigation intents in one utility/hook and consume everywhere.
- Progress: Customers list now uses `useCustomerNavigation.navigateToEdit` for edit routing.
- Regression Test: one integration test for list/detail -> edit -> detail navigation.
- Commit/PR: Pending

### CUS-003 Customer edit route is heavy and mutation-dense (high regression surface)
- Severity: P3
- Status: Open
- User Impact: More opportunities for partial-save edge cases and UX inconsistency.
- File: `src/routes/_authenticated/customers/$customerId_.edit.tsx`
- Root Cause: Route-level orchestration performs customer + contacts + addresses sync loops in one component.
- Fix: Split orchestration into domain hook with transaction-like failure messaging and partial-operation reporting.
- Regression Test: simulate create/update/delete combinations for contacts/addresses in one submit.
- Commit/PR: Pending

---

## Projects Findings

### PRJ-001 Project detail ignored `?edit=true` URL intent
- Severity: P1
- Status: Fixed
- User Impact: URL changes to edit-intent but dialog does not open.
- File: `src/routes/_authenticated/projects/$projectId.tsx`, `src/components/domain/jobs/projects/containers/project-detail-container.tsx`
- Root Cause: Route validated `edit` but container UI state never consumed it.
- Fix: Added `openEditOnMount` and edit-open change callback; clear `edit` from URL after dialog close.
- Regression Test: open `/projects/:id?edit=true`, confirm edit dialog opens once and URL is cleaned on close.
- Commit/PR: Pending

### PRJ-002 Project detail ignored deep-link tab initialization
- Severity: P2
- Status: Fixed
- User Impact: Shared links with `?tab=tasks` landed on overview, causing confusion.
- File: `src/hooks/jobs/use-project-detail.ts`, `src/components/domain/jobs/projects/containers/project-detail-container.tsx`, `src/routes/_authenticated/projects/$projectId.tsx`
- Root Cause: UI hook defaulted to `overview` and did not receive route `tab`.
- Fix: Added `initialTab` option through composite hook and container from route search.
- Regression Test: open `/projects/:id?tab=tasks` and verify tasks tab is selected initially.
- Commit/PR: Pending

---

## Suppliers Findings

### SUP-001 Supplier list edit action navigated to non-consumed query mode
- Severity: P1
- Status: Fixed
- User Impact: Clicking edit could change URL without opening an edit surface.
- File: `src/components/domain/suppliers/suppliers-list-container.tsx`
- Root Cause: List used `/suppliers/$supplierId?edit=true` while domain now uses `/suppliers/$supplierId/edit`.
- Fix: Updated list edit navigation to dedicated edit route.
- Regression Test: click Edit from supplier list and verify `/suppliers/:id/edit` loads edit page.
- Commit/PR: Pending

### SUP-002 Mixed edit models (query-mode legacy + route-mode current)
- Severity: P3
- Status: Open
- User Impact: Increased drift risk and future regressions in list/detail flows.
- File: `src/components/domain/suppliers/**`, `src/routes/_authenticated/suppliers/**`
- Root Cause: Legacy query-driven edit pattern survived route migration.
- Fix: Sweep for query-edit remnants and standardize on route-based edit only.
- Regression Test: enforce no `search: { edit: true }` under suppliers domain.
- Commit/PR: Pending

---

## Products Findings

### PRD-001 Product table row actions were effectively no-op
- Severity: P1
- Status: Fixed
- User Impact: Edit/Duplicate/Delete actions appeared but did nothing from products list.
- File: `src/routes/_authenticated/products/products-page.tsx`
- Root Cause: `ProductTable` action callbacks were not wired from page container.
- Fix: Wired `onEditProduct`, `onDuplicateProduct`, and `onDeleteProduct` handlers.
- Regression Test: run row action matrix from products list and verify route or mutation executes.
- Commit/PR: Pending

### PRD-002 Mixed edit surfaces between detail modal and dedicated edit route
- Severity: P2
- Status: Open
- User Impact: Inconsistent mental model (detail opens modal, list opens route edit).
- File: `src/components/domain/products/containers/product-detail-container.tsx`, `src/routes/_authenticated/products/$productId_.edit.tsx`
- Root Cause: Two edit orchestration patterns coexist.
- Fix: Choose one canonical edit surface and deprecate the other via standards.
- Regression Test: UX consistency test across list/detail/quick actions.
- Commit/PR: Pending

### PRD-003 Product routes used string-cast navigation in key create/list flows
- Severity: P2
- Status: Fixed
- User Impact: Increases silent route drift risk when paths change; weakens compile-time route safety.
- File: `src/routes/_authenticated/products/new.tsx`, `src/routes/_authenticated/products/products-page.tsx`
- Root Cause: Use of `navigate({ to: ... as string })` and template-string route paths bypassed typed route checks.
- Fix: Replaced casts/template paths with typed route targets and params.
- Regression Test: navigate create/list/detail flows and verify route typing catches invalid targets at compile time.
- Commit/PR: Pending

### PRD-004 Product tab actions exposed non-functional controls
- Severity: P2
- Status: Fixed
- User Impact: Multiple visible actions in pricing/relations/inventory tabs appeared clickable but performed no action.
- File: `src/components/domain/products/tabs/pricing-tab.tsx`, `src/components/domain/products/tabs/relations-tab.tsx`, `src/components/domain/products/tabs/inventory-tab-view.tsx`
- Root Cause: Placeholder controls and empty-state actions were wired with no-op handlers.
- Fix: Converted non-implemented actions to explicit disabled states and removed no-op empty-state actions.
- Regression Test: verify no product-tab action appears clickable without an implemented behavior.
- Commit/PR: Pending

---

## Procurement / Purchase Orders Findings

### PPO-001 PO detail edit action navigated into unimplemented `editId` create flow
- Severity: P1
- Status: Fixed
- User Impact: Clicking Edit changed URL/intention without any usable edit surface.
- File: `src/routes/_authenticated/purchase-orders/$poId.tsx`
- Root Cause: Detail route navigated to `/purchase-orders/create?editId=...` but create flow does not implement edit mode.
- Fix: Removed dead navigation path; now provides explicit user feedback instead of broken route handoff.
- Regression Test: click Edit on PO detail and verify no dead route transition occurs.
- Commit/PR: Pending

### PPO-002 Missing canonical PO edit surface
- Severity: P2
- Status: Open
- User Impact: Users cannot perform full PO edits (line items, supplier, terms) from a dedicated edit flow.
- File: `src/routes/_authenticated/purchase-orders/create.tsx`, `src/routes/_authenticated/purchase-orders/-create-page.tsx`, `src/components/domain/suppliers/po-creation-wizard.tsx`
- Root Cause: Creation wizard is create-only and update endpoint does not cover item-level editing.
- Fix: Add explicit `/purchase-orders/$poId/edit` route with server support for draft-safe PO item updates.
- Regression Test: end-to-end edit scenario for supplier/terms/items with save and detail refetch.
- Commit/PR: Pending

---

## Pipeline Findings

### PIP-001 Opportunity detail edit action was a silent no-op
- Severity: P1
- Status: Fixed
- User Impact: Clicking "Edit Opportunity" did nothing, creating confusion.
- File: `src/hooks/pipeline/use-opportunity-detail.ts`
- Root Cause: `onEdit` set local `isEditing` state that is never consumed by any rendered component.
- Fix: Replaced silent state toggle with explicit user feedback to avoid false affordance.
- Regression Test: click "Edit Opportunity" and verify user receives explicit message instead of no-op.
- Commit/PR: Pending

### PIP-002 Canonical opportunity edit surface is still undefined
- Severity: P2
- Status: Open
- User Impact: No consistent direct edit workflow from detail/list contexts.
- File: `src/components/domain/pipeline/opportunities/containers/opportunity-detail-container.tsx`, `src/components/domain/pipeline/pipeline-kanban-container.tsx`
- Root Cause: Quick dialog edit flow exists in kanban context while detail route has no mounted edit form.
- Fix: Introduce dedicated route-driven edit surface (or reusable dialog orchestration) and standardize entry points.
- Regression Test: matrix test for edit from list/kanban/detail leading to same editable form.
- Commit/PR: Pending

---

## Communications Findings

### COM-001 OAuth callback processing could execute more than once per mount
- Severity: P1
- Status: Fixed
- User Impact: Duplicate account connect attempts, repeated toasts, and redirect churn after OAuth return.
- File: `src/routes/_authenticated/communications/settings/inbox-accounts_.callback.tsx`
- Root Cause: Callback side-effect lived in `useEffect` without one-time guard while mutation state updates can re-render.
- Fix: Added `handledRef` guard to ensure callback/error handling runs once per mount.
- Regression Test: simulate callback route with valid `code/state` and verify single mutation invocation.
- Commit/PR: Pending

---

## Financial Findings

### FIN-001 Nullable `invoiceStatus` created transition/action dead-ends
- Severity: P1
- Status: Fixed
- User Impact: Legacy invoices with `invoiceStatus = null` rendered as draft but had no status transition actions, blocking progression.
- File: `src/hooks/invoices/use-invoice-detail.ts`
- Root Cause: Hook returned `nextStatusActions = []` and blocked `onUpdateStatus` when `invoiceStatus` was null.
- Fix: Normalized null invoice status to `'draft'` in one place and reused it for transitions and alerts.
- Regression Test: load an invoice with null status and verify status actions are available per draft transition rules.
- Commit/PR: Pending

### FIN-002 Product edit route could render a blank screen on missing loader payload
- Severity: P2
- Status: Fixed
- User Impact: Navigating to product edit with missing payload produced no visible feedback.
- File: `src/routes/_authenticated/products/$productId_.edit.tsx`
- Root Cause: Route returned `null` when `loaderData.product` was absent.
- Fix: Replaced null return with explicit error state and recovery action back to products.
- Regression Test: force missing product payload and verify user sees error state with recovery CTA.
- Commit/PR: Pending

---

## Support Findings

### SUPP-001 Claims list used string-cast route navigation
- Severity: P3
- Status: Fixed
- User Impact: Increases route refactor fragility and weakens typed navigation guarantees.
- File: `src/routes/_authenticated/support/claims/index.tsx`
- Root Cause: `navigate({ to: '/support/claims/$claimId' as string })` bypassed route typing.
- Fix: Removed cast and used typed route target directly.
- Regression Test: type-check route target and verify row click still opens claim detail.
- Commit/PR: Pending

---

## Inventory Findings

### INV-001 Locations page exposed dead Export/Import actions
- Severity: P3
- Status: Fixed
- User Impact: Users could click visible controls that performed no action, creating trust erosion.
- File: `src/routes/_authenticated/inventory/locations-page.tsx`
- Root Cause: Placeholder action buttons were rendered as active without implemented handlers.
- Fix: Marked actions disabled with explicit titles to communicate unavailable functionality.
- Regression Test: verify actions are visibly disabled and do not appear interactive.
- Commit/PR: Pending

---

## Mobile Findings

### MOB-001 Mobile home exposed dead transfer link and inert settings control
- Severity: P3
- Status: Fixed
- User Impact: Quick action could route to a non-existent path and bottom-nav settings affordance appeared clickable but did nothing.
- File: `src/routes/_authenticated/mobile/mobile-page.tsx`, `src/components/mobile/inventory-actions.tsx`
- Root Cause: `quickActions` referenced `/mobile/transfer` (no route), and settings button lacked navigation handler.
- Fix: Replaced dead quick action target with valid inventory route, wired settings button to `/settings`, and switched quick actions from raw anchors to router links.
- Regression Test: tap all mobile-home quick actions and bottom settings button; verify each leads to a mounted route.
- Commit/PR: Pending

---

## Cross-Cutting Findings

### XCUT-001 Non-route files under `src/routes` create noisy scanner warnings
- Severity: P3
- Status: In Progress
- User Impact: Indirect; increases risk of misplaced files and route confusion during maintenance.
- File: `src/routes/**` (multiple non-route files), `tsr.config.json`
- Root Cause: File placement and ignore pattern do not fully align.
- Fix: Rename non-route files with route ignore prefix or relocate outside `src/routes`.
- Progress: Expanded `routeFileIgnorePattern` in `tsr.config.json` to ignore common non-route helper suffixes.
- Regression Test: zero "does not export a Route" warnings in local route generation.
- Commit/PR: Pending

### XCUT-002 Form API augmentation still uses mutable merge pattern
- Severity: P3
- Status: Open
- User Impact: Future runtime regressions after library updates.
- File: `src/hooks/_shared/use-tanstack-form.ts`
- Root Cause: `Object.assign(form, utilities)` mutates external API object.
- Fix: Return wrapped API object without mutating base form instance.
- Regression Test: unit tests for set/get/watch helper behavior across upgrades.
- Commit/PR: Pending
