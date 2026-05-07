# Users Maintainer Sprint 12: MFA Status Feedback

## Status

Closed in commit-ready state.

## Issue 1: MFA Hook Returned Raw Query Error Messages

### Problem

`useMFA` returned `query.error?.message` as its `error` value. The MFA enrollment and disable dialogs render that hook value, so Supabase/provider, token/session, or runtime details could appear in security settings while an operator manages two-factor authentication.

### Workflow Spine

Security settings route
-> `useMFA`
-> Supabase MFA assurance-level and factor-list reads
-> auth MFA query key
-> MFA status formatter
-> enrollment/disable dialog error text.

### Touched Domains

- Auth/MFA hook.
- Security settings MFA dialogs.
- Auth feedback contract tests.

### Business Value Protected

Two-factor authentication protects operator accounts and business data. Failure copy should help operators recover from expired sessions or rate limits without exposing provider internals, tokens, or implementation errors.

### Scope Constraints

- Do not change Supabase MFA operations, query keys, stale time, retry behavior, enrollment/verify/unenroll/challenge behavior, dialog UI, or security route behavior.
- Keep the `MFAState.error` shape as `string | null`.
- Sanitize only the status-read error returned by the hook.

### Changes

- Added `mfa-error-messages.ts` with `formatMfaStatusError`.
- Routed `useMFA` fallback state through the MFA formatter instead of `query.error?.message`.
- Added focused tests for session-expired, rate-limit, unsafe provider/runtime suppression, hook wiring, and dialog consumption.

### Standards Checked

- Domain ownership: MFA status copy now lives under auth hook feedback helpers.
- Route -> page/dialog -> hook -> provider read -> query key/cache policy: preserved; only hook error formatting changed.
- Query/cache policy: no query keys, stale time, retry behavior, invalidation, or cache contracts changed.
- Tenant isolation/data integrity: no auth session mutation, MFA factor mutation, organization predicate, database write, inventory behavior, finance behavior, or serialized lineage behavior changed.
- UI states/error handling: MFA dialogs no longer receive raw provider error messages from status reads.
- Reviewability: one helper, one hook call site, one focused test file, and this closeout.

### Smells Removed

- Direct `query.error?.message` return from `useMFA`.
- Missing auth-owned formatter contract for MFA status read failures.

### Deferred

- Enrollment, verification, unenroll, and challenge operations currently return booleans and do not expose detailed error text; richer MFA action feedback is a separate UX slice.
- Browser QA was not selected because this is formatter/source-contract behavior with no intended layout or interaction change.

### Gates

- Passed: focused MFA and related auth formatter contracts, `bun run test:vitest tests/unit/auth/mfa-feedback-contract.test.ts tests/unit/auth/auth-callback-feedback-contract.test.ts tests/unit/auth/sign-up-feedback-contract.test.ts` - 3 files, 8 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for `formatMfaStatusError(query.error)` wiring and removed `query.error?.message`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This is a direct application of the standing maintainer goal. Serialized gates remain retired for unrelated auth-feedback slices.

### Residual Risk

Low for MFA status-read feedback. Moderate for MFA action UX because failed enroll/verify/disable actions still collapse to boolean failure without action-specific visible guidance.
