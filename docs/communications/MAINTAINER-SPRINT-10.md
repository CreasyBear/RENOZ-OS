# Communications Maintainer Sprint 10

## Status

Closed in commit-ready state.

## Issue 1: Communication Preference Mutation Failure Copy

### Problem

Communication preference opt-in and confirmed opt-out updates still used generic `getUserFriendlyMessage(error as Error)` handling and raw `updateMutation.error?.message` display. That left a consent-sensitive channel preference workflow behind the communications-owned mutation feedback contract and risked exposing backend, database, stack, permission, or validation internals while operators manage whether a contact can receive email or SMS.

### Workflow Spine

Customer/contact communications surface
-> `CommunicationPreferences`
-> `useUpdateContactPreferences`
-> `updateContactPreferences` server function
-> `updatePreferencesSchema`
-> tenant-scoped `contacts` update and `customerActivities` audit insert in one transaction
-> contact preference and preference history query key invalidation
-> communications-owned preference mutation formatter
-> operator-safe opt-in, opt-out, and submit-error copy.

### Touched Domains

- Communications preference UI.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications preference read/cache evidence.
- Communications maintainer closeout docs.

### Business Value Protected

Communication preferences protect consent, channel trust, customer contact quality, and auditability. Operators need clear safe recovery copy when updating email or SMS preferences fails because this workflow affects marketing reach, customer support follow-up, compliance posture, and the accuracy of preference history.

### Scope Constraints

- Do not change preference routes, customer/contact surfaces, preference layout, confirmation dialog behavior, read-state handling, form schema, success copy, hook invalidation behavior, server function, tenant predicates, transaction boundary, database writes, or preference-history read behavior.
- Preserve the existing cache contract: successful updates still invalidate the contact preference key and preference history key.
- Keep this as communication preference mutation failure feedback only.
- Serialized gates remain retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added a communications-owned preference update fallback.
- Routed immediate opt-in update failures through `formatCommunicationPreferenceMutationError`.
- Routed confirmed opt-out update failures through `formatCommunicationPreferenceMutationError`.
- Routed the preference form submit error through the same formatter.
- Added focused coverage for unsafe preference fallback suppression and source-level preference formatter wiring.

### Standards Checked

- Domain ownership: preference mutation feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after the existing preference mutation fails.
- Query/cache policy: unchanged. `useUpdateContactPreferences` still invalidates `contactPreference(contactId)` and `preferenceHistory(contactId)`.
- Tenant isolation/data integrity: unchanged. `updateContactPreferences` still uses `withAuth`, filters by `organizationId`, and keeps contact update plus audit insert behavior inside the existing transaction.
- UI states/error handling: strengthened. Preference update failures no longer expose raw mutation messages in toasts or submit summary.
- Reviewability: the diff is limited to formatter fallback, preference failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for immediate preference update failures.
- Generic `getUserFriendlyMessage(error as Error)` handling for confirmed opt-out failures.
- Raw `updateMutation.error?.message` display in the preference form submit error.
- Missing preference mutation coverage in the communications mutation feedback contract.

### Deferred

- Preference read-state copy still displays normalized read-query messages from query errors and remains a separate read-state slice.
- Preference history read-state copy was not changed.
- Communication preferences layout, confirmation dialog UX, and audit-history presentation were not changed.
- Email preview, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 13 tests.
- Passed: targeted source scan for preference formatter wiring and removed raw preference mutation failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 57 tests.
- Passed: targeted architecture scan for preference query keys, server auth, tenant predicates, transaction boundary, and formatter wiring.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe errors, safe mutation/cache contracts, tenant isolation, meaningful tests, and risk-selected evidence.

### Residual Risk

Low for communication preference mutation failure feedback. Remaining communications feedback risk is broader: preference read states, preference history read states, email preview, domain verification, analytics, campaign wizard/detail, and other remaining read-state surfaces still need their own domain review.
