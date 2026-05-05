# Support Maintainer Sprint 44

This sprint follows Sprint 43's RMA detail failure propagation cleanup and stays on the support/RMA feedback track. The target is RMA creation from order detail: server mutation failures should be formatted at the mutation caller boundary, while the support dialog keeps local validation and preserves operator context on failure.

Status: Closed after Issue 1.

## Business Value

RMA creation turns an order line into a recoverable support workflow. When creation fails, operators should see safe, useful feedback and keep their selected return lines instead of losing context or seeing raw database errors.

## Workflow Spine

Order detail route
-> order detail container
-> `RmaCreateDialog`
-> `useCreateRma`
-> `createRma` server function
-> existing RMA/order/issue cache invalidation
-> safe operator toast and dialog state.

## Architecture Constraints

- Keep this sprint to RMA create feedback ownership.
- Do not change order routes, RMA server functions, schemas, database predicates, query keys, cache invalidation, shipped-serial validation, serialized lineage, or navigation on success.
- Keep local dialog validation feedback in `RmaCreateDialog`.
- Move server mutation failure feedback to the order detail submit boundary using the RMA mutation formatter.
- Leave the dialog open on failed submit so selected return lines and notes remain available for correction or retry.
- Treat serialized/reliability gates as closed for the standing goal unless a future slice touches serialized lineage.

## Issue Ledger

### 1. RMA Create Mutation Feedback Boundary

Problem:

- `RmaCreateDialog` surfaced raw `Error.message` text for create mutation failures.
- The support dialog mixed local validation feedback with server mutation feedback even though the order detail container owns the `useCreateRma` mutation call.
- RMA-specific safe error copy was local to `useRmaDetail`, so the create workflow could not reuse it without duplicating code.

Workflow protected:

Order detail route -> order detail container -> `RmaCreateDialog` -> `useCreateRma` -> `createRma` server function -> existing cache invalidation -> safe operator feedback and preserved dialog state.

Implemented slice:

- Extracted reusable RMA mutation error formatting from `useRmaDetail`.
- Routed order-detail RMA create mutation failures through the RMA formatter.
- Removed server mutation failure toasts from `RmaCreateDialog` while preserving local validation toasts.
- Added formatter, source-contract, and dialog behavior tests.

Out of scope:

- RMA list bulk actions and bulk server failure messages.
- RMA server mutation behavior, shipped-serial validation, serialized lineage, query invalidation, and success navigation.
- Browser/mounted workflow QA.

Closeout:

- Touched domains: order detail RMA create orchestration, support RMA create dialog, support RMA mutation formatter, RMA detail formatter reuse, support tests, support sprint evidence.
- Workflow protected: order detail route -> order detail container -> `RmaCreateDialog` -> `useCreateRma` -> `createRma` server function -> existing RMA/order/issue cache invalidation -> safe operator toast and preserved dialog state.
- Business value protected: operators creating an RMA from an order now keep their selected return lines when creation fails and receive safe RMA-specific failure copy instead of raw exception text.
- Architecture standards checked: order detail remains the mutation caller; `RmaCreateDialog` keeps local validation only; RMA-specific server failure formatting is reusable across RMA detail and create workflows; RMA server functions, schemas, database predicates, shipped-serial validation, query keys, cache invalidation, serialized lineage, and success navigation unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, server mutation, database write path, shipped-serial validation, serialized lineage write, or order/RMA cache identity changed.
- Query/cache contract checked: `useCreateRma` success invalidation remains unchanged for RMA detail/list, linked issue list/detail, and linked order detail; this slice only changed failed-mutation feedback ownership.
- Smells removed: raw `Error.message` feedback from `RmaCreateDialog`; duplicated RMA mutation copy embedded in `useRmaDetail`; server mutation failure feedback mixed into a form presenter; missing behavior coverage for failed RMA create preserving dialog state.
- Smells deferred: RMA list bulk actions and bulk receive server failure messages still need a separate feedback-boundary slice; broader support direct `sonner` and raw-error call sites remain outside this RMA create slice; browser QA remains deferred.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/rma-mutation-errors.test.ts tests/unit/support/rma-create-feedback-contract.test.ts tests/unit/support/rma-create-dialog.test.tsx tests/unit/support/rma-detail-mutation-feedback-contract.test.ts tests/unit/support/use-rma-mutations.test.tsx`; focused eslint for changed hook/container/dialog/tests; source scan for RMA create formatter/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (42 files, 170 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback ownership slice with unit/source coverage and no visual layout change; serialized/reliability gates, by maintainer direction, because the serialized gate track is closed and this slice did not touch serialized lineage.
- Goal adaptations: declined. The standing product-owner/repo-maintainer posture and Sprint 42 serialized-gate adaptation still fit.
- Residual risk: RMA bulk approve/receive/retry still surfaces raw top-level or per-RMA failure text and should be the next RMA feedback slice before leaving this support cleanup track.
