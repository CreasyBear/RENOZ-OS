# Users Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Public Invitation Acceptance Feedback

### Problem

Sprint 8 closed public sign-up feedback, but invitation acceptance still had raw public error surfaces. The invalid invitation page rendered `invitationError.message`, and the invitation form rendered caught mutation errors directly. That could leak provider, token, database, transaction, rollback, or runtime details while an invited RENOZ operator was trying to activate an account.

### Workflow Spine

Invitation acceptance workflow
-> accept-invitation route
-> invitation token lookup through `useInvitationByToken`
-> accept invitation form
-> `useAcceptInvitation`
-> invitation acceptance server mutation
-> optional Supabase sign-in
-> success navigation to dashboard or login
-> public invitation feedback copy on failure
-> query key/cache policy unchanged.

### Touched Domains

- Public auth.
- Invitation acceptance.
- Users invitation hooks and normalized read contract.
- Auth feedback helpers.
- Auth/users contract tests.
- Users maintainer closeout docs.

### Business Value Protected

Invitation acceptance is how new RENOZ operators join the platform. It must give clear guidance for invalid, expired, already-used, rate-limited, and weak-password cases without exposing invitation tokens, auth provider failures, database internals, rollback details, or stack/runtime text.

### Scope Constraints

- Do not change invitation token lookup behavior, invitation acceptance mutation behavior, Supabase sign-in semantics, form schema, invitation metadata display, success navigation, query keys, cache invalidation, database writes, or invite status transitions.
- Keep safe invalid-link, expired-link, current-state, rate-limit, lookup-outage, and password-strength guidance available.
- Change only public invitation feedback normalization.
- Leave auth hash/session exchange as a separate explicit slice.
- Browser QA is skipped because this is formatter/source-contract behavior with no intended visual layout or route interaction change.

### Changes

- Added auth-owned `formatAcceptInvitationError` and `isUnsafeAcceptInvitationMessage`.
- Exported the invitation formatter from the auth hook barrel.
- Updated the accept-invitation route invalid state to format invitation lookup errors instead of rendering `invitationError.message`.
- Updated `AcceptInvitationForm` to format caught submit failures instead of rendering raw mutation errors.
- Added focused tests for safe invitation copy, unsafe provider/token/database suppression, route/form wiring, and the intentionally deferred hash/session exchange path.

### Standards Checked

- Domain ownership: public invitation failure copy is now owned by `src/hooks/auth/accept-invitation-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only route/form feedback boundaries around existing invitation lookup and acceptance failures.
- Query/cache policy: unchanged. `useAcceptInvitation` still invalidates invitation lists, token lookup, invitation stats, user lists, and user stats on success.
- Tenant isolation/data integrity: unchanged. No organization predicate, invitation token lookup, mutation contract, invite status transition, user activation transaction, Supabase sign-in behavior, inventory transaction, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: strengthened. The public invite path suppresses implementation-shaped provider/token/database/runtime text while preserving useful operator guidance.
- Reviewability: the diff is limited to one auth formatter, one route substitution, one form substitution, one barrel export, one focused test, and this closeout note.

### Smells Removed

- Raw `invitationError.message` rendered on the invalid invitation page.
- Raw caught `err.message` rendered in the invitation acceptance form.
- Missing auth-owned formatter boundary for public invitation acceptance failures.
- Missing source contract proving the public invite form and route stay behind safe copy.

### Deferred

- Auth hash/session exchange still passes `authError.description` from `useExchangeHashForSession` into `/auth/error`; that is a separate auth callback slice.
- `useSignIn` remains a generic unused hook that can still throw raw provider failures if future consumers adopt it without a formatter boundary.
- Browser QA for invitation interactions remains future UX verification.

### Gates

- Passed: focused invitation/users tests, `./node_modules/.bin/vitest run tests/unit/auth/accept-invitation-feedback-contract.test.ts tests/unit/users/user-mutation-errors.test.ts tests/unit/users/query-normalization-wave5a.test.tsx` - 3 files, 12 tests.
- Passed: broader auth suite, `./node_modules/.bin/vitest run tests/unit/auth` - 13 files, 50 tests.
- Passed: targeted source scan for legacy raw invitation message patterns in the route, form, and formatter returned no matches.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader auth suite still emits the existing rate-limit warning when Upstash env vars are not configured; tests pass.
- Skipped: browser QA because this is pure formatter/source-contract behavior with no intended layout, navigation, or interaction change.
- Skipped: full unit suite and build because this slice did not change shared runtime plumbing, route loading, build-time behavior, server mutation behavior, database behavior, or cross-domain contracts beyond public invitation feedback; typecheck, lint, focused source contracts, user query normalization, user mutation formatter tests, and the auth suite covered the risk.

### Goal Adaptation

Declined. The standing product-owner goal already covers domain ownership, operator-safe errors, meaningful tests, reviewable diffs, and repo cleanliness. Sprint 7's serialized-gate posture still applies: serialized gates are not routine evidence for unrelated slices.

### Residual Risk

Medium-low. Public invitation lookup and form feedback are safer, but auth hash/session exchange and any future consumer of the generic `useSignIn` hook still need separate auth-feedback hardening.
