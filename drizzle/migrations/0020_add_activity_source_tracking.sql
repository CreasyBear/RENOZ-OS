-- Migration: Add activity source tracking
-- @see COMMS-AUTO-002

-- Create the activity_source enum
CREATE TYPE activity_source AS ENUM ('manual', 'email', 'webhook', 'system', 'import');

-- Add source and source_ref columns to activities table
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS source activity_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref UUID;

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_activities_source ON activities (organization_id, source, created_at);

-- Add comment for documentation
COMMENT ON COLUMN activities.source IS 'How the activity was created: manual (user), email (auto-capture), webhook, system, import';
COMMENT ON COLUMN activities.source_ref IS 'Reference to source record (e.g., email_history.id when source=email)';
