# Operations Maintainer Sprint 52: Knowledge Base Settings Read Error Safety

## Status

Closed in commit-ready state.

## Issue 1: Knowledge Base Settings Bypassed Support Read Error Formatting

### Problem

The Knowledge Base settings route used the support `useKbCategories` hook, which already normalizes read errors, but the hard category-tree error state still rendered `categoriesError.message` directly. That left a settings-admin support workflow outside the support domain read-error contract.

### Workflow Spine

Knowledge Base category settings read workflow
-> `/settings/knowledge-base`
-> `KnowledgeBaseSettingsPage`
-> `useKbCategories`
-> `listCategories`
-> `kbCategories` schema/database rows
-> `queryKeys.support.kbCategoryList`
-> support-owned safe read feedback.

### Touched Domains

- Settings.
- Support knowledge base categories.
- Support read-error formatter contract.
- Focused support read-state tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators configuring support categories now get safe, consistent read-failure copy instead of raw server or database details. This protects a support configuration workflow that feeds customer-facing knowledge base structure.

### Scope Constraints

- Do not change category reads, category mutation behavior, support server functions, schema/database, query keys, cache invalidation, article counts, or category tree rendering.
- Keep the existing support formatter as the owner of knowledge base read-error presentation.
- Limit the slice to the settings route hard-error state and its source contract.

### Changes

- Imported `formatSupportReadError` into the Knowledge Base settings route.
- Added a route-local safe category read fallback for settings category failures.
- Replaced direct `categoriesError.message` rendering with the support read formatter.
- Extended the existing knowledge base category read-state contract to cover the settings route.

### Standards Checked

- Domain ownership: support read-error semantics stay in `src/lib/support/read-error-messages.ts`; the settings route only supplies context-specific fallback copy.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and preserved for knowledge base categories.
- Tenant isolation/data integrity: unchanged. `listCategories` remains organization-scoped.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: strengthened. The hard settings category read failure no longer renders raw error copy.
- Reviewability: the diff is limited to one settings route, one existing support contract test, and this closeout note.

### Smells Removed

- Direct `categoriesError.message` rendering in Knowledge Base settings.
- Settings-admin support route bypassing support-owned read-error presentation.
- Missing test coverage that the settings Knowledge Base category tree uses safe read feedback.

### Deferred

- Broader Knowledge Base settings layout and category tree ergonomics remain separate UI quality work.
- Support category mutation feedback was already formatter-backed and was not changed.
- Browser QA can be added when a future slice changes the category tree interaction flow.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/kb-category-tree-read-state-contract.test.ts tests/unit/support/support-read-error-messages.test.ts` - 2 files, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change server functions, schema/database, query keys, cache invalidation, mutation behavior, category tree behavior, inventory behavior, or financial behavior.
- Skipped: browser QA because this is a narrow hard-error copy contract change with focused source tests and no layout or interaction change.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe errors, tenant isolation checks, meaningful tests, and reviewable diffs.

### Residual Risk

Low. The touched Knowledge Base settings hard-error path is now formatter-backed. Broader support settings UX polish remains a separate product-quality concern.
