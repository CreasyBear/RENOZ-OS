# Support Maintainer Sprint 65

This sprint follows Sprint 64's CSAT issue-detail read-state cleanup into a live knowledge-base read-state boundary. The target is the `/support/knowledge-base` category sidebar: hard category reads should use the support-domain read-error formatter, stale categories should remain visible with explicit degraded copy, and the existing hook/server/query-key contract should remain unchanged.

Status: Closed after Issue 1.

## Business Value

The knowledge base is the operator-facing support memory for battery product support, installation guidance, troubleshooting, and repeated customer issues. Operators should not see arbitrary category read errors, and cached categories should remain usable when a refresh fails.

## Workflow Spine

`/support/knowledge-base`
-> `KnowledgeBasePage`
-> `useKbCategories`
-> `listCategories` server function and schema
-> `kbCategories` database read
-> `queryKeys.support.kbCategoryList`
-> operator-safe hard-error and stale-data category sidebar states.

## Architecture Constraints

- Keep this sprint to the support knowledge-base category sidebar read state.
- Do not change article list/search, popular/suggested article sidebars, article/category mutations, server functions, schemas, database reads, query keys, cache policy, or feedback mutations.
- Preserve route-owned hard vs stale read-state classification.
- Use the support read-error helper for hard failures.
- Serialized gates are domain-triggered only; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. Knowledge Base Category Tree Safe Read Error

Problem:

- `/support/knowledge-base` rendered `categoryTreeError.message` directly for hard category sidebar read failures.
- The route already kept cached categories visible with a degraded warning, but hard failures bypassed the support-domain read-error formatter.

Workflow protected:

Knowledge base route -> category sidebar -> support KB category hook -> KB category server function/schema -> KB category list query key -> operator-safe hard-error and stale-data states.

Implemented slice:

- Routed hard category sidebar read-failure copy through `formatSupportReadError`.
- Preserved the existing stale category warning and retry action.
- Added source contract coverage for the KB category tree read-state spine.

Out of scope:

- KB article list/search read states.
- Popular and suggested article sidebar read states.
- Category settings route behavior.
- KB article/category mutation feedback.
- Server functions, schemas, database reads, query keys, and cache policy.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support knowledge-base category sidebar, support read-error helper usage, support tests, support sprint evidence.
- Workflow protected: `/support/knowledge-base` -> `KnowledgeBasePage` -> `useKbCategories` -> `listCategories` -> `queryKeys.support.kbCategoryList` -> operator-safe hard/stale category sidebar states.
- Business value protected: operators no longer see arbitrary category read error text and can continue using cached categories when refresh is unavailable.
- Architecture standards checked: route owns hard vs stale classification; hook normalization, server function, schema, database reads, query key policy, article surfaces, and mutations unchanged.
- Tenant isolation and data integrity checked: no organization predicate, deleted-category filter, article counts, category writes, article writes, or permission boundary changed.
- Query/cache contract checked: KB category list still uses the centralized category list query key with always-shaped normalized read errors.
- Smells removed: raw `categoryTreeError.message` display in the KB category sidebar hard-error state.
- Smells deferred: browser visual QA remains a future slice; broader warranty analytics chart read-state consistency is outside this support KB slice.
- Gates run: focused KB category tree read-state, query-normalization wave 5e, and support read-error contracts, 3 files / 10 tests; full support unit suite, 66 files / 201 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this is a copy/read-state contract slice without intended layout changes; serialized gates, because this slice does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.
- Goal adaptations: declined. The current domain-triggered gate policy fits this slice.
- Residual risk: browser visual QA remains unrun; broader warranty analytics chart read-state consistency is a separate warranty-domain slice, not part of this support KB cleanup.
