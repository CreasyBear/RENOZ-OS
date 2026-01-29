---
title: "Phase 06 - Jobs to Projects Migration Runbook"
date: "2026-01-29"
owner: "Ops"
status: "draft"
---

# Phase 06 - Jobs to Projects Migration Runbook

## Goal

Migrate legacy jobs data (`job_assignments`) into the new project-centric model (`projects`, `site_visits`) and ensure all related records are linked and validated before cutover.

## Preconditions

- Latest schema migrations generated and committed:
  - `drizzle/migrations/0003_fresh_longshot.sql`
  - `drizzle/migrations/0004_serious_mongoose.sql`
- Data migration SQL updated:
  - `drizzle/migrations/0003_data_migration_job_tasks.sql`
- Application deployed with new schema and migration script:
  - `scripts/migrate-jobs-to-projects.ts`
- Full database backup completed and verified.

## Migration Steps (Production Rehearsal)

1) Apply schema migrations (production-safe)

```
bun run db:migrate
```

1) Run the main migration script

```
DRY_RUN=true bun run scripts/migrate-jobs-to-projects.ts
bun run scripts/migrate-jobs-to-projects.ts
```

1) Run data migration SQL for legacy records

```
psql $DATABASE_URL -f drizzle/migrations/0003_data_migration_job_tasks.sql
```

## Verification Queries

### Check presence of new tables

```
select to_regclass('public.projects') as projects,
       to_regclass('public.site_visits') as site_visits,
       to_regclass('public.project_bom') as project_bom,
       to_regclass('public.project_bom_items') as project_bom_items,
       to_regclass('public.site_visit_photos') as site_visit_photos;
```

### Validate migration coverage

```
select count(*) as jobs_total from job_assignments;
select count(*) as projects_total from projects;
select count(*) as site_visits_total from site_visits;
```

### Orphan checks

```
select count(*) as tasks_missing_project
from job_tasks
where project_id is null;

select count(*) as materials_missing_project
from job_materials
where project_id is null;

select count(*) as time_entries_missing_project
from job_time_entries
where project_id is null;
```

### Photo migration validation

```
select count(*) as legacy_photos from job_photos;
select count(*) as migrated_photos from site_visit_photos;
```

## Rollback Plan

- Restore from pre-migration backup.
- Re-deploy previous application version.

## Cutover Checklist (Go/No-Go)

- [ ] All schema migrations applied without error
- [ ] Migration script completed with zero critical errors
- [ ] No orphaned records for tasks/materials/time entries
- [ ] Photos migrated and visible
- [ ] App routes verified against project-based domain
