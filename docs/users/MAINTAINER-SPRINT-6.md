# Users Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Password Reset Completion Feedback

### Problem

Sprint 5 closed password-reset request feedback, but reset completion still rendered raw provider failures. `ResetPasswordForm` threw the Supabase `updateUser` error directly and rendered caught `error.message`, so provider, token, session, stack, or runtime details could appear while an operator was trying to finish account recovery.

### Workflow Spine

Password reset completion workflow
-> update-password route
-> reset-password form
-> Supabase recovery session/password update
-> dashboard navigation on success
-> reset-password form feedback copy on failure
-> query key/cache policy unchanged.

### Touched Domains

- Public auth.
- Password reset completion.
- Auth feedback helpers.
- Auth formatter contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Password reset completion is the final step in account recovery. Operators need clear password-policy and expired-session guidance without seeing Supabase provider internals, recovery tokens, stack traces, or runtime details.

### Scope Constraints

- Do not change update-password route behavior, PKCE/hash exchange, legacy reset-password redirect, form layout, password strength UI, password confirmation schema, Supabase update semantics, dashboard navigation, query/cache behavior, or auth lifecycle routing.
- Keep safe password policy and expired reset-session guidance available.
- Change only reset-completion feedback normalization and focused source contracts.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Extended the auth-owned password reset formatter with `formatPasswordResetCompletionError`.
- Exported the completion formatter from the auth hook barrel.
- Updated `ResetPasswordForm` to wrap Supabase password-update failures in formatted copy before throwing.
- Updated the reset form catch path to render formatted completion copy instead of caught `error.message`.
- Added focused tests for password-policy preservation, expired-session copy, unsafe provider/runtime suppression, form wiring, and source-contract drift.

### Standards Checked

- Domain ownership: reset-completion failure copy is now owned by `src/hooks/auth/password-reset-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only reset-completion client feedback after the existing Supabase update failure.
- Query/cache policy: unchanged. Reset completion does not own a cache invalidation contract in this slice.
- Tenant isolation/data integrity: unchanged. No organization scope, user scope, auth routing, session exchange behavior, Supabase update behavior, database write, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. Reset completion suppresses implementation-shaped provider/runtime text while preserving safe password-policy and expired-session copy.
- Reviewability: the diff is limited to extending the existing auth reset formatter, one form substitution, one barrel export, one focused test, and this closeout note.

### Smells Removed

- Raw Supabase password-update error thrown from reset completion.
- Raw caught `error.message` rendering in the reset-password form.
- Missing auth-owned formatter coverage for reset-completion provider/session failures.
- Missing source contract that reset-completion feedback remains behind auth-owned copy.

### Deferred

- Public login, sign-up, invitation acceptance, and hash-exchange auth flows still need their own auth-feedback review.
- Live Supabase fixture coverage for uncommon reset-completion provider failures remains future hardening.
- Browser QA for reset-completion interactions remains future UX verification.

### Gates

- Passed: focused auth/reset-completion tests, `./node_modules/.bin/vitest run tests/unit/auth/password-reset-completion-feedback-contract.test.ts tests/unit/auth/password-reset-request-feedback-contract.test.ts tests/unit/auth/resend-confirmation-feedback-contract.test.ts tests/unit/auth/route-policy.test.ts` - 4 files, 17 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 10 files, 42 tests.
- Passed: targeted source scan for raw reset-completion message patterns in the touched form/formatter paths.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, auth routing, Supabase update behavior, database behavior, or cross-domain contracts beyond the password-reset formatter; typecheck, lint, focused source contracts, and the auth suite covered the risk.

### Goal Adaptation

Declined. The standing product-owner goal already covers operator-safe errors, clear domain ownership, query/cache contracts, meaningful tests, and reviewable diffs. Serialized gates remain retired as routine evidence and were not relevant to this public auth slice.

### Residual Risk

Medium-low. Password reset completion feedback is safer, but public login, sign-up, invitation acceptance, and auth hash/session exchange still have separate raw-message surfaces that should be reviewed in dedicated auth slices.
