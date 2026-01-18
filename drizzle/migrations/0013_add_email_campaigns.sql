-- Migration: Add Email Campaigns Tables
-- Story: DOM-COMMS-003a
-- Description: Create email_campaigns and campaign_recipients tables for bulk email marketing

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'paused',
    'cancelled',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_recipient_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'unsubscribed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- EMAIL CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,

  -- Campaign metadata
  "name" text NOT NULL,
  "description" text,

  -- Email content
  "template_type" text NOT NULL,
  "template_data" jsonb DEFAULT '{}',

  -- Recipient selection
  "recipient_criteria" jsonb DEFAULT '{}',

  -- Scheduling
  "scheduled_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,

  -- Status tracking
  "status" campaign_status NOT NULL DEFAULT 'draft',

  -- Stats (denormalized)
  "recipient_count" integer NOT NULL DEFAULT 0,
  "sent_count" integer NOT NULL DEFAULT 0,
  "delivered_count" integer NOT NULL DEFAULT 0,
  "open_count" integer NOT NULL DEFAULT 0,
  "click_count" integer NOT NULL DEFAULT 0,
  "bounce_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "unsubscribe_count" integer NOT NULL DEFAULT 0,

  -- Who created this campaign
  "created_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- CAMPAIGN RECIPIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "campaign_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign reference
  "campaign_id" uuid NOT NULL REFERENCES "email_campaigns"("id") ON DELETE CASCADE,

  -- Recipient information
  "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
  "email" text NOT NULL,
  "name" text,

  -- Per-recipient template variables
  "recipient_data" jsonb DEFAULT '{}',

  -- Delivery status
  "status" campaign_recipient_status NOT NULL DEFAULT 'pending',

  -- Tracking timestamps
  "sent_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "opened_at" timestamp with time zone,
  "clicked_at" timestamp with time zone,
  "bounced_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "unsubscribed_at" timestamp with time zone,

  -- Error tracking
  "error_message" text,

  -- Reference to sent email in email_history
  "email_history_id" uuid,

  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Email campaigns indexes
CREATE INDEX IF NOT EXISTS "idx_email_campaigns_org_status"
  ON "email_campaigns"("organization_id", "status");

CREATE INDEX IF NOT EXISTS "idx_email_campaigns_scheduled_at"
  ON "email_campaigns"("scheduled_at", "status");

CREATE INDEX IF NOT EXISTS "idx_email_campaigns_creator"
  ON "email_campaigns"("created_by_id");

-- Campaign recipients indexes
CREATE INDEX IF NOT EXISTS "idx_campaign_recipients_campaign"
  ON "campaign_recipients"("campaign_id");

CREATE INDEX IF NOT EXISTS "idx_campaign_recipients_campaign_status"
  ON "campaign_recipients"("campaign_id", "status");

CREATE INDEX IF NOT EXISTS "idx_campaign_recipients_contact"
  ON "campaign_recipients"("contact_id");

CREATE INDEX IF NOT EXISTS "idx_campaign_recipients_campaign_email"
  ON "campaign_recipients"("campaign_id", "email");

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE "email_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_recipients" ENABLE ROW LEVEL SECURITY;

-- Email campaigns: users can only see campaigns in their organization
CREATE POLICY "email_campaigns_select_policy" ON "email_campaigns"
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "email_campaigns_insert_policy" ON "email_campaigns"
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "email_campaigns_update_policy" ON "email_campaigns"
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "email_campaigns_delete_policy" ON "email_campaigns"
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Campaign recipients: access through campaign (organization scoped)
CREATE POLICY "campaign_recipients_select_policy" ON "campaign_recipients"
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM email_campaigns
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "campaign_recipients_insert_policy" ON "campaign_recipients"
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM email_campaigns
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "campaign_recipients_update_policy" ON "campaign_recipients"
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM email_campaigns
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "campaign_recipients_delete_policy" ON "campaign_recipients"
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM email_campaigns
      WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );
