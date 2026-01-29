---
title: "Phase 06 - Support/Jobs/Projects Migration Runbook (Renoz CRM -> Renoz Website)"
date: "2026-01-29"
owner: "Ops"
status: "draft"
---

## Phase 06 - Support/Jobs/Projects Migration Runbook (Renoz CRM -> Renoz Website)

## Scope

- Phase: 06
- Domain(s): support, jobs, projects, warranties (confirm)
- Source project: REN0Z-CRM (Supabase project id: `rbeuidfnvjqxonxplfjb`)
- Target project: renoz-website (Supabase project id: `tcrpfwxfsbkrwqielhfg`)
- Source DB: Supabase Postgres (old)
- Target DB: Supabase Postgres (new)
- Org name: (fill)
- Old org id: (fill)
- New org id: (fill)
- Dry run date/time: (fill)
- Migration date/time: (fill)

## Preconditions

- [ ] Latest schema migrations applied on target:
  - `drizzle/migrations/0003_fresh_longshot.sql`
  - `drizzle/migrations/0004_serious_mongoose.sql`
- [ ] Data migration SQL available:
  - `docs/migrations/phase-06-support-jobs-projects-migration.sql`
- [ ] Application deployed with new schema and migration script(s):
  - `scripts/migrate-jobs-to-projects.ts`
- [ ] Full database backup completed and verified.
- [ ] Service role / pooler access verified for both projects.

## Mapping Assumptions (fill in)

- Support Issues → (target table + key fields)
- Support SLA Tracking → (target table + key fields)
- Jobs → Projects conversion rules
- Warranty records → Projects or Warranty domain tables
- Warranty certificate header uses `order_id` as primary link; `project_id` optional.
- Warranty items stored in `warranty_items` (normalized for reporting + serial search).
- Policy mapping: `manufacturer` → `inverter_manufacturer`, `extended` → `battery_performance`,
  `service_plan` → `installation_workmanship` (use org default policies).
- ID strategy: preserve IDs where safe; use new IDs for new rows if required by constraints.
- Status mapping rules:
- Defaults for new-only columns:
- Null handling:

## Source Table Snapshot (Old DB)

### support_tickets

- Columns: `id`, `organization_id`, `ticket_number`, `customer_id`, `contact_name`,
  `contact_email`, `contact_phone`, `type`, `status`, `priority`, `subject`,
  `description`, `assigned_to_user_id`, `assigned_at`, `order_id`,
  `inventory_item_id`, `product_id`, `resolution_notes`, `resolved_at`,
  `resolved_by_user_id`, `customer_satisfaction_rating`, `tags`, `custom_fields`,
  `attachments`, `sla_due_date`, `first_response_at`, `created_at`, `updated_at`,
  `created_by_user_id`, `updated_by_user_id`, `version`
- Enums:
  - `support_ticket_type_enum`
  - `support_ticket_status_enum`
  - `support_ticket_priority_enum`
- FKs:
  - `organization_id` → `organizations.id`
  - `customer_id` → `customers.id`
  - `assigned_to_user_id` → `users.id`
  - `created_by_user_id` → `users.id`
  - `updated_by_user_id` → `users.id`
  - `resolved_by_user_id` → `users.id`
  - `order_id` → `orders.id`
  - `inventory_item_id` → `inventory_items.id`
  - `product_id` → `products.id`

### warranties

- Columns: `id`, `organization_id`, `warranty_number`, `inventory_item_id`,
  `product_id`, `customer_id`, `order_id`, `warranty_type`, `status`, `start_date`,
  `end_date`, `registered_at`, `registered_by_user_id`, `registration_notes`,
  `transferred_from_customer_id`, `transferred_at`, `transfer_reason`,
  `installed_by_installer_id`, `installation_date`, `commissioning_report_url`,
  `terms_and_conditions`, `created_at`, `updated_at`, `created_by_user_id`,
  `updated_by_user_id`, `version`, `sold_by_customer_id`, `installation_address`,
  `commissioning_date`, `system_configuration`, `installer_snapshot`,
  `customer_snapshot`
- Enums:
  - `warranty_type`
  - `warranty_status_enum`
- FKs:
  - `organization_id` → `organizations.id`
  - `customer_id` → `customers.id`
  - `sold_by_customer_id` → `customers.id`
  - `transferred_from_customer_id` → `customers.id`
  - `inventory_item_id` → `inventory_items.id`
  - `product_id` → `products.id`
  - `order_id` → `orders.id`
  - `installed_by_installer_id` → `installers.id`
  - `registered_by_user_id` → `users.id`
  - `created_by_user_id` → `users.id`
  - `updated_by_user_id` → `users.id`
  - `project_id` → `projects.id` (optional in target)

### warranty_items

- Columns: `id`, `organization_id`, `warranty_id`, `inventory_item_id`,
  `warranty_start_date`, `warranty_end_date`, `warranty_period_months`,
  `installation_notes`, `created_at`, `updated_at`
- Enums: none
- FKs:
  - `organization_id` → `organizations.id`
  - `warranty_id` → `warranties.id`
  - `inventory_item_id` → `inventory_items.id`

## Migration Steps

### 1) Preflight (target readiness)

Run schema migrations on target:

```bash
bun run db:migrate
```

### 2) Dry Run (no writes)

Use the SQL file with DRY_RUN section enabled (read-only checks):

```bash
psql "$SOURCE_DATABASE_URL" -f docs/migrations/phase-06-support-jobs-projects-migration.sql
```

### 3) Execute Migration

Run the jobs → projects migration script (if applicable):

```bash
DRY_RUN=true bun run scripts/migrate-jobs-to-projects.ts
bun run scripts/migrate-jobs-to-projects.ts
```

Then run the SQL migration steps (load + validation):

```bash
psql "$TARGET_DATABASE_URL" -f docs/migrations/phase-06-support-jobs-projects-migration.sql
```

## Validation

Use the validation queries in the SQL file. Minimum checks:

- Row count parity for scoped tables
- Orphan checks (tasks/materials/time entries without project_id)
- Support issues with missing associations
- Warranty records mapped to expected projectType or warranty tables
- Warranty items mapped with product IDs and serials
- Warranty headers linked to at least one item

## Rollback Plan

- Restore from pre-migration backup.
- Re-deploy previous application version.
- Drop/cleanup any partially migrated records (see SQL cleanup section).

## Cutover Checklist (Go/No-Go)

- [ ] All schema migrations applied without error
- [ ] Migration script completed with zero critical errors
- [ ] No orphaned records (tasks/materials/time entries/support issues)
- [ ] Warranty records and claims visible
- [ ] App routes verified against project-based domain
