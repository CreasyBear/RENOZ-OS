# Support Maintainer Sprint 61

This sprint follows Sprint 60's issue board read-state cleanup into issue template list read states. The target is the issue template management presenter: hard read failures should use the support-domain read-error formatter while preserving the existing stale-data warning owned by the settings route.

Status: Closed after Issue 1.

## Business Value

Issue templates make support intake faster and more consistent for recurring battery support cases. Template management should fail clearly and safely when reads are unavailable, without leaking internal read errors to operators.

## Workflow Spine

`/settings/issue-templates`
-> `IssueTemplatesSettingsPage`
-> `IssueTemplateList`
-> `useIssueTemplates`
-> `listIssueTemplates` server function and schema
-> issue template list database reads
-> `queryKeys.support.issueTemplatesListFiltered`
-> operator-safe hard-error and stale-data template states.

## Architecture Constraints

- Keep this sprint to issue template list read-state presentation.
- Do not change issue template filters, pagination, create/edit/delete/duplicate behavior, server functions, schemas, issue template SQL, query keys, cache policy, or mutation feedback.
- Preserve route-owned hard vs stale read-state classification.
- Use the support read-error helper introduced in Sprint 59.
- Serialized gates are not part of this slice's gate set; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. Issue Template List Safe Read Error

Problem:

- `IssueTemplateList` rendered `error.message` directly for hard template list failures.
- The settings route already separated hard errors from stale data, but the presenter did not use the support-domain read-error formatter.

Workflow protected:

Issue templates settings route -> template list presenter -> support issue-template hook -> issue-template server function/schema -> issue-template list query key -> operator-safe hard-error and stale-data states.

Implemented slice:

- Routed `IssueTemplateList` hard read-failure copy through `formatSupportReadError`.
- Updated the hard failure title to an operator-safe, specific template message.
- Added source contract coverage for issue template read-state behavior.

Out of scope:

- Issue template mutations and mutation feedback.
- Issue template server behavior.
- Issue template query/cache policy.
- Popular-template read-state presentation.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support issue template list presenter, settings issue-template route contract, support tests, support sprint evidence.
- Workflow protected: `/settings/issue-templates` -> `IssueTemplateList` -> `useIssueTemplates` -> `listIssueTemplates` -> `queryKeys.support.issueTemplatesListFiltered` -> operator-safe template read states.
- Business value protected: operators no longer see arbitrary template read error text and still keep stale template data visible through the existing route warning.
- Architecture standards checked: route owns hard vs stale classification; presenter owns hard-error display; hook normalization, server function, schema, database reads, query key policy, and mutations unchanged.
- Tenant isolation and data integrity checked: no organization predicate, issue-template read SQL, issue-template write path, support issue intake behavior, or permission boundary changed.
- Query/cache contract checked: issue template list still uses the centralized filtered issue-template query key with normalized read-error behavior.
- Smells removed: raw `error.message` display in issue template list; template hard-error copy drift from support read-error helper.
- Smells deferred: popular-template read-state presentation and browser visual QA remain future slices.
- Gates run: focused issue-template read-state, support read-error, and settings stale-data contracts, 3 files / 10 tests; full support unit suite, 62 files / 197 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this sprint changes hard-error copy/presentation with source/unit coverage, but no dev server was already running.
- Goal adaptations: declined. The Sprint 57 serialized-gate adaptation still applies; this slice does not touch those contracts.
- Residual risk: popular-template read-state presentation and browser visual QA remain future slices.
