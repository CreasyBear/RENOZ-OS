# Pipeline Maintainer Sprint 44

## Status

Closed in commit-ready state.

## Issue 1: Quote Send Orchestration Lived In Quote Versioning

### Problem

After Sprint 43, `quote-versions.tsx` still owned `sendQuote`, which mixes email delivery, email history persistence, PDF orchestration, activity logging, and opportunity stage bumping with quote version CRUD. Sending a quote is a commercial communication workflow, not quote version creation/list/restore behavior.

### Workflow Spine

Send quote email
-> quote mutation hook
-> quote send server module
-> tenant-scoped quote/opportunity/customer reads
-> quote PDF generation
-> email history pending/sent/failed writes
-> Resend delivery
-> activity log and stage bump transaction
-> quote/opportunity/document/activity cache invalidation unchanged.

### Touched Domains

- Pipeline quote send server workflow.
- Pipeline quote version CRUD server module.
- Pipeline quote PDF orchestration.
- Pipeline email history persistence.
- Pipeline opportunity activity and stage transition.
- Pipeline quote mutation hooks and tests.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote sending is the handoff from internal quoting to customer-facing commercial action. Isolating it makes email delivery, customer communication history, activity evidence, and proposal-stage movement easier to audit without reading quote CRUD.

### Scope Constraints

- Do not change send inputs, result shape, email subject/body defaults, PDF attachment behavior, Resend payload shape, email history status semantics, activity description, mutation cache invalidation, UI behavior, quote version CRUD, or quote PDF generation.
- Keep this as a server ownership extraction with tenant-scope hardening on touched send follow-up writes.
- Serialized gates remain retired infrastructure for this unrelated pipeline quote/email slice.

### Changes

- Added `quote-send.ts` as the server owner for `sendQuote`.
- Moved Resend setup, email content construction, email history writes, activity logging, and stage bump orchestration out of `quote-versions.tsx`.
- Updated `use-quote-mutations.ts` and mutation test mocks to import send from the focused module.
- Added a source contract covering quote send ownership, tenant predicates, PDF orchestration, and unchanged mutation cache policy.
- Hardened email history status updates and proposal-stage bump writes with organization predicates.

### Standards Checked

- Domain ownership: quote send orchestration now has a focused server owner instead of living in quote version CRUD.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hook behavior and cache invalidation stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: preserved organization-scoped reads for quote version, opportunity, and customer; email history updates and proposal stage bump now include organization predicates.
- Query/cache contract: unchanged; sent quote mutations still invalidate quote versions, opportunity detail, opportunity lists, opportunity documents, and opportunity activities through centralized helpers.
- Honest UI states/operator-safe errors: unchanged.
- Reviewability: bounded diff across one new send server module, one import split, focused source contracts, and this closeout.

### Smells Removed

- Email delivery and communication history embedded in quote version CRUD.
- Quote versioning importing Resend, email history, organizations, and email formatting dependencies.
- Email history status updates relying only on email history id.
- Proposal stage bump relying on opportunity id and previous stage without the organization predicate.

### Deferred

- `quote-versions.tsx` still owns quote create/read/list/restore and remains a future CRUD-focused cleanup target.
- Browser QA remains deferred because this source-covered slice changes server ownership and tenant predicate hardening only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-send-contract.test.ts tests/unit/pipeline/quote-server-pdf-contract.test.ts tests/unit/pipeline/quote-server-import-order-contract.test.ts tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 5 files, 9 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote send ownership and tenant write predicates.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and current process already cover domain ownership, tenant isolation, communication/cache contracts, meaningful tests, retired routine serialized gates, and reviewable diffs.

### Residual Risk

Low for quote send ownership and tenant predicate hardening. Moderate for the remaining quote version CRUD module because create/restore/read/list can still be separated into smaller read/write owners in future sprints.
