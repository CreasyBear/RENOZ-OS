# Users Maintainer Sprint 14: Onboarding Read Feedback

## Status

Closed in commit-ready state.

## Issue 1: Onboarding Surfaces Rendered Raw Read Error Messages

### Problem

`useOnboardingProgress` already normalizes onboarding read failures, and Wave 6A verified that the onboarding route/checklist distinguish unavailable from healthy empty progress. The route and shared checklist still rendered `error.message || fallback` directly, which left arbitrary non-normalized errors able to reach the UI.

### Workflow Spine

Authenticated onboarding route or checklist
-> `useOnboardingProgress`
-> `getOnboardingProgress`
-> normalized onboarding read result
-> `getOnboardingProgressReadErrorMessage`
-> cold-load or cached-data onboarding alert.

### Touched Domains

- Onboarding route.
- Shared onboarding checklist.
- Shared onboarding read-feedback helper.
- Users onboarding read-feedback contract test.
- Users maintainer closeout docs.

### Business Value Protected

Onboarding helps operators complete setup without guessing which first steps matter. If onboarding progress is unavailable, the app should show clear recovery copy without exposing database, auth, or runtime details.

### Scope Constraints

- Do not change onboarding server functions, query keys, checklist behavior, completion/dismissal mutations, analytics tracking, navigation, or rendered onboarding progress.
- Preserve the existing unavailable and cached-data fallback copy.
- Keep this slice limited to read feedback formatting.

### Changes

- Added shared onboarding read fallback constants and `getOnboardingProgressReadErrorMessage`.
- Routed the onboarding route cold-load and stale-data alerts through the helper.
- Routed the shared onboarding checklist cold-load and stale-data alerts through the helper.
- Added a focused contract for unsafe message suppression and source wiring.

### Standards Checked

- Domain ownership: onboarding read feedback is now centralized beside the shared onboarding UI.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked through the route/checklist, `useOnboardingProgress`, server read, and alert display boundary.
- Tenant isolation/data integrity: unchanged; no server/database behavior changed.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: improved for onboarding read failures.
- Query/cache contract: unchanged.
- Reviewability: one helper, two display replacements, one contract, one closeout note.

### Smells Removed

- Raw onboarding route `error.message || fallback` rendering.
- Raw onboarding checklist `error.message || fallback` rendering.
- Duplicated onboarding unavailable copy in UI surfaces.

### Deferred

- Onboarding mutation toast copy remains separate from read feedback and was not changed.
- Browser QA remains deferred because this changes alert copy safety only.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/users/onboarding-read-feedback-contract.test.ts tests/unit/system/query-normalization-wave6a.test.tsx`.
- Passed: `./node_modules/.bin/eslint src/components/shared/onboarding-read-error-messages.ts src/components/shared/onboarding-checklist.tsx src/routes/_authenticated/onboarding/index.tsx tests/unit/users/onboarding-read-feedback-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues operator-safe user/onboarding read feedback under the standing maintainer goal.

### Residual Risk

Low. Onboarding behavior is unchanged; raw read messages now go through a bounded helper.
