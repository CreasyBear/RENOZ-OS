-- Migration: Add retry count tracking to ai_approvals table
-- Task: DATA-005 - Add Retry Count Tracking to Approvals
--
-- This migration adds columns to track failed execution attempts:
-- - retry_count: Number of failed execution attempts (default 0)
-- - last_error: Error message from most recent failed attempt
-- - last_attempt_at: Timestamp of most recent execution attempt

-- Add retry tracking columns
ALTER TABLE ai_approvals ADD COLUMN retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE ai_approvals ADD COLUMN last_error text;
ALTER TABLE ai_approvals ADD COLUMN last_attempt_at timestamp with time zone;

-- Index for finding stuck approvals (pending with multiple retry attempts)
CREATE INDEX idx_ai_approvals_retry_status ON ai_approvals (status, retry_count);
