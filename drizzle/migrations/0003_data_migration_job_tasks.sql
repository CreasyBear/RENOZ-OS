-- ============================================================================
-- Data Migration: Populate project_id on job_tasks + related tables
-- ============================================================================
-- This migration populates denormalized project/site_visit references
-- across job_tasks, job_materials, job_time_entries, and job_photos.
--
-- Run this AFTER applying schema migrations:
-- - 0003_fresh_longshot.sql
-- - 0004_serious_mongoose.sql
-- ============================================================================

-- Start transaction
BEGIN;

-- Update job_tasks that have a site_visit_id to set project_id
-- by looking up the project from the site_visits table
UPDATE job_tasks
SET project_id = site_visits.project_id
FROM site_visits
WHERE job_tasks.site_visit_id = site_visits.id
  AND job_tasks.project_id IS NULL;

-- Update job_materials to set project_id and task_id
-- project_id derives from first task for the job
UPDATE job_materials jm
SET
  project_id = (
    SELECT project_id
    FROM job_tasks
    WHERE job_tasks.job_id = jm.job_id
      AND job_tasks.project_id IS NOT NULL
    ORDER BY position ASC NULLS LAST, created_at ASC
    LIMIT 1
  ),
  task_id = (
    SELECT id
    FROM job_tasks
    WHERE job_tasks.job_id = jm.job_id
      AND job_tasks.project_id IS NOT NULL
    ORDER BY position ASC NULLS LAST, created_at ASC
    LIMIT 1
  )
WHERE jm.project_id IS NULL;

-- Update job_time_entries to set project_id and site_visit_id
UPDATE job_time_entries jte
SET
  project_id = (
    SELECT project_id
    FROM job_tasks
    WHERE job_tasks.job_id = jte.job_id
      AND job_tasks.project_id IS NOT NULL
    ORDER BY position ASC NULLS LAST, created_at ASC
    LIMIT 1
  ),
  site_visit_id = (
    SELECT site_visit_id
    FROM job_tasks
    WHERE job_tasks.job_id = jte.job_id
      AND job_tasks.project_id IS NOT NULL
    ORDER BY position ASC NULLS LAST, created_at ASC
    LIMIT 1
  )
WHERE jte.project_id IS NULL;

-- Migrate job_photos into site_visit_photos (new table)
-- Use first site visit for the project (if multiple)
INSERT INTO site_visit_photos (
  organization_id,
  site_visit_id,
  project_id,
  type,
  photo_url,
  thumbnail_url,
  caption,
  location,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  jp.organization_id,
  sv.id as site_visit_id,
  sv.project_id,
  jp.type::text::site_visit_photo_type,
  jp.photo_url,
  NULL,
  jp.caption,
  jp.location,
  jp.created_at,
  jp.updated_at,
  jp.created_by,
  jp.updated_by
FROM job_photos jp
JOIN job_assignments ja ON ja.id = jp.job_assignment_id
JOIN projects p ON p.id = ja.migrated_to_project_id
JOIN LATERAL (
  SELECT id, project_id
  FROM site_visits
  WHERE project_id = p.id
  ORDER BY scheduled_date ASC NULLS LAST, created_at ASC
  LIMIT 1
) sv ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM site_visit_photos svp
  WHERE svp.site_visit_id = sv.id
    AND svp.photo_url = jp.photo_url
    AND svp.type = jp.type::text::site_visit_photo_type
);

-- Log how many rows were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM job_tasks
  WHERE project_id IS NOT NULL;

  RAISE NOTICE 'Updated % job_tasks with project_id from site_visits', updated_count;
END $$;

-- For tasks without a site_visit_id, we can optionally:
-- 1. Leave project_id null (legacy tasks will need manual assignment)
-- 2. Set a default project based on job_assignment (if still linked)
-- 3. Create a "migration needed" flag

-- Check for any remaining null project_ids
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM job_tasks
  WHERE project_id IS NULL;

  IF null_count > 0 THEN
    RAISE WARNING '% job_tasks still have NULL project_id. These may be legacy tasks not yet associated with a site visit.', null_count;
  END IF;
END $$;

-- Check for any remaining null project_ids on materials/time entries
DO $$
DECLARE
  materials_null_count INTEGER;
  time_entries_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO materials_null_count
  FROM job_materials
  WHERE project_id IS NULL;

  SELECT COUNT(*) INTO time_entries_null_count
  FROM job_time_entries
  WHERE project_id IS NULL;

  IF materials_null_count > 0 THEN
    RAISE WARNING '% job_materials still have NULL project_id.', materials_null_count;
  END IF;

  IF time_entries_null_count > 0 THEN
    RAISE WARNING '% job_time_entries still have NULL project_id.', time_entries_null_count;
  END IF;
END $$;

-- Commit transaction
COMMIT;

-- ============================================================================
-- Verification Query (run manually if needed)
-- ============================================================================
-- Check the distribution of tasks by project:
--
-- SELECT
--   p.title as project_title,
--   COUNT(jt.id) as task_count
-- FROM job_tasks jt
-- JOIN projects p ON jt.project_id = p.id
-- GROUP BY p.id, p.title
-- ORDER BY task_count DESC;
-- ============================================================================
