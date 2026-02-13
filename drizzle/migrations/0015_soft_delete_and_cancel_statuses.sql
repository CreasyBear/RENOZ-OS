-- Migration: Add soft delete columns and cancellation statuses
-- Phase 1 of soft-delete/archive implementation across domains

-- ============================================================================
-- 1. Add deletedAt to quotes table
-- ============================================================================
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- Update unique index to scope to active records only
DROP INDEX IF EXISTS "idx_quotes_number_org_unique";
CREATE UNIQUE INDEX "idx_quotes_number_org_unique"
  ON "quotes" ("organization_id", "quote_number")
  WHERE "deleted_at" IS NULL;

-- ============================================================================
-- 2. Add deletedAt to projects table
-- ============================================================================
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- Update unique index to scope to active records only
DROP INDEX IF EXISTS "idx_projects_org_number";
CREATE UNIQUE INDEX "idx_projects_org_number"
  ON "projects" ("organization_id", "project_number")
  WHERE "deleted_at" IS NULL;

-- ============================================================================
-- 3. Add deletedAt to warranties table
-- ============================================================================
ALTER TABLE "warranties" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- Update unique indexes to scope to active records only
DROP INDEX IF EXISTS "idx_warranties_number_org";
CREATE UNIQUE INDEX "idx_warranties_number_org"
  ON "warranties" ("organization_id", "warranty_number")
  WHERE "deleted_at" IS NULL;

DROP INDEX IF EXISTS "idx_warranties_serial_org";
CREATE UNIQUE INDEX "idx_warranties_serial_org"
  ON "warranties" ("organization_id", "product_serial")
  WHERE "product_serial" IS NOT NULL AND "deleted_at" IS NULL;

-- ============================================================================
-- 4. Add 'cancelled' status to warranty_claim_status enum
-- NOTE: ALTER TYPE ADD VALUE cannot run inside a transaction in some PG versions.
--       Drizzle/Supabase migrations run each file as a single transaction,
--       so we use the IF NOT EXISTS guard for safety.
-- ============================================================================
ALTER TYPE "warranty_claim_status" ADD VALUE IF NOT EXISTS 'cancelled';

-- ============================================================================
-- 5. Add 'cancelled' status to rma_status enum
-- ============================================================================
ALTER TYPE "rma_status" ADD VALUE IF NOT EXISTS 'cancelled';
