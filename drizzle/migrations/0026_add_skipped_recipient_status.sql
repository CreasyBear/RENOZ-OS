-- Migration: Add 'skipped' status to campaign_recipient_status enum
-- Story: INT-RES-004
-- Description: Allow marking campaign recipients as skipped when suppressed

-- Add 'skipped' value to the campaign_recipient_status enum
ALTER TYPE campaign_recipient_status ADD VALUE IF NOT EXISTS 'skipped';
