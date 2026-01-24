# Full‑Stack Inputs Required (Atomized Plan Prereqs)

This document enumerates the full‑stack information required to produce an
atomized, phase‑by‑phase implementation plan. It is the checklist of “knowns”
we must lock before execution planning.

## 1) Core Schema Decisions
- Orders as invoice‑of‑record (finalized).
- Search indexing uses outbox (finalized).
- Portal model supports customer + subcontractor access (finalized).
- SLA ownership and reports ownership (confirm final owners).

## 2) Missing Schemas to Add
- Search: `search_index`, `search_index_outbox`, `recent_items`.
- Timeline: `unified_activities` (view or materialized view).
- Portal: `customer_portal_sessions`, magic‑link tokens, portal branding settings.
- Reports: `scheduled_reports`, `custom_reports`, `report_favorites`.
- Financial: `payment_reminder_settings`.
- Ops: `order_line_items.pick_status`, `picked_at`, `picked_by`.
- Sales: `opportunities.follow_up_date`.
- Field Tech: `job_time_entries.category`.

## 3) Data Types & Constraints
- Money: numeric(12,2) everywhere.
- Counts: integer everywhere.
- UUID PKs everywhere.
- Polymorphic allowlists (activities, custom fields, SLA).
- FK enforcement for cross‑domain references.

## 4) RLS & Security
- Org‑scoped policies on all tenant tables.
- Join‑only tables with explicit join‑policy rules.
- Customer portal policies (customer‑scoped).
- Subcontractor portal policies (job‑scoped).
- Field suppression rules (internal notes, cost/margin).

## 5) Analytics Layer
- Define MV schemas + refresh cadence.
- Metric catalog for `mv_*` (source tables, formulas).
- Ownership: reports domain; dashboard consumes.

## 6) Search & Indexing Flows
- Outbox event schema + status fields.
- Worker scheduling and retry policy.
- Reindex endpoints and admin access rules.

## 7) Timeline Flows
- Event capture sources (email history, orders, jobs, support).
- Unified activity types + mapping rules.
- Idempotency strategy for email webhooks.

## 8) Portal Flows
- Magic‑link token lifecycle (expiry, rate limits).
- Customer ↔ contact mapping rules.
- Subcontractor assignment model (job_assignment ↔ contractor).

## 9) API/Server Functions (Minimum Set)
- Search: global search, quick search, reindex, index status.
- Timeline: get customer timeline, log activity.
- Portal: request magic link, verify token, list quotes/orders/jobs/invoices, submit support ticket.
- Analytics: fetch KPI views, refresh MVs.
- Roles: follow‑up, reminders, approvals, picking workflows.

## 10) UI Routes & UX Contracts
- Cmd+K command palette.
- Customer portal routes and access flow.
- Role landing pages and dashboards.
- Timeline integration on customer detail.

## 11) Cron & Background Jobs
- Outbox worker (search indexing).
- Scheduled reports delivery.
- Reminder automation.
- MV refresh cadence.
- SLA breach checks.

## 12) Migration & Rollback Strategy
- Additive migrations only.
- Backfill then constrain.
- Keep deprecated columns one release.

## 13) Test & Verification
- RLS policy tests per role.
- Search performance (<500ms).
- Timeline API pagination + filters.
- Portal access control tests.
- Analytics accuracy regression tests.
