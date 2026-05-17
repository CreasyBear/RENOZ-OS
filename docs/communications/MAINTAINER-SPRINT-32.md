# Communications Maintainer Sprint 32

## Status

Closed in commit-ready state.

## Issue 1: Campaign Wizard Model Concentration

### Problem

The campaign wizard still kept form defaults, template options, edit-mode form mapping, step validation, invalid-template policy, scheduled-send derivation, mutation orchestration, and all presentation in one file. Sprint 31 made action feedback safer, but the next change to the wizard would still require reading through a large mixed-concern component before touching a pure rule.

### Workflow Spine

Communications campaign create/edit route
-> `CampaignWizard`
-> campaign wizard model defaults/validation
-> campaign mutation hooks
-> communications server functions
-> campaign/recipient persistence
-> query invalidation for campaign list/detail/recipients
-> operator confirmation, toast, or submit error.

### Touched Domains

- Communications campaign wizard component.
- Communications campaign wizard model helpers.
- Communications campaign wizard model tests.

### Business Value Protected

Campaign setup is a customer-facing communications workflow. Moving pure wizard decisions into a tested campaign-owned model reduces the chance that future UI work breaks validation, scheduling, edit-mode hydration, or saved-template failure handling. It makes campaign creation safer to maintain without changing the operator flow.

### Scope Constraints

- Do not change campaign route wiring, mutations, server functions, database schema, recipient persistence, sending, scheduling, or query invalidation.
- Do not redesign the wizard UI or change copy/labels.
- Do not broaden into campaign analytics, inbox, scheduled calls, templates, or provider processing.

### Changes

- Extracted `campaign-wizard-model.ts` with:
  - campaign wizard form data shape
  - campaign template options
  - empty and edit-mode form builders
  - step validation
  - invalid saved-template policy
  - scheduled-send derivation
- Updated `campaign-wizard.tsx` to consume the campaign model instead of carrying those rules inline.
- Added `campaign-wizard-model.test.ts` to cover the extracted form defaults, edit mapping, validation, saved-template guard, scheduled-send derivation, and source boundary.

### Standards Checked

- Domain ownership: campaign wizard rules now live in a campaign-local model module beside the campaign UI.
- Route -> container/page -> hook -> server -> schema/database -> query/cache flow: the route and mutation hook flow is unchanged; only client-side wizard model decisions moved behind a tested boundary.
- Query/cache policy: no query keys, invalidations, stale times, or cache contracts changed.
- Tenant isolation/data integrity: no tenant filters, server functions, write payload ownership, or recipient persistence changed.
- Inventory/finance integrity: no inventory, warehouse, serialized stock, finance, invoice, order, warranty, or RMA state changed.
- Serialized lineage: not touched.
- UI states/error handling: visible wizard states and campaign action feedback are unchanged from Sprint 31; model validation and invalid-template policy are now directly tested.
- Reviewability: the wizard dropped from 925 lines to 807 lines, with 144 lines of pure model logic extracted and covered by focused tests.

### Smells Removed

- Inline campaign wizard form defaults and edit-mode mapping.
- Inline step validation rules.
- Inline template option list and saved-template invalidity check.
- Inline scheduled-send derivation.
- One untested pure-rule cluster inside a large UI/mutation component.

### Deferred

- Mutation orchestration still lives in the component. A later sprint can extract a campaign wizard submit workflow if the next campaign work touches create/update/populate/send sequencing.
- Step presentation remains inside the wizard. A later sprint can split details/template/recipient/preview panels if UI work needs that boundary.
- Browser QA is deferred because the UI markup and happy-path interaction flow were not intentionally changed.

### Gates

- Passed: `npm run test:vitest -- tests/unit/communications/campaign-wizard-model.test.ts tests/unit/communications/communications-mutation-errors.test.ts` - 2 files, 19 tests.
- Passed: `npm exec eslint src/components/domain/communications/campaigns/campaign-wizard.tsx src/components/domain/communications/campaigns/campaign-wizard-model.ts tests/unit/communications/campaign-wizard-model.test.ts tests/unit/communications/communications-mutation-errors.test.ts -- --report-unused-disable-directives`.
- Passed: `npm run typecheck`.
- Passed: `npm run lint:reliability`.
- Passed: `npm run lint`.
- Passed: `npm run test:unit` - 730 files, 2384 tests.
- Passed: `git diff --check`.
- Skipped: browser QA, production build, deploy, finance gates, and document gates because this sprint did not change visible markup intentionally, persistence, finance/document behavior, deployment code, or serialized inventory lineage.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain-local modularity, reviewable diffs, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for the extracted model decisions because focused unit tests cover defaults, edit mapping, validation, saved-template invalidity, scheduled-send behavior, and the component boundary. Medium for campaign wizard maintainability because mutation orchestration and step presentation are still in the component.
