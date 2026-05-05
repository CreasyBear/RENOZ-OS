# Support Maintainer Sprint 51

This sprint follows Sprint 50's knowledge base article feedback cleanup into knowledge base category management. The target is category create, update, and delete mutation feedback in `/settings/knowledge-base`: failed category mutations should use the shared support formatter and toast adapter while preserving the category form's local validation behavior.

Status: Closed after Issue 1.

## Business Value

Knowledge base categories structure support guidance for battery issues, warranty handling, RMAs, and recurring operator questions. Failed category maintenance should give safe next-action feedback without exposing database or infrastructure detail, and failed saves should keep the operator's draft category edits available.

## Workflow Spine

Knowledge base settings route
-> `KnowledgeBaseSettingsPage`
-> `KbCategoryTree` / `KbCategoryFormDialog`
-> `useKbCategories`, `useCreateKbCategory`, `useUpdateKbCategory`, `useDeleteKbCategory`
-> knowledge base category server functions and schemas
-> `queryKeys.support.kbCategoryList`, `queryKeys.support.kbCategories`, and category detail cache policy
-> safe route-owned mutation feedback and preserved category form state.

## Architecture Constraints

- Keep this sprint to knowledge base category mutation feedback.
- Do not change category tree rendering, category form schema, category server functions, tenant predicates, query keys, cache invalidation, or article/category relationships.
- Keep form validation feedback inside the category dialog.
- Keep server mutation failure toasts at the route boundary.
- Do not run serialized gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage or inventory identity.

## Issue Ledger

### 1. Knowledge Base Category Feedback Boundary

Problem:

- `settings/knowledge-base.tsx` imported `sonner` directly and displayed raw `Error.message` text for delete failures.
- Category create/update failures used generic fallback copy without formatter/code handling.
- The category dialog parsed raw `Error.message` for slug conflict display.
- The route passed raw mutation error messages into `FormErrorSummary`.

Workflow protected:

Knowledge base settings route -> `KnowledgeBaseSettingsPage` -> category tree/form dialog -> KB category hooks -> KB category server functions -> existing KB category query invalidation -> safe mutation feedback and preserved form state.

Implemented slice:

- Moved the KB category route and category form dialog to the shared toast adapter.
- Added route-local category mutation error formatting using the shared support formatter with KB category-specific copy.
- Routed category delete, create, and update failures through the formatter.
- Routed category form slug-conflict extraction through the shared formatter instead of raw `Error.message`.
- Passed formatted submit errors into the category form summary.
- Added a source contract to protect the category feedback boundary.

Out of scope:

- Category tree UI extraction.
- Category server duplicate-slug validation improvements.
- Article helpful/not-helpful vote mutation feedback.
- Refactoring `KnowledgeBaseSettingsPage` into smaller containers/hooks.
- Changing category schemas, server functions, query keys, cache invalidation, or category/article relationship behavior.

Closeout:

- Touched domains: support knowledge base category settings route, KB category form dialog, support mutation feedback formatter usage, support tests, support sprint evidence.
- Workflow protected: KB category settings route -> `KnowledgeBaseSettingsPage` -> `KbCategoryTree` / `KbCategoryFormDialog` -> `useCreateKbCategory` / `useUpdateKbCategory` / `useDeleteKbCategory` -> KB category server functions/schemas -> existing KB category list/detail invalidation -> safe route-owned feedback and preserved form state.
- Business value protected: operators can maintain support knowledge structure without raw infrastructure messages, and failed saves keep category edits in place.
- Architecture standards checked: route/tree/dialog/hook/server/schema/database/query-key flow unchanged; route still owns mutation orchestration and feedback; dialog owns local validation and safe slug field display; hooks still own query invalidation; KB category server functions and schemas unchanged.
- Tenant isolation and data integrity checked: no tenant predicate, permission boundary, database write path, transaction, category hierarchy behavior, article reassignment behavior, or deleted-at behavior changed.
- Query/cache contract checked: `useCreateKbCategory`, `useUpdateKbCategory`, and `useDeleteKbCategory` invalidation/detail write behavior remains unchanged.
- Smells removed: direct `sonner` imports in KB category route/dialog; raw category delete failure display; raw category form slug-conflict parsing; raw route submit-error display; unformatted category create/update failure copy.
- Smells deferred: category server functions still rely on database uniqueness for duplicate slug conflicts; article feedback votes still have their own feedback path; CSAT link/submission feedback and support read-state raw query messages remain; `KnowledgeBaseSettingsPage` can still be thinned after behavior debt is lower.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/kb-category-feedback-contract.test.ts tests/unit/support/kb-article-feedback-contract.test.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/issue-template-feedback-contract.test.ts` (4 files, 8 tests); source scan for KB category raw-toast/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (51 files, 185 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a mutation feedback contract slice with no intended visual layout change; serialized gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage or inventory identity.
- Goal adaptations: declined. Sprint 50 already updated the serialized-gate posture, and this slice follows that policy.
- Residual risk: duplicate category slugs still degrade to a safe generic save failure until server-side uniqueness validation is made explicit; KB category route remains large; article feedback votes, CSAT, and read-state feedback remain cleanup candidates.
