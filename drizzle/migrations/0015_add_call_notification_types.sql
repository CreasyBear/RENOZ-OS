-- Migration: Add Call Notification Types
-- Story: DOM-COMMS-004b
-- Description: Add call_reminder and call_overdue to notification_type enum

-- Add new notification type values
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'call_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'call_overdue';
