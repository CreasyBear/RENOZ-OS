# Sprint Plan — DB Implementation (Atomized)

This plan breaks the database and supporting full‑stack work into **atomic, testable tasks**.
Each task has a clear validation step. Sprints build on prior work. Timeline features are excluded.

## Sprint 0 — Guardrails & Foundations

Goal: lock foundational decisions, test harness, and migration safety.

### Tasks
1. **Lock core decisions in docs**
   - Update `idealized-schema.md` + `rationalized-db-design.md` (already aligned).
   - Validation: docs updated and reviewed.
2. **Define DB change policy**
   - Add migration rules (additive, backfill, constraint enforcement).
   - Validation: `migration-readiness.md` updated.
3. **Create RLS test harness**
   - Add lightweight DB policy tests (org/user scope).
   - Validation: tests pass or scripted query validation exists.
4. **Add search outbox worker contract**
   - Define job interface and idempotency rules.
   - Validation: documented contract in `functions-and-crons.md`.

### Sprint 0 Review
- Decision docs locked.
- RLS test harness in place.
- Migration policy confirmed.

---

## Domain Rationalization (from 02‑domains Audits)

These are **domain-level schema corrections** discovered in `01-domains/*` audits that
must be explicitly implemented. This is the missing bridge between domain audits and
the implementation plan.

### Domain Rationalization Tasks (Atomic)
- **DR-T01** Add missing FKs in Support `issues` (`customerId`, `assignedToUserId`, `slaTrackingId`).
  - Files: `drizzle/schema/support/issues.ts` + migration.
  - Validation: invalid references rejected.
- **DR-T02** Add `warranty_claims.issueId` linkage.
  - Files: `drizzle/schema/warranty/warranty-claims.ts` + migration.
  - Validation: FK enforced.
- **DR-T03** Fix `statement_history` count columns to integer types.
  - Files: `drizzle/schema/financial/statement-history.ts` + migration.
  - Validation: data preserved; types updated.
- **DR-T04** Enforce `data_exports.entities` non‑empty array constraint.
  - Files: `drizzle/schema/settings/data-exports.ts` + migration check constraint.
  - Validation: empty array rejected.
- **DR-T05** Add dashboard/reports schemas missing in Drizzle (tables + MVs).
  - Files: `drizzle/schema/reports/*`, MV SQL migrations.
  - Validation: migrations apply; MVs refresh.
- **DR-T06** Standardize invoice vs order references (financial tables use `orderId`).
  - Files: `drizzle/schema/financial/*` + docs update.
  - Validation: no lingering `invoiceId` fields.
- **DR-T07** Add `opportunities.follow_up_date` (sales).
  - Files: `drizzle/schema/pipeline/pipeline.ts` + migration.
  - Validation: index exists.
- **DR-T08** Add `job_time_entries.category` (field tech).
  - Files: `drizzle/schema/jobs/job-time-entries.ts` + migration.
  - Validation: enum/check enforced.
- **DR-T09** Add `order_line_items.pick_status` fields (operations).
  - Files: `drizzle/schema/orders/order-line-items.ts` + migration.
  - Validation: update persists.
- **DR-T10** Add `search_index` + `recent_items` (search PRD).
  - Files: `drizzle/schema/search-*.ts` + migrations.
  - Validation: indexes + RLS present.
- **DR-T11** Add `unified_activities` view/MV (timeline PRD).
  - Files: migration SQL.
  - Validation: query returns unified events.
- **DR-T12** Add portal session schema + customer‑scoped RLS (portal PRD).
  - Files: `drizzle/schema/customer-portal-sessions.ts` + policies.
  - Validation: portal access isolated.

### Where This Fits
- DR tasks map directly to Sprints 1–5 in this plan and should be executed in
  those sprints alongside their related features.

---

## Sprint 1 — Cross‑Domain Infrastructure (Search + Recent Items)

Goal: build search schema and indexing pipeline.

### Tasks
1. **Add `search_index` table (PRD‑level schema)**
   - Files: `drizzle/schema/search-index.ts`, export in `drizzle/schema/index.ts`.
   - Columns: `organizationId`, `entityType`, `entityId`, `title`, `subtitle`, `description`,
     `url`, `searchText`, `rankBoost`, `metadata`, `createdAt`, `updatedAt`.
   - Indexes: GIN on `to_tsvector(searchText)`; unique `(organizationId, entityType, entityId)`;
     `(organizationId, entityType)`; `(organizationId, updatedAt)`.
   - Validation: FK to `organizations` enforced; migration applies; indexes present.
2. **Add `recent_items` table (PRD‑level schema)**
   - Files: `drizzle/schema/recent-items.ts`.
   - Columns: `organizationId`, `userId`, `entityType`, `entityId`, `title`, `subtitle`, `url`,
     `lastAccessedAt`, `createdAt`, `updatedAt`.
   - Constraints: unique `(organizationId, userId, entityType, entityId)`.
   - Indexes: `(organizationId, userId)`; `(organizationId, lastAccessedAt)`.
   - Validation: trigger or cleanup keeps max 50 per user.
3. **Add `search_index_outbox` table**
   - Files: `drizzle/schema/search-index-outbox.ts`.
   - Columns: `organizationId`, `entityType`, `entityId`, `action`, `payload`, `status`,
     `retryCount`, `lastError`, `processedAt`, `createdAt`, `updatedAt`.
   - Validation: FK to `organizations` enforced; insert + status transitions.
4. **Add migrations for search tables + indexes**
   - Files: `drizzle/migrations/*_search*.sql`.
   - Validation: `db:push` succeeds.
5. **Add RLS policies for `search_index` and `recent_items`**
   - Scope: org + user (recent_items).
   - Validation: RLS tests or SQL scripts pass.
6. **Add outbox writer helper (MVP trigger or app hook)**
   - Files: `src/server/functions/_shared/search-index-outbox.ts`.
   - Target entities: customers, orders, jobs, quotes.
   - Validation: outbox rows created on insert/update/delete.
7. **Add outbox worker job (batch + retry)**
   - Files: `src/server/jobs/search-index-outbox.ts` (or equivalent).
   - Validation: outbox processed and cleared; retries increment.
8. **Add search APIs**
   - Files: `src/server/functions/search/search.ts`, `src/lib/schemas/search/search.ts`.
   - Endpoints: `globalSearch`, `quickSearch`, `reindex`, `indexStatus`.
   - Validation: benchmark <500ms on seed data.
9. **Add recent items APIs**
   - Files: `src/server/functions/search/search.ts`.
   - Validation: list + track pass; max‑50 enforced.
10. **Add tests**
   - Files: `tests/unit/search/*.spec.ts` or SQL verification script.
   - Validation: tests pass.

### Sprint 1 Review
- Search index + outbox stable.
- Recent items operational.
- Search API validated.

---

## Sprint 2 — Portal Foundations (Supabase Auth + Scoped Access)

Goal: enable portal access using Supabase Auth magic links while enforcing strict customer/subcontractor scoping in RLS.

### Tasks
1. **Add portal identity map (Supabase Auth user → portal scope)**
   - Files: `drizzle/schema/portal/portal-identities.ts`, export in `drizzle/schema/portal/index.ts` and `drizzle/schema/index.ts`.
   - Enums (add to `_shared/enums.ts`): `portalScopeEnum` = `customer | subcontractor`, `portalIdentityStatusEnum` = `active | revoked | disabled`.
   - Columns:
     - `organizationId` (FK → `organizations.id`, onDelete: `cascade`)
     - `authUserId` (Supabase `auth.users.id`, UUID, no FK)
     - `scope` (enum)
     - `status` (enum, default `active`)
     - `customerId` (FK → `customers.id`, onDelete: `set null`)
     - `contactId` (FK → `contacts.id`, onDelete: `set null`)
     - `jobAssignmentId` (FK → `job_assignments.id`, onDelete: `set null`)
     - `lastSeenAt`, `revokedAt`, `createdAt`, `updatedAt`
   - Constraints:
     - If `scope = 'customer'` → `customerId` is NOT NULL and `jobAssignmentId` IS NULL.
     - If `scope = 'subcontractor'` → `jobAssignmentId` is NOT NULL.
   - Indexes:
     - unique `(organizationId, authUserId)`
     - `(organizationId, scope, customerId)`
     - `(organizationId, scope, jobAssignmentId)`
   - Validation: insert + lookup by `authUserId`; invalid scope/id combos rejected.
   - Note: `customer_portal_sessions` remains legacy; new portal access uses `portal_identities`.
2. **Supabase Auth magic‑link flow (portal users)**
   - Use Supabase Auth OTP/magic‑link; no custom token table.
   - Client flow uses `src/lib/supabase/client.ts` or server uses admin link creation with `SUPABASE_SERVICE_ROLE_KEY`.
   - Validation: magic‑link establishes Supabase session; expired link rejected.
3. **Add portal auth endpoints (Supabase session aware)**
   - Files: `src/server/functions/portal-auth.ts`, Zod schemas in `src/lib/schemas/portal/auth.ts`.
   - Endpoints:
     - `requestPortalLink` (admin‑only): create or update portal identity + request magic link.
     - `getPortalIdentity` (portal user): resolves `auth.uid()` → portal identity + org context.
     - `revokePortalAccess` (admin‑only): set status `revoked` + `revokedAt`.
   - Validation: request link creates identity; revoked access blocks portal reads.
4. **Add portal branding storage**
   - Option A: `organizations.settings.portalBranding` (JSONB).
   - Option B: `portal_branding` table (org‑scoped).
   - Validation: read/write config per org.
5. **Add portal RLS policies (customer scope)**
   - Orders/quotes/jobs/invoices view must enforce:
     - `EXISTS` portal identity with `auth.uid()` and `status = 'active'`
     - `scope = 'customer'` AND `portal_identities.customer_id = <entity>.customer_id`
   - Validation: portal user only sees their customer data.
6. **Add subcontractor scope rules**
   - Jobs: `scope = 'subcontractor'` AND `portal_identities.job_assignment_id = job_assignments.id`
   - Orders: allow if `job_assignments.order_id = orders.id` for that portal identity
   - Validation: subcontractor sees only assigned job + related order basics.
7. **Define portal field suppression contract**
   - Orders: exclude `internalNotes`, `auditColumns`, `xero*`, `deletedAt`
   - Job assignments: exclude `internalNotes`, `auditColumns`, `signOffToken`, `confirmationToken`
   - Line items: exclude `notes` when scope = `subcontractor` (if internal)
   - Validation: API responses omit suppressed fields.

### Sprint 2 Review
- Portal auth stable.
- Customer/subcontractor scoping enforced.
- Branding stored safely.

### Sprint 2 Limitations (Non‑core)
- Portal UI is minimal and intended only for validation, not production UX.
- Portal read APIs must remain the only data access path to guarantee field suppression.
- Rate limiting is in‑memory; multi‑instance deployments need Redis or equivalent.
- Supabase magic‑link admin API behavior is a dependency and should be validated in the target environment.

---

## Sprint 3 — Role‑Driven Schema Enhancements

Goal: schema changes required by roles and core flows.

### Tasks
1. **Add `opportunities.follow_up_date`**
   - Files: `drizzle/schema/pipeline/opportunities.ts`.
   - Index: `(organizationId, followUpDate)`.
   - Validation: migration + query.
2. **Add `job_time_entries.category`**
   - Files: `drizzle/schema/jobs/job-time-entries.ts`.
   - Enum: `work|travel|break` or check constraint.
   - Validation: insert works for each category only.
3. **Add pick/pack fields to `order_line_items`**
   - Files: `drizzle/schema/orders/order-line-items.ts`.
   - Fields: `pickStatus`, `pickedAt`, `pickedBy`.
   - Validation: update persists; defaults null.
4. **Add `payment_reminder_settings`**
   - Files: `drizzle/schema/financial/payment-reminder-settings.ts`.
   - FK to `reminder_templates`.
   - Validation: CRUD + FK enforcement.
5. **Add missing FK constraints**
   - Files: `drizzle/schema/support/issues.ts`, `warranty_claims.ts`,
     `return-authorizations.ts`.
   - Validation: invalid references rejected.

### Sprint 3 Review
- All role-driven schema changes live.
- FK integrity improved.

---

## Sprint 4 — Analytics Layer (Dashboards + Reports)

Goal: canonical metrics via materialized views and reports tables.

### Tasks
1. **Add reports tables (PRD‑level schema)**
   - Files: `drizzle/schema/reports/scheduled-reports.ts`,
     `custom-reports.ts`, `report-favorites.ts`.
   - Constraints: org/user scoping; unique favorites per user/report.
   - Validation: CRUD + RLS tests.
2. **Create MV `mv_daily_metrics`**
   - SQL: migration file; includes `organizationId`, date bucket, revenue, orders, quotes, issues.
   - Validation: refresh + row count.
3. **Create MV `mv_daily_pipeline`**
   - SQL: pipeline totals by stage.
   - Validation: refresh + row count.
4. **Create MV `mv_daily_jobs`**
   - SQL: job completion + SLA by day.
   - Validation: refresh + row count.
5. **Create MV `mv_daily_warranty`**
   - SQL: claim counts by status/day.
   - Validation: refresh + row count.
6. **Create MV `mv_current_state`**
   - SQL: latest snapshot for dashboards.
   - Validation: refresh + row count.
7. **Add MV indexes**
   - `(organizationId, day)` or `(organizationId, createdAt)` as appropriate.
   - Validation: index exists.
8. **Define metric catalog**
   - File: `07-idealized-db/metric-catalog.md`.
   - Validation: metrics + formulas documented.
9. **Create MV refresh job**
   - Files: `src/server/jobs/refresh-analytics.ts`.
   - Validation: scheduled refresh runs.

### Sprint 4 Review
- Analytics tables + MVs usable.
- Refresh pipeline stable.

---

## Sprint 5 — Timeline Aggregation (Non‑UI)

Goal: unify activities without duplicating data.

### Tasks
1. **Create `unified_activities` view or MV**
   - Files: migration SQL for view/MV.
   - Columns: `organizationId`, `customerId`, `entityType`, `entityId`,
     `activityType`, `title`, `description`, `createdAt`, `createdBy`.
   - Validation: query returns merged events.
2. **Add activity type enum + allowlist**
   - Files: `drizzle/schema/_shared/enums.ts`.
   - Validation: invalid activityType rejected.
3. **Add indexes for timeline**
   - `(organizationId, customerId, createdAt DESC)` and `(organizationId, activityType, createdAt DESC)`.
   - Validation: index exists + explain plan.
4. **Add email event ingestion mapping**
   - Files: `src/server/functions/email-events.ts` (or integration handler).
   - Validation: idempotent insert on duplicate webhook.

### Sprint 5 Review
- Unified timeline backend ready.
- Idempotent ingestion validated.

---

## Sprint 6 — RLS Hardening & Security

Goal: enforce cross‑domain policies and reduce leakage risk.

### Tasks
1. **Implement join‑policy checklist**
   - Apply to join-only tables.
   - Validation: policy tests for each join table.
2. **Enforce polymorphic allowlists**
   - DB constraint + app layer validation.
   - Validation: invalid entityType rejected.
3. **Field suppression rules**
   - Internal notes, cost/margin hidden for portal and subcontractors.
   - Validation: API response tests.

### Sprint 6 Review
- RLS coverage complete.
- Policy tests pass.

---

## Sprint 7 — Data Type Normalization

Goal: eliminate inconsistent types early.

### Tasks
1. **Convert count fields to integer**
   - `statement_history` counts.
   - Validation: data migration scripts run and values preserved.
2. **Standardize currency columns**
   - numeric(12,2) everywhere.
   - Validation: schema diff + tests.

### Sprint 7 Review
- Types normalized.
- No precision regressions.

---

## Sprint 8 — Operational Review & Cleanup

Goal: validate performance and readiness.

### Tasks
1. **Query performance audit**
   - Validate indexes against query patterns.
   - Validation: explain plan notes.
2. **Search latency check**
   - Confirm <500ms for typical queries.
   - Validation: simple benchmark log.
3. **Migration readiness review**
   - Update `migration-readiness.md`.
   - Validation: all checklist items passed.

### Sprint 8 Review
- System performance acceptable.
- Migration readiness complete.

---

## Sprint 9 — Consistency, Ownership & Integrity Cleanup

Goal: resolve remaining cross‑domain inconsistencies so the DB is clean and intuitive.

### Tasks
1. **Audit logs strategy (table vs activities)**
   - Decide canonical storage and update docs.
   - Validation: decision recorded + referenced in settings/users/support audits.
2. **Business hours / holidays ownership**
   - Canonicalize `business_hours`/`holidays` in settings vs support SLA.
   - Validation: single source of truth; naming documented and schema aligned.
3. **Reports/Dashboard ownership conflicts**
   - Clarify `scheduledReports` ownership and remove duplicates.
   - Validation: single schema definition + docs updated.
4. **Report favorites storage**
   - Decide `report_favorites` table vs `user_preferences` JSON.
   - Validation: chosen storage implemented and documented.
5. **PRD constraints enforcement**
   - Add constraint for `purchase_order_items.line_total = quantity * unit_price` (or generated column).
   - Validation: invalid inserts rejected.
6. **Supplier rating formula**
   - Enforce `overallRating` rule (generated column, view, or trigger).
   - Validation: values auto‑derived and not user‑editable.
7. **DESC index ordering**
   - Add explicit DESC ordering where PRDs expect it (analytics + timeline).
   - Validation: index definitions include DESC.
8. **Uniqueness enforcement**
   - Ensure PRD‑intended uniqueness (e.g., campaign recipients).
   - Validation: duplicates rejected.
9. **Nomenclature alignment**
   - Map/rename `issue_feedback` ↔ `csat_responses` and other mismatches.
   - Validation: docs + schema reflect canonical names.
10. **Optional comms FKs**
   - Add/confirm `email_history.campaignId/templateId` FKs if PRD requires.
   - Validation: FK constraints enforced or explicitly documented as intentional.

### Sprint 9 Review
- Ownership conflicts resolved.
- Constraints and naming are consistent.

---

## Definition of Done (Global)

For every task in this plan:
- **Schema changes**: migration applies cleanly; rollback path documented.
- **RLS changes**: policy tests or scripted verification queries pass.
- **APIs**: request/response schemas validated with Zod; error paths tested.
- **Jobs/Cron**: idempotent behavior verified; retry behavior documented.
- **Docs**: affected specs updated in `/07-idealized-db/` or `/06-rationalization/`.

---

## Atomic Task Breakdown (Sprint‑by‑Sprint)

### Sprint 0 — Guardrails & Foundations (Atomic Tasks)
- **S0-T01** Update `idealized-schema.md` decisions block to final state.
  - Validation: diff shows orders decision + outbox indexing + portal scope.
- **S0-T02** Update `rationalized-db-design.md` to match final decisions.
  - Validation: diff shows updated cross-domain truths.
- **S0-T03** Add migration policy note to `migration-readiness.md`.
  - Validation: checklist includes additive/backfill/constraint steps.
- **S0-T04** Create RLS test file(s) scaffolding (even if stubbed).
  - Validation: test file exists with TODOs + sample policy test.
- **S0-T05** Document outbox worker contract in `functions-and-crons.md`.
  - Validation: outbox worker section exists with retry/idempotency notes.
- **S0-T06** Add global server function middleware plan (auth/logging/context).
  - Validation: `10-codebasewiring/design-patterns.md` includes middleware guidance.
- **S0-T07** Standardize typed server function usage plan.
  - Validation: `design-patterns.md` calls out `typedGetFn`/`typedPostFn` adoption.
- **S0-T08** Define query key discipline rule (central `queryKeys`).
  - Validation: `design-patterns.md` includes rule + enforcement note.
- **S0-T09** Define error handling contract (use `ServerError` subclasses).
  - Validation: `design-patterns.md` includes rule + example reference.
- **S0-T10** Add JSONB typing guideline (no index signatures).
  - Validation: `design-patterns.md` or `techContext` note added.
- **S0-T11** Add migration rollout template (add → backfill → constrain).
  - Validation: `migration-readiness.md` includes rollout template.

**Success criteria (Sprint 0)**
- Patterns doc updated with middleware, typed server fns, query keys, errors, JSONB rules.
- RLS scaffolding exists and is referenced in plan.
- Migration rollout template documented and referenced.

### Sprint 1 — Search Infrastructure (Atomic Tasks)
- **S1-T01** Add Drizzle schema file for `search_index`.
  - Validation: `drizzle/schema/search-index.ts` created; types exported; org FK present.
- **S1-T02** Add Drizzle schema file for `recent_items`.
  - Validation: `drizzle/schema/recent-items.ts` created; types exported; org FK present.
- **S1-T03** Add Drizzle schema file for `search_index_outbox`.
  - Validation: `drizzle/schema/search-index-outbox.ts` created; types exported; org FK present.
- **S1-T04** Add migration for tables + indexes (GIN + unique composite).
  - Validation: migration file runs locally.
- **S1-T05** Add RLS policies for `search_index` + `recent_items`.
  - Validation: org/user scoped select passes; cross‑org blocked.
- **S1-T06** Add shared outbox helper (mandatory).
  - Files: `src/server/functions/_shared/search-index-outbox.ts`.
  - Validation: unit test for enqueue + retry behavior.
- **S1-T07** Add MVP outbox write hook for customers/orders/jobs/quotes.
  - Validation: insert creates outbox row.
- **S1-T08** Add outbox worker job (batch + retry).
  - Files: `src/trigger/jobs/search-index-outbox.ts`.
  - Validation: outbox row processed and status updated.
- **S1-T09** Add global search API.
  - Validation: returns ranked results <500ms on seed data.
- **S1-T10** Add recent items API.
  - Validation: list + track endpoints pass.
- **S1-T11** Add test coverage for search APIs + RLS.
  - Validation: tests pass or scripted SQL verification saved.

**Success criteria (Sprint 1)**
- Search tables + outbox exist with RLS and indexes.
- Outbox worker processes rows idempotently.
- Search API returns ranked results with latency target met.

### Sprint 2 — Portal Foundations (Atomic Tasks)
- **S2-T01** Add `portal_identities` schema + enums + migration.
  - Validation: insert + lookup by `authUserId` works; scope constraints enforced.
- **S2-T02** Configure Supabase magic‑link flow for portal users (no custom token table).
  - Validation: Supabase session established; expired link rejected.
- **S2-T03** Add portal auth endpoints (request/get/revoke with Supabase session).
  - Validation: portal identity resolves; revoked access blocked.
- **S2-T04** Add portal RLS policies (customer‑scoped via portal identity map).
  - Validation: portal user can only read own customer data.
- **S2-T05** Add subcontractor scope rules (job‑assignment scoped via portal identity map).
  - Validation: subcontractor sees only assigned jobs + related order basics.
- **S2-T06** Add portal branding storage (settings JSONB or table).
  - Validation: branding config read/write works.
- **S2-T07** Add portal field suppression contract + tests.
  - Validation: API response tests exclude suppressed fields.
- **S2-T08** Add portal RLS test harness.
  - Files: `tests/unit/rls/portal/*.spec.ts` (or scripted SQL).
  - Validation: RLS tests pass.

**Success criteria (Sprint 2)**
- Portal auth flow works with expiring tokens.
- Customer/subcontractor scoping enforced by RLS.
- Sensitive fields suppressed in portal responses.

### Sprint 3 — Role‑Driven Schema Enhancements (Atomic Tasks)
- **S3-T01** Add `opportunities.follow_up_date` + index migration.
  - Validation: migration applies; index exists.
- **S3-T02** Add `job_time_entries.category` + enum/check.
  - Validation: insert works for work/travel/break only.
- **S3-T03** Add picking fields to `order_line_items`.
  - Validation: update persists; null defaults.
- **S3-T04** Add `payment_reminder_settings` table + FK to templates.
  - Validation: FK enforced; CRUD tests pass.
- **S3-T05** Add missing FK constraints (support/warranty).
  - Validation: invalid references rejected.

**Success criteria (Sprint 3)**
- Role‑driven fields exist with indexes/checks.
- FK coverage improved for support/warranty domains.

### Sprint 4 — Analytics Layer (Atomic Tasks)
- **S4-T01** Add reports tables + migrations.
  - Validation: CRUD + RLS checks.
- **S4-T02** Define MV SQL for `mv_daily_metrics`.
  - Validation: refresh succeeds; rows returned.
- **S4-T03** Define MV SQL for `mv_daily_pipeline`.
  - Validation: refresh succeeds; rows returned.
- **S4-T04** Define MV SQL for `mv_daily_jobs`.
  - Validation: refresh succeeds; rows returned.
- **S4-T05** Define MV SQL for `mv_daily_warranty`.
  - Validation: refresh succeeds; rows returned.
- **S4-T06** Define MV SQL for `mv_current_state`.
  - Validation: refresh succeeds; rows returned.
- **S4-T07** Add MV indexes (orgId + date).
  - Validation: indexes exist in schema.
- **S4-T08** Add MV refresh job (cron).
  - Files: `src/trigger/jobs/refresh-analytics.ts`.
  - Validation: job runs locally or script proves refresh.
- **S4-T09** Create metric catalog doc.
  - Validation: metrics documented with source tables.

**Success criteria (Sprint 4)**
- MV definitions refresh without errors.
- Analytics job runs on schedule with logs.
- Metric catalog aligns MVs to source tables.

### Sprint 5 — Timeline Aggregation (Non‑UI)
- **S5-T01** Add `unified_activities` view (or MV).
  - Validation: query returns merged events.
- **S5-T02** Add activityType enum or constraint.
  - Validation: invalid activityType rejected.
- **S5-T03** Add timeline indexes.
  - Validation: `(orgId, customerId, createdAt DESC)` exists.
- **S5-T04** Add email event ingestion mapping.
  - Validation: webhook event creates activity once.

**Success criteria (Sprint 5)**
- Unified timeline query returns merged events.
- Activity type constraints enforced.

### Sprint 6 — RLS Hardening (Atomic Tasks)
- **S6-T01** Implement join‑policy checklist across join‑only tables.
  - Validation: RLS tests per join table pass.
- **S6-T02** Implement polymorphic allowlist constraints.
  - Validation: invalid `entityType` rejected.
- **S6-T03** Add portal field suppression tests.
  - Validation: responses omit internal fields.

**Success criteria (Sprint 6)**
- Join‑table RLS policies validated with tests.
- Polymorphic allowlists enforced at DB/app layers.

### Sprint 7 — Type Normalization (Atomic Tasks)
- **S7-T01** Migrate count fields to integer.
  - Validation: counts preserved after migration.
- **S7-T02** Normalize currency precision.
  - Validation: schema diff shows numeric(12,2) everywhere.

**Success criteria (Sprint 7)**
- Count/currency types normalized across schema.

### Sprint 8 — Operational Review (Atomic Tasks)
- **S8-T01** Run query explain audit for hot paths.
  - Validation: explain plan doc saved.
- **S8-T02** Run search latency benchmark.
  - Validation: benchmark log saved.
- **S8-T03** Update `migration-readiness.md`.
  - Validation: all checklist items marked pass.

**Success criteria (Sprint 8)**
- Explain/latency audits completed and saved.
- Migration readiness checklist passes.

### Sprint 9 — Consistency & Ownership Cleanup (Atomic Tasks)
- **S9-T01** Decide audit log storage (table vs activities) and document.
  - Validation: decision recorded in `07-idealized-db/rls-and-security.md` + audits.
- **S9-T02** Implement chosen audit log storage.
  - Validation: insert/query works; RLS enforced.
- **S9-T03** Canonicalize `business_hours`/`holidays` ownership.
  - Validation: single schema source + docs updated.
- **S9-T04** Resolve `scheduledReports` ownership conflict.
  - Validation: only one schema definition remains; exports updated.
- **S9-T05** Decide report favorites storage (table vs JSON).
  - Validation: chosen path implemented + documented.
- **S9-T06** Enforce `purchase_order_items.line_total` formula.
  - Validation: invalid insert rejected or generated column used.
- **S9-T07** Enforce supplier `overallRating` formula.
  - Validation: derived and non‑editable.
- **S9-T08** Add PRD‑required DESC indexes.
  - Validation: index definitions include DESC.
- **S9-T09** Enforce PRD uniqueness constraints (e.g., campaign recipients).
  - Validation: duplicates rejected.
- **S9-T10** Align naming (`issue_feedback` ↔ `csat_responses`, etc).
  - Validation: docs + schema reflect canonical names.
- **S9-T11** Add/confirm comms FKs (`email_history.campaignId/templateId`).
  - Validation: FK constraints enforced or documented as intentional omission.

**Success criteria (Sprint 9)**
- Ownership conflicts resolved and documented.
- Consistency constraints enforced across domains.

### Sprint Review Tasks (Atomic)
- **SR-T01** Review Sprint 0 outputs (docs + RLS scaffold + migration policy).
  - Validation: `10-codebasewiring/e2e-review-checklist.md` updated.
- **SR-T02** Review Sprint 1 outputs (search schema, RLS, outbox, APIs).
  - Validation: checklist updated with search section.
- **SR-T03** Review Sprint 2 outputs (portal auth, RLS, suppression).
  - Validation: checklist updated with portal section.
- **SR-T04** Review Sprint 3 outputs (role-driven schema + FKs).
  - Validation: checklist updated with role schema section.
- **SR-T05** Review Sprint 4 outputs (reports + MVs + jobs).
  - Validation: checklist updated with analytics section.
- **SR-T06** Review Sprint 5 outputs (timeline aggregation).
  - Validation: checklist updated with timeline section.
- **SR-T07** Review Sprint 6 outputs (RLS hardening).
  - Validation: checklist updated with RLS section.
- **SR-T08** Review Sprint 7 outputs (type normalization).
  - Validation: checklist updated with types section.
- **SR-T09** Review Sprint 8 outputs (performance + readiness).
  - Validation: checklist updated with ops section.
- **SR-T10** Review Sprint 9 outputs (ownership + constraints).
  - Validation: checklist updated with consistency section.

---

## Task Tracker (Atomic)

| Task ID | Sprint | Task (Explicit) | Validation | Status |
| --- | --- | --- | --- | --- |
| S0-T01 | 0 | Update `07-idealized-db/idealized-schema.md` decisions block | Doc diff | todo |
| S0-T02 | 0 | Update `07-idealized-db/rationalized-db-design.md` decisions | Doc diff | todo |
| S0-T03 | 0 | Add migration policy to `04-target-schema/migration-readiness.md` | Doc diff | todo |
| S0-T04 | 0 | Add RLS test scaffold in `tests/unit/rls/*.spec.ts` | Test file exists | todo |
| S0-T05 | 0 | Document outbox worker contract in `07-idealized-db/functions-and-crons.md` | Doc diff | todo |
| S0-T06 | 0 | Add global server function middleware plan (auth/logging/context) | Doc diff | todo |
| S0-T07 | 0 | Standardize typed server fn usage plan (`typedGetFn`/`typedPostFn`) | Doc diff | todo |
| S0-T08 | 0 | Define query key discipline rule (central `queryKeys`) | Doc diff | todo |
| S0-T09 | 0 | Define error handling contract (`ServerError` subclasses) | Doc diff | todo |
| S0-T10 | 0 | Add JSONB typing guideline (no index signatures) | Doc diff | todo |
| S0-T11 | 0 | Add migration rollout template (add/backfill/constrain) | Doc diff | todo |
| DR-T01 | D | Add Support issues FKs (customerId/assignedToUserId/slaTrackingId) | Constraint test | done |
| DR-T02 | D | Add `warranty_claims.issueId` FK | Constraint test | done |
| DR-T03 | D | Convert `statement_history` counts to integer | Migration test | done |
| DR-T04 | D | Add `data_exports.entities` non‑empty check | Constraint test | done |
| DR-T05 | D | Add reports/dashboard schemas + MVs | Migration/refresh test | done |
| DR-T06 | D | Standardize financial references to `orderId` | Schema diff | done |
| DR-T07 | D | Add `opportunities.follow_up_date` + index | Migration/index | done |
| DR-T08 | D | Add `job_time_entries.category` enum/check | Enum test | done |
| DR-T09 | D | Add `order_line_items.pick_status` fields | Update test | done |
| DR-T10 | D | Add `search_index` + `recent_items` | RLS/index test | done |
| DR-T11 | D | Add `unified_activities` view/MV | Query test | done |
| DR-T12 | D | Add portal session schema + RLS | RLS test | done |
| S1-T01 | 1 | Add `drizzle/schema/search-index.ts` + export in `schema/index.ts` | Types exported | done |
| S1-T02 | 1 | Add `drizzle/schema/recent-items.ts` + export | Types exported | done |
| S1-T03 | 1 | Add `drizzle/schema/search-index-outbox.ts` + export | Types exported | done |
| S1-T04 | 1 | Migration `*_search*.sql` for tables + GIN/unique indexes | Migration runs | done |
| S1-T05 | 1 | RLS policies in search tables (`pgPolicy`) | RLS tests | done |
| S1-T06 | 1 | Add shared outbox helper `src/server/functions/_shared/search-index-outbox.ts` | Unit test | done |
| S1-T07 | 1 | Wire outbox helper into domain write paths | Outbox row created | done |
| S1-T08 | 1 | Job `src/trigger/jobs/search-index-outbox.ts` | Row processed | done |
| S1-T09 | 1 | API `src/server/functions/search.ts` + schemas | API test | done |
| S1-T10 | 1 | API `src/server/functions/recent-items.ts` | API test | done |
| S1-T11 | 1 | Tests `tests/unit/search/*.spec.ts` | Tests pass | done |
| S2-T01 | 2 | Add `portal_identities` schema + enums + migration | Insert/query test | done |
| S2-T02 | 2 | Supabase magic‑link flow for portal users (no custom token table) | Auth flow test | done |
| S2-T03 | 2 | Portal auth API `src/server/functions/portal-auth.ts` + schemas | Auth flow test | done |
| S2-T04 | 2 | Portal RLS policies (customer‑scoped via portal identity map) | RLS test | done |
| S2-T05 | 2 | Subcontractor job‑scope policies (portal identity map) | RLS test | done |
| S2-T06 | 2 | Portal branding storage (`organizations.settings` or table) | Settings test | done |
| S2-T07 | 2 | Portal field suppression contract + tests | API test | done |
| S2-T08 | 2 | Portal RLS tests `tests/unit/rls/portal/*.spec.ts` | RLS tests | done |
| S3-T01 | 3 | Add `opportunities.follow_up_date` + index | Migration + index | done |
| S3-T02 | 3 | Add `job_time_entries.category` enum/check | Enum test | done |
| S3-T03 | 3 | Add `order_line_items.pick_status/picked_at/picked_by` | Update test | done |
| S3-T04 | 3 | Add `payment_reminder_settings` table + FK | FK test | done |
| S3-T05 | 3 | Add missing FKs in support/warranty schemas | Constraint test | done |
| S4-T01 | 4 | Add reports tables in `drizzle/schema/reports/*` | CRUD + RLS | done |
| S4-T02 | 4 | MV SQL `mv_daily_metrics` | Refresh test | done |
| S4-T03 | 4 | MV SQL `mv_daily_pipeline` | Refresh test | done |
| S4-T04 | 4 | MV SQL `mv_daily_jobs` | Refresh test | done |
| S4-T05 | 4 | MV SQL `mv_daily_warranty` | Refresh test | done |
| S4-T06 | 4 | MV SQL `mv_current_state` | Refresh test | done |
| S4-T07 | 4 | Add MV indexes `(orgId, day)` | Index check | done |
| S4-T08 | 4 | Job `src/trigger/jobs/refresh-analytics.ts` | Cron run log | done |
| S4-T09 | 4 | Create `07-idealized-db/metric-catalog.md` | Doc created | done |
| S5-T01 | 5 | Create `unified_activities` view/MV (SQL migration) | Query test | done |
| S5-T02 | 5 | Add activityType enum in `_shared/enums.ts` | Constraint test | done |
| S5-T03 | 5 | Add timeline indexes (orgId, customerId, createdAt DESC) | Index check | done |
| S5-T04 | 5 | Email ingestion mapping handler | Idempotency test | done |
| S6-T01 | 6 | Implement join‑policy RLS for join‑only tables | RLS test | done |
| S6-T02 | 6 | Enforce polymorphic allowlists | Constraint test | done |
| S6-T03 | 6 | Field suppression tests for portal/subcontractor | API test | done |
| S7-T01 | 7 | Migrate count fields to integer | Migration test | done |
| S7-T02 | 7 | Normalize currency precision numeric(12,2) | Schema diff | done |
| S8-T01 | 8 | Query explain audit for hot paths | Audit doc | done |
| S8-T02 | 8 | Search latency benchmark | Benchmark log | done |
| S8-T03 | 8 | Update readiness checklist | Doc updated | done |
| S9-T01 | 9 | Decide audit log storage and document | Decision recorded | done |
| S9-T02 | 9 | Implement audit log storage + RLS | Insert/query test | done |
| S9-T03 | 9 | Canonicalize business hours/holidays ownership | Schema/docs aligned | done |
| S9-T04 | 9 | Resolve `scheduledReports` ownership conflict | Single schema source | done |
| S9-T05 | 9 | Decide report favorites storage | Decision + schema | done |
| S9-T06 | 9 | Enforce `purchase_order_items.line_total` formula | Constraint test | done |
| S9-T07 | 9 | Enforce supplier `overallRating` formula | Derived column test | done |
| S9-T08 | 9 | Add PRD‑required DESC indexes | Index check | done |
| S9-T09 | 9 | Enforce PRD uniqueness constraints | Constraint test | done |
| S9-T10 | 9 | Align naming mismatches (`issue_feedback`/`csat_responses`) | Docs/schema aligned | done |
| S9-T11 | 9 | Add/confirm comms FKs (`email_history` campaign/template) | FK check | done |
| SR-T01 | R | Review Sprint 0 outputs | Checklist updated | todo |
| SR-T02 | R | Review Sprint 1 outputs | Checklist updated | todo |
| SR-T03 | R | Review Sprint 2 outputs | Checklist updated | todo |
| SR-T04 | R | Review Sprint 3 outputs | Checklist updated | todo |
| SR-T05 | R | Review Sprint 4 outputs | Checklist updated | todo |
| SR-T06 | R | Review Sprint 5 outputs | Checklist updated | todo |
| SR-T07 | R | Review Sprint 6 outputs | Checklist updated | todo |
| SR-T08 | R | Review Sprint 7 outputs | Checklist updated | todo |
| SR-T09 | R | Review Sprint 8 outputs | Checklist updated | todo |
| SR-T10 | R | Review Sprint 9 outputs | Checklist updated | todo |
