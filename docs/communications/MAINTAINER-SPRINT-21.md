# Communications Maintainer Sprint 21

## Status

Closed in commit-ready state.

## Issue 1: Campaign Recipient Preview Read-State Copy

### Problem

The campaign recipient preview panel rendered `error.message` directly when recipient preview failed. The preview hook already normalizes read failures and uses a centralized `campaignPreview` query key, but the panel display boundary still exposed backend-shaped errors before a campaign could be reviewed or sent.

### Workflow Spine

Campaign wizard preview step
-> `CampaignPreviewPanel`
-> `useCampaignPreview`
-> `previewCampaignRecipients`
-> campaign recipient criteria schema and contact/customer database reads
-> centralized campaign preview query key
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe recipient preview copy.

### Touched Domains

- Communications campaign recipient preview panel.
- Communications read-state copy helper.
- Communications read-state and preview runtime tests.
- Communications maintainer closeout docs.

### Business Value Protected

Recipient preview is a pre-send safety check for outbound campaigns. Operators should see clear recovery copy when preview fails, without backend or database details, so campaign review remains safe and understandable.

### Scope Constraints

- Do not change recipient criteria, sample size, preview query key behavior, campaign wizard flow, recipient count callbacks, preview server function, tenant predicates, schemas, campaign send behavior, or wizard validation.
- Keep this as recipient preview read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended layout or interaction change.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added campaign preview fallback copy to `COMMUNICATION_READ_MESSAGES`.
- Routed campaign preview panel failure copy through `formatCommunicationReadError`.
- Extended focused source coverage so campaign preview stays behind communications-owned copy.
- Added runtime preview panel coverage that backend-shaped recipient-preview failures do not render.

### Standards Checked

- Domain ownership: campaign preview read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the panel display boundary after the existing preview read fails.
- Query/cache policy: unchanged. Campaign preview query keys and sample criteria were not changed.
- Tenant isolation/data integrity: unchanged. Recipient preview still flows through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Recipient preview no longer renders direct raw read error text.
- Reviewability: the diff is limited to one fallback constant, one panel message call site, focused source coverage, runtime panel coverage, and this closeout note.

### Smells Removed

- Direct `error instanceof Error ? error.message : "Failed to load recipient preview"` rendering in campaign preview.
- Duplicate ad hoc campaign preview fallback copy outside `COMMUNICATION_READ_MESSAGES`.
- Missing runtime coverage that recipient-preview failures use operator-safe copy.

### Deferred

- Email preview modal read-state copy remains a separate follow-up slice.
- Generic communications error boundary behavior remains separate because it handles render exceptions rather than query read states.
- Browser QA was not run because this is read-state copy behavior with no intended layout change.

### Gates

- Passed: focused communication read-state and preview tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/campaign-preview-read-state.test.tsx tests/unit/communications/query-normalization-wave4d.test.tsx tests/unit/communications/campaign-query-key-contract.test.tsx` - 4 files, 13 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 18 files, 68 tests.
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

Low for campaign recipient preview read-state copy. Remaining communications read-state risk is concentrated in the email preview modal and generic communications error boundary.
