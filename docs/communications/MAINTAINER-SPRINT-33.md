# Communications Maintainer Sprint 33

## Status

Closed in commit-ready state.

## Issue 1: Campaign Wizard Submit Orchestration Concentration

### Problem

Sprint 32 extracted the campaign wizard's pure model rules, but create/update submission still lived inside `CampaignWizard`. The component still owned mutation sequencing, scheduled-send branching, recipient population, send failure handling, submit-error formatting, and toast decisions. That kept business workflow control mixed into a large UI component and made future campaign changes harder to review safely.

### Workflow Spine

Communications campaign create/edit route
-> `CampaignWizard`
-> campaign wizard model defaults/validation
-> campaign wizard submit workflow
-> campaign mutation hooks
-> communications server functions
-> campaign/recipient persistence
-> query invalidation for campaign list/detail/recipients
-> operator confirmation, warning, error feedback, or submit error.

### Touched Domains

- Communications campaign wizard component.
- Communications campaign wizard submit workflow.
- Communications campaign wizard submit tests.
- Communications mutation feedback source contract tests.

### Business Value Protected

Campaign creation and editing are operator-facing workflows that can affect customer/dealer communication. Extracting the submit workflow makes the critical create/update/populate/send decision tree easier to test, easier to review, and less likely to regress when the wizard UI changes. Operators keep the same feedback behavior, but the code now exposes the campaign workflow as a campaign-owned boundary.

### Scope Constraints

- Do not change campaign route wiring, server functions, database schema, recipient persistence, sending, scheduling, or query invalidation.
- Do not redesign the wizard UI, alter step layout, or change field behavior.
- Do not broaden into campaign detail, analytics, inbox, scheduled calls, templates, or provider processing.
- Do not change tenant scope, inventory, finance, warranty, order, RMA, or serialized-stock behavior.

### Changes

- Added `campaign-wizard-submit.ts` with a campaign-local submit workflow boundary for:
  - invalid saved-template blocking
  - edit-mode update and recipient refresh
  - create-mode recipient population
  - scheduled campaign creation without immediate send
  - unscheduled campaign immediate send
  - operator-safe populate/send/create/update error formatting
- Updated `campaign-wizard.tsx` so the component delegates mutation sequencing to `submitCampaignWizard` and only renders returned feedback plus success closeout behavior.
- Added `campaign-wizard-submit.test.ts` to cover invalid template blocking, unscheduled create/send, scheduled create, population failure, send failure, edit-mode recipient refresh warning, and source boundary expectations.
- Updated the communications mutation error source contract so safe campaign formatter checks follow the extracted submit boundary.

### Standards Checked

- Domain ownership: campaign submit orchestration now lives beside the campaign wizard instead of inside the UI component body.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: the route, mutation hooks, server functions, schema/database writes, and query invalidation contracts are unchanged.
- Query/cache policy: no query keys, invalidation scopes, stale times, or cache semantics changed.
- Tenant isolation/data integrity: no tenant filters, server functions, write payload ownership, recipient persistence semantics, or database contracts changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: visible success/warning/error behavior is preserved through returned feedback and covered with focused tests. Raw provider/database errors remain behind campaign-owned formatter copy.
- Reviewability: the wizard dropped from 807 lines to 737 lines; create/update/populate/send sequencing now has a 230-line tested workflow boundary.

### Smells Removed

- Inline campaign submit mutation decision tree in a presentation component.
- Inline `let campaign` and `let populateResult` orchestration state inside `CampaignWizard`.
- Inline scheduled-send derivation inside the submit handler.
- Direct campaign mutation error formatter usage in the UI component.
- Untested branching around population failure, immediate send failure, scheduled create, and edit-mode recipient refresh.

### Deferred

- The wizard step presentation remains inside `campaign-wizard.tsx`. A later sprint can split details/template/recipient/preview panels if UI work needs that boundary.
- The create-and-send happy path still returns the existing two success feedback events. This preserves current behavior; a later product decision can collapse it to one operator message if desired.
- Campaign detail remains a large action/read-state surface and should be the next communications cleanup candidate.
- Browser QA is deferred because this sprint did not intentionally change markup, layout, or interactive controls.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-wizard-submit.test.ts tests/unit/communications/campaign-wizard-model.test.ts tests/unit/communications/communications-mutation-errors.test.ts` - 3 files, 26 tests.
- Passed: targeted ESLint for `campaign-wizard.tsx`, `campaign-wizard-model.ts`, `campaign-wizard-submit.ts`, `campaign-wizard-submit.test.ts`, `campaign-wizard-model.test.ts`, and `communications-mutation-errors.test.ts`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run test:unit` - 731 files, 2391 tests.
- Passed: `npm run build`.
- Passed: `git diff --check`.
- Skipped: browser QA, deploy, finance gates, and document gates because this sprint did not intentionally change visible markup, deployment code, financial/document behavior, persistence, or serialized inventory lineage.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, workflow-spine protection, operator-safe errors, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for campaign submit behavior because focused tests cover each extracted branch and the full unit/build gates pass. Medium for the broader communications campaign surface because `campaign-detail-panel.tsx` remains large and still combines action feedback, read-state behavior, and presentation concerns. Build warnings about large chunks and mixed Supabase client static/dynamic imports remain broader repo risks outside this sprint.
