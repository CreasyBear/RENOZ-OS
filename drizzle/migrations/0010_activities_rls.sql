-- Activities Domain RLS Policies and Schema Enhancement
-- Enables Row Level Security for multi-tenant isolation on activities table.
-- Part of ACTIVITY-CORE-SCHEMA story.
--
-- @see _Initiation/_prd/2-domains/activities/activities.prd.json

-- ============================================================================
-- ADD MISSING COLUMNS TO ACTIVITIES TABLE
-- ============================================================================

-- Add userId column if it doesn't exist (actor who performed the action)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "activities" ADD COLUMN "user_id" uuid;
  END IF;
END $$;

-- Add ipAddress column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE "activities" ADD COLUMN "ip_address" inet;
  END IF;
END $$;

-- Add userAgent column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE "activities" ADD COLUMN "user_agent" text;
  END IF;
END $$;

-- ============================================================================
-- CREATE ADDITIONAL INDEXES
-- ============================================================================

-- Index for user activity history (if not exists)
CREATE INDEX IF NOT EXISTS "idx_activities_user"
  ON "activities" ("user_id", "created_at" DESC);

-- Index for entity type filtering (if not exists)
CREATE INDEX IF NOT EXISTS "idx_activities_entity_type"
  ON "activities" ("organization_id", "entity_type", "created_at" DESC);

-- Index for action type filtering with createdAt (if not exists)
DROP INDEX IF EXISTS "idx_activities_action";
CREATE INDEX "idx_activities_action"
  ON "activities" ("organization_id", "action", "created_at" DESC);

-- GIN index on changes->fields for "which activities changed field X" queries
-- This enables efficient queries like: WHERE changes->'fields' ? 'email'
CREATE INDEX IF NOT EXISTS "idx_activities_changes_fields"
  ON "activities" USING GIN ((changes->'fields'));

-- ============================================================================
-- ENABLE RLS ON ACTIVITIES TABLE
-- ============================================================================

ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR ORGANIZATION ISOLATION
-- ============================================================================

-- Policy: Users can only see activities from their organization
-- Uses organization_members table to check membership
CREATE POLICY "activities_org_isolation" ON "activities"
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM "organization_members"
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can INSERT activities for their organization
-- (Activities are append-only, so no UPDATE or DELETE policies)
CREATE POLICY "activities_org_insert" ON "activities"
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM "organization_members"
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SERVICE ROLE BYPASS (for server-side operations)
-- ============================================================================

-- Service role policy allows server functions to bypass RLS
-- This is needed for automated activity logging from Drizzle hooks
CREATE POLICY "activities_service_role" ON "activities"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PREVENT UPDATE AND DELETE (Append-Only Pattern)
-- ============================================================================

-- Create a trigger function to prevent updates
CREATE OR REPLACE FUNCTION activities_prevent_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Activities table is append-only. Updates are not allowed.';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to prevent deletes
CREATE OR REPLACE FUNCTION activities_prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Activities table is append-only. Deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to enforce append-only pattern
DROP TRIGGER IF EXISTS activities_no_update ON "activities";
CREATE TRIGGER activities_no_update
  BEFORE UPDATE ON "activities"
  FOR EACH ROW
  EXECUTE FUNCTION activities_prevent_update();

DROP TRIGGER IF EXISTS activities_no_delete ON "activities";
CREATE TRIGGER activities_no_delete
  BEFORE DELETE ON "activities"
  FOR EACH ROW
  EXECUTE FUNCTION activities_prevent_delete();

-- ============================================================================
-- PARTITIONING NOTES
-- ============================================================================

-- PostgreSQL native table partitioning by createdAt (monthly) is recommended
-- for production deployments with high activity volume. However, this requires:
--
-- 1. Creating the table as a partitioned table from the start:
--    CREATE TABLE activities (...) PARTITION BY RANGE (created_at);
--
-- 2. Creating monthly partitions:
--    CREATE TABLE activities_y2026m01 PARTITION OF activities
--      FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
--
-- 3. Setting up automatic partition management (pg_partman extension)
--
-- Since this is an existing table, partitioning would require:
-- - Creating a new partitioned table
-- - Migrating data from the old table
-- - Renaming tables
--
-- This is deferred to a separate migration when needed for scale.
-- For now, the indexes on (organization_id, created_at) provide good performance.
--
-- @see https://www.postgresql.org/docs/current/ddl-partitioning.html

-- ============================================================================
-- RETENTION POLICY (FUTURE WORK)
-- ============================================================================

-- Activity data should have a retention policy to prevent unbounded growth.
-- Recommended approaches (not yet implemented):
--
-- 1. ARCHIVAL STRATEGY (Recommended for audit compliance)
--    - Keep recent data (e.g., 90 days) in main activities table
--    - Move older data to activities_archive table or cold storage (S3/R2)
--    - Implement via scheduled job (pg_cron or Trigger.dev)
--
--    Example archival job (pseudocode):
--    ```sql
--    -- Move data older than 90 days to archive
--    INSERT INTO activities_archive SELECT * FROM activities
--      WHERE created_at < NOW() - INTERVAL '90 days';
--    -- Note: Would need to temporarily disable delete trigger
--    DELETE FROM activities WHERE created_at < NOW() - INTERVAL '90 days';
--    ```
--
-- 2. TIME-BASED DELETION (Simpler, no compliance requirement)
--    - Automatically delete activities older than retention period
--    - Use pg_cron to run nightly cleanup
--    - Consider keeping aggregated stats before deletion
--
-- 3. PARTITIONING + DROP PARTITION (Best for scale)
--    - If partitioned by month, simply drop old partitions
--    - Fastest deletion method (DDL, not row-by-row)
--    - Requires implementing partitioning first (see notes above)
--
-- Retention period considerations:
--    - Legal/compliance requirements (e.g., GDPR, SOC2)
--    - Business need for historical audit data
--    - Storage costs vs. query performance
--    - Typical: 90 days hot, 1-2 years archive, then purge
--
-- @todo Implement retention policy based on business requirements
-- @see _Initiation/_prd/2-domains/activities/activities.prd.json
-- @status NOT_IMPLEMENTED - Awaiting business requirements
