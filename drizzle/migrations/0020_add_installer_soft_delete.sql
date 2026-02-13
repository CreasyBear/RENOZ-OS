-- Migration: Add soft delete to installer_profiles table
-- Finding #16: Implement soft delete pattern consistent with other domains

-- ============================================================================
-- 1. Add deletedAt column to installer_profiles
-- ============================================================================
ALTER TABLE "installer_profiles" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- ============================================================================
-- 2. Update unique index to scope to active records only
-- ============================================================================
DROP INDEX IF EXISTS "idx_installer_profiles_org_user";
CREATE UNIQUE INDEX "idx_installer_profiles_org_user"
  ON "installer_profiles" ("organization_id", "user_id")
  WHERE "deleted_at" IS NULL;

DROP INDEX IF EXISTS "idx_installer_profiles_user";
CREATE UNIQUE INDEX "idx_installer_profiles_user"
  ON "installer_profiles" ("user_id")
  WHERE "deleted_at" IS NULL;
