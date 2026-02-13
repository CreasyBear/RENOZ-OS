-- ============================================================================
-- Generated Documents: Unique Constraint + Regeneration Tracking
-- Migration: 0012_generated_documents_unique_constraint.sql
-- Created: 2026-02-02
--
-- Adds:
-- 1. Unique constraint on (org, entity_type, entity_id, document_type)
--    This ensures ONE row per logical document, enabling upsert pattern
-- 2. regeneration_count column to track how many times regenerated
--
-- Pattern: Upsert on regenerate, log to activities for audit trail
-- ============================================================================

-- ============================================================================
-- ADD REGENERATION COUNT COLUMN
-- ============================================================================

ALTER TABLE generated_documents
ADD COLUMN IF NOT EXISTS regeneration_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN generated_documents.regeneration_count IS
  'Number of times this document has been regenerated. Incremented on each upsert.';

-- ============================================================================
-- ADD UNIQUE CONSTRAINT
-- Enables ON CONFLICT DO UPDATE for upsert pattern
-- ============================================================================

-- Drop old redundant index if exists (covered by unique index)
DROP INDEX IF EXISTS idx_generated_documents_org_entity;

-- Create unique index (one document per entity per type per org)
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_documents_unique_per_entity
ON generated_documents (organization_id, entity_type, entity_id, document_type);

COMMENT ON INDEX idx_generated_documents_unique_per_entity IS
  'Ensures one document row per (org, entity, type). Enables upsert pattern.';

-- ============================================================================
-- CLEANUP: Remove any existing duplicates before constraint (if any)
-- Keep the most recent version of each document
-- ============================================================================

WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, entity_type, entity_id, document_type
      ORDER BY generated_at DESC, created_at DESC
    ) as rn
  FROM generated_documents
)
DELETE FROM generated_documents
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
