# Support Maintainer Sprint 50

This sprint follows Sprint 49's issue template feedback cleanup and stays in knowledge base article management. The target is article create, update, and delete mutation feedback: failed article mutations should use the shared support formatter and toast adapter while preserving the article form's local validation behavior.

Status: Closed after Issue 1.

## Business Value

Knowledge base articles capture operational support knowledge for battery issues, warranty guidance, and recurring customer questions. When article maintenance fails, operators need safe next-action copy without raw infrastructure details, and article forms should preserve in-progress edits.

## Workflow Spine

Knowledge base article route
-> `KnowledgeBasePage`
-> `KbArticleList` / `KbArticleFormDialog`
-> `useKbArticles`, `useCreateKbArticle`, `useUpdateKbArticle`, `useDeleteKbArticle`
-> knowledge base article server functions and schemas
-> `queryKeys.support.kbArticleList`, `queryKeys.support.kbArticles`, and article detail cache policy
-> safe route-owned mutation feedback and preserved article form state.

## Architecture Constraints

- Keep this sprint to knowledge base article mutation feedback.
- Do not change category management, article helpful-vote feedback, article list/search/filter behavior, article form schema, create/update/delete server functions, tenant predicates, or query invalidation.
- Keep form validation feedback inside the article dialog.
- Keep server mutation failure toasts at the route boundary.
- Do not run serialized gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage or inventory identity.

## Issue Ledger

### 1. Knowledge Base Article Feedback Boundary

Problem:

- `knowledge-base.tsx` imported `sonner` directly and displayed raw `Error.message` text for delete failures.
- Article create/update failures used generic fallback copy without formatter/code handling.
- `KbArticleFormDialog` parsed raw `Error.message` for slug conflict display.

Workflow protected:

Knowledge base article route -> `KnowledgeBasePage` -> article list/form dialog -> KB article hooks -> KB article server functions -> existing KB article query invalidation -> safe mutation feedback and preserved form state.

Implemented slice:

- Moved the KB article route and article form dialog to the shared toast adapter.
- Added route-local article mutation error formatting using the shared support formatter with KB article-specific copy.
- Routed article delete, create, and update failures through the formatter.
- Routed article form slug-conflict extraction through the shared formatter instead of raw `Error.message`.
- Added a source contract to protect the article feedback boundary.

Out of scope:

- Category create/update/delete feedback in `/settings/knowledge-base`.
- Article helpful/not-helpful vote mutation feedback.
- Refactoring `KnowledgeBasePage` into smaller containers/hooks.
- Changing article schemas, server functions, query keys, cache invalidation, search/filter behavior, or optimistic feedback deltas.

Closeout:

- Touched domains: support knowledge base article route, KB article form dialog, support mutation feedback formatter usage, support tests, support sprint evidence.
- Workflow protected: KB article route -> `KnowledgeBasePage` -> `KbArticleList` / `KbArticleFormDialog` -> `useCreateKbArticle` / `useUpdateKbArticle` / `useDeleteKbArticle` -> KB article server functions/schemas -> existing KB article list/detail invalidation -> safe route-owned feedback and preserved form state.
- Business value protected: support operators can maintain KB articles without raw infrastructure messages, and failed saves keep draft edits in place.
- Architecture standards checked: route/list/dialog/hook/server/schema/database/query-key flow unchanged; route still owns mutation orchestration and feedback; dialog owns local validation and safe slug field display; hooks still own query invalidation; KB article server functions and schemas unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, permission boundary, database write path, transaction, article status behavior, or deleted-at behavior changed. Existing authenticated and organization-scoped KB article server behavior remains unchanged.
- Query/cache contract checked: `useCreateKbArticle`, `useUpdateKbArticle`, and `useDeleteKbArticle` cache invalidation/detail write behavior remains unchanged. Helpful-vote optimistic delta and rollback behavior unchanged.
- Smells removed: direct `sonner` imports in KB article route/dialog; raw article delete failure display; raw article form slug-conflict parsing; unformatted article create/update failure copy.
- Smells deferred: KB category management still has direct-toast/raw-error patterns; article feedback votes still have their own feedback path; `KnowledgeBasePage` remains large and mixes route state, article orchestration, category sidebar, suggestions, preview, and feedback handling.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/kb-article-feedback-contract.test.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/use-optimistic-feedback-deltas.test.ts tests/unit/support/query-normalization-wave5e.test.tsx`; source scan for KB article raw-toast/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (50 files, 184 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback contract slice with no intended visual layout change; serialized gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage or inventory identity.
- Goal adaptations: made. `docs/reference/maintainer-sprint-process.md` now treats serialized gates as risk-selected evidence for serialized/inventory identity work rather than a default closeout gate for unrelated slices.
- Residual risk: KB category feedback, CSAT link/submission feedback, and support read-state raw query messages remain. KB article management should eventually be split into a thinner route/container boundary before larger feature work.
