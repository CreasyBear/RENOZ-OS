# Support Maintainer Sprint 52

This sprint follows Sprints 50 and 51 through the remaining knowledge base feedback surface. The target is article helpful/not-helpful voting in suggested article previews: mutation success and failure feedback should be owned by the route that owns the optimistic delta, rollback, pending state, mutation hook, and formatter.

Status: Closed after Issue 1.

## Business Value

Article helpfulness signals tell operators which battery support guidance is working and which content needs improvement. Failed votes should not leave inflated counters or raw infrastructure feedback, and the preview UI should stay retryable when the vote cannot be recorded.

## Workflow Spine

Knowledge base article route
-> `KnowledgeBasePage`
-> `KbSuggestedArticles` / `ArticlePreview`
-> `useRecordArticleFeedback`
-> `recordArticleFeedback` server function and schema
-> `queryKeys.support.kbArticles` and article detail invalidation
-> optimistic feedback delta, rollback, safe route-owned toast feedback, and retryable preview controls.

## Architecture Constraints

- Keep this sprint to article helpful/not-helpful vote feedback.
- Do not change article create/update/delete, category management, article list/search/filter behavior, preview loading, server feedback counts, schemas, query keys, or invalidation.
- Keep optimistic apply/rollback/clear behavior unchanged except for route-owned operator feedback.
- Keep the presenter responsible for local voted state only.
- Do not run serialized gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage or inventory identity.

## Issue Ledger

### 1. Suggested Article Vote Feedback Boundary

Problem:

- `KbSuggestedArticles` imported `sonner` directly.
- The presenter owned success and failure toasts even though the route owned the mutation, optimistic delta, rollback, pending state, and formatter.
- Failure feedback used generic local copy and duplicated mutation-boundary responsibility.

Workflow protected:

Knowledge base route -> suggested article preview -> route-owned feedback mutation -> article feedback server function -> existing KB article list/detail invalidation -> optimistic count adjustment, rollback, and retryable controls.

Implemented slice:

- Moved article vote success and failure toasts to `KnowledgeBasePage.handleRecordFeedback`.
- Routed vote failure through `formatKbArticleMutationError`.
- Removed direct toast ownership from `KbSuggestedArticles`.
- Kept `hasVoted` local to the preview and only set it after the route mutation resolves successfully.
- Added a source contract to protect the route/presenter feedback boundary.

Out of scope:

- Server-side article feedback model changes.
- Vote deduplication by user/session.
- Article helpfulness ranking algorithm changes.
- CSAT feedback link/submission cleanup.
- Read-state query error cleanup.

Closeout:

- Touched domains: support knowledge base article route, suggested article preview presenter, article feedback mutation boundary, support tests, support sprint evidence.
- Workflow protected: KB article route -> `KnowledgeBasePage` -> `KbSuggestedArticles` / `ArticlePreview` -> `useRecordArticleFeedback` -> `recordArticleFeedback` server function/schema -> existing KB article list/detail invalidation -> optimistic delta/rollback/clear and safe route-owned feedback.
- Business value protected: operators can vote on support guidance without drifted helpfulness counts or misplaced feedback ownership; failed votes remain retryable.
- Architecture standards checked: route/presenter/hook/server/schema/database/query-key flow unchanged; route owns mutation orchestration, optimistic deltas, and operator feedback; presenter owns only preview-local state; KB feedback server function and schemas unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, feedback-count write path, database transaction, article lookup, or authentication boundary changed.
- Query/cache contract checked: `useRecordArticleFeedback` invalidates KB article collections and the article detail key exactly as before.
- Smells removed: direct `sonner` import in suggested article presenter; presenter-owned mutation success/failure toasts; unformatted article vote failure copy at the presenter boundary.
- Smells deferred: CSAT link/submission feedback and support read-state raw query messages remain; article voting still lacks user/session-level deduplication; `KnowledgeBasePage` remains large.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/kb-article-vote-feedback-contract.test.ts tests/unit/support/kb-article-feedback-contract.test.ts tests/unit/support/use-optimistic-feedback-deltas.test.ts tests/unit/support/support-mutation-errors.test.ts` (4 files, 11 tests); source scan for suggested-article presenter toast ownership and route-owned formatted vote feedback; `./node_modules/.bin/vitest run tests/unit/support` (52 files, 186 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback boundary slice with no intended visual layout change; serialized gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage or inventory identity.
- Goal adaptations: declined. Sprint 50 already updated the serialized-gate posture, and this slice follows that policy.
- Residual risk: CSAT, support read-state errors, and broader KB route extraction remain useful next slices after feedback surfaces are normalized.
