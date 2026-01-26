-- Migration: Add generated documents schema
-- This migration adds:
-- 1. quote_pdf_url and invoice_pdf_url columns to orders table
-- 2. generated_documents audit table for tracking document generation

-- ============================================================================
-- ADD PDF URL COLUMNS TO ORDERS TABLE
-- ============================================================================

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "quote_pdf_url" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_pdf_url" text;

-- ============================================================================
-- CREATE GENERATED DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "generated_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "document_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "filename" text NOT NULL,
  "storage_url" text NOT NULL,
  "file_size" integer,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "generated_by_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "generated_documents_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade,
  CONSTRAINT "generated_documents_generated_by_id_users_id_fk"
    FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE set null
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Primary lookup by entity (entity_type, entity_id)
CREATE INDEX IF NOT EXISTS "idx_generated_documents_entity"
  ON "generated_documents" ("entity_type", "entity_id");

-- Multi-tenant queries
CREATE INDEX IF NOT EXISTS "idx_generated_documents_org_entity"
  ON "generated_documents" ("organization_id", "entity_type", "entity_id");

-- Document type queries
CREATE INDEX IF NOT EXISTS "idx_generated_documents_org_doc_type"
  ON "generated_documents" ("organization_id", "document_type");

-- User's generated documents
CREATE INDEX IF NOT EXISTS "idx_generated_documents_generated_by"
  ON "generated_documents" ("generated_by_id");

-- Recent documents (cursor pagination)
CREATE INDEX IF NOT EXISTS "idx_generated_documents_org_created"
  ON "generated_documents" ("organization_id", "created_at" DESC, "id" DESC);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE "generated_documents" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generated_documents'
    AND policyname = 'generated_documents_select_policy'
  ) THEN
    CREATE POLICY "generated_documents_select_policy"
      ON "generated_documents"
      FOR SELECT
      TO authenticated
      USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generated_documents'
    AND policyname = 'generated_documents_insert_policy'
  ) THEN
    CREATE POLICY "generated_documents_insert_policy"
      ON "generated_documents"
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generated_documents'
    AND policyname = 'generated_documents_update_policy'
  ) THEN
    CREATE POLICY "generated_documents_update_policy"
      ON "generated_documents"
      FOR UPDATE
      TO authenticated
      USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
      WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generated_documents'
    AND policyname = 'generated_documents_delete_policy'
  ) THEN
    CREATE POLICY "generated_documents_delete_policy"
      ON "generated_documents"
      FOR DELETE
      TO authenticated
      USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
  END IF;
END $$;
