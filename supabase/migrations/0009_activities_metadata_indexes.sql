-- ============================================================================
-- Activities Metadata Indexes
-- Migration: 0009_activities_metadata_indexes.sql
-- Created: 2026-01-30
--
-- PERFORMANCE: These indexes optimize JSONB metadata queries used for:
-- 1. Customer timeline queries (metadata->>'customerId')
-- 2. Duplicate detection (metadata->>'movementId')
-- 3. Order activity lookups by customer
--
-- Without these indexes, JSONB queries require full table scans.
-- ============================================================================

-- ============================================================================
-- GIN INDEX FOR JSONB METADATA QUERIES
-- ============================================================================

-- GIN index enables fast JSONB queries on any metadata field
-- Supports: metadata->>'customerId', metadata->>'movementId', etc.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_metadata_gin 
ON activities USING GIN (metadata)
WHERE metadata IS NOT NULL;

-- ============================================================================
-- COMPUTED COLUMN FOR CUSTOMER ID LOOKUPS
-- ============================================================================

-- Add computed column for customerId from metadata (for order activities)
-- This enables efficient customer timeline queries without JSONB extraction
-- Uses safe UUID casting that returns NULL for invalid UUIDs
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS customer_id_from_metadata UUID 
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

-- Index for customer timeline queries (organization + customer + created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_customer_id_metadata 
ON activities (organization_id, customer_id_from_metadata, created_at DESC)
WHERE customer_id_from_metadata IS NOT NULL;

-- ============================================================================
-- COMPUTED COLUMN FOR MOVEMENT ID LOOKUPS
-- ============================================================================

-- Add computed column for movementId from metadata (for duplicate detection)
-- Uses safe UUID casting that returns NULL for invalid UUIDs
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS movement_id_from_metadata UUID 
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

-- Index for duplicate detection queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_movement_id_metadata 
ON activities (organization_id, movement_id_from_metadata)
WHERE movement_id_from_metadata IS NOT NULL;

-- ============================================================================
-- NOTES
-- ============================================================================

-- The GIN index (idx_activities_metadata_gin) provides:
-- - Fast queries on ANY metadata field
-- - Supports: metadata->>'customerId', metadata->>'movementId', etc.
-- - Trade-off: Larger index size, but enables flexible queries
--
-- The computed columns provide:
-- - Faster queries for specific metadata fields (customerId, movementId)
-- - Enables standard B-tree indexes (smaller, faster than GIN)
-- - Trade-off: Less flexible, but optimized for common queries
--
-- Both approaches complement each other:
-- - Use computed columns for common queries (customer timeline, duplicate detection)
-- - Use GIN index for ad-hoc metadata queries
