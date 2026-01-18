-- Migration: Add activity enum values for communications auto-capture
-- @see COMMS-AUTO-001

-- Add new action values to activity_action enum
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'email_sent';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'email_opened';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'email_clicked';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'call_logged';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'note_added';

-- Add new entity type values to activity_entity_type enum
ALTER TYPE activity_entity_type ADD VALUE IF NOT EXISTS 'email';
ALTER TYPE activity_entity_type ADD VALUE IF NOT EXISTS 'call';
