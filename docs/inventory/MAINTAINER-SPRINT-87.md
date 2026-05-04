# Inventory Maintainer Sprint 87

This sprint follows Sprint 86's single-PO serialization fail-closed handling. The target is boundary cleanup: product serialization error copy and formatting should live in one receive-owned boundary instead of being duplicated across bulk and single receiving.

Status: Closed after Issue 1.

## Business Value

Serialized battery receiving is a lineage-critical workflow. When product serialization requirements cannot be loaded, operators should see consistent, safe recovery copy whether they receive one PO or multiple POs.

## Workflow Spine

product serialization requirement read
-> read error normalization
-> shared product serialization error message formatting
-> bulk receiving error state
-> single receiving error state
-> retry failed product requirement reads.

## Architecture Constraints

- Keep this sprint to extraction and boundary cleanup.
- Preserve the fail-closed behavior from Sprints 85 and 86.
- Preserve server behavior, query keys, stale times, cache invalidation, dialog wizard state, and route behavior.
- Avoid fast-refresh violations by keeping pure helpers in a non-component module.

## Issue Ledger

### 1. Product Serialization Error Copy Was Duplicated Across Receiving Paths

Problem:

- Bulk receiving and single receiving both carried the same serialization fallback copy and product-label message formatting.
- The duplication made future drift likely in a safety-critical error path.
- A first extraction shape needed to respect the repo's fast-refresh lint rule for component files.

Workflow protected:

product serialization read failure -> product-label-aware error copy -> operator retry -> safe receiving block.

Implemented slice:

- Added `product-serialization-error-messages.ts` for shared constants and message formatting.
- Added `ProductSerializationErrorState` as the reusable receive-owned error-state component.
- Rewired bulk receiving to use the shared title/fallback/message builder while preserving mixed PO/product error behavior.
- Rewired single receiving to use the shared error-state component.

Out of scope:

- Browser QA of receiving overlays.
- Server receive mutation behavior.
- Product serialization hook behavior, already hardened in Sprint 85.
- Broader receive dialog visual polish.

Closeout:

- Touched domains: purchase-order receiving error boundary, procurement bulk receiving container, inventory sprint evidence.
- Workflow protected: product serialization read failure -> consistent receiving error copy -> retry failed product reads -> blocked receipt mutation.
- Business value protected: operators get consistent serialized-lineage safety messaging across bulk and single receiving.
- Architecture standards checked: shared pure helpers live in a non-component module; shared component only renders the error state; containers/wrappers still own read composition; hook/server/cache boundaries unchanged.
- Tenant isolation and data integrity checked: no database reads, writes, tenant predicates, transactions, finance behavior, or serialized inventory writes changed.
- Query/cache contract checked: no query keys, stale times, invalidation, optimistic updates, rollback behavior, or retry targets changed.
- Smells removed: duplicated serialization fallback copy and product-label formatting across bulk and single receiving.
- Smells deferred: browser QA of focus/operator perception; possible future extraction of PO detail error formatting if a second real duplicate emerges.
- Gates run: focused wrapper/hook/dialog tests (`3` files, `14` tests); focused ESLint; procurement + purchase-order + supplier + inventory unit suites (`106` files, `329` tests); TypeScript.
- Gates skipped: browser QA, because this was behavior-preserving extraction covered by existing component tests.
- Goal adaptations: declined. The standing maintainer goal already covers boundary cleanup, serialized lineage continuity, operator-safe errors, meaningful tests, and evidence-based closeout.
- Residual risk: extraction is verified through existing focused tests, but a browser pass remains useful for overlay focus and visual perception.
