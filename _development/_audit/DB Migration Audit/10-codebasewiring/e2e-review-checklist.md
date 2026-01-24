# End‑to‑End Review Checklist

Use this before closing out implementation and wiring.

## Schema & Migrations
- [ ] All new tables exist in Drizzle schema with exports.
- [ ] Migrations created for all schema additions and indexes.
- [ ] FK constraints added for cross‑domain references.
- [ ] Money/count types normalized (numeric(12,2), integers).

## RLS & Security
- [ ] Org‑scoped policies on all tenant tables.
- [ ] Portal customer policies enforced.
- [ ] Subcontractor job‑scoped policies enforced.
- [ ] Polymorphic allowlists applied.

## Search
- [ ] `search_index`, `recent_items`, `search_index_outbox` present.
- [ ] Outbox helper wired into write paths.
- [ ] Outbox worker runs in `src/trigger/jobs`.
- [ ] Search API latency <500ms on seed data.

## Portal
- [ ] Magic‑link auth and session lifecycle complete.
- [ ] Field suppression verified (notes/costs hidden).
- [ ] Branding config stored per org.

## Analytics
- [ ] MVs created and refreshed.
- [ ] Metrics catalog documented.
- [ ] Refresh job runs on cadence.

## Timeline
- [ ] unified_activities view/MV exists.
- [ ] email event ingestion idempotent.

## Zod / API / Hooks
- [ ] Zod schemas exist for all new endpoints.
- [ ] Server functions call queries with org filters.
- [ ] Hooks and query keys exist for new endpoints.

## Jobs / Cron
- [ ] All jobs idempotent and retried.
- [ ] Jobs write to `activities`.

## Validation
- [ ] RLS tests pass.
- [ ] Search benchmarks pass.
- [ ] Migration readiness checklist updated.
