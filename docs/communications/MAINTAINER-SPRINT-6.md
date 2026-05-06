# Communications Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Signature Mutation Failure Copy

### Problem

Email signature create, update, delete, and set-default failures still used generic `getUserFriendlyMessage(error as Error)` or broad "Failed to ..." toasts. The create path also reported "Failed to update signature", which made the recovery copy inaccurate. That left signature management behind the communications-owned mutation feedback contract and risked exposing backend, database, stack, or server details during email setup.

### Workflow Spine

Communications signatures route
-> `SignaturesPage`
-> `SignaturesList` and `SignatureEditor`
-> signature mutation hooks
-> communications signature server functions
-> signature schema/database records
-> signature query keys
-> communications-owned signature mutation formatter
-> operator-safe create, update, delete, and set-default failure copy.

### Touched Domains

- Communications signatures route/page.
- Communications signature editor.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Email signatures support consistent outbound communication for sales, ordering, support, warranty, RMA, dealer, and customer follow-up. Operators should be able to create, update, delete, and set default signatures with safe recovery copy when the mutation fails, without seeing raw database constraints, stack traces, or server internals.

### Scope Constraints

- Do not change signatures routes, list rendering, editor layout, formatting toolbar behavior, HTML sanitization, server functions, schemas, tenant predicates, success copy, read-state query normalization, or signature persistence behavior.
- Preserve the existing cache policy: create/delete/set-default invalidate signatures; update invalidates signatures and the edited detail.
- Keep this as signature mutation failure feedback only.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added signature fallbacks for create, update, delete, and set-default failures.
- Routed signature editor create and update failures through `formatCommunicationSignatureMutationError`.
- Routed signatures page delete and set-default failures through `formatCommunicationSignatureMutationError`.
- Corrected the create failure path to use create-specific copy instead of update copy.
- Added focused coverage for unsafe signature fallback suppression and source-level signature formatter wiring.

### Standards Checked

- Domain ownership: signature mutation feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing signature mutations fail.
- Query/cache policy: unchanged. No invalidation, rollback, stale-time, detail key, or list key behavior changed.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, signature persistence, default-selection, or sanitization behavior changed.
- UI states/error handling: strengthened. Signature mutation failures no longer expose raw mutation messages, and create failures no longer use update copy.
- Reviewability: the diff is limited to formatter fallbacks, page/editor failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for signature create and update failures.
- Broad unformatted signature delete and set-default page failures.
- Create-signature failure copy incorrectly saying update failed.
- Missing signature mutation coverage in the communications mutation feedback contract.

### Deferred

- Signature read-state copy still displays normalized read-query messages and can be reviewed separately as a query-state slice.
- Template editor, communication preferences, suppression dialogs, quick log, email preview, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 9 tests.
- Passed: targeted source scan for signature formatter wiring and removed raw signature mutation failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 53 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, repair scripts, serial lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer process already covers domain ownership, operator-safe errors, query/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for signature mutation failure feedback. Remaining communications feedback risk is broader: read-state copy and other communications action surfaces still need their own domain review.
