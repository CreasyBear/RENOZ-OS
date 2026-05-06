# Operations Maintainer Sprint 53: Delegation Settings Mutation Feedback Safety

## Status

Closed in commit-ready state.

## Issue 1: Delegation Settings Surfaced Raw Mutation Errors

### Problem

The Delegation Management settings route caught create/cancel failures and rendered `err.message` directly. Delegation settings are a user-administration workflow, so mutation feedback should be owned by the users domain formatter rather than route-local raw exception handling.

### Workflow Spine

Delegation settings mutation workflow
-> `/settings/delegations`
-> `DelegationsPage`
-> `useCreateDelegation`, `useCancelDelegation`
-> `createDelegation`, `cancelDelegation`
-> `userDelegations` schema/database rows
-> `queryKeys.users.delegations.all()`
-> safe user-owned mutation feedback.

### Touched Domains

- Settings.
- Users/delegations.
- User mutation-error formatter.
- Focused user delegation feedback tests.
- Operations maintainer closeout docs.

### Business Value Protected

Operators can set and cancel out-of-office delegations without seeing raw database, constraint, stack, or implementation details when mutations fail. This keeps delegation administration safer and more consistent with the rest of user management.

### Scope Constraints

- Do not change delegation read queries, date validation, overlap detection, permissions, activity logging, database schema, query keys, cache invalidation, or dialog flow.
- Keep delegation mutation execution in the existing hooks.
- Limit the slice to safe create/cancel mutation feedback and a focused contract guard.

### Changes

- Added `createDelegation` and `cancelDelegation` fallbacks to the user mutation formatter.
- Updated the Delegation Management settings route to use `formatUserMutationError`.
- Added focused tests proving unsafe delegation mutation messages fall back to safe user-owned copy.
- Added source-level checks for the settings route, delegation hooks, server functions, and query key spine.

### Standards Checked

- Domain ownership: delegation mutation copy now belongs to `src/hooks/users/user-mutation-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and preserved for delegation create/cancel.
- Tenant isolation/data integrity: unchanged. Delegate lookup remains organization-scoped, and cancellation remains scoped to the current delegator.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: strengthened. Create/cancel failures no longer render raw exception messages.
- Reviewability: the diff is limited to one settings route, one users formatter, one focused contract test, and this closeout note.

### Smells Removed

- Route-local `err instanceof Error ? err.message` handling for delegation creation.
- Route-local `err instanceof Error ? err.message` handling for delegation cancellation.
- Missing user-owned mutation fallbacks for delegation actions.
- Missing focused contract coverage for delegation settings feedback.

### Deferred

- Delegation read-state honesty can be reviewed separately; the route currently shows a partial-unavailable banner and fallback empty data when reads fail.
- Delegation page layout and empty-state polish remain separate UI quality work.
- Browser QA can be added if a future slice changes dialog behavior or tab interaction.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/users/delegation-feedback-contract.test.ts tests/unit/users/user-mutation-errors.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change delegation server behavior, schema/database, query keys, cache invalidation, read behavior, dialog interaction, inventory behavior, or financial behavior.
- Skipped: browser QA because this is a narrow mutation feedback contract change with focused tests and no layout or interaction-flow change.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe errors, mutation/cache contracts, tenant isolation checks, meaningful tests, and reviewable diffs.

### Residual Risk

Low for delegation create/cancel feedback. Delegation read-state honesty remains worth a separate settings/users slice.
