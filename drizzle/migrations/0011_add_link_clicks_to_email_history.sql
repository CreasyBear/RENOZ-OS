-- Migration: Add link_clicks JSONB column to email_history table
-- Story: DOM-COMMS-001a - Add Email Tracking Schema
-- Description: Adds link_clicks column to track individual link clicks in emails
--
-- The column stores a JSONB object with the structure:
-- {
--   "clicks": [{ "linkId": "...", "url": "...", "clickedAt": "...", "userAgent": "...", "ipHash": "..." }],
--   "totalClicks": 0,
--   "uniqueLinksClicked": 0
-- }

ALTER TABLE "email_history" ADD COLUMN "link_clicks" jsonb;

-- Add index for querying emails with link clicks for analytics
CREATE INDEX IF NOT EXISTS "idx_email_history_link_clicks" ON "email_history" USING GIN ("link_clicks");
