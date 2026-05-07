# Users Maintainer Sprint 11: Admin Group Mutation Feedback

## Status

Closed in commit-ready state.

## Issue 1: Group Admin Routes Surfaced Raw Mutation Errors

### Problem

The admin groups list and group detail containers used direct `error.message` fallbacks for create, update, delete, add-member, role-update, and remove-member mutations. User administration already had a formatter contract, but group admin routes bypassed it, leaving raw database, auth, or implementation text available to operators.

### Workflow Spine

Admin groups routes
-> `GroupsPageContainer` or `GroupDetailPageContainer`
-> users group mutation hooks
-> `src/server/functions/users/user-groups.ts`
-> centralized users query keys and cache invalidations
-> user-owned mutation feedback formatter
-> operator toast.

### Touched Domains

- Users/admin group management.
- Users mutation feedback formatter.
- User admin mutation feedback contract tests.

### Business Value Protected

Group administration controls operator access, teams, and role membership. Admins need actionable, safe failure copy without seeing database constraints, session internals, or implementation exceptions while changing group membership.

### Scope Constraints

- Do not change group query keys, cache invalidations, mutation hook payloads, server functions, schemas, permissions, group/member reads, stale-data banners, confirmation dialogs, or presenter behavior.
- Preserve safe validation messages and known user-admin code mappings.
- Route only mutation toasts through the existing user-owned formatter.

### Changes

- Extended `USER_MUTATION_FALLBACKS` with group create/update/delete/member-role/removal actions.
- Routed admin group list create/delete failures through `formatUserMutationError`.
- Routed group detail update/add-member/role/remove failures through `formatUserMutationError`.
- Extended user mutation feedback tests for group validation, unsafe suppression, and route wiring.

### Standards Checked

- Domain ownership: group mutation copy now uses the users-domain formatter already exported by `@/hooks/users`.
- Route -> container -> hook -> server function -> schema/database -> query key/cache policy: preserved; only final toast formatting changed.
- Query/cache policy: no query keys, invalidations, stale times, or cache contracts changed.
- Tenant isolation/data integrity: no permission checks, organization predicates, server writes, or membership persistence changed.
- UI states/error handling: mutation toasts no longer render raw thrown messages.
- Reviewability: bounded diff across one formatter, two route containers, one focused test file, and this closeout.

### Smells Removed

- Six direct `error.message` mutation toast fallbacks in admin group routes.
- Missing user-domain formatter actions for group create/update/delete/member role/member removal.
- Missing route-level source contract coverage for admin group mutation feedback.

### Deferred

- Group read-state banners still rely on read-path normalized query errors and were not changed.
- Browser QA was not selected because this is formatter/source-contract behavior with no intended layout or interaction change.

### Gates

- Passed: focused users mutation feedback contract, `bun run test:vitest tests/unit/users/user-mutation-errors.test.ts` - 1 file, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for direct admin group mutation `error.message` toast fallbacks.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a straightforward application of the existing repo maintainer goal and users-domain feedback contract. Serialized gates are not relevant to this admin feedback slice.

### Residual Risk

Low for admin group mutation feedback. Broader admin read-state UX and role-permission modeling remain outside this slice.
