# Inventory Maintainer Sprint 129: Direct PO Creation Product Guard

## Status

Closed in commit-ready state.

## Issue 1: Direct Inventory PO Dialogs Could Bypass Purchasable Picker Policy

### Problem

Sprint 128 aligned the generic purchase-order create picker with the server-side purchasable-product invariant. Two inventory entry points still created purchase orders directly:

- Create PO from inventory alert.
- Create PO from reorder recommendation.

Both dialogs call `useCreatePurchaseOrder` directly and could send a stale or non-purchasable product link to the mutation. The server would reject it, but the dialogs had no honest pre-submit state for that product policy.

### Workflow Spine

Inventory alert / forecast recommendation
-> direct create-PO dialog
-> product detail validation
-> supplier selection and quantity form
-> `useCreatePurchaseOrder`
-> supplier purchase-order server mutation
-> PO approval / ordering / receiving / inventory and finance state.

### Touched Domains

- Inventory alert create-PO dialog.
- Inventory forecasting create-PO dialog.
- Shared inventory procurement product guard.
- Focused inventory guard tests.
- Inventory/procurement sprint evidence.

### Business Value Protected

Operators should not be allowed to create procurement records from low-stock alerts or reorder recommendations when the product is inactive, discontinued, not purchasable, or no longer available. The workflow now blocks earlier with clear copy instead of failing only after submit.

### Scope Constraints

- Do not change server mutation policy from Sprints 126-127.
- Do not change alert or forecasting generation logic.
- Do not change supplier selection, quantity defaults, pricing defaults, notes, or success behavior.
- Do not change query keys or cache invalidation.

### Changes

- Added `procurement-product-guard.ts` with a shared active/purchasable product-state check.
- Direct create-PO dialogs now load the linked product detail with `useProduct`.
- Direct dialogs disable submit while product detail is loading or blocked.
- Direct dialogs show and preserve operator-safe blocked copy before mutation.
- Added focused tests for guard behavior and both direct-dialog wiring points.

### Standards Checked

- Domain ownership: shared procurement product policy lives in the inventory domain next to direct inventory procurement surfaces.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: direct dialogs now validate product detail through the product hook before calling the purchase-order mutation.
- Tenant isolation/data integrity: product detail remains tenant-scoped through the product server function.
- Transactional inventory/finance integrity: blocked products cannot become new procurement source records through these direct inventory workflows.
- Serialized lineage continuity: no serialized mutation path changed; cleaner PO creation protects downstream receiving lineage.
- UI states/error handling: direct dialogs now show honest unavailable/not-purchasable states.
- Reviewability: one small helper, two call sites, focused tests, one closeout note.

### Smells Removed

- Direct inventory PO dialogs interpreted product validity less strictly than the PO server mutation.
- Reorder and alert flows relied on submit-time rejection for stale product state.

### Deferred

- Existing stale alerts or recommendations remain data-quality/read-model slices.
- Product detail fetch failures use the same unavailable guard copy; richer retry affordances can be a separate UX slice.
- Browser QA was not selected because this is a product-state guard and no layout behavior was intentionally changed.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/procurement-product-guard.test.ts`.
- Passed: focused ESLint on touched guard, dialogs, and test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint is upstream of stock-in and preserves lineage continuity.

### Residual Risk

Low for these two direct PO creation surfaces. Alert and forecasting generation may still surface products that later become non-purchasable, but the create-PO action now blocks before mutation.
