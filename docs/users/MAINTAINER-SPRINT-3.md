# Users Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Auth Password Change Feedback

### Problem

Sprint 2 closed profile/settings feedback, but authenticated password change still had an auth-owned raw-message path. `useChangePassword` threw `result.error` directly and toasted `error.message`, so Supabase/provider, token, stack, or runtime details could become both operator-visible toast copy and future `mutation.error.message` copy if another caller rendered the mutation error.

### Workflow Spine

Authenticated password change workflow
-> profile and security settings routes
-> password change form
-> `useChangePassword`
-> auth password-change server function
-> Supabase auth provider/current-password check/password update/rate limiter
-> toast or mutation error copy
-> query key/cache policy unchanged.

### Touched Domains

- Authenticated settings.
- Password change.
- Auth feedback helpers.
- Auth formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Password changes are account-security operations. Operators should receive safe, actionable guidance for incorrect current password, expired session, rate limits, and password policy failures without seeing auth provider internals, tokens, stack traces, or runtime implementation details.

### Scope Constraints

- Do not change password-change form layout, field validation, password strength logic, Supabase auth calls, rate-limit behavior, server function contract, route loaders, query keys, cache behavior, session handling, or profile/security page composition.
- Keep safe password guidance available for current-password, session, rate-limit, and password-policy failures.
- Change only authenticated password-change client feedback normalization and focused source contracts.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added auth-owned `formatPasswordChangeError` and `isUnsafePasswordChangeMessage`.
- Exported the formatter from the auth hook barrel.
- Updated `useChangePassword` to normalize server function failures before throwing, so `mutation.error.message` is safe for future consumers.
- Updated `useChangePassword` toast copy to use the same formatter.
- Added focused tests for safe guidance preservation, auth-provider/runtime suppression, hook normalization, and password-change form source behavior.

### Standards Checked

- Domain ownership: password-change failure copy is now owned by `src/hooks/auth/password-change-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the hook-level client feedback boundary after existing password-change failures.
- Query/cache policy: unchanged. Password change does not own a cache invalidation contract in this slice.
- Tenant isolation/data integrity: unchanged. No organization scope, user scope, database write, auth server function behavior, rate limiter behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. The password-change hook now suppresses implementation-shaped provider text while preserving safe current-password, session, rate-limit, and password-policy copy.
- Reviewability: the diff is limited to one auth formatter, one hook substitution, one barrel export, one focused test, and this closeout note.

### Smells Removed

- Raw password-change `result.error` thrown into mutation state.
- Raw password-change `error.message` toast copy.
- Missing auth-owned formatter boundary for authenticated password-change failures.
- Missing source contract that password-change form does not read raw mutation errors.

### Deferred

- Public login, sign-up, password reset, confirmation, and invitation-auth flows still need their own auth-feedback review instead of being mixed into this settings slice.
- Live Supabase fixture coverage for uncommon provider password update failures remains future hardening.
- Browser QA for password-change form interactions remains future UX verification.

### Gates

- Passed: focused auth/password tests, `./node_modules/.bin/vitest run tests/unit/auth/password-change-feedback-contract.test.ts tests/unit/auth/auth-error-route.test.ts tests/unit/auth/error-codes.test.ts tests/unit/auth/route-policy.test.ts` - 4 files, 22 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 7 files, 36 tests.
- Passed: targeted source scan for direct raw password-change message patterns in the touched hook/form/formatter paths.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, auth server behavior, rate-limit behavior, database behavior, or cross-domain contracts beyond the password-change formatter; typecheck, lint, focused source contracts, and the auth suite covered the risk.

### Goal Adaptation

Declined. The standing product-owner goal already covers operator-safe errors, clear domain ownership, query/cache contracts, meaningful tests, and reviewable diffs. Serialized gates remain retired as routine evidence and were not relevant to this authenticated settings slice.

### Residual Risk

Medium-low. Authenticated password-change feedback is safer, but public auth flows still have separate raw-message surfaces and should be reviewed in dedicated auth slices.
