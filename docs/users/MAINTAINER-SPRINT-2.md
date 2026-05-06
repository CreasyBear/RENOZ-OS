# Users Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Profile Settings Feedback

### Problem

Sprint 1 removed raw mutation feedback from user administration surfaces, but profile self-service still had separate raw-message paths. Profile update, avatar upload/removal, notification preference updates, the profile route submit handler, and the notification preferences read state could expose raw thrown messages or implementation-shaped copy to the operator.

### Workflow Spine

Profile settings feedback workflow
-> profile route
-> profile/avatar/notification preference components
-> profile and preference hooks
-> user/profile/preference server functions
-> schema/database/storage/auth provider failure
-> toast, form summary, or preferences degraded-state copy
-> query key/cache policy unchanged.

### Touched Domains

- Users profile settings.
- Avatar upload/removal.
- Notification preferences.
- Users formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Profile settings are a high-frequency self-service surface. Operators should be able to update their profile, avatar, and notification preferences without seeing storage, database, token, or runtime details when something fails. The workflow should feel dependable, not like an implementation leak.

### Scope Constraints

- Do not change profile, avatar, preference, auth, user, or storage server functions.
- Do not change database writes, storage upload semantics, tenant predicates, route loaders, query keys, invalidation behavior, preference mapping, profile schemas, avatar validation rules, or page layout.
- Keep safe local validation copy available for avatar file type, avatar file size, and readable profile/preference validation messages.
- Change only profile/settings feedback presentation and focused source contracts.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Extended the users-owned mutation formatter with profile, avatar, and notification preference actions.
- Routed `useUpdateProfile`, avatar upload/removal, and notification preference mutations through `formatUserMutationError`.
- Routed the profile route submit failure description through the users formatter.
- Replaced profile and notification preferences read-state raw `error.message` rendering with stable unavailable copy.
- Added focused tests for safe avatar validation copy, unsafe storage/runtime/database suppression, hook wiring, and profile page/form source contracts.

### Standards Checked

- Domain ownership: profile settings feedback now uses the users-owned `src/hooks/users/user-mutation-error-messages.ts` boundary.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only profile/settings failure presentation after existing read or mutation failures reach the client.
- Query/cache policy: unchanged. Existing profile, auth-user, and notification preference invalidations remain untouched.
- Tenant isolation/data integrity: unchanged. No organization scope, user scope, database write, storage operation, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Profile/settings mutation feedback falls back to action-specific recovery copy when server text looks implementation-shaped, while safe local validation copy still flows.
- Reviewability: the diff extends the existing users formatter and applies direct formatter substitutions in the profile/settings paths.

### Smells Removed

- Raw profile update mutation toast copy in the profile hook.
- Raw avatar upload/removal mutation toast copy.
- Raw notification preference mutation toast copy.
- Raw profile route submit failure description.
- Raw profile and notification preference read-state `error.message` rendering.
- Missing source contract for profile/settings feedback safety.

### Deferred

- Password-change feedback remains auth-owned and should be handled in an auth/settings slice if needed.
- Deeper profile/settings UX polish and avatar upload browser QA remain future work.
- Live backend fixtures for uncommon storage/provider/profile error shapes remain future hardening.

### Gates

- Passed: focused profile/users feedback tests, `./node_modules/.bin/vitest run tests/unit/users/profile-mutation-errors.test.ts tests/unit/users/user-mutation-errors.test.ts tests/unit/users/query-normalization-wave5a.test.tsx` - 3 files, 11 tests.
- Passed: broader users suite, `./node_modules/.bin/vitest run tests/unit/users` - 4 files, 14 tests.
- Passed: exact source scan for direct raw-message patterns in touched profile/settings paths.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, database behavior, storage behavior, or cross-domain contracts beyond the users formatter; typecheck, lint, focused source contracts, and the full users suite covered the risk.

### Goal Adaptation

Declined. The standing product-owner goal already covers operator-safe errors, clear domain ownership, query/cache contracts, meaningful tests, and reviewable diffs. Serialized gates remain retired as routine evidence and were not relevant to this profile/settings slice.

### Residual Risk

Low for profile/settings feedback copy. Remaining nearby risk is auth-owned password change feedback and live fixture coverage for uncommon profile, preference, and storage provider error shapes.
