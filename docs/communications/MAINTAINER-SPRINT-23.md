# Communications Maintainer Sprint 23

## Status

Closed in commit-ready state.

## Issue 1: Campaign Detail Read-State Copy

### Problem

The campaign detail panel rendered `campaignError?.message` directly when a campaign detail read failed. The `useCampaign` hook already normalizes detail-read failures and uses the centralized campaign detail query key, but the panel display boundary could still expose backend-shaped errors on a high-value outbound campaign review surface.

### Workflow Spine

Campaign detail workflow
-> `CampaignDetailPanel`
-> `useCampaign`
-> `getCampaignById`
-> campaign schemas and database records
-> centralized campaign detail query key
-> normalized detail read error
-> communications-owned read-state formatter
-> operator-safe campaign detail copy.

### Touched Domains

- Communications campaign detail panel read-state UI.
- Communications read-state copy helper.
- Communications read-state and panel runtime tests.
- Maintainer sprint process documentation.
- Communications maintainer closeout docs.

### Business Value Protected

Campaign detail is the operator control surface for reviewing, sending, pausing, resuming, and tracing outbound communications. When a campaign cannot load, operators need a clear recovery instruction, not database or provider exception text.

### Scope Constraints

- Do not change campaign rendering, recipient loading, send/pause/resume/test-send mutations, campaign route behavior, query keys, server functions, tenant predicates, cache policy, schemas, or campaign analytics.
- Keep this as campaign detail read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Added campaign detail fallback copy to `COMMUNICATION_READ_MESSAGES`.
- Routed campaign detail panel failure copy through `formatCommunicationReadError`.
- Extended focused source coverage so campaign detail stays behind communications-owned copy.
- Added runtime panel coverage that backend-shaped campaign detail failures do not render.
- Updated the maintainer process to stop treating the old serialized gate pack as a recurring closeout item.

### Standards Checked

- Domain ownership: campaign detail read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the panel display boundary after the existing detail read fails.
- Query/cache policy: unchanged. Campaign detail query keys and stale-time behavior were not changed.
- Tenant isolation/data integrity: unchanged. Campaign detail still flows through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Campaign detail no longer renders direct raw read error text.
- Reviewability: the diff is limited to one fallback constant, one panel message call site, focused source coverage, runtime panel coverage, a maintainer process wording update, and this closeout note.

### Smells Removed

- Direct `campaignError?.message` rendering in the campaign detail panel.
- Duplicate ad hoc campaign detail fallback copy outside `COMMUNICATION_READ_MESSAGES`.
- Missing runtime coverage that campaign detail failures use operator-safe copy.
- Serialized gate closeout wording that kept a completed gate track alive as routine sprint ceremony.

### Deferred

- Generic communications error boundary behavior remains separate because it handles render exceptions rather than query read states.
- Communications mutation/form submit errors remain separate slices and should be judged by mutation formatter contracts, not this read-state pass.
- Browser QA was not run because this is read-state copy behavior with no intended layout change.

### Gates

- Passed: focused communication read-state and campaign detail tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/campaign-detail-read-state.test.tsx tests/unit/communications/query-normalization-wave4d.test.tsx` - 3 files, 11 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 20 files, 70 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the focused and broader communications suites still emit the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Made. Per user direction, the old serialized gate pack is closed and no longer part of routine maintainer closeout. Future serial-lineage work should define focused evidence for that slice instead of rerunning a completed default gate pack. The product-owner goal still treats battery serial lineage as a domain invariant, but the evidence model is now cleaner.

### Residual Risk

Low for campaign detail read-state copy. Remaining communications error-surface risk is mostly generic render-boundary and mutation/form-submit feedback, which should be handled as separate slices.
