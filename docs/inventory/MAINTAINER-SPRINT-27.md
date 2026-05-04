# Inventory Maintainer Sprint 27

This sprint follows Sprint 26's product-scoped turnover filter cleanup. The target is cost-layer quantity-bound integrity: manual cost-layer creation should reject layers whose remaining quantity exceeds received quantity before bad finance data reaches the database.

Status: Closed after Issue 1.

## Business Value

Cost layers are the FIFO valuation source for RENOZ Energy battery stock. A layer with more remaining units than received units corrupts valuation trust, finance integrity checks, and downstream COGS reasoning. Operators should not be able to create impossible layer state through the valuation workflow.

## Workflow Spine

cost-layer create hook
-> `useCreateCostLayer`
-> `createCostLayer`
-> `createCostLayerSchema`
-> inventory manage permission
-> organization-scoped inventory row
-> valid cost-layer quantity bounds
-> existing valuation query-key/cache policy.

## Architecture Constraints

- Keep this sprint to cost-layer schema/data-integrity bounds.
- Preserve public schema exports, coercion behavior, server response shape, query keys, cache invalidation, and UI.
- Do not broaden into manual cost-layer workflow redesign, inventory value recomputation, live database fixtures, or finance reconciliation UX.

## Issue Ledger

### 1. Cost-Layer Schema Allowed Remaining Quantity Above Received Quantity

Problem:

- `createCostLayerSchema` required positive `quantityReceived` and non-negative `quantityRemaining`.
- It did not enforce `quantityRemaining <= quantityReceived`.
- Finance integrity later flags over-remaining layers, but the create workflow should reject impossible layer state before insertion.

Workflow protected:

cost-layer create -> schema validation -> tenant-owned inventory row -> valid FIFO layer bounds -> valuation cache refresh.

Implemented slice:

- Added a shared cost-layer base schema for create and row schemas.
- Added a quantity-bound refinement to `createCostLayerSchema`.
- Added the same quantity-bound refinement to `costLayerSchema`.
- Added a focused schema test that rejects `quantityRemaining > quantityReceived`.

Out of scope:

- Changing cost-layer create server response shape.
- Recomputing inventory valuation after manual layer creation.
- Disabling manual cost-layer creation.
- Adding live database fixtures.

Closeout:

- Touched domains: inventory valuation schema, valuation schema ownership tests, inventory sprint evidence.
- Workflow protected: cost-layer create hook/server function -> valuation schema -> valid FIFO cost-layer bounds -> existing valuation cache contract.
- Business value protected: impossible FIFO layer quantities are rejected before they can weaken valuation and finance integrity signals.
- Architecture standards checked: route/page/hook/query-key/cache flow is unchanged; schema ownership remains in valuation; server function continues to enforce inventory manage permission and organization-scoped inventory ownership.
- Tenant isolation and data integrity checked: no server query or tenant predicate changed; data-integrity guard added at schema boundary; no inventory mutations, serialized lineage, or finance reconciliation paths changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, or cache mutation helpers changed.
- Smells removed: cost-layer create validation allowed over-remaining layers.
- Smells deferred: manual cost-layer workflow redesign; inventory value recomputation after manual layer creation; live cost-layer integration fixtures.
- Gates run: focused valuation schema ownership/bounds test; focused valuation analytics/permission tests; focused ESLint; full inventory suite; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a schema/data-integrity validation change with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already requires finance integrity, meaningful tests, reviewable domain slices, and closeout evidence.
- Residual risk: manual cost-layer creation still deserves a future workflow review for valuation recomputation and operator intent; this sprint only blocks impossible quantity bounds.
