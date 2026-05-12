# Communications Maintainer Sprint 29

## Status

Closed in commit-ready state.

## Issue 1: Legacy Campaign Hook Ownership

### Problem

The communications domain still had an unexported legacy `use-email-campaigns.ts` hook that duplicated campaign creation behavior already owned by `use-campaigns.ts`. The active campaign callers use `use-campaigns.ts`, whose create mutation refreshes the campaign family. The legacy hook was not exported from the communications barrel, but it still carried a `queryKeys.communications.all` invalidation and stale commentary about campaign/timeline refresh behavior.

### Workflow Spine

Campaign wizard or customer communications campaign action
-> communications barrel export
-> `use-campaigns.ts`
-> campaign server functions
-> campaign query key families
-> campaign list/detail/read-state surfaces.

### Touched Domains

- Communications campaign hook ownership.
- Communications barrel comment.
- Communications domain remediation contracts.

### Business Value Protected

Campaigns are customer communication and follow-up infrastructure for RENOZ operators. There should be one obvious campaign hook surface so future campaign fixes land in the active workflow instead of a dead legacy hook with broader cache behavior.

### Scope Constraints

- Do not change campaign server functions, schemas, campaign send/populate behavior, tenant predicates, recipient identity, read-state copy, mutation feedback, or UI flow.
- Do not change active campaign cache invalidation behavior beyond removing the unused legacy alternative.
- Keep this to hook ownership and source contract cleanup, not a broader communications cache audit.

### Changes

- Removed the unexported legacy `src/hooks/communications/use-email-campaigns.ts` hook.
- Updated the communications barrel comment so it no longer references the removed legacy module.
- Extended the communications domain-remediation contract to pin campaign hook ownership to `use-campaigns.ts`, reject `queryKeys.communications.all` inside the active campaign hook, and assert the legacy file stays absent.

### Standards Checked

- Domain ownership: campaign hooks are now owned by the active `use-campaigns.ts` module.
- Route -> container/page -> hook -> server flow: active campaign callers already route through `use-campaigns.ts`; no caller changed.
- Query/cache policy: the removed legacy hook no longer offers a communications-root invalidation path for campaign creation.
- Tenant isolation/data integrity: no server function, schema, query predicate, tenant filter, recipient query, or database write changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, support, or warranty persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: campaign read states, mutation feedback, and wizard/customer communications UI behavior are unchanged.
- Reviewability: the diff is limited to deleting the unused legacy hook, tightening the barrel comment, focused source contract coverage, and this closeout note.

### Smells Removed

- Duplicate unexported campaign creation hook.
- Dead communications-root invalidation path in legacy campaign creation.
- Barrel comment referencing a removed legacy hook pattern.

### Deferred

- Other communications cache families remain separate sprint candidates.
- Browser QA remains deferred because no runtime UI path or visual layout changed.
- A broader dead-code audit remains deferred to avoid turning this hook-ownership cleanup into unbounded cleanup.

### Gates

- Passed after one contract-driven fix: `./node_modules/.bin/vitest run tests/unit/communications/domain-remediation.test.ts tests/unit/communications/campaign-query-key-contract.test.tsx tests/unit/communications/query-normalization-wave4d.test.tsx` - 3 files, 19 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/communications/index.ts tests/unit/communications/domain-remediation.test.ts --report-unused-disable-directives`.
- Passed: targeted source scan showing `use-email-campaigns` and `queryKeys.communications.all` only in negative contract assertions.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, centralized query keys, safe mutation/cache contracts, meaningful tests, reviewable diffs, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Low for active campaign creation ownership because current callers use `use-campaigns.ts` and typecheck passed after deleting the legacy file. Broader communications cache cleanup remains open in other hooks and should continue as separate domain-sliced work.
