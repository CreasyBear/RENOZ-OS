# Operations Maintainer Sprint 63: Project Notes Mutation Contracts

## Status

Closed in commit-ready state.

## Issue 1: Project Note Mutations Were Not Fully Project-Scoped Or Feedback-Safe

### Problem

Project notes had normalized read-state handling and centralized query keys, but create/update/delete failures could still surface raw thrown messages to operators. Update and delete server functions also accepted note identity without the route project id, so the final write predicate relied on tenant scope and note id rather than carrying the route project boundary through the mutation contract.

### Workflow Spine

Jobs project notes workflow
-> `ProjectNotesTab`, `NoteCreateDialog`, `NoteEditDialog`
-> `useNotes`, `useCreateNote`, `useUpdateNote`, `useDeleteNote`
-> `listNotes`, `getNote`, `createNote`, `updateNote`, `deleteNote`
-> `createNoteSchema`, `updateNoteSchema`, `projectScopedNoteIdSchema`, `projectNotes`
-> `queryKeys.projectNotes.byProject`, `detail`, and `stats`
-> tenant- and project-scoped writes with safe mutation feedback.

### Touched Domains

- Jobs project notes UI and dialogs.
- Jobs project notes TanStack Query hooks.
- Project notes server functions and schemas.
- Jobs mutation error formatting.
- Focused jobs contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Project notes hold site observations, meeting context, client feedback, and operator handoff details for RENOZ Energy battery OEM workflows. Mutation failures now give operators safe, useful feedback, and note writes preserve both tenant and project boundaries at the server boundary.

### Scope Constraints

- Do not alter the notes list read contract, empty/unavailable states, or query key shape.
- Do not change note creation payload semantics beyond safe error feedback.
- Keep cache invalidation on project note list, stats, and detail keys.
- Keep the slice limited to project note mutation safety and project write scope.

### Changes

- Added `formatProjectNoteMutationError` with action-specific fallbacks and safe server-code messages.
- Exported the project note mutation formatter through the jobs hook barrel.
- Replaced raw create/update/delete note error toasts with safe formatter output.
- Required `projectId` in note update server input.
- Added `projectScopedNoteIdSchema` for delete-note mutation input.
- Updated `useUpdateNote` and `useDeleteNote` to carry the route `projectId` to the server function.
- Added `projectNotes.projectId` to update/delete final write predicates.
- Made delete return and validate the deleted row so stale/cross-project deletes produce a not-found error instead of silent success.
- Converted project note not-found paths to `NotFoundError`.
- Added focused contract coverage for safe mutation feedback, hook cache contracts, schema input scope, and server predicates.

### Standards Checked

- Domain ownership: project note mutation concerns remain inside jobs notes UI, hooks, schemas, and server functions.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for notes create/update/delete.
- Tenant isolation/data integrity: strengthened. Update/delete now require organization and project predicates.
- Safe mutation/cache contracts: strengthened. Mutations retain project list/stats/detail invalidation and now use safe operator messages.
- Honest UI states: read-state behavior preserved; mutation failures no longer leak raw internals.
- Transactional inventory and finance integrity: not touched.
- Reviewability: the diff is limited to notes mutation contracts, one formatter, one focused test, and this closeout note.

### Smells Removed

- Raw `err.message` note create/update feedback.
- Generic note delete failure feedback.
- Note update server input without route project scope.
- Note delete server input without route project scope.
- Silent delete success when no project note row was deleted.
- Generic project note not-found errors in touched server paths.

### Deferred

- Dormant audio processing remains separate from the live note create/edit/delete workflow because it is not wired to a route today.
- Broader project notes UX polish, including audio persistence and richer empty-state actions, remains a separate product slice.

### Gates

- Passed: `bun test tests/unit/jobs/project-notes-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-notes-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx` - 2 files, 15 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice is a narrow notes mutation contract change covered by focused tests plus type/lint gates.
- Skipped: browser QA because no layout, navigation, or successful user journey changed; mutation failure behavior is covered by contract tests.

### Goal Adaptation

Adopted. Closeout evidence should stay tied to the invariants touched by the current slice instead of carrying forward historical gates by habit.

### Residual Risk

Low to medium. Live note create/update/delete contracts are safer. Remaining risk sits in the dormant audio processing path and broader project notes UX completeness outside this slice.
