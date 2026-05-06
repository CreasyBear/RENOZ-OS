# Users Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Public Login Feedback

### Problem

The public login form still rendered raw authentication failures. Rate-limit failures, Supabase sign-in errors, missing-session failures, incomplete app-user setup, and the final catch path could all flow into visible `err.message` copy while an operator was trying to access RENOZ.

### Workflow Spine

Public login workflow
-> login route
-> login form
-> login rate-limit server function
-> Supabase sign-in/session check
-> app-user lookup
-> dashboard navigation on success
-> login form feedback copy on failure
-> query key/cache policy unchanged.

### Touched Domains

- Public auth.
- Login and sign-in.
- Auth feedback helpers.
- Auth formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Login is the front door for RENOZ operators. It needs to give useful guidance for invalid credentials, unconfirmed email, rate limits, incomplete account setup, and session failures without exposing provider internals, tokens, database text, stack traces, or runtime details.

### Scope Constraints

- Do not change the login route, layout, form schema, rate-limit behavior, Supabase sign-in semantics, session lookup, users-table lookup, dashboard navigation, query/cache behavior, or auth lifecycle routing.
- Keep safe credential, confirmation, rate-limit, session, and incomplete-account guidance available.
- Change only login feedback normalization and focused source contracts.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added auth-owned `formatLoginError` and `isUnsafeLoginMessage`.
- Exported the login formatter from the auth hook barrel.
- Updated `LoginForm` to normalize rate-limit, Supabase sign-in, missing-session, incomplete app-user, and final catch feedback through the login formatter.
- Added focused tests for safe login copy, unsafe provider/runtime suppression, form wiring, and source-contract drift.

### Standards Checked

- Domain ownership: login failure copy is now owned by `src/hooks/auth/login-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the client feedback boundary around existing login failures.
- Query/cache policy: unchanged. Login does not own a cache invalidation contract in this slice.
- Tenant isolation/data integrity: unchanged. No organization scope, user scope, rate-limit server behavior, Supabase auth behavior, users-table lookup behavior, database write, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. The login path suppresses implementation-shaped provider/database/runtime text while preserving safe invalid-credential, unconfirmed-email, rate-limit, session, and incomplete-account copy.
- Reviewability: the diff is limited to one auth formatter, one form substitution, one barrel export, one focused test, and this closeout note.

### Smells Removed

- Raw Supabase sign-in error thrown from login.
- Raw caught `err.message` rendering in the login form.
- Raw rate-limit error fallback construction inside the form.
- Raw missing-session and incomplete-account throw copy escaping the form boundary.
- Missing auth-owned formatter coverage for login failures.
- Missing source contract that login feedback remains behind auth-owned copy.

### Deferred

- Public sign-up, invitation acceptance, and auth hash/session exchange still need dedicated auth-feedback review.
- `useSignIn` remains a generic unused hook that can still throw raw provider failures if future consumers adopt it without a formatter boundary.
- Live Supabase fixture coverage for uncommon login provider failures remains future hardening.
- Browser QA for login interactions remains future UX verification.

### Gates

- Passed: focused auth/login tests, `./node_modules/.bin/vitest run tests/unit/auth/login-feedback-contract.test.ts tests/unit/auth/password-reset-completion-feedback-contract.test.ts tests/unit/auth/password-reset-request-feedback-contract.test.ts tests/unit/auth/route-policy.test.ts` - 4 files, 17 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 11 files, 44 tests.
- Passed: targeted source scan for legacy raw login message patterns in `LoginForm` returned no matches.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, auth routing, Supabase behavior, database behavior, or cross-domain contracts beyond the login feedback formatter; typecheck, lint, focused source contracts, and the auth suite covered the risk.

### Goal Adaptation

Made. Serialized gates are no longer run or listed as routine skipped evidence for unrelated slices. Serialized lineage continuity remains a domain invariant, but lineage-specific evidence should be introduced only when a slice touches serialized inventory, identity, movement, warranty/RMA serial continuity, or related repair scripts.

### Residual Risk

Medium-low. Public login feedback is safer, but sign-up, invitation acceptance, hash/session exchange, and any future consumer of the generic `useSignIn` hook still need separate auth-feedback hardening.
