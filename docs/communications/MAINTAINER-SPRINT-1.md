# Communications Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Campaign Action Failure Copy

### Problem

The communications campaigns route is a live campaign operations surface. Direct campaign actions still surfaced raw mutation failures for cancel, delete, duplicate, and test-send actions. Bulk campaign delete/pause/resume also stored raw rejection messages before summarizing failures. That made campaign operations weaker than the newly established communications mutation feedback contract and risked exposing backend or provider details to operators.

### Workflow Spine

Communications campaigns route
-> `CampaignsPage`
-> `CampaignsList`
-> campaign mutation hooks
-> communications campaign server functions
-> communications campaign schemas/database
-> communications query key invalidation
-> communications-owned campaign mutation formatter
-> direct and bulk campaign failure toast/alert copy.

### Touched Domains

- Communications campaign route.
- Communications mutation feedback helper.
- Shared bulk action result helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Campaign operations support dealer/customer follow-up at scale. When an operator cancels, deletes, duplicates, pauses, resumes, or test-sends a campaign, failures should explain the recovery path without leaking campaign recipient constraints, provider internals, database names, stack traces, or raw server text.

### Scope Constraints

- Do not change campaign server functions, campaign schemas, tenant predicates, recipient processing, campaign status transitions, query keys, invalidation, success copy, dialogs, filters, selection behavior, or campaign read states.
- Keep this as campaign action feedback only; do not change inbox, scheduled email, signatures, suppression, analytics, or template workflow behavior.
- Keep the shared bulk helper backwards-compatible; only communications campaign callers opt into domain formatting.
- Serialized gates are retired from routine closeout evidence; do not run them for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added campaign action fallbacks for cancel, delete, duplicate, test send, pause, and resume to the communications mutation formatter.
- Routed direct campaign cancel/delete/duplicate/test-send failures through `formatCommunicationCampaignMutationError`.
- Added an optional `formatError` callback to `executeBulkAction`.
- Routed communications campaign bulk delete/pause/resume failure items through the campaign formatter before summarization.
- Added focused coverage for campaign formatter fallback behavior, campaign route source wiring, removed raw campaign action fallbacks, and bulk failure item formatting.

### Standards Checked

- Domain ownership: campaign feedback uses the communications mutation formatter, not customer/support/warranty helpers.
- Route -> container/page -> hook -> server -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing campaign mutations fail.
- Query/cache policy: unchanged. Campaign invalidation still uses existing centralized communications query keys.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, recipient persistence, campaign persistence, or delivery behavior changed.
- UI states/error handling: strengthened. Direct and bulk campaign action failures no longer expose raw mutation messages.
- Reviewability: the diff is limited to formatter fallbacks, campaign route catch blocks, a backwards-compatible bulk helper option, focused tests, and this closeout note.

### Smells Removed

- Raw cancel campaign failure toast.
- Raw delete campaign failure toast.
- Raw duplicate campaign failure toast.
- Raw test-send campaign failure toast.
- Raw bulk campaign delete/pause/resume rejection messages before failure summarization.
- Missing campaign action coverage in the communications mutation feedback contract.

### Deferred

- Campaign read-state cached-error copy still displays the normalized query error message and can be reviewed separately.
- Inbox, scheduled emails, signatures, suppression, domain verification, and analytics action feedback remain separate communications slices.
- Products and suppliers still use the legacy default `executeBulkAction` raw-message behavior; this sprint only adds the opt-in formatter path and wires communications campaign callers.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 4 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 48 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Passed: targeted source scan for campaign formatter wiring and removed raw direct campaign fallback paths.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or repair scripts.
- Skipped: serialized gates because they are retired from routine closeout evidence and this slice did not touch serialized lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, operator-safe errors, mutation/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for communications campaign action failure feedback. Remaining communications feedback risk is broader: inbox/email actions and other communications settings flows still need their own domain review.
