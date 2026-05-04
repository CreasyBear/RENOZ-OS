# Inventory Maintainer Sprint 42

This sprint follows Sprint 41's supplier price-change apply integrity cleanup. The target is supplier price-list bulk-update honesty: a bulk update should not silently ignore missing or cross-tenant price-list IDs, and should verify that every scoped write actually updates a row before reporting success.

Status: Closed after Issue 1.

## Business Value

Supplier price lists influence procurement cost signals for battery stock. Bulk updates are high-leverage operator actions, so they should fail clearly when the requested price records are not all available in the active organization rather than reporting partial success as a clean update.

## Workflow Spine

supplier price-list bulk update
-> pricing server function
-> unique requested ID set
-> organization-scoped price-list target read
-> checked tenant-scoped price-list writes
-> supplier pricing query/cache policy
-> procurement cost readiness.

## Architecture Constraints

- Keep this sprint to bulk supplier price-list update result honesty.
- Preserve single price-list CRUD, price agreements, price import, price-change workflow, query keys, cache behavior, response shape, and UI behavior.
- Do not broaden into supplier pricing UX, live database fixtures, pricing schema redesign, or import workflow changes.

## Issue Ledger

### 1. Bulk Price-List Update Could Silently Ignore Missing Targets

Problem:

- Bulk update selected price lists by the requested IDs and active organization.
- Missing, deleted, or cross-tenant IDs were silently absent from the scoped target set.
- The mutation returned success using the number of found rows, not evidence that every requested unique target was updated.
- Individual write results were not checked.

Workflow protected:

bulk price update -> tenant-owned target set -> checked price-list writes -> honest supplier pricing mutation result.

Implemented slice:

- Deduplicated requested bulk price-list IDs before scoped target reads.
- Added a `ValidationError` when the organization-scoped target set does not match the requested unique ID set.
- Added returning checks to each tenant-scoped price-list write.
- Added a `ValidationError` when any scoped write returns no updated row.
- Returned the checked updated count and message, rather than the pre-check item count.
- Added focused source contract coverage for missing-target rejection and checked write results.

Out of scope:

- Changing single price-list CRUD, price agreements, price import, or price-change workflows.
- Changing hooks, query keys, or UI controls.
- Adding live database fixtures.

Closeout:

- Touched domains: supplier pricing server function, supplier price-list bulk-update contract tests, inventory sprint evidence.
- Workflow protected: supplier price-list bulk update -> unique requested ID set -> organization-scoped price-list target read -> checked tenant-scoped price-list writes -> supplier pricing query/cache policy -> procurement cost readiness.
- Business value protected: bulk supplier price changes cannot report clean success when requested price records were missing, cross-tenant, or failed to update, improving trust in procurement cost maintenance.
- Architecture standards checked: route/page/hook/cache behavior is unchanged; supplier pricing remains the mutation owner; the bulk mutation now has explicit target-set and write-result contracts.
- Tenant isolation and data integrity checked: target reads still require price-list IDs and organization ID; each write still requires price-list ID and organization ID and now verifies a row was updated; no single price-list CRUD, agreements, price import, price-change apply, receiving, inventory, finance posting, or serialized lineage behavior changed.
- Query/cache contract checked: no query keys, invalidation, stale times, optimistic updates, rollback behavior, or UI state contracts changed.
- Smells removed: bulk price-list update silently ignored missing/cross-tenant IDs and reported success from found rows without checking write results.
- Smells deferred: live database fixtures for supplier bulk price updates under seeded RLS/concurrency; supplier pricing UX hardening; broader price import workflow review.
- Gates run: focused supplier pricing/query tests; focused ESLint; supplier + purchase-order unit suites; TypeScript; `git diff --check`.
- Gates skipped: browser QA, because this was a server mutation honesty correction with no UI or interaction change.
- Goal adaptations: declined. The standing maintainer goal already covers tenant isolation, finance integrity, operator-safe errors, domain ownership, meaningful tests, and evidence-based closeout.
- Residual risk: source-level contracts prove the intended checks stay present; live DB fixtures are still needed to prove bulk behavior under seeded multi-tenant/RLS and concurrent update conditions.
