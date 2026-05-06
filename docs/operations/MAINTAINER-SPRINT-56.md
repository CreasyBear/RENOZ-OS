# Operations Maintainer Sprint 56: Organization Settings Mutation Feedback Safety

## Status

Closed in commit-ready state.

## Issue 1: Organization Settings Leaked Raw Mutation Errors

### Problem

Organization settings saves and logo changes used raw mutation error messages in toasts and inline UI. That made business-critical settings workflows vulnerable to provider, database, or stack details leaking into operator-facing feedback.

### Workflow Spine

Organization settings workflow
-> `/settings/organization`
-> `UnifiedSettingsContainer`
-> `GeneralSettingsSection`, `AddressSettingsSection`, `RegionalSettingsSection`, `FinancialSettingsSection`, `BrandingSettingsSection`
-> `useUpdateOrganization`, `useUpdateOrganizationSettings`, `useUpdateOrganizationBranding`, `useOrganizationLogoUpload`, `useRemoveOrganizationLogo`
-> `updateOrganization`, `updateOrganizationSettings`, `updateOrganizationBranding`, `uploadOrganizationLogoFile`, `removeOrganizationLogo`
-> `organizations` schema/database rows and organization logo storage path
-> `queryKeys.organizations.current()`, `settings()`, and `branding()`
-> safe mutation feedback and cache invalidation.

### Touched Domains

- Settings/organization.
- Organizations hooks.
- Organization branding/logo upload.
- Shared organization mutation feedback.
- Focused settings feedback tests.
- Operations maintainer closeout docs.

### Business Value Protected

RENOZ operators can update organization contact details, regional settings, financial defaults, portal branding, and logo assets without raw infrastructure errors surfacing in the UI. Company identity and operating defaults remain safer to manage as internal business workflows mature.

### Scope Constraints

- Do not change organization server behavior, schemas, database writes, storage path shape, permissions, validation rules, query key shape, cache invalidation, or form layout.
- Keep immediate logo upload/remove behavior and save-after-color/URL behavior unchanged.
- Limit the slice to domain-owned mutation feedback and focused contract coverage.

### Changes

- Added `formatOrganizationMutationError` and `formatOrganizationLogoMutationError`.
- Routed organization profile, settings, and branding mutation toast descriptions through the organization formatter.
- Routed logo upload and removal toast errors through the logo formatter.
- Replaced inline branding-section raw mutation messages with formatter-backed copy.
- Exported the organization feedback helpers through the organizations hook barrel.
- Added focused coverage for safe formatter behavior and the route/hook/server/query-key workflow spine.

### Standards Checked

- Domain ownership: organization mutation copy now lives with organization hooks instead of route/component-local raw error handling.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and preserved for organization settings and logo workflows.
- Tenant isolation/data integrity: unchanged. Server functions still use `ctx.organizationId` and existing `PERMISSIONS.organization.update` checks.
- Transactional inventory and finance integrity: not touched.
- UI states/error handling: strengthened. Logo inline errors and all organization settings mutation toasts now use operator-safe copy.
- Reviewability: the diff is limited to organization feedback formatting, hook wiring, one presenter helper, focused tests, and this closeout note.

### Smells Removed

- `error.message || 'Failed to update logo'`.
- `error.message || 'Failed to remove logo'`.
- Raw `error instanceof Error ? error.message : 'Please try again'` descriptions in organization mutation toasts.
- Raw `logoUpload.error?.message` and `removeLogo.error?.message` inline display.
- Missing organization-owned mutation feedback contract.

### Deferred

- Broader settings UI polish and field-level ergonomics remain separate product-quality slices.
- Legacy settings presenters with generic save failures remain outside this organization settings slice.
- Browser QA can be added when a future slice changes layout, keyboard behavior, or the actual upload interaction.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/settings/organization-settings-feedback-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice did not change organization server behavior, schema/database, storage behavior, query key shape, cache invalidation, form layout, inventory behavior, or financial behavior.
- Skipped: browser QA because this is a narrow feedback-safety contract change with no intended visual layout or interaction-flow change.

### Goal Adaptation

Accepted the user correction in operating practice: completed baseline work should not appear as routine skipped evidence. No change to the standing product-owner objective was needed because this slice is governed by operator-safe errors, domain ownership, mutation/cache contracts, tenant isolation checks, meaningful tests, and reviewable diffs.

### Residual Risk

Low. Organization settings mutation feedback is safer, but the broader settings surface still has older generic save flows that should be addressed through future domain-sliced work.
