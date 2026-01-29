-- Phase 06 - Support/Jobs/Projects Migration SQL (Template)
-- Source: renoz-crm (old)
-- Target: renoz-website (new)
-- NOTE: Fill in schema/table mappings before execution.

-- =========================================
-- DRY RUN SECTION (read-only checks)
-- =========================================

-- Presence checks
select to_regclass('public.projects') as projects,
       to_regclass('public.site_visits') as site_visits,
       to_regclass('public.job_assignments') as job_assignments,
       to_regclass('public.support_tickets') as support_tickets,
       to_regclass('public.support_issues') as support_issues,
       to_regclass('public.support_sla_tracking') as support_sla_tracking,
       to_regclass('public.warranties') as warranties,
       to_regclass('public.warranty_items') as warranty_items;

-- Row counts (source)
-- Replace schema/table names as needed for renoz-crm
select count(*) as jobs_total from job_assignments;
select count(*) as tasks_total from job_tasks;
select count(*) as materials_total from job_materials;
select count(*) as time_entries_total from job_time_entries;
select count(*) as support_tickets_total from support_tickets;
select count(*) as support_issues_total from support_issues;
select count(*) as support_sla_total from support_sla_tracking;
select count(*) as warranties_total from warranties;
select count(*) as warranty_items_total from warranty_items;

-- =========================================
-- LOAD SECTION (target inserts/updates)
-- =========================================
-- IMPORTANT: Review and replace placeholders with actual mappings.

-- -----------------------------------------
-- Schema Extension (target)
-- -----------------------------------------
-- 1) Add optional project_id to warranties (order_id remains primary link)
-- alter table warranties add column if not exists project_id uuid;
-- alter table warranties
--   add constraint warranties_project_id_projects_id_fk
--   foreign key (project_id) references projects(id) on delete set null;

-- 2) Create warranty_items table (normalized items for reporting + serial search)
-- create table if not exists warranty_items (
--   id uuid primary key default gen_random_uuid(),
--   organization_id uuid not null references organizations(id) on delete cascade,
--   warranty_id uuid not null references warranties(id) on delete cascade,
--   product_id uuid not null references products(id) on delete restrict,
--   product_serial varchar(255),
--   inventory_id uuid references inventory(id) on delete set null,
--   warranty_start_date date not null,
--   warranty_end_date date not null,
--   warranty_period_months integer not null,
--   installation_notes text,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now(),
--   created_by uuid,
--   updated_by uuid
-- );
-- create index if not exists idx_warranty_items_org_warranty
--   on warranty_items (organization_id, warranty_id);
-- create index if not exists idx_warranty_items_org_product
--   on warranty_items (organization_id, product_id);
-- create index if not exists idx_warranty_items_org_serial
--   on warranty_items (organization_id, product_serial);

-- -----------------------------------------
-- Warranty Policy Defaults (target)
-- -----------------------------------------
-- Create default policies if none exist for the org.
-- Update durations/terms as needed.
-- insert into warranty_policies (
--   id, organization_id, name, description, type, duration_months, cycle_limit,
--   terms, is_default, is_active, created_at, updated_at
-- )
-- select gen_random_uuid(), '<NEW_ORG_ID>', 'Battery Performance Default',
--   'Default battery performance warranty policy', 'battery_performance', 120, 6000,
--   '{"depth_of_discharge_percent":80,"soh_percent_after_years":70,"soh_years":10}'::jsonb,
--   true, true, now(), now()
-- where not exists (
--   select 1 from warranty_policies
--   where organization_id = '<NEW_ORG_ID>' and type = 'battery_performance' and is_default = true
-- );
-- insert into warranty_policies (
--   id, organization_id, name, description, type, duration_months, cycle_limit,
--   terms, is_default, is_active, created_at, updated_at
-- )
-- select gen_random_uuid(), '<NEW_ORG_ID>', 'Inverter Manufacturer Default',
--   'Default inverter manufacturer warranty policy', 'inverter_manufacturer', 120, null,
--   '{}'::jsonb, true, true, now(), now()
-- where not exists (
--   select 1 from warranty_policies
--   where organization_id = '<NEW_ORG_ID>' and type = 'inverter_manufacturer' and is_default = true
-- );
-- insert into warranty_policies (
--   id, organization_id, name, description, type, duration_months, cycle_limit,
--   terms, is_default, is_active, created_at, updated_at
-- )
-- select gen_random_uuid(), '<NEW_ORG_ID>', 'Installation Workmanship Default',
--   'Default installation workmanship warranty policy', 'installation_workmanship', 24, null,
--   '{}'::jsonb, true, true, now(), now()
-- where not exists (
--   select 1 from warranty_policies
--   where organization_id = '<NEW_ORG_ID>' and type = 'installation_workmanship' and is_default = true
-- );

-- Example: Jobs -> Projects
-- insert into projects (
--   id, organization_id, customer_id, name, status, project_type,
--   created_at, updated_at
-- )
-- select
--   j.id,
--   j.organization_id,
--   j.customer_id,
--   j.title,
--   j.status,
--   case when j.job_type = 'warranty' then 'warranty' else 'standard' end,
--   j.created_at,
--   j.updated_at
-- from job_assignments j
-- where j.organization_id = '<OLD_ORG_ID>';

-- Example: Job Tasks -> Project Tasks (if applicable)
-- insert into project_tasks (
--   id, project_id, organization_id, title, status, created_at, updated_at
-- )
-- select
--   t.id, t.project_id, t.organization_id, t.title, t.status, t.created_at, t.updated_at
-- from job_tasks t
-- where t.organization_id = '<OLD_ORG_ID>';

-- Example: Support Issues -> (target table)
-- insert into support_issues (
--   id, organization_id, project_id, title, description, status, created_at, updated_at
-- )
-- select
--   s.id, s.organization_id, s.project_id, s.title, s.description, s.status, s.created_at, s.updated_at
-- from support_issues s
-- where s.organization_id = '<OLD_ORG_ID>';

-- Example: Support Tickets -> (target table)
-- NOTE: If the target table is named differently (e.g. support_issues), remap columns accordingly.
-- insert into support_tickets (
--   id, organization_id, ticket_number, customer_id, contact_name, contact_email,
--   contact_phone, type, status, priority, subject, description, assigned_to_user_id,
--   assigned_at, order_id, inventory_item_id, product_id, resolution_notes, resolved_at,
--   resolved_by_user_id, customer_satisfaction_rating, tags, custom_fields, attachments,
--   sla_due_date, first_response_at, created_at, updated_at, created_by_user_id,
--   updated_by_user_id, version
-- )
-- select
--   t.id, t.organization_id, t.ticket_number, t.customer_id, t.contact_name, t.contact_email,
--   t.contact_phone, t.type, t.status, t.priority, t.subject, t.description, t.assigned_to_user_id,
--   t.assigned_at, t.order_id, t.inventory_item_id, t.product_id, t.resolution_notes, t.resolved_at,
--   t.resolved_by_user_id, t.customer_satisfaction_rating, t.tags, t.custom_fields, t.attachments,
--   t.sla_due_date, t.first_response_at, t.created_at, t.updated_at, t.created_by_user_id,
--   t.updated_by_user_id, t.version
-- from support_tickets t
-- where t.organization_id = '<OLD_ORG_ID>';

-- Example: Warranties -> (target table)
-- insert into warranties (
--   id, organization_id, warranty_number, customer_id, product_id, product_serial,
--   warranty_policy_id, order_id, project_id, registration_date, expiry_date, status,
--   original_customer_id, transferred_at, expiry_alert_opt_out, certificate_url, notes,
--   created_by, updated_by, created_at, updated_at
-- )
-- with policy_map as (
--   select 'manufacturer'::text as old_type, 'inverter_manufacturer'::warranty_policy_type as policy_type
--   union all
--   select 'extended', 'battery_performance'
--   union all
--   select 'service_plan', 'installation_workmanship'
-- ),
-- policy_ids as (
--   select pm.old_type, wp.id as policy_id
--   from policy_map pm
--   join warranty_policies wp
--     on wp.organization_id = '<NEW_ORG_ID>'
--    and wp.type = pm.policy_type
--    and wp.is_default = true
-- ),
-- primary_item as (
--   select distinct on (wi.warranty_id)
--     wi.warranty_id,
--     ii.product_id,
--     ii.serial_number
--   from warranty_items wi
--   join inventory_items ii on ii.id = wi.inventory_item_id
--   where wi.organization_id = '<OLD_ORG_ID>'
--   order by wi.warranty_id, wi.warranty_start_date asc
-- )
-- select
--   w.id, w.organization_id, w.warranty_number, w.customer_id,
--   -- Header product: use first item product/serial
--   coalesce(pitem.product_id, w.product_id) as product_id,
--   pitem.serial_number as product_serial,
--   pmap.policy_id, w.order_id, null::uuid as project_id,
--   w.registered_at as registration_date,
--   w.end_date::timestamptz as expiry_date,
--   case w.status
--     when 'ACTIVE' then 'active'::warranty_status
--     when 'EXPIRED' then 'expired'::warranty_status
--     when 'VOID' then 'voided'::warranty_status
--     when 'TRANSFERRED' then 'transferred'::warranty_status
--     else 'active'::warranty_status
--   end as status,
--   w.transferred_from_customer_id as original_customer_id,
--   w.transferred_at,
--   false as expiry_alert_opt_out,
--   null::text as certificate_url,
--   w.registration_notes as notes,
--   w.created_by_user_id as created_by,
--   w.updated_by_user_id as updated_by,
--   w.created_at,
--   w.updated_at
-- from warranties w
-- join policy_ids pmap on pmap.old_type = w.warranty_type
-- left join primary_item pitem on pitem.warranty_id = w.id
-- where w.organization_id = '<OLD_ORG_ID>';

-- Example: Warranty Items -> (target table)
-- insert into warranty_items (
--   id, organization_id, warranty_id, product_id, product_serial, inventory_id,
--   warranty_start_date, warranty_end_date, warranty_period_months, installation_notes,
--   created_at, updated_at, created_by, updated_by
-- )
-- select
--   wi.id, wi.organization_id, wi.warranty_id, ii.product_id,
--   ii.serial_number as product_serial,
--   null::uuid as inventory_id,
--   wi.warranty_start_date, wi.warranty_end_date, wi.warranty_period_months,
--   wi.installation_notes, wi.created_at, wi.updated_at, null::uuid, null::uuid
-- from warranty_items wi
-- left join inventory_items ii on ii.id = wi.inventory_item_id
-- where wi.organization_id = '<OLD_ORG_ID>';

-- =========================================
-- VALIDATION SECTION
-- =========================================

-- Row count parity (target)
select count(*) as projects_total from projects;
select count(*) as site_visits_total from site_visits;
select count(*) as project_tasks_total from project_tasks;
select count(*) as support_tickets_total from support_tickets;
select count(*) as support_issues_total from support_issues;
select count(*) as support_sla_total from support_sla_tracking;
select count(*) as warranties_total from warranties;
select count(*) as warranty_items_total from warranty_items;

-- Serial coverage checks (target)
-- select count(*) as warranty_items_missing_serial
-- from warranty_items
-- where product_serial is null;

-- Orphan checks
select count(*) as tasks_missing_project
from job_tasks
where project_id is null;

select count(*) as materials_missing_project
from job_materials
where project_id is null;

select count(*) as time_entries_missing_project
from job_time_entries
where project_id is null;

-- Support issues missing project (if required)
select count(*) as support_issues_missing_project
from support_issues
where project_id is null;

-- Warranty item coverage checks
select count(*) as warranty_items_missing_product
from warranty_items
where product_id is null;

select count(*) as warranty_items_missing_serial
from warranty_items
where product_serial is null;

select count(*) as warranty_headers_without_items
from warranties w
left join warranty_items wi on wi.warranty_id = w.id
where wi.id is null;

-- =========================================
-- CLEANUP/ROLLBACK SECTION (optional)
-- =========================================
-- delete from support_issues where organization_id = '<OLD_ORG_ID>';
-- delete from project_tasks where organization_id = '<OLD_ORG_ID>';
-- delete from projects where organization_id = '<OLD_ORG_ID>';
