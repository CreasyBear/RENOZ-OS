# Communications Maintainer Sprint 31

## Status

Closed in commit-ready state.

## Issue 1: Campaign Action Error Feedback Drift

### Problem

The communications campaign route actions already used communications-owned mutation error formatters, but the campaign detail panel and campaign wizard still rendered generic friendly error messages directly from caught errors. That left send, pause, resume, test-send, recipient population, create, and update failures with uneven operator copy and a path for database/provider phrasing to leak into the UI.

### Workflow Spine

Communications campaign operator action
-> campaign detail panel or campaign wizard
-> communications campaign mutation hook
-> communications server function
-> campaign/recipient persistence
-> query invalidation for campaign list/detail/recipients
-> operator toast or submit error.

### Touched Domains

- Communications campaign detail actions.
- Communications campaign wizard create/update/populate/send flow.
- Communications campaign mutation feedback formatter.
- Communications mutation feedback contract tests.

### Business Value Protected

Campaigns are customer-facing communications. Operators need action failure copy that explains what failed without leaking provider, SQL, token, or stack details. This protects customer communication reliability, reduces support friction when a campaign cannot send or refresh recipients, and keeps the campaign workflow consistent with the rest of the communications domain.

### Scope Constraints

- Do not change campaign persistence, recipient population behavior, sending behavior, scheduling, server functions, database schema, or query invalidation.
- Do not broaden into campaign builder layout, campaign analytics, inbox, scheduled calls, templates, or outbound email processing.
- Do not alter provider integration behavior or retry policy.

### Changes

- Added campaign formatter fallbacks for `send`, `update`, and `populate`.
- Replaced campaign detail panel send, pause, resume, and test-send failure descriptions with `formatCommunicationCampaignMutationError`.
- Replaced campaign wizard update-populate, create-populate, immediate-send, and submit failure paths with the campaign formatter.
- Extended communications mutation feedback tests to prove campaign detail and wizard actions stay on the communications-owned formatter and reject the older generic message paths.

### Standards Checked

- Domain ownership: campaign operator feedback is owned by communications formatter code in `src/hooks/communications/_mutation-errors.ts`.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: UI feedback now aligns with existing campaign mutation hooks; server, schema, database, and query invalidation paths were not changed.
- Query/cache policy: no query keys or invalidation contracts changed.
- Tenant isolation/data integrity: no tenant filters, persistence writes, recipient updates, or campaign send semantics changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: campaign action failures now use domain-safe fallback copy when caught errors look like infrastructure/provider/internal failures.
- Reviewability: the diff is limited to one formatter, two campaign UI surfaces, one source contract test, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(normalizeError(error))` campaign action copy in the campaign detail panel.
- Generic `getUserFriendlyMessage(error as Error)` campaign wizard action copy.
- Missing campaign formatter actions for send/update/populate failure paths.

### Deferred

- Campaign wizard remains a large mixed-concern component and still deserves a later extraction pass by step/state/action boundary.
- Campaign detail panel remains a broad detail surface and can be split later if future campaign work touches presentation complexity.
- Browser QA is deferred because this slice changes failure-copy routing only, not visible happy-path layout or interaction mechanics.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 14 tests.
- Passed: `npm exec eslint src/hooks/communications/_mutation-errors.ts src/components/domain/communications/campaigns/campaign-detail-panel.tsx src/components/domain/communications/campaigns/campaign-wizard.tsx tests/unit/communications/communications-mutation-errors.test.ts -- --report-unused-disable-directives`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test:unit` - 729 files, 2379 tests.
- Passed: `git diff --check`.
- Skipped: browser QA, production build, deploy, finance gates, and document gates because this sprint did not change route rendering, persistence, finance/document behavior, deployment code, or serialized inventory lineage.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe error handling, domain-owned feedback, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for campaign action raw-error leakage across the touched campaign detail and wizard paths because source contracts now assert formatter usage and reject the older generic patterns. Medium for broader campaign maintainability because the wizard and detail panel are still large components with mixed state, action, and presentation concerns.
