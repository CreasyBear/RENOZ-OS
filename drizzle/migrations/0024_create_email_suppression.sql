-- Migration: Create Email Suppression Table
-- Story: INT-RES-003
-- Description: Email suppression list for bounces, complaints, unsubscribes with soft delete support

-- Create suppression reason enum if not exists
DO $$ BEGIN
    CREATE TYPE suppression_reason AS ENUM ('bounce', 'complaint', 'unsubscribe', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create bounce type enum if not exists
DO $$ BEGIN
    CREATE TYPE bounce_type AS ENUM ('hard', 'soft');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create email suppression table
CREATE TABLE IF NOT EXISTS email_suppression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason suppression_reason NOT NULL,
    bounce_type bounce_type,
    source TEXT,
    resend_event_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_reason TEXT
);

-- Create unique index on (organization_id, email) for active suppressions only
CREATE UNIQUE INDEX IF NOT EXISTS email_suppression_unique_idx
    ON email_suppression (organization_id, email)
    WHERE deleted_at IS NULL;

-- Create index for email lookup across organizations (for global hard bounce check)
CREATE INDEX IF NOT EXISTS email_suppression_email_idx
    ON email_suppression (email);

-- Create index for reason-based filtering
CREATE INDEX IF NOT EXISTS email_suppression_reason_idx
    ON email_suppression (reason);

-- Create index for organization + reason queries
CREATE INDEX IF NOT EXISTS email_suppression_org_reason_idx
    ON email_suppression (organization_id, reason);

-- Create index for cursor-based pagination
CREATE INDEX IF NOT EXISTS email_suppression_org_created_id_idx
    ON email_suppression (organization_id, created_at DESC, id DESC);

-- Enable RLS
ALTER TABLE email_suppression ENABLE ROW LEVEL SECURITY;

-- RLS policy for select
CREATE POLICY email_suppression_select_policy ON email_suppression
    FOR SELECT
    TO authenticated
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- RLS policy for insert
CREATE POLICY email_suppression_insert_policy ON email_suppression
    FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);

-- RLS policy for update
CREATE POLICY email_suppression_update_policy ON email_suppression
    FOR UPDATE
    TO authenticated
    USING (organization_id = current_setting('app.organization_id', true)::uuid)
    WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);

-- RLS policy for delete
CREATE POLICY email_suppression_delete_policy ON email_suppression
    FOR DELETE
    TO authenticated
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- Add comments
COMMENT ON TABLE email_suppression IS 'Email suppression list for managing bounces, complaints, unsubscribes. Part of Resend integration.';
COMMENT ON COLUMN email_suppression.email IS 'Normalized lowercase email address';
COMMENT ON COLUMN email_suppression.reason IS 'Why the email was suppressed: bounce, complaint, unsubscribe, or manual';
COMMENT ON COLUMN email_suppression.bounce_type IS 'Type of bounce (hard/soft) - only applicable when reason is bounce';
COMMENT ON COLUMN email_suppression.source IS 'Where suppression originated: webhook, manual, import, api';
COMMENT ON COLUMN email_suppression.resend_event_id IS 'Original Resend webhook event ID for correlation';
COMMENT ON COLUMN email_suppression.deleted_at IS 'Soft delete timestamp - NULL means active suppression';
COMMENT ON COLUMN email_suppression.deleted_by IS 'User who removed the suppression';
COMMENT ON COLUMN email_suppression.deleted_reason IS 'Reason for removing from suppression list';
