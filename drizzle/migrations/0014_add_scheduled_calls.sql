-- Migration: Add Scheduled Calls Table
-- Story: DOM-COMMS-004a
-- Description: Create scheduled_calls table for call scheduling with reminders

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE scheduled_call_status AS ENUM (
    'pending',
    'completed',
    'cancelled',
    'rescheduled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SCHEDULED CALLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "scheduled_calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,

  -- Who the call is with
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,

  -- Who is assigned to make the call
  "assignee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Call scheduling
  "scheduled_at" timestamp with time zone NOT NULL,
  "reminder_at" timestamp with time zone,

  -- Call details
  "purpose" text NOT NULL DEFAULT 'general',
  "notes" text,

  -- Status tracking
  "status" scheduled_call_status NOT NULL DEFAULT 'pending',

  -- Outcome tracking
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "cancel_reason" text,
  "outcome" text,
  "outcome_notes" text,

  -- If rescheduled, track the new call
  "rescheduled_to_id" uuid,

  -- Timestamps
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding calls by assignee
CREATE INDEX IF NOT EXISTS "idx_scheduled_calls_assignee"
  ON "scheduled_calls"("assignee_id");

-- Index for finding upcoming calls
CREATE INDEX IF NOT EXISTS "idx_scheduled_calls_scheduled_at"
  ON "scheduled_calls"("scheduled_at");

-- Index for status filtering
CREATE INDEX IF NOT EXISTS "idx_scheduled_calls_status"
  ON "scheduled_calls"("status");

-- Composite index for assignee + status queries
CREATE INDEX IF NOT EXISTS "idx_scheduled_calls_assignee_status"
  ON "scheduled_calls"("assignee_id", "status");

-- Index for customer lookup
CREATE INDEX IF NOT EXISTS "idx_scheduled_calls_customer"
  ON "scheduled_calls"("customer_id");

-- Index for organization + status queries
CREATE INDEX IF NOT EXISTS "idx_scheduled_calls_org_status"
  ON "scheduled_calls"("organization_id", "status");

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE "scheduled_calls" ENABLE ROW LEVEL SECURITY;

-- Users can see scheduled calls in their organization
CREATE POLICY "scheduled_calls_select_policy" ON "scheduled_calls"
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can create scheduled calls in their organization
CREATE POLICY "scheduled_calls_insert_policy" ON "scheduled_calls"
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can update scheduled calls in their organization
CREATE POLICY "scheduled_calls_update_policy" ON "scheduled_calls"
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users can delete scheduled calls in their organization
CREATE POLICY "scheduled_calls_delete_policy" ON "scheduled_calls"
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
