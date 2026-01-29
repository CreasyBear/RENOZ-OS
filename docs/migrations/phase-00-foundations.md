# Phase 00 — Foundations

## Objective
Prepare shared prerequisites required by all downstream migrations.

## Checklist
- Confirm target org exists in new DB (or insert if missing).
- Create Main Warehouse location in `warehouse_locations`.
- Confirm migration access (service role / pooler) for both DBs.
- Capture org + location IDs for reuse in scripts.
- Initialize runbook entries using `docs/migrations/runbook-template.md`.

## Org Setup (execute_sql)
```sql
select id, name
from public.organizations
where lower(name) like '%renoz%';
```

If missing, insert (minimal required fields):
```sql
insert into public.organizations (name, slug, is_active)
values ('RENOZ Energy', 'renoz-energy', true)
returning id, name;
```

## Warehouse Location (execute_sql)
```sql
select id, name, location_code
from public.warehouse_locations
where organization_id = '<NEW_ORG_ID>'
  and lower(name) = lower('Main Warehouse');
```

If missing:
```sql
insert into public.warehouse_locations (
  organization_id,
  location_code,
  name,
  location_type,
  attributes
)
values (
  '<NEW_ORG_ID>',
  'MAIN-WH',
  'Main Warehouse',
  'warehouse',
  '{"description":"Main warehouse","isDefault":true}'::jsonb
)
returning id, name, location_code;
```

## Notes
- Use pooler connection for new DB if needed for RLS bypass.
- Record IDs in phase runbooks for repeatable ETL runs.
