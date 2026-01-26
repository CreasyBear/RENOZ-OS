-- Migration: AI Infrastructure Schema
-- Stories: AI-INFRA-001, AI-INFRA-002, AI-INFRA-003, AI-INFRA-004
-- Tables: ai_conversations, ai_conversation_messages, ai_approvals, ai_agent_tasks, ai_cost_tracking

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Message role enum
DO $$ BEGIN
  CREATE TYPE "ai_message_role" AS ENUM ('user', 'assistant', 'system', 'tool');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Approval status enum
DO $$ BEGIN
  CREATE TYPE "ai_approval_status" AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Agent task status enum
DO $$ BEGIN
  CREATE TYPE "ai_agent_task_status" AS ENUM ('queued', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Agent name enum (v1.0 + future phases)
DO $$ BEGIN
  CREATE TYPE "ai_agent_name" AS ENUM (
    'triage',
    'customer',
    'order',
    'analytics',
    'quote',
    'jobs',
    'communications',
    'inventory',
    'warranty',
    'purchasing'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- AI CONVERSATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "active_agent" "ai_agent_name",
  "agent_history" jsonb DEFAULT '[]'::jsonb,
  "last_message_at" timestamp with time zone DEFAULT NOW(),
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_org" ON "ai_conversations" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_user" ON "ai_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_last_message" ON "ai_conversations" ("last_message_at");
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_active_agent" ON "ai_conversations" ("active_agent");

-- RLS Policies
ALTER TABLE "ai_conversations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conversations_select_policy" ON "ai_conversations";
CREATE POLICY "ai_conversations_select_policy" ON "ai_conversations"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_conversations_insert_policy" ON "ai_conversations";
CREATE POLICY "ai_conversations_insert_policy" ON "ai_conversations"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_conversations_update_policy" ON "ai_conversations";
CREATE POLICY "ai_conversations_update_policy" ON "ai_conversations"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_conversations_delete_policy" ON "ai_conversations";
CREATE POLICY "ai_conversations_delete_policy" ON "ai_conversations"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- =============================================================================
-- AI CONVERSATION MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ai_conversation_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "ai_conversations"("id") ON DELETE CASCADE,
  "role" "ai_message_role" NOT NULL,
  "content" text NOT NULL,
  "tool_calls" jsonb,
  "tool_results" jsonb,
  "tokens_used" integer,
  "agent_name" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_ai_messages_conversation_created" ON "ai_conversation_messages" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_ai_messages_conversation_role" ON "ai_conversation_messages" ("conversation_id", "role");
CREATE INDEX IF NOT EXISTS "idx_ai_messages_agent_name" ON "ai_conversation_messages" ("agent_name");

-- RLS Policies (inherit from parent conversation)
ALTER TABLE "ai_conversation_messages" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conversation_messages_select_policy" ON "ai_conversation_messages";
CREATE POLICY "ai_conversation_messages_select_policy" ON "ai_conversation_messages"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ai_conversations c
    WHERE c.id = conversation_id
    AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
  ));

DROP POLICY IF EXISTS "ai_conversation_messages_insert_policy" ON "ai_conversation_messages";
CREATE POLICY "ai_conversation_messages_insert_policy" ON "ai_conversation_messages"
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_conversations c
    WHERE c.id = conversation_id
    AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
  ));

DROP POLICY IF EXISTS "ai_conversation_messages_delete_policy" ON "ai_conversation_messages";
CREATE POLICY "ai_conversation_messages_delete_policy" ON "ai_conversation_messages"
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ai_conversations c
    WHERE c.id = conversation_id
    AND c.organization_id = (SELECT current_setting('app.organization_id', true)::uuid)
  ));

-- =============================================================================
-- AI APPROVALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ai_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid REFERENCES "ai_conversations"("id") ON DELETE SET NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "agent" "ai_agent_name" NOT NULL,
  "action_data" jsonb NOT NULL,
  "status" "ai_approval_status" NOT NULL DEFAULT 'pending',
  "version" integer NOT NULL DEFAULT 1,
  "approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "approved_at" timestamp with time zone,
  "rejection_reason" text,
  "executed_at" timestamp with time zone,
  "execution_result" jsonb,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_ai_approvals_org" ON "ai_approvals" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_ai_approvals_user" ON "ai_approvals" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_approvals_status" ON "ai_approvals" ("status");
CREATE INDEX IF NOT EXISTS "idx_ai_approvals_expires" ON "ai_approvals" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_ai_approvals_user_status" ON "ai_approvals" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_ai_approvals_org_status" ON "ai_approvals" ("organization_id", "status");

-- RLS Policies
ALTER TABLE "ai_approvals" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_approvals_select_policy" ON "ai_approvals";
CREATE POLICY "ai_approvals_select_policy" ON "ai_approvals"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_approvals_insert_policy" ON "ai_approvals";
CREATE POLICY "ai_approvals_insert_policy" ON "ai_approvals"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_approvals_update_policy" ON "ai_approvals";
CREATE POLICY "ai_approvals_update_policy" ON "ai_approvals"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_approvals_delete_policy" ON "ai_approvals";
CREATE POLICY "ai_approvals_delete_policy" ON "ai_approvals"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- =============================================================================
-- AI AGENT TASKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ai_agent_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "task_type" text NOT NULL,
  "agent" "ai_agent_name" NOT NULL,
  "input" jsonb NOT NULL,
  "context" jsonb,
  "status" "ai_agent_task_status" NOT NULL DEFAULT 'queued',
  "progress" integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  "current_step" text,
  "result" jsonb,
  "error" jsonb,
  "tokens_used" integer DEFAULT 0,
  "cost_cents" integer DEFAULT 0,
  "queued_at" timestamp with time zone DEFAULT NOW(),
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_org" ON "ai_agent_tasks" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_user" ON "ai_agent_tasks" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_status" ON "ai_agent_tasks" ("status");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_type" ON "ai_agent_tasks" ("task_type");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_queued" ON "ai_agent_tasks" ("queued_at");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_user_status" ON "ai_agent_tasks" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_org_status" ON "ai_agent_tasks" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_tasks_status_queued" ON "ai_agent_tasks" ("status", "queued_at");

-- RLS Policies
ALTER TABLE "ai_agent_tasks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_agent_tasks_select_policy" ON "ai_agent_tasks";
CREATE POLICY "ai_agent_tasks_select_policy" ON "ai_agent_tasks"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_agent_tasks_insert_policy" ON "ai_agent_tasks";
CREATE POLICY "ai_agent_tasks_insert_policy" ON "ai_agent_tasks"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_agent_tasks_update_policy" ON "ai_agent_tasks";
CREATE POLICY "ai_agent_tasks_update_policy" ON "ai_agent_tasks"
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid))
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_agent_tasks_delete_policy" ON "ai_agent_tasks";
CREATE POLICY "ai_agent_tasks_delete_policy" ON "ai_agent_tasks"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

-- =============================================================================
-- AI COST TRACKING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ai_cost_tracking" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "conversation_id" uuid REFERENCES "ai_conversations"("id") ON DELETE SET NULL,
  "task_id" uuid REFERENCES "ai_agent_tasks"("id") ON DELETE SET NULL,
  "model" text NOT NULL,
  "feature" text,
  "input_tokens" integer NOT NULL,
  "output_tokens" integer NOT NULL,
  "cache_read_tokens" integer DEFAULT 0,
  "cache_write_tokens" integer DEFAULT 0,
  "cost_cents" integer NOT NULL,
  "date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_ai_cost_org" ON "ai_cost_tracking" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_user" ON "ai_cost_tracking" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_date" ON "ai_cost_tracking" ("date");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_model" ON "ai_cost_tracking" ("model");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_feature" ON "ai_cost_tracking" ("feature");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_org_date" ON "ai_cost_tracking" ("organization_id", "date");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_user_date" ON "ai_cost_tracking" ("user_id", "date");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_org_model_date" ON "ai_cost_tracking" ("organization_id", "model", "date");
CREATE INDEX IF NOT EXISTS "idx_ai_cost_org_feature_date" ON "ai_cost_tracking" ("organization_id", "feature", "date");

-- RLS Policies
ALTER TABLE "ai_cost_tracking" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_cost_tracking_select_policy" ON "ai_cost_tracking";
CREATE POLICY "ai_cost_tracking_select_policy" ON "ai_cost_tracking"
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_cost_tracking_insert_policy" ON "ai_cost_tracking";
CREATE POLICY "ai_cost_tracking_insert_policy" ON "ai_cost_tracking"
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));

DROP POLICY IF EXISTS "ai_cost_tracking_delete_policy" ON "ai_cost_tracking";
CREATE POLICY "ai_cost_tracking_delete_policy" ON "ai_cost_tracking"
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT current_setting('app.organization_id', true)::uuid));
