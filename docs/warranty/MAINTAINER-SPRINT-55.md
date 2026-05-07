# Warranty Maintainer Sprint 55: Unitized Review Entitlement Naming

## Status

Closed in commit-ready state.

## Issue 1: Delivery Review Entitlements Were Named as Placeholders

### Problem

The delivery entitlement helper used `placeholderReviewEntitlementExistsTx` for fractional or otherwise review-required unitized coverage rows. Those rows are not fake placeholders: they preserve delivered coverage until an operator can review and activate or repair the entitlement. The helper name weakened the warranty-domain language around real coverage records.

### Workflow Spine

Shipment marked delivered
-> warranty entitlement provisioning transaction
-> unitized or serialized coverage row
-> `needs_review` entitlement when deterministic activation is blocked
-> operator entitlement review and activation.

### Touched Domains

- Warranty delivery entitlement provisioning.
- Warranty entitlement serialization/source contract.

### Business Value Protected

Warranty entitlements are the coverage bridge from delivered RENOZ battery orders into owner activation, claims, support, and remedy work. Review-required rows must be treated as durable coverage records, not placeholder data that can be casually ignored or removed.

### Scope Constraints

- Do not change entitlement insert behavior, duplicate detection semantics, status mapping, policy resolution, serialized item lookup, shipment delivery behavior, schemas, query keys, cache invalidation, or UI rendering.
- Keep this as naming and contract reinforcement only.

### Changes

- Renamed `placeholderReviewEntitlementExistsTx` to `unitizedReviewEntitlementExistsTx`.
- Added a focused contract test that keeps unitized `needs_review` entitlements framed as real coverage records.

### Standards Checked

- Domain ownership: entitlement review semantics remain inside the warranty delivery helper.
- Route -> order shipment delivery -> warranty entitlement helper -> schema/database: preserved.
- Query/cache policy: unchanged.
- Tenant isolation/data integrity: unchanged. Existing organization-scoped reads and inserts remain intact.
- Serialized lineage continuity: unchanged for serialized rows; unitized review rows continue to preserve coverage when serial capture or deterministic unitization is incomplete.
- Reviewability: one helper rename, one source-contract expansion, and this closeout.

### Smells Removed

- Misleading `placeholder` language in warranty entitlement provisioning core.
- Missing source contract around review-required unitized entitlement semantics.

### Deferred

- No behavior change was made to fractional delivery handling or operator review UX.
- Broader warranty entitlement transaction tests remain separate work; this slice protects domain language and existing source invariants only.
- Browser QA was not selected because this slice has no UI behavior or layout change.

### Gates

- Passed: `bun run test:vitest tests/unit/warranty/warranty-entitlement-serialization.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted warranty scan confirming the old helper name is gone from production code.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the maintainer goal: sharpen domain language, preserve serialized/coverage lineage, and leave the repo easier to reason about. Serialized gates remain retired and were not part of this closeout.

### Residual Risk

Low for entitlement helper semantics. The underlying behavior was already covered by existing serialization contracts; deeper transactional coverage for fractional deliveries would be a separate warranty sprint.
