-- ============================================================================
-- Generated Documents: Unique Constraint + Regeneration Tracking
-- Migration: 0012_generated_documents_upsert.sql
-- Created: 2026-02-02
--
-- Adds:
-- 1. regeneration_count column to track how many times regenerated
-- 2. Unique index on (org, entity_type, entity_id, document_type)
--    This ensures ONE row per logical document, enabling upsert pattern
--
-- Pattern: Upsert on regenerate, log to activities for audit trail
-- ============================================================================

-- ============================================================================
-- ADD REGENERATION COUNT COLUMN
-- ============================================================================

ALTER TABLE "generated_documents"
ADD COLUMN IF NOT EXISTS "regeneration_count" integer NOT NULL DEFAULT 0;

-- ============================================================================
-- ADD UNIQUE INDEX
-- Enables ON CONFLICT DO UPDATE for upsert pattern
-- ============================================================================

-- Drop old redundant index if exists (covered by unique index)
DROP INDEX IF EXISTS "idx_generated_documents_org_entity";

-- Create unique index (one document per entity per type per org)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_generated_documents_unique_per_entity"
ON "generated_documents" ("organization_id", "entity_type", "entity_id", "document_type");

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
