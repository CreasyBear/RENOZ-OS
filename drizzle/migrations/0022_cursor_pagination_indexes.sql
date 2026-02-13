-- Migration: Add indexes for cursor pagination on high-traffic tables
-- Created: 2026-02-11
-- Purpose: Optimize cursor-based list queries (listJobAssignmentsCursor, etc.)
-- Reference: DRIZZLE-SERVER-FUNCTIONS-AUDIT.md Phase 4

-- Job assignments: cursor pagination uses (organization_id, created_at, id)
-- Enables efficient ORDER BY created_at DESC, id DESC with cursor WHERE
CREATE INDEX IF NOT EXISTS "idx_job_assignments_org_created_id" 
ON "job_assignments" ("organization_id", "created_at" DESC, "id" DESC);
