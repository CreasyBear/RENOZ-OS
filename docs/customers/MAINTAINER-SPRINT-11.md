# Customers Maintainer Sprint 11

## Status

Closed in commit-ready state.

## Issue 1: Customer Communications Mutation Failure Copy

### Problem

The live customer communications container still exposed raw mutation feedback in template and campaign actions. Template save used `error.message` directly, while template delete and campaign create used `getUserFriendlyMessage` in a way that could still return unsafe backend text for unclassified errors. This left a customer-facing communications workflow with weaker operator-safe error handling than the rest of the cleaned customer mutation surface.

### Workflow Spine

Customer communications route/tab
-> `CommunicationsContainer`
-> `CommunicationTemplates` / `BulkCommunications`
-> communications mutation hooks
-> communications server functions
-> communications schemas/database
-> communications query key invalidation
-> communications-owned mutation formatter
-> operator-safe template/campaign failure toast.

### Touched Domains

- Customer communications container.
- Communications mutation feedback helper.
- Communications hook barrel export.
- Communications mutation feedback tests.
- Customer maintainer closeout docs.

### Business Value Protected

Customer communications support follow-up, support, warranty, quote, and marketing workflows. When template or campaign actions fail, operators need clear recovery copy without leaking database constraints, infrastructure details, or raw server text.

### Scope Constraints

- Do not change communications server functions, schemas, tenant predicates, campaign/template query keys, mutation invalidation, success copy, read-state handling, Zod validation behavior, tab layout, timeline logging, scheduled email behavior, or campaign delivery behavior.
- Keep this as customer communications mutation feedback only; do not touch the orphaned customer export dialog or broader inbox/email action feedback.
- Serialized gates are retired from routine closeout evidence; do not run them for this customer slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added a communications-owned mutation formatter with template and campaign fallbacks.
- Suppressed unsafe infrastructure-flavored messages such as database constraint, stack, Supabase, Postgres, and internal server errors.
- Exported the formatter from the communications hook barrel.
- Routed customer communication template save/delete and campaign create failures through the formatter.
- Added focused coverage for unsafe-message suppression, safe recovery copy, hook barrel exposure, and container source wiring.

### Standards Checked

- Domain ownership: communications mutation feedback now lives in `src/hooks/communications`, not in the customer or support formatters.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint changes only post-failure feedback after existing communications mutations fail.
- Query/cache policy: unchanged. Template and campaign hook invalidation still flows through existing centralized communications query keys.
- Tenant isolation/data integrity: unchanged. No communications server function, auth predicate, organization predicate, database write, or campaign/template persistence behavior changed.
- UI states/error handling: strengthened. Raw template save failures and unsafe generic fallback descriptions are removed from the live customer communications container.
- Reviewability: the diff is limited to one formatter, one barrel export, three container catch blocks, focused tests, and this closeout note.

### Smells Removed

- Raw template save `error.message` toast.
- Template delete feedback path that could fall through to unclassified backend text.
- Campaign create feedback path that could fall through to unclassified backend text.
- Missing communications-owned mutation feedback formatter.
- Missing regression coverage for customer communications mutation feedback wiring.

### Deferred

- Zod validation copy still uses inline issue formatting and can be refined separately.
- Customer export failure feedback remains separate debt.
- Broader communications inbox/email action feedback still uses existing `getUserFriendlyMessage` patterns and needs its own communications-domain review.
- Communications read-state alerts were not changed in this mutation-feedback slice.
- No browser QA was run because no visual layout or interaction structure changed.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 2 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 46 tests.
- Passed: broader customer suite, `./node_modules/.bin/vitest run tests/unit/customers` - 14 files, 47 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for communications formatter wiring and removed raw template/campaign fallback paths.
- Note: the broader suites still emit the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or repair scripts.
- Skipped: serialized gates because they are retired from routine closeout evidence and this slice did not touch serialized lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe errors, safe mutation/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for customer communications template/campaign mutation feedback. Remaining customer-facing feedback debt is concentrated in export and broader communications inbox/email actions, which need separate workflow slices.
