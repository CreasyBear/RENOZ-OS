-- ============================================================================
-- Storage Bucket Configuration: Documents
-- Migration: 0011_storage_documents_bucket.sql
-- Created: 2026-02-02
--
-- Creates the 'documents' bucket for storing generated PDFs (quotes, invoices, etc.)
-- with RLS policies that verify user's organization ownership via auth.uid().
--
-- Storage path convention: {organization_id}/{document_type}/{filename}
-- Example: a1b2c3d4-5678-90ab-cdef-1234567890ab/quote/QUOTE-ORD-001.pdf
--
-- IMPORTANT:
-- - Drizzle ORM is for database operations only
-- - Supabase Storage uses separate Supabase JS client
-- - Storage RLS uses auth.uid() from JWT, verified against users table
-- - Uses (select auth.uid()) pattern for query optimizer caching
--
-- @see https://supabase.com/docs/guides/storage/security/access-control
-- @see https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
-- ============================================================================

-- ============================================================================
-- CREATE BUCKET
-- ============================================================================

-- Create the documents bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket (requires signed URLs for access)
  52428800,  -- 50MB file size limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- HELPER FUNCTION: Get user's organization ID
-- Uses SECURITY DEFINER to access users table regardless of RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION storage.get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM users
  WHERE id = (select auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Extract org ID from storage path
-- Storage paths are: {org_id}/{document_type}/{filename}
-- IMMUTABLE for query optimizer caching
-- ============================================================================

CREATE OR REPLACE FUNCTION storage.get_path_organization_id(path text)
RETURNS uuid AS $$
  SELECT (string_to_array(path, '/'))[1]::uuid
$$ LANGUAGE sql IMMUTABLE;

-- ============================================================================
-- RLS POLICIES FOR storage.objects
--
-- Best practices applied:
-- 1. Use (select auth.uid()) for query optimizer caching
-- 2. Use TO authenticated to short-circuit for anon users
-- 3. Use helper functions to keep policies clean
-- 4. Index on users(id, organization_id) for fast lookups
-- ============================================================================

-- Policy: Allow authenticated users to upload files to their org folder
CREATE POLICY "documents_upload_org_folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND storage.get_path_organization_id(name) = storage.get_user_organization_id()
);

-- Policy: Allow authenticated users to read files from their org folder
CREATE POLICY "documents_read_org_folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND storage.get_path_organization_id(name) = storage.get_user_organization_id()
);

-- Policy: Allow authenticated users to update files in their org folder
CREATE POLICY "documents_update_org_folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND storage.get_path_organization_id(name) = storage.get_user_organization_id()
)
WITH CHECK (
  bucket_id = 'documents'
  AND storage.get_path_organization_id(name) = storage.get_user_organization_id()
);

-- Policy: Allow authenticated users to delete files from their org folder
CREATE POLICY "documents_delete_org_folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND storage.get_path_organization_id(name) = storage.get_user_organization_id()
);

-- ============================================================================
-- SERVICE ROLE BYPASS
-- Service keys bypass RLS entirely per Supabase docs
-- ============================================================================

CREATE POLICY "documents_service_role_all"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index for fast user->org lookups (critical for storage RLS performance)
CREATE INDEX IF NOT EXISTS idx_users_id_organization
ON users (id, organization_id);

-- Index on storage objects for bucket + path prefix queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_name
ON storage.objects (bucket_id, name text_pattern_ops);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION storage.get_user_organization_id() IS
  'Gets organization_id for current user. Uses (select auth.uid()) for optimizer caching.';

COMMENT ON FUNCTION storage.get_path_organization_id(text) IS
  'Extracts organization_id from storage path. Paths: {org_id}/{type}/{filename}';

COMMENT ON POLICY "documents_upload_org_folder" ON storage.objects IS
  'Allow authenticated users to upload documents to their organization folder only.';

COMMENT ON POLICY "documents_read_org_folder" ON storage.objects IS
  'Allow authenticated users to read documents from their organization folder only.';
