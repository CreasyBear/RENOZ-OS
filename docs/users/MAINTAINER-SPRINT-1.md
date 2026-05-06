# Users Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: User Administration Mutation Feedback

### Problem

User administration workflows still surfaced raw thrown mutation messages from hooks, route containers, and dialogs. Session termination, invitations, user lifecycle actions, bulk updates, export, ownership transfer, and user group assignment could show database, auth provider, token, stack, or runtime details directly to operators.

### Workflow Spine

User administration feedback workflow
-> admin users, invitations, security, and user detail routes
-> route container or dialog presenter
-> user hooks
-> user, invitation, session, or group server function
-> schema/database/auth provider failure
-> toast, alert, import row summary, or dialog retry copy
-> query key/cache policy unchanged.

### Touched Domains

- Users and access administration.
- Invitation management.
- Session management.
- User group membership from the user detail page.
- Users formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Access control is operational infrastructure for RENOZ. Admins need safe, clear failure copy when inviting staff, terminating sessions, exporting users, changing roles/statuses, transferring ownership, or assigning groups. These workflows should reduce support burden and security confusion instead of leaking implementation details during account-management work.

### Scope Constraints

- Do not change user, invitation, session, group, auth, or profile server functions.
- Do not change database writes, tenant predicates, route loaders, search schemas, query keys, invalidation behavior, table layout, CSV parsing, or import result shape.
- Keep safe validation, expired-invitation, permission, not-found, conflict, auth, and rate-limit guidance available.
- Change only user-administration mutation feedback boundaries and focused source contracts.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added `formatUserMutationError` and `isUnsafeUserMutationMessage` in a users-owned pure formatter module.
- Routed session termination, invitation mutations, and user export hook errors through the formatter.
- Routed admin users list, user detail, invite page, bulk invite import, and invite dialog mutation feedback through the formatter or hook-owned copy.
- Added focused tests for safe validation/code copy, unsafe infrastructure/runtime suppression, hook wiring, and page/dialog source contracts.

### Standards Checked

- Domain ownership: user administration mutation copy now belongs to `src/hooks/users/user-mutation-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only client-side failure presentation after existing user-admin mutations fail.
- Query/cache policy: unchanged. Existing invalidations for users, stats, details, invitations, sessions, and groups remain untouched.
- Tenant isolation/data integrity: unchanged. No organization scope, auth boundary, database write, audit log, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Operator-facing user-admin feedback falls back to action-specific recovery copy when server text looks implementation-shaped, while safe validation and known code copy still flows.
- Reviewability: the formatter is local to the users domain and the route/hook changes are direct formatter substitutions.

### Smells Removed

- Raw `error.message` toasts in user session, invitation, and export hooks.
- Raw mutation messages in admin users list lifecycle/bulk/export actions.
- Raw mutation messages in user detail update/deactivate/reactivate/ownership/group-member actions.
- Raw mutation messages in invite page and bulk invite import failure summaries.
- Duplicate raw failure toast from the user invite dialog after the hook already owns invitation failure copy.
- Missing user-domain regression coverage for unsafe mutation message suppression.

### Deferred

- Profile and notification preference mutation feedback still has separate raw-message debt and should be handled in a profile-focused slice.
- Deeper toast deduplication across user invitation success paths remains future UX cleanup.
- Live backend fixtures for every user-admin mutation error shape remain future hardening.

### Gates

- Passed: focused user-admin tests, `./node_modules/.bin/vitest run tests/unit/users/user-mutation-errors.test.ts tests/unit/users/query-normalization-wave5a.test.tsx tests/unit/users/user-sorting.test.ts` - 3 files, 12 tests.
- Passed: broader users suite, `./node_modules/.bin/vitest run tests/unit/users` - 3 files, 12 tests.
- Passed: source scan for raw mutation-message patterns in touched user-admin hooks/routes/dialog paths.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, database behavior, or cross-domain contracts beyond the users formatter; typecheck, lint, focused source contracts, and the full users suite covered the risk.

### Goal Adaptation

Declined. The standing product-owner goal already covers operator-safe errors, clear domain ownership, query/cache contracts, meaningful tests, and reviewable diffs. Serialized gates remain retired as routine evidence and were not relevant to this user-administration slice.

### Residual Risk

Medium-low. User administration mutation feedback is safer, but profile/preferences mutation feedback remains a nearby users-domain follow-up and invitation success toasts still deserve a deliberate deduplication pass.
