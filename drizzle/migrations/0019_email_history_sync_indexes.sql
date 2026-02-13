-- Migration: Add indexes for email sync duplicate detection and performance
-- Created: 2026-02-06
-- Purpose: Improve duplicate detection queries and performance for synced emails

-- GIN index on metadata JSONB column for fast duplicate detection queries
-- This enables efficient queries like: WHERE metadata->>'providerMessageId' = 'xxx'
CREATE INDEX IF NOT EXISTS "idx_email_history_metadata_gin" ON "email_history" USING GIN ("metadata");

-- Partial unique index to prevent duplicate synced emails
-- Only applies to rows with providerMessageId in metadata (synced emails)
-- Ensures one email per provider message ID per organization
CREATE UNIQUE INDEX IF NOT EXISTS "idx_email_history_provider_message_unique" 
ON "email_history" ("organization_id", (("metadata"->>'providerMessageId')), (("metadata"->>'provider')))
WHERE "metadata" IS NOT NULL 
  AND ("metadata"->>'providerMessageId') IS NOT NULL 
  AND ("metadata"->>'provider') IS NOT NULL;

-- Index for filtering synced emails by source
-- Enables fast queries for synced vs sent emails
CREATE INDEX IF NOT EXISTS "idx_email_history_metadata_source" 
ON "email_history" ((("metadata"->>'source')))
WHERE "metadata" IS NOT NULL 
  AND ("metadata"->>'source') IS NOT NULL;
