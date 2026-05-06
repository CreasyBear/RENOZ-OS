# Operations Maintainer Sprint 65: Project Workstreams Mutation Contracts

## Status

Closed in commit-ready state.

## Issue 1: Project Workstream Mutations Had Unsafe Feedback And Weak Write Boundaries

### Problem

Project workstreams already had normalized read-state handling and centralized query keys, but create/update/delete/reorder failures still used raw or generic operator feedback. The create dialog forced new workstreams into position `0`, and update/delete server mutations accepted workstream identity without carrying the route project boundary into final write predicates. Delete and reorder also changed ordered rows without transactional guarantees or explicit stale-id failure on reorder.

### Workflow Spine

Jobs project workstreams workflow
-> `ProjectWorkstreamsTab`, `WorkstreamCreateDialog`, `WorkstreamEditDialog`
-> `useWorkstreams`, `useCreateWorkstream`, `useUpdateWorkstream`, `useDeleteWorkstream`, `useReorderWorkstreams`
-> `listWorkstreams`, `getWorkstream`, `createWorkstream`, `updateWorkstream`, `deleteWorkstream`, `reorderWorkstreams`
-> `createWorkstreamSchema`, `updateWorkstreamSchema`, `projectScopedWorkstreamIdSchema`, `projectWorkstreams`
-> `queryKeys.projectWorkstreams.byProject` and `detail`
-> tenant- and project-scoped writes with safe mutation feedback and stable workstream ordering.

### Touched Domains

- Jobs project workstreams UI and dialogs.
- Jobs project workstreams TanStack Query hooks.
- Project workstreams server functions and schemas.
- Jobs mutation error formatting.
- Focused jobs contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Workstreams organize RENOZ Energy project execution into phases and work areas. Operators now get safe failure feedback, new workstreams append instead of being forced into the first position, and ordered workstream changes are scoped and atomic enough to avoid confusing project task organization.

### Scope Constraints

- Do not change the workstream read contract, unavailable state behavior, or query key shape.
- Do not alter default project workstream seeding.
- Keep cache invalidation on project workstream list and detail keys.
- Keep the slice limited to workstream create/update/delete/reorder mutation contracts and ordering behavior.

### Changes

- Added `formatProjectWorkstreamMutationError` with action-specific create/update/delete/reorder fallbacks and safe server-code messages.
- Exported the project workstream mutation formatter through the jobs hook barrel.
- Replaced raw create/update workstream failure feedback with safe formatter output.
- Replaced generic delete/reorder workstream failure feedback with safe formatter output.
- Removed forced `position: 0` from the workstream create dialog so server append-position logic works.
- Changed project workstream creation schema `position` from defaulted to optional.
- Required `projectId` in workstream update server input.
- Added `projectScopedWorkstreamIdSchema` for delete-workstream mutation input.
- Updated `useUpdateWorkstream` and `useDeleteWorkstream` to carry route `projectId` to server functions.
- Added `projectWorkstreams.projectId` to update/delete final write predicates.
- Wrapped delete plus remaining-workstream reorder in a transaction.
- Wrapped reorder mutations in a transaction and fail on stale/cross-project ids instead of silently succeeding.
- Converted touched project workstream not-found paths to `NotFoundError`.
- Added focused contract coverage for safe mutation feedback, hook cache contracts, schema input scope, server predicates, transactional ordered writes, and append positioning.

### Standards Checked

- Domain ownership: project workstream mutation concerns remain inside jobs workstream UI, hooks, schemas, and server functions.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for workstream create/update/delete/reorder.
- Tenant isolation/data integrity: strengthened. Update/delete/reorder now require organization and project predicates, and ordered writes are transactional.
- Safe mutation/cache contracts: strengthened. Mutations retain project list/detail invalidation and now use safe operator messages.
- Honest UI states: read-state behavior preserved; mutation failure feedback is now safer.
- Transactional inventory and finance integrity: not touched.
- Reviewability: the diff is limited to workstream mutation contracts, one formatter extension, one focused test, and this closeout note.

### Smells Removed

- Raw create/update workstream error feedback.
- Generic delete/reorder workstream error feedback.
- Forced first-position workstream create payloads that bypassed append ordering.
- Workstream update server input without route project scope.
- Workstream delete server input without route project scope.
- Delete plus reorder spread across non-transactional statements.
- Reorder silently succeeding when a provided workstream id did not belong to the route project.
- Generic project workstream not-found errors in touched server paths.

### Deferred

- Broader task/workstream drag-and-drop UX polish remains outside this mutation-contract slice.
- Physical implications of deleting a workstream with assigned tasks remain a separate product rule review because this sprint preserved existing delete semantics.
- Project task mutation feedback remains a separate workflow slice.

### Gates

- Passed: `bun test tests/unit/jobs/project-workstreams-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-workstreams-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4b.test.tsx` - 2 files, 7 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice is a narrow project workstreams mutation contract change covered by focused tests plus type/lint gates.
- Skipped: browser QA because no layout, navigation, or successful drag interaction was changed; mutation payload/error contracts are covered by tests.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, safe mutation/cache contracts, tenant isolation, data integrity, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Medium. Workstream mutation contracts are safer. The main residual risk is product semantics around deleting workstreams that may still have assigned tasks, which deserves a separate workflow review rather than an incidental change in this contract slice.
