# Reliability Maintainer Sprint 3: Realtime Export Boundary

## Status

Closed in commit-ready state.

## Issue 1: Legacy Realtime Hooks Were Still Public

### Problem

The realtime barrel described org-scoped broadcast hooks as the production pattern, but it still exported unused legacy `postgres_changes` hooks and their generic subscription helper. Those legacy hooks subscribed directly to tables, used raw string query keys, did not require an organization channel, and conflicted with the current multi-tenant broadcast posture.

### Workflow Spine

Realtime hook import
-> `src/hooks/realtime/index.ts`
-> org-scoped broadcast hook
-> Supabase broadcast channel
-> explicit query-key families.

### Touched Domains

- Shared realtime hook exports.
- Shared realtime implementation comments.
- Reliability realtime export contract test.
- Reliability maintainer closeout docs.

### Business Value Protected

Live order, pipeline, and inventory screens are operational surfaces for fulfillment, sales, warehouse stock, and support decisions. Keeping the public realtime API aligned to org-scoped broadcast channels prevents future screens from reintroducing table-wide subscription and cache-key shortcuts.

### Scope Constraints

- Do not change the active broadcast hook behavior.
- Do not change notification copy, channel names, query-key arrays, or reconnect behavior in active realtime hooks.
- Do not introduce a new realtime abstraction.
- Keep the slice limited to retiring unused legacy exports and files.

### Changes

- Removed legacy `useRealtimeOrders`, `useRealtimeOrdersByStatus`, `useRealtimePipeline`, `useRealtimePipelineByStage`, `useRealtimeHotLeads`, and `useRealtimeSubscription` exports.
- Deleted the unused legacy `postgres_changes` hook files.
- Removed stale compatibility commentary from the broadcast hook file.
- Added a focused export contract proving the realtime barrel exposes only the broadcast hook families and that the deleted legacy files stay absent.

### Standards Checked

- Domain ownership: realtime infrastructure now exposes one production subscription posture.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged for active screens; imports resolve to broadcast hooks only.
- Tenant isolation/data integrity: improved API boundary by removing public direct-table subscription helpers that did not require an organization-scoped channel.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: active realtime status behavior unchanged.
- Query/cache contract: improved by removing raw string legacy query-key paths from the public realtime surface.
- Reviewability: bounded deletion plus one source contract and one closeout note.

### Smells Removed

- Public legacy `postgres_changes` realtime hooks beside the broadcast API.
- Generic direct-table subscription helper exported as an advanced realtime escape hatch.
- Stale compatibility comment in `use-realtime.ts`.
- Raw string cache-key arrays inside unused realtime hooks.

### Deferred

- Payload-derived realtime invalidation remains deferred; active broadcast hooks still accept static query-key families.
- Runtime browser smoke remains deferred because no active route behavior changed.
- A future schema/security audit can verify database realtime publication policy, but this slice only governs client imports.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/reliability/realtime-export-contract.test.ts tests/unit/orders/orders-realtime-cache-contract.test.ts tests/unit/inventory/inventory-realtime-cache-contract.test.ts tests/unit/pipeline/pipeline-realtime-cache-contract.test.ts`.
- Passed: `./node_modules/.bin/eslint src/hooks/realtime/index.ts src/hooks/realtime/use-realtime.ts tests/unit/reliability/realtime-export-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the standing maintainer goal by tightening a cross-domain API boundary before more realtime behavior work.

### Residual Risk

Low for app behavior because repo search showed no active imports of the legacy hooks outside the barrel and their own files. Moderate for unknown external consumers importing deleted internal files directly; this app does not expose those files as a stable package API.
