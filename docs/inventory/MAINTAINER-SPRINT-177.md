# Inventory Maintainer Sprint 177: Ownership Transfer Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Ownership Transfer Refreshed Current-User Root and Missed Previous Owner Detail

### Problem

Transferring organization ownership invalidated `queryKeys.currentUser.all` after promoting the new owner. The server result also returns the previous owner identity, but the hook did not refresh that previous owner’s admin user detail cache after demoting them to admin.

This is a small but consequential admin workflow: the current operator’s authority changes, the target user’s authority changes, and the admin user table/detail surfaces should reflect both without relying on a root current-user invalidation.

### Workflow Spine

Admin ownership transfer UI
-> `useTransferOwnership`
-> `transferOwnership`
-> tenant-scoped owner demotion/promotion transaction
-> user list/stats refresh
-> new owner detail refresh
-> previous/current owner detail refresh
-> current-user detail refresh.

### Touched Domains

- User/admin mutation hook.
- Users query normalization tests.
- Inventory sprint evidence.

### Business Value Protected

Ownership transfer now updates both sides of the role change in admin cache state. RENOZ operators see the new owner and previous owner roles refresh without invalidating the current-user root.

### Scope Constraints

- Do not change ownership transfer server behavior, auth, validation, transaction semantics, or audit logging.
- Do not change user list/detail read behavior.
- Do not change invitation/session/preference hooks.
- Keep this slice limited to mutation cache ownership.

### Changes

- `useTransferOwnership` now uses the mutation result to invalidate the previous owner’s `users.detail` cache.
- Replaced `queryKeys.currentUser.all` invalidation with `queryKeys.currentUser.detail()`.
- Added hook coverage proving ownership transfer refreshes user lists, stats, new owner detail, previous owner detail, and current-user detail without root invalidation.

### Standards Checked

- Domain ownership: user/admin hook owns both role-change cache effects.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: server result identity now drives previous-owner cache refresh.
- Tenant isolation/data integrity: unchanged; server transfer remains organization-scoped and owner-only.
- Transactional inventory/finance integrity: not applicable.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged; existing user mutation error formatting remains.
- Query/cache contract: improved and covered with focused hook tests.
- Reviewability: one hook-line contract change plus focused test coverage.

### Smells Removed

- Ownership transfer used current-user root invalidation where current-user detail was enough.
- Previous owner admin detail cache was not refreshed even though the server returned the previous owner id.

### Deferred

- No browser smoke; this was a hook/cache contract slice.
- No broader users/invitations cache audit.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/users/query-normalization-wave5a.test.tsx tests/unit/users/user-mutation-errors.test.ts tests/unit/users/profile-mutation-errors.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/users/use-users.ts tests/unit/users/query-normalization-wave5a.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening a high-authority admin workflow around explicit mutation identity and targeted cache refresh.

### Residual Risk

Low. Server behavior is unchanged. Remaining risk is limited to broader user administration cache paths not audited in this slice.
