# Communications Maintainer Sprint 22

## Status

Closed in commit-ready state.

## Issue 1: Email Preview Modal Read-State Copy

### Problem

The email preview modal rendered `previewError.message` directly when template preview rendering failed. The `useEmailPreview` hook already normalizes preview read failures and uses a centralized email preview query key, but the modal display boundary could still expose provider or backend details.

### Workflow Spine

Template/signature workflow
-> `EmailPreviewModal`
-> `useEmailPreview`
-> `renderEmailPreview`
-> email template/signature schemas and database records
-> centralized email preview query key
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe email preview copy.

### Touched Domains

- Communications email preview modal read-state UI.
- Communications read-state copy helper.
- Communications read-state and modal runtime tests.
- Communications maintainer closeout docs.

### Business Value Protected

Email preview is the last review step before sending test or customer-facing email content. Operators should see clear recovery copy when preview rendering fails, without provider payloads, database details, or backend exceptions.

### Scope Constraints

- Do not change template rendering, variable merging, preview query keys, test-send mutation behavior, pending dialog guards, tab behavior, iframe rendering, server functions, tenant predicates, or schema contracts.
- Keep this as preview read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended layout or interaction change.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added email preview fallback copy to `COMMUNICATION_READ_MESSAGES`.
- Routed email preview modal failure copy through `formatCommunicationReadError`.
- Extended focused source coverage so email preview stays behind communications-owned copy.
- Added runtime modal coverage that provider-shaped preview failures do not render.

### Standards Checked

- Domain ownership: email preview read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the modal display boundary after the existing preview read fails.
- Query/cache policy: unchanged. Email preview query keys and cache timing were not changed.
- Tenant isolation/data integrity: unchanged. Email preview still flows through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Email preview no longer renders direct raw preview error text.
- Reviewability: the diff is limited to one fallback constant, one modal message call site, focused source coverage, runtime modal coverage, and this closeout note.

### Smells Removed

- Direct `Failed to load preview: {previewError.message}` rendering in the email preview modal.
- Duplicate ad hoc email preview fallback copy outside `COMMUNICATION_READ_MESSAGES`.
- Missing runtime coverage that email preview failures use operator-safe copy.

### Deferred

- Generic communications error boundary behavior remains separate because it handles render exceptions rather than query read states.
- Communications mutation/form submit errors remain separate slices and should be judged by mutation formatter contracts, not this read-state pass.
- Browser QA was not run because this is read-state copy behavior with no intended layout change.

### Gates

- Passed: focused communication read-state and preview tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/email-preview-modal-read-state.test.tsx tests/unit/communications/query-normalization-wave4d.test.tsx` - 3 files, 11 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 19 files, 69 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the communications suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Accepted the ongoing runtime adaptation that serialized gates are no longer routine sprint evidence. Declined changing the standing product-owner goal itself because serialized lineage continuity remains a valid domain invariant for battery OEM workflows.

### Residual Risk

Low for email preview modal read-state copy. Remaining communications error-surface risk is mostly generic render-boundary and mutation/form-submit feedback, which should be handled as separate slices.
