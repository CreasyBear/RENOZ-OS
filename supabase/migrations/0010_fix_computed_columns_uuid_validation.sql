-- ============================================================================
-- Fix Computed Columns UUID Validation
-- Migration: 0010_fix_computed_columns_uuid_validation.sql
-- Created: 2026-01-30
--
-- Fixes computed columns to safely handle invalid UUIDs in metadata
-- by validating UUID format before casting
-- ============================================================================

-- Drop existing computed columns (they'll be recreated with safe casting)
ALTER TABLE activities DROP COLUMN IF EXISTS customer_id_from_metadata;
ALTER TABLE activities DROP COLUMN IF EXISTS movement_id_from_metadata;

-- Recreate with safe UUID validation
ALTER TABLE activities 
ADD COLUMN customer_id_from_metadata UUID 
GENERATED ALWAYS AS (
  CASE 
    WHEN metadata IS NOT NULL AND metadata ? 'customerId' 
    THEN CASE 
      WHEN (metadata->>'customerId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN (metadata->>'customerId')::uuid 
      ELSE NULL 
    END
    ELSE NULL 
  END
) STORED;

ALTER TABLE activities 
ADD COLUMN movement_id_from_metadata UUID 
GENERATED ALWAYS AS (
  CASE 
    WHEN metadata IS NOT NULL AND metadata ? 'movementId' 
    THEN CASE 
      WHEN (metadata->>'movementId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN (metadata->>'movementId')::uuid 
      ELSE NULL 
    END
    ELSE NULL 
  END
) STORED;

-- Recreate indexes (they were dropped with the columns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_customer_id_metadata 
ON activities (organization_id, customer_id_from_metadata, created_at DESC)
WHERE customer_id_from_metadata IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_movement_id_metadata 
ON activities (organization_id, movement_id_from_metadata)
WHERE movement_id_from_metadata IS NOT NULL;
