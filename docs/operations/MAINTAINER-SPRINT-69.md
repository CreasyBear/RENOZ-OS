# Operations Maintainer Sprint 69: Installer Profile Mutation Contracts

## Status

Closed in commit-ready state.

## Issue 1: Installer Profile Mutations Had Unsafe Feedback And Scattered Cache Policy

### Problem

Installer profile create, edit, and bulk status workflows are part of the field-operations control surface, but the UI still surfaced raw server errors and the hooks encoded cache invalidation separately per mutation. Profile updates could also target soft-deleted installers because the final update predicate did not include `deletedAt IS NULL`, and bulk status updates did not verify the final write count after the update.

### Workflow Spine

Installer management workflow
-> installers list page and installer detail page
-> `useCreateInstallerProfile`, `useUpdateInstallerProfile`, `useDeleteInstallerProfile`, `useUpdateInstallerStatusBatch`
-> `createInstallerProfile`, `updateInstallerProfile`, `deleteInstallerProfile`, `updateInstallerStatusBatch`
-> `installerProfiles`, `users`
-> `queryKeys.installers.*`
-> tenant-scoped installer profile mutations with safe feedback and directory/suggestion cache invalidation.

### Touched Domains

- Installer list route.
- Installer detail route.
- Jobs installer hooks.
- Installer server functions.
- Jobs mutation error formatting.
- Focused installer contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Installer profiles drive scheduling, workload planning, capacity warnings, and field-team availability. This slice keeps profile changes safer and clearer for operators managing the people who execute RENOZ Energy project work.

### Scope Constraints

- Do not redesign installer list/detail UI.
- Do not touch certification, skill, territory, or blockout mutation forms.
- Keep query key shapes unchanged.
- Keep installer profile create/update/bulk status business rules intact.
- Defer time-tracking project/job resolver work because that is a separate field-operations architecture slice.

### Changes

- Added `formatInstallerProfileMutationError` with action-specific create/update/delete/bulk-status fallbacks and safe server-code messages.
- Exported the installer profile mutation formatter through the jobs hook barrel.
- Replaced raw installer create, update, and bulk-status error feedback with safe formatter calls.
- Added a shared installer mutation invalidation helper for list/all-active and suggestion caches plus touched installer detail caches.
- Changed create/update/delete/bulk-status installer hooks to use the shared invalidation helper.
- Scoped installer profile update final writes to non-deleted profiles.
- Returned the deleted installer profile from soft delete so callers can invalidate the touched detail cache.
- Added a final bulk-status write-count check after the scoped update.
- Added focused contract coverage for safe feedback, cache policy, soft-delete predicates, batch final write verification, and removed raw feedback.

### Standards Checked

- Domain ownership: installer profile concerns remain inside installer routes, jobs installer hooks, installer server functions, and shared jobs mutation feedback.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for profile create, edit, delete, and bulk status paths.
- Tenant isolation/data integrity: preserved and strengthened. Profile mutations remain organization-scoped and updates now exclude soft-deleted profiles at final write time.
- Safe mutation/cache contracts: strengthened. Installer profile mutations now share one invalidation helper for directory and suggestion surfaces.
- Honest UI states: read-state behavior was preserved; mutation failure feedback is safer and action-specific.
- Transactional inventory and finance integrity: not touched; this slice does not mutate stock, costs, invoices, or payments.
- Reviewability: the diff is limited to installer profile mutation contracts, one formatter extension, one focused test, and this closeout note.

### Smells Removed

- Raw installer create/update/bulk-status error feedback.
- Repeated installer mutation cache invalidation logic.
- Profile updates that could target soft-deleted installers.
- Bulk status final writes without post-update count verification.
- Soft delete returning only `{ success: true }`, leaving hooks without touched installer identity.

### Deferred

- Certification, skill, territory, and blockout mutation forms still deserve their own safe-feedback/resource-contract sweep.
- Installer assignment eligibility and organization-membership policy remains a separate scheduling integrity slice.
- Project time tracking has a larger project-id vs legacy-job-id resolver issue and should not be mixed into this installer profile commit.
- Browser QA remains a follow-up if installer list/detail interactions are visually or behaviorally changed.

### Gates

- Passed: `bun test tests/unit/jobs/installer-profile-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/installer-profile-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4b-admin.test.tsx` - 2 files, 11 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice is a focused installer mutation contract change covered by targeted tests plus type/lint gates.
- Skipped: browser QA because no layout or successful interaction flow was redesigned; mutation feedback, predicates, and cache policy are covered by focused tests.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, safe mutation/cache contracts, tenant isolation, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Medium. Installer profile mutations are cleaner, but related installer resource mutations and scheduling eligibility rules remain important follow-up slices.
