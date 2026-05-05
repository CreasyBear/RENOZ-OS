# Maintainer Sprint 42 - Service Mutation Fallback Specificity

## Slice

Service linkage review resolution and service-system ownership transfer used the shared service mutation formatter, but their unsafe fallbacks were still generic `Failed to ...` strings. The linkage review server path also had a `ValidationError('Failed to resolve service linkage review')`, which could bypass the hook fallback as a 400 validation message.

## Workflow Spine Protected

Service linkage review/system routes
-> service containers
-> `useResolveServiceLinkageReview` / `useTransferServiceSystemOwnership`
-> service server functions
-> service review/system and linked warranty query invalidation
-> operator-safe mutation toast.

## Business Value Protected

Service systems connect warranty and entitlement evidence to real installed battery systems. Operators resolving linkage ambiguity or transferring system ownership need clear unavailable-state copy without database wording and without generic failure text that hides which service workflow failed.

## Change

- Added typed service mutation actions for linkage review resolution and service-system ownership transfer.
- Added `formatServiceActionMutationError(error, action)` on top of the existing shared service formatter.
- Routed both service mutations through action-specific unavailable copy.
- Replaced the server-side linkage review invariant failure with an operator-safe validation message.
- Updated cache/source contracts to preserve service/warranty invalidation while rejecting the old generic fallback strings.

## Standards Checked

- Domain ownership: service owns its mutation fallback map in `src/hooks/service/_mutation-errors.ts`.
- Route -> container -> hook -> server flow: service route/container orchestration remains unchanged; the hook still owns mutation toasts.
- Query/cache policy: service linkage review lists/details, service system lists/details, warranty lists/status counts, source warranty detail, and linked warranty detail invalidations are unchanged.
- Tenant isolation/data integrity: no organization predicate, database mutation, transaction, or ownership-transfer data shape changed.
- Inventory/finance integrity: no inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states/error handling: unsafe mutation failures now use action-specific unavailable copy; safe validation and known auth/not-found/permission/rate-limit messages still flow through the shared formatter.
- Reviewability: the diff is limited to one service formatter helper, one hook, one server validation string, focused contracts, and this closeout note.

## Smells Removed

- Generic `Failed to resolve service linkage review` hook fallback.
- Generic `Failed to transfer system ownership` hook fallback.
- Server-side generic `Failed to resolve service linkage review` validation message.
- Source contracts that permitted generic service mutation fallback copy.

## Deferred

- Service read containers still render some raw `error.message` values and generic `Failed to load ...` titles; those are separate read-state slices.
- A broader shared abstraction for domain action fallback maps remains deferred until the repeated pattern becomes harder to review than explicit maps.
- Browser QA was not selected because this was source-covered hook/server error feedback with no layout or interaction change.

## Gates

- Focused service mutation/cache contracts: `./node_modules/.bin/vitest run tests/unit/service/service-mutation-errors.test.ts tests/unit/service/service-linkage-review-resolution-cache-contract.test.ts tests/unit/service/service-ownership-transfer-cache-contract.test.ts` passed, 3 files and 6 tests.
- Targeted source scan: confirmed `formatServiceActionMutationError` wiring, action-specific service unavailable copy, preserved service/warranty invalidation keys, preserved `sourceWarrantyId` and `linkedWarrantyIds` return contracts, and removed old generic mutation fallback strings from the hook/server paths.
- Service unit suite: `./node_modules/.bin/vitest run tests/unit/service` passed, 7 files and 15 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.
- Browser QA, reliability, finance, document, release, deploy, and serialized gates skipped because this slice did not touch those contracts. Serialized gates remain retired as routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

## Goal Adaptation

Declined. This is a bounded service-domain maintainer slice under the existing operator-safe error, cache-contract, and reviewable-diff standards.

## Residual Risk

The tests verify formatter behavior and source-level hook/server contracts, but they do not exercise live service API rejection payloads. Unsupported thrown backend shapes still fall back to the action-specific unavailable copy.
