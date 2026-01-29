-- ============================================================================
-- Phase 06 Preflight: Jobs -> Projects Migration
-- ============================================================================
-- Read-only checks for schema readiness and data consistency.
-- Run these BEFORE applying migrations in production.
-- ============================================================================

-- Confirm legacy tables exist
select to_regclass('public.job_assignments') as job_assignments,
       to_regclass('public.job_tasks') as job_tasks,
       to_regclass('public.job_materials') as job_materials,
       to_regclass('public.job_time_entries') as job_time_entries,
       to_regclass('public.job_photos') as job_photos;

-- Confirm new tables exist (will be NULL before migrations)
select to_regclass('public.projects') as projects,
       to_regclass('public.site_visits') as site_visits,
       to_regclass('public.project_bom') as project_bom,
       to_regclass('public.project_bom_items') as project_bom_items,
       to_regclass('public.site_visit_photos') as site_visit_photos;

-- Legacy row counts
select count(*) as job_assignments_count from job_assignments;
select count(*) as job_tasks_count from job_tasks;
select count(*) as job_materials_count from job_materials;
select count(*) as job_time_entries_count from job_time_entries;
select count(*) as job_photos_count from job_photos;

-- Check for jobs without billing address (needed for siteAddress)
select count(*) as jobs_missing_billing_address
from job_assignments ja
left join addresses a
  on a.customer_id = ja.customer_id
 and a.type = 'billing'
where a.id is null;

-- Check for jobs missing required fields
select count(*) as jobs_missing_customer
from job_assignments
where customer_id is null;

select count(*) as jobs_missing_installer
from job_assignments
where installer_id is null;

select count(*) as jobs_missing_schedule
from job_assignments
where scheduled_date is null;

-- Check for legacy tasks without job assignments
select count(*) as tasks_missing_job
from job_tasks jt
left join job_assignments ja on ja.id = jt.job_id
where ja.id is null;

-- Check for legacy materials without jobs
select count(*) as materials_missing_job
from job_materials jm
left join job_assignments ja on ja.id = jm.job_id
where ja.id is null;

-- Check for legacy time entries without jobs
select count(*) as time_entries_missing_job
from job_time_entries jte
left join job_assignments ja on ja.id = jte.job_id
where ja.id is null;

-- Check for photos without jobs
select count(*) as photos_missing_job
from job_photos jp
left join job_assignments ja on ja.id = jp.job_assignment_id
where ja.id is null;

-- Check for duplicate job numbers (projectNumber depends on this)
select job_number, count(*) as dup_count
from job_assignments
group by job_number
having count(*) > 1
order by dup_count desc;
