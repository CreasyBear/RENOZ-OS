-- Migration: Add bounce_count column to email_suppression
-- Story: INT-RES-004
-- Description: Track soft bounce occurrences for 3-strike suppression rule

-- Add bounce_count column with default value of 0
ALTER TABLE email_suppression
    ADD COLUMN IF NOT EXISTS bounce_count INTEGER NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN email_suppression.bounce_count IS 'Number of soft bounces within tracking window. Auto-suppress at 3.';
