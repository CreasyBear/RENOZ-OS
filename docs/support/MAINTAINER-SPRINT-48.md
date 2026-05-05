# Support Maintainer Sprint 48

This sprint follows Sprint 47's issues board feedback cleanup and stays in support issue intake. The target is new issue creation mutation feedback: failed issue creation should use the shared support formatter and toast adapter, while preserving create-specific lineage conflict copy.

Status: Closed after Issue 1.

## Business Value

Support intake is where battery, warranty, order, and customer context becomes an actionable RENOZ Energy issue. When creation fails, operators need clear next action without raw database, infrastructure, or serialized server details.

## Workflow Spine

Support new issue route
-> `NewIssuePage`
-> `useTanStackForm`
-> `useCreateIssue`
-> `createIssue`
-> `createIssueSchema`, anchor resolution, issue insert transaction, optional SLA tracking
-> `queryKeys.support.issuesList` invalidation
-> safe submit error and toast feedback.

## Architecture Constraints

- Keep this sprint to failed create feedback and formatter reuse.
- Do not change intake anchor selection, preview behavior, form schema, create payload shape, issue creation transaction, SLA tracking, tenant predicates, activity logging, or query invalidation.
- Preserve issue anchor conflict guidance as operator-safe copy.
- Keep mutation errors on the shared support formatter and shared toast adapter.
- Do not run serialized/reliability gates for this slice; serialized lineage is closed baseline unless a future diff touches serialized lineage.

## Issue Ledger

### 1. New Issue Create Feedback Boundary

Problem:

- `new.tsx` imported `sonner` directly instead of the shared toast adapter.
- Failed create mutations manually inspected arbitrary error shapes and fell back to raw `Error.message`.
- Serialized issue anchor conflict summaries were handled locally instead of by the support mutation formatter.

Workflow protected:

Support new issue route -> `NewIssuePage` -> `useTanStackForm` -> `useCreateIssue` -> `createIssue` -> issue schema/database transaction/SLA tracking -> issues list invalidation -> safe submit error and toast feedback.

Implemented slice:

- Moved the new issue route to the shared toast adapter.
- Exported `formatSupportMutationError` from the support hook barrel for maintained support surfaces.
- Routed create mutation failures through `formatSupportMutationError` with create-specific code copy.
- Extended the support mutation formatter to read serialized `details.summary` paths for issue anchor conflict errors.
- Added formatter and source-contract tests for new issue creation feedback.

Out of scope:

- Splitting `NewIssuePage` into route/container/form components.
- Changing issue intake preview, anchor conflict detection, create server function behavior, transaction behavior, SLA tracking, activity logging, or cache invalidation.
- Cleaning knowledge base, CSAT, issue template, or read-state feedback debt.

Closeout:

- Touched domains: support issue intake route, support mutation feedback formatter, support hook exports, support tests, support sprint evidence.
- Workflow protected: support new issue route -> `NewIssuePage` -> `useTanStackForm` -> `useCreateIssue` -> `createIssue` -> `createIssueSchema` and anchor resolution -> issue insert transaction/SLA tracking -> `queryKeys.support.issuesList` invalidation -> safe submit error and toast feedback.
- Business value protected: operators can continue creating support issues from serial, warranty, order, or customer context while failed creates now show safe next-action copy instead of raw server exception text.
- Architecture standards checked: route/form/hook/server/schema/database/query-key flow unchanged; route still owns intake form orchestration; hook still owns create mutation and list invalidation; server transaction, tenant context, anchor resolution, activity logging, SLA tracking, and create schema unchanged; formatter owns failed-message safety.
- Tenant isolation and data integrity checked: no tenant predicate, permission boundary, database write path, transaction, SLA tracking behavior, serialized lineage write, or anchor resolution rule changed. Existing `withAuth`, organization-scoped anchor resolution, and `set_config('app.organization_id', ...)` remain unchanged.
- Query/cache contract checked: `useCreateIssue` still invalidates `queryKeys.support.issuesList()` on success; no query key, cache invalidation, optimistic update, or rollback behavior changed.
- Smells removed: direct `sonner` import from new issue creation; local arbitrary error-shape parsing in the route; raw `Error.message` create failure fallback; missing formatter coverage for serialized issue anchor conflict summaries.
- Smells deferred: `NewIssuePage` remains a large route component with mixed intake UI, preview, and submit orchestration; knowledge base, CSAT, issue template, and support read-state surfaces still have direct-toast/raw-error patterns.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/new-issue-feedback-contract.test.ts tests/unit/support/support-mutation-errors.test.ts tests/unit/support/query-normalization-wave1.test.tsx`; source scan for new issue raw-toast/raw-error patterns; `./node_modules/.bin/vitest run tests/unit/support` (48 files, 182 tests); `bun run typecheck`; `bun run lint`; `git diff --check`.
- Gates skipped: browser QA, because this was a failed-mutation feedback and formatter contract slice with no intended visual layout change; serialized/reliability gates, by maintainer direction, because serialized lineage is closed baseline and this slice did not touch serialized lineage.
- Goal adaptations: declined. The current maintainer posture and Sprint 46 serialized-gate adaptation still fit.
- Residual risk: issue intake still deserves structural decomposition before feature work; remaining support feedback debt is now concentrated in knowledge base article/category flows, CSAT link/submission flows, issue template saving, and read-state raw query messages.
