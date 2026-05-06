# Communications Maintainer Sprint 8

## Status

Closed in commit-ready state.

## Issue 1: Suppression Mutation Failure Copy

### Problem

Suppression add and remove actions still used generic `getUserFriendlyMessage(error as Error)` or raw mutation error display. That left outbound email safety controls behind the communications-owned mutation feedback contract and risked exposing backend, database, stack, or server details while operators manage which addresses RENOZ can email.

### Workflow Spine

Communications settings route
-> suppression settings surface
-> `AddSuppressionDialog` and `SuppressionListTable`
-> suppression mutation hooks
-> communications suppression server functions
-> suppression schema/database records
-> suppression query keys and email check cache
-> communications-owned suppression mutation formatter
-> operator-safe add and remove failure copy.

### Touched Domains

- Communications suppression add dialog.
- Communications suppression list table.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Suppression management protects outbound email trust for customer, dealer, warranty, support, RMA, and marketing communications. Operators should be able to manually suppress or re-enable an address with safe recovery copy when the mutation fails, without seeing raw database constraints, stack traces, or server internals.

### Scope Constraints

- Do not change suppression routes, list rendering, filters, pagination, sorting, confirmation dialog behavior, server functions, schemas, tenant predicates, success copy, read-state query normalization, suppression policy behavior, or soft-delete behavior.
- Preserve the existing cache policy: add invalidates suppression lists and the affected email check; remove invalidates suppression queries.
- Keep this as suppression mutation failure feedback only.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added suppression fallbacks for add and remove failures.
- Routed `AddSuppressionDialog` add failure toast and submit error through `formatCommunicationSuppressionMutationError`.
- Routed `SuppressionListTable` remove failure toast through `formatCommunicationSuppressionMutationError`.
- Added focused coverage for unsafe suppression fallback suppression and source-level suppression formatter wiring.

### Standards Checked

- Domain ownership: suppression mutation feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing suppression mutations fail.
- Query/cache policy: unchanged. No invalidation, rollback, stale-time, list key, or email-check key behavior changed.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, suppression persistence, policy helper, or soft-delete behavior changed.
- UI states/error handling: strengthened. Suppression mutation failures no longer expose raw mutation messages.
- Reviewability: the diff is limited to formatter fallbacks, dialog/table failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for suppression add failures.
- Generic `getUserFriendlyMessage(err as Error)` handling for suppression remove failures.
- Raw `addMutation.error?.message` display in the add-suppression dialog submit error.
- Missing suppression mutation coverage in the communications mutation feedback contract.

### Deferred

- Suppression list read-state copy still displays normalized read-query messages and can be reviewed separately as a query-state slice.
- Email preview, communication preferences, quick log, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 11 tests.
- Passed: targeted source scan for suppression formatter wiring and removed raw suppression mutation failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 55 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Accepted. Routine serialized gates are no longer part of the default maintainer closeout because that workstream is complete. Gate selection should stay risk-based and bring serialized evidence back only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Residual Risk

Low for suppression mutation failure feedback. Remaining communications feedback risk is broader: read-state copy and other communications action surfaces still need their own domain review.
