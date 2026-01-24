# Task Runbook (Atomic Execution Steps)

This runbook gives **step‑by‑step execution** for each task ID in the sprint plan.
Use it as the checklist for low‑capability agents.

## Sprint 0

**Success criteria template (apply per task group)**

1. Schema/Doc changes completed and referenced in plan.
2. Validation steps executed and recorded (test, SQL, or doc diff).
3. No cross‑domain standardization regressions introduced.

### S0-T01 — Update decisions in idealized schema

1. Open `07-idealized-db/idealized-schema.md`.
2. Confirm orders‑as‑invoice, outbox indexing, portal scope.
3. Save file.
4. Validation: diff shows updated decisions.

### S0-T02 — Update rationalized design decisions

1. Open `07-idealized-db/rationalized-db-design.md`.
2. Ensure cross-domain truths match decisions.
3. Save file.
4. Validation: diff shows updated text.

### S0-T03 — Add migration policy note

1. Open `04-target-schema/migration-readiness.md`.
2. Add additive/backfill/constraint enforcement steps.
3. Save file.
4. Validation: checklist includes policy.

### S0-T04 — Add RLS test scaffold

1. Create `tests/unit/rls/README.md` and `tests/unit/rls/policies.spec.ts`.
2. Add TODO test cases for org/portal/subcontractor scope.
3. Validation: files exist.

### S0-T05 — Outbox worker contract

1. Open `07-idealized-db/functions-and-crons.md`.
2. Add section describing outbox worker inputs/outputs/retry/idempotency.
3. Validation: doc updated.

### S0-T06 — Global server function middleware plan

1. Open `10-codebasewiring/design-patterns.md`.
2. Add guidance for `createMiddleware({ type: "function" })` usage + when to apply globally.
3. Validation: middleware pattern + rules present.

### S0-T07 — Typed server function standardization plan

1. Open `10-codebasewiring/design-patterns.md`.
2. Add a rule to prefer `typedGetFn` / `typedPostFn` from `src/lib/server/typed-server-fn.ts`.
3. Validation: rule present + referenced file path.

### S0-T08 — Query key discipline rule

1. Open `10-codebasewiring/design-patterns.md`.
2. Add rule: prefer central `src/lib/query-keys.ts` unless a local key is required.
3. Validation: rule present in Hooks section.

### S0-T09 — Error handling contract

1. Open `10-codebasewiring/design-patterns.md`.
2. Add rule to use `ServerError` subclasses from `src/lib/server/errors.ts`.
3. Validation: rule present + file referenced.

### S0-T10 — JSONB typing guideline

1. Open `10-codebasewiring/design-patterns.md`.
2. Add rule: avoid index signatures in JSONB types to satisfy TanStack serialization.
3. Validation: rule present + example or note.

### S0-T11 — Migration rollout template

1. Open `04-target-schema/migration-readiness.md`.
2. Add rollout checklist: add columns/tables → backfill → constrain → monitor.
3. Validation: checklist includes rollout steps.

---

## Sprint 1 — Search Infrastructure

### S1-T01 — Add `search_index` schema

1. Create `drizzle/schema/search-index.ts`.
2. Define table with columns + indexes.
3. Export from `drizzle/schema/index.ts`.
4. Validation: type exports compile.

### S1-T02 — Add `recent_items` schema

1. Create `drizzle/schema/recent-items.ts`.
2. Add unique constraint + index.
3. Export from `drizzle/schema/index.ts`.
4. Validation: type exports compile.

### S1-T03 — Add `search_index_outbox` schema

1. Create `drizzle/schema/search-index-outbox.ts`.
2. Add status/retry fields.
3. Export from `drizzle/schema/index.ts`.
4. Validation: type exports compile.

### S1-T04 — Add search migrations

1. Add migration SQL for three tables.
2. Include GIN and composite indexes.
3. Run `bun run db:push` (or validate SQL).
4. Validation: migration applies.

### S1-T05 — Add RLS policies

1. Add `pgPolicy` blocks in search schemas.
2. Ensure org/user scoping.
3. Validation: RLS test or SQL script.

### S1-T06 — Add outbox helper

1. Create `src/server/_shared/outbox.ts`.
2. Implement enqueue function.
3. Add unit tests if possible.
4. Validation: helper tested or callable.

### S1-T07 — Wire outbox helper

1. Identify write paths in `src/server/functions/**`.
2. Add enqueue after insert/update/delete.
3. Validation: outbox row created.

### S1-T08 — Add outbox worker job

1. Create `src/trigger/jobs/search-index-outbox.ts`.
2. Batch process outbox rows.
3. Mark processed/retry.
4. Validation: row processed.

### S1-T09 — Add search APIs

1. Create `src/server/functions/search.ts`.
2. Add Zod schemas in `src/lib/schemas/search.ts`.
3. Validation: query returns ranked results.

### S1-T10 — Add recent items APIs

1. Create `src/server/functions/recent-items.ts`.
2. Add Zod schemas for params.
3. Validation: list/track works.

### S1-T11 — Add tests

1. Create `tests/unit/search/*.spec.ts` (or SQL script).
2. Validate latency and ranking.
3. Validation: tests pass.

---

## Sprint 2 — Portal Foundations (Supabase Auth)

### S2-T01 — Add portal identity map (Supabase Auth)

1. Add enums to `drizzle/schema/_shared/enums.ts`:
   - `portal_scope`: `customer | subcontractor`
   - `portal_identity_status`: `active | revoked | disabled`
2. Create `drizzle/schema/portal/portal-identities.ts`:
   - Columns: `organizationId` (FK org), `authUserId` (Supabase auth user UUID),
     `scope`, `status`, `customerId`, `contactId`, `jobAssignmentId`,
     `lastSeenAt`, `revokedAt`, `createdAt`, `updatedAt`.
   - Constraints:
     - `scope = 'customer'` → `customerId` NOT NULL AND `jobAssignmentId` IS NULL
     - `scope = 'subcontractor'` → `jobAssignmentId` NOT NULL
   - Indexes:
     - unique `(organizationId, authUserId)`
     - `(organizationId, scope, customerId)`
     - `(organizationId, scope, jobAssignmentId)`
3. Export from `drizzle/schema/portal/index.ts` and `drizzle/schema/index.ts`.
4. Add migration SQL for table + constraints + indexes.
5. Validation: insert/query by `authUserId` works; invalid scope/id combos rejected.

### S2-T02 — Supabase magic‑link flow (portal users)

1. Use Supabase Auth OTP/magic‑link for portal users (no custom token table).
2. Create `src/lib/supabase/admin.ts` (service role client) if needed for admin‑generated links.
3. Confirm redirect URLs and expiry settings in Supabase dashboard.
4. Validation: magic‑link login establishes Supabase session; expired link rejected.

### S2-T03 — Add portal auth endpoints (Supabase session aware)

1. Create `src/server/functions/portal-auth.ts`.
2. Add Zod schemas in `src/lib/schemas/portal/auth.ts`.
3. Endpoints:
   - `requestPortalLink` (admin): upsert portal identity + send magic link (admin API).
   - `getPortalIdentity` (portal): map `auth.uid()` → portal identity + org id.
   - `revokePortalAccess` (admin): set `status=revoked`, `revokedAt=now()`.
4. Validation: request → link sent; getPortalIdentity resolves; revoke blocks access.

### S2-T04 — Add portal RLS policies (customer scope)

1. Orders/quotes/jobs/invoices view policy pattern:
   - `EXISTS (SELECT 1 FROM portal_identities pi`
   - `WHERE pi.auth_user_id = auth.uid()`
   - `AND pi.status = 'active'`
   - `AND pi.organization_id = <table>.organization_id`
   - `AND pi.scope = 'customer'`
   - `AND pi.customer_id = <table>.customer_id)`
2. Validation: portal user can only read own customer data.

### S2-T05 — Add subcontractor scope (job assignment)

1. Jobs policy:
   - `pi.scope = 'subcontractor' AND pi.job_assignment_id = job_assignments.id`
2. Orders policy for subcontractor:
   - `EXISTS job_assignments ja WHERE ja.order_id = orders.id AND ja.id = pi.job_assignment_id`
3. Validation: subcontractor sees only assigned job + related order basics.

### S2-T06 — Add portal branding storage

1. Option A: JSONB on `organizations.settings.portalBranding`.
2. Option B: `portal_branding` table (org‑scoped).
3. Validation: read/write works.

### S2-T07 — Field suppression contract + tests

1. Define allowed portal fields (whitelist) for:
   - Orders: exclude `internalNotes`, `auditColumns`, `xero*`, `deletedAt`.
   - Job assignments: exclude `internalNotes`, `auditColumns`, `signOffToken`, `confirmationToken`.
   - Line items: exclude `notes` for subcontractor scope.
2. Add API response tests to assert suppressed fields are absent.
3. Validation: tests pass.

### S2-T08 — Portal RLS tests

1. Add `tests/unit/rls/portal/*.spec.ts` (or SQL script).
2. Validate customer scope + subcontractor scope with portal identities.

---

## Sprint 3 — Role‑Driven Schema Enhancements

### S3-T01 — Add follow_up_date

1. Edit `drizzle/schema/pipeline/opportunities.ts`.
2. Add column + index migration.
3. Validation: migration applied.

### S3-T02 — Add time entry category

1. Edit `drizzle/schema/jobs/job-time-entries.ts`.
2. Add enum/check.
3. Validation: insert works for allowed values.

### S3-T03 — Add pick fields

1. Edit `drizzle/schema/orders/order-line-items.ts`.
2. Add `pickStatus`, `pickedAt`, `pickedBy`.
3. Validation: update persists.

### S3-T04 — Add reminder settings

1. Create `drizzle/schema/financial/payment-reminder-settings.ts`.
2. Add migration + FK.
3. Validation: CRUD + FK.

### S3-T05 — Add missing FKs

1. Update support/warranty schemas with FKs.
2. Add migration.
3. Validation: invalid references rejected.

---

## Sprint 4 — Analytics Layer

### S4-T01 — Add reports tables

1. Create `drizzle/schema/reports/*`.
2. Add migration + RLS.
3. Validation: CRUD + RLS.

### S4-T02…S4-T06 — Create MVs

1. Add SQL migrations for each MV.
2. Ensure `organizationId` and date buckets.
3. Validation: refresh returns rows.

### S4-T07 — Add MV indexes

1. Add index SQL per MV.
2. Validation: index exists.

### S4-T08 — Add MV refresh job

1. Create `src/trigger/jobs/refresh-analytics.ts`.
2. Validation: job runs.

### S4-T09 — Metric catalog

1. Create `07-idealized-db/metric-catalog.md`.
2. Validation: metrics defined with sources.

---

## Sprint 5 — Timeline Aggregation (Non‑UI)

### S5-T01 — Create `unified_activities`

1. Add SQL migration for view/MV.
2. Validation: query returns merged events.

### S5-T02 — Add activityType enum

1. Update `_shared/enums.ts`.
2. Validation: invalid type rejected.

### S5-T03 — Add timeline indexes

1. Add index SQL.
2. Validation: index exists.

### S5-T04 — Email ingestion mapping

1. Add handler in `src/server/functions/email-events.ts`.
2. Validation: idempotent inserts.

---

## Sprint 6 — RLS Hardening

### S6-T01 — Join‑policy enforcement

1. Add RLS policies to join‑only tables.
2. Validation: RLS tests pass.

### S6-T02 — Polymorphic allowlists

1. Add constraints + app validation.
2. Validation: invalid entityType rejected.

### S6-T03 — Field suppression tests

1. Add API response tests.
2. Validation: tests pass.

---

## Sprint 7 — Type Normalization

### S7-T01 — Count fields to integer

1. Add migration altering count fields.
2. Validation: data preserved.

### S7-T02 — Currency precision

1. Update currency columns to numeric(12,2).
2. Validation: schema diff.

---

## Sprint 8 — Operational Review

### S8-T01 — Query explain audit

1. Run explain plans for hot paths.
2. Save `explain-audit.md`.

### S8-T02 — Search latency benchmark

1. Run benchmark script.
2. Save results to `search-benchmark.md`.

### S8-T03 — Update readiness checklist

1. Update `migration-readiness.md`.
2. Validation: all items pass.
