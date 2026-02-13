-- ============================================================================
-- Storage Bucket Configuration: Public (avatars, organization logos)
-- Migration: 0013_storage_public_bucket.sql
--
-- Creates or configures the 'public' bucket for avatars and organization logos.
-- Storage paths:
--   avatars/{userId}-{timestamp}.{ext}
--   organizations/{orgId}/branding/logo.{ext}
--
-- Uses storage.get_user_organization_id() from 0011 (documents bucket).
-- @see src/lib/storage/storage-url-utils.ts
-- @see src/server/functions/profile/avatar.ts
-- @see src/server/functions/settings/organization-logo.ts
-- ============================================================================

-- ============================================================================
-- CREATE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public',
  'public',
  true,  -- Public read (logos/avatars in PDFs, emails, UI)
  2097152,  -- 2MB (matches LOGO_MAX_SIZE_BYTES)
  ARRAY['image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- HELPER: Extract user ID from avatar path (avatars/{userId}-*.{ext})
-- ============================================================================

CREATE OR REPLACE FUNCTION storage.get_avatar_user_id(path text)
RETURNS uuid AS $$
  SELECT (
    SELECT (regexp_match(path, '^avatars/([0-9a-f-]{36})-'))[1]
  )::uuid
$$ LANGUAGE sql IMMUTABLE;

-- ============================================================================
-- RLS POLICIES FOR storage.objects (public bucket)
-- ============================================================================

DROP POLICY IF EXISTS "public_avatars_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_read" ON storage.objects;
DROP POLICY IF EXISTS "public_org_logo_upload" ON storage.objects;
DROP POLICY IF EXISTS "public_avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "public_org_logo_update" ON storage.objects;
DROP POLICY IF EXISTS "public_avatars_delete" ON storage.objects;
DROP POLICY IF EXISTS "public_org_logo_delete" ON storage.objects;

-- Policy: Allow authenticated users to upload their own avatar
CREATE POLICY "public_avatars_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND name LIKE 'avatars/%'
  AND storage.get_avatar_user_id(name) = (select auth.uid())
);

-- Policy: Public read for avatars and org logos
CREATE POLICY "public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public');

-- Helper: Extract org ID from path organizations/{orgId}/branding/logo.{ext}
CREATE OR REPLACE FUNCTION storage.get_org_logo_organization_id(path text)
RETURNS uuid AS $$
  SELECT (string_to_array(path, '/'))[2]::uuid
$$ LANGUAGE sql IMMUTABLE;

-- Policy: Allow authenticated users to upload org logo (their org only)
CREATE POLICY "public_org_logo_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public'
  AND name LIKE 'organizations/%/branding/logo.%'
  AND storage.get_org_logo_organization_id(name) = storage.get_user_organization_id()
);

-- Policy: Allow authenticated users to update their own avatar
CREATE POLICY "public_avatars_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public'
  AND name LIKE 'avatars/%'
  AND storage.get_avatar_user_id(name) = (select auth.uid())
)
WITH CHECK (
  bucket_id = 'public'
  AND name LIKE 'avatars/%'
  AND storage.get_avatar_user_id(name) = (select auth.uid())
);

-- Policy: Allow authenticated users to update org logo (their org only)
CREATE POLICY "public_org_logo_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public'
  AND name LIKE 'organizations/%/branding/logo.%'
  AND storage.get_org_logo_organization_id(name) = storage.get_user_organization_id()
)
WITH CHECK (
  bucket_id = 'public'
  AND name LIKE 'organizations/%/branding/logo.%'
  AND storage.get_org_logo_organization_id(name) = storage.get_user_organization_id()
);

-- Policy: Allow authenticated users to delete their own avatar
CREATE POLICY "public_avatars_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public'
  AND name LIKE 'avatars/%'
  AND storage.get_avatar_user_id(name) = (select auth.uid())
);

-- Policy: Allow authenticated users to delete org logo (their org only)
CREATE POLICY "public_org_logo_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public'
  AND name LIKE 'organizations/%/branding/logo.%'
  AND storage.get_org_logo_organization_id(name) = storage.get_user_organization_id()
);
