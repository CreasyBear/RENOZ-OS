CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"external_account_id" varchar(255),
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"operation" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"record_count" integer,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_service_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"scope" varchar(255) NOT NULL,
	"is_granted" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"services" jsonb NOT NULL,
	"redirect_url" text NOT NULL,
	"state" text NOT NULL,
	"pkce_verifier" text,
	"pkce_challenge" text,
	"pkce_method" varchar(10) DEFAULT 'S256' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"is_consumed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"location" text,
	"status" text NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"last_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"thread_id" text,
	"subject" text,
	"from" jsonb,
	"to" jsonb DEFAULT '[]'::jsonb,
	"received_at" timestamp with time zone,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"full_name" text,
	"emails" jsonb DEFAULT '[]'::jsonb,
	"phones" jsonb DEFAULT '[]'::jsonb,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_sync_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_sync_logs" ADD CONSTRAINT "oauth_sync_logs_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_sync_logs" ADD CONSTRAINT "oauth_sync_logs_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "oauth_connections"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_service_permissions" ADD CONSTRAINT "oauth_service_permissions_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_service_permissions" ADD CONSTRAINT "oauth_service_permissions_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "oauth_connections"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_calendar_events" ADD CONSTRAINT "oauth_calendar_events_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_calendar_events" ADD CONSTRAINT "oauth_calendar_events_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "oauth_connections"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_email_messages" ADD CONSTRAINT "oauth_email_messages_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_email_messages" ADD CONSTRAINT "oauth_email_messages_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "oauth_connections"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_contacts" ADD CONSTRAINT "oauth_contacts_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_contacts" ADD CONSTRAINT "oauth_contacts_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "oauth_connections"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_sync_states" ADD CONSTRAINT "oauth_sync_states_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "oauth_sync_states" ADD CONSTRAINT "oauth_sync_states_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "oauth_connections"("id") ON DELETE cascade;--> statement-breakpoint
CREATE INDEX "idx_oauth_connections_org_user_provider_service" ON "oauth_connections" ("organization_id","user_id","provider","service_type");--> statement-breakpoint
CREATE INDEX "idx_oauth_connections_last_synced" ON "oauth_connections" ("last_synced_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_logs_org_connection_service" ON "oauth_sync_logs" ("organization_id","connection_id","service_type");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_logs_org_started" ON "oauth_sync_logs" ("organization_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_logs_status" ON "oauth_sync_logs" ("status");--> statement-breakpoint
CREATE INDEX "idx_oauth_service_permissions_org_connection_service" ON "oauth_service_permissions" ("organization_id","connection_id","service_type");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_org_provider" ON "oauth_states" ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_state" ON "oauth_states" ("state");--> statement-breakpoint
CREATE INDEX "idx_oauth_states_expires" ON "oauth_states" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_calendar_events_org_conn" ON "oauth_calendar_events" ("organization_id","connection_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_calendar_events_external" ON "oauth_calendar_events" ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_email_messages_org_conn" ON "oauth_email_messages" ("organization_id","connection_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_email_messages_external" ON "oauth_email_messages" ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_contacts_org_conn" ON "oauth_contacts" ("organization_id","connection_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_contacts_external" ON "oauth_contacts" ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_sync_states_org_conn" ON "oauth_sync_states" ("organization_id","connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oauth_sync_states_conn_service_unique" ON "oauth_sync_states" ("connection_id","service_type");--> statement-breakpoint
ALTER TABLE "oauth_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_sync_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_service_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_email_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_sync_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "oauth_connections_select_policy" ON "oauth_connections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_connections_insert_policy" ON "oauth_connections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_connections_update_policy" ON "oauth_connections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_connections_delete_policy" ON "oauth_connections" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_select_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_insert_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_update_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_logs_delete_policy" ON "oauth_sync_logs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_select_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_insert_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_update_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_service_permissions_delete_policy" ON "oauth_service_permissions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_states_select_policy" ON "oauth_states" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_states_insert_policy" ON "oauth_states" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_states_update_policy" ON "oauth_states" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_states_delete_policy" ON "oauth_states" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_select_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_insert_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_update_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_calendar_events_delete_policy" ON "oauth_calendar_events" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_email_messages_select_policy" ON "oauth_email_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_email_messages_insert_policy" ON "oauth_email_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_email_messages_update_policy" ON "oauth_email_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_email_messages_delete_policy" ON "oauth_email_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_contacts_select_policy" ON "oauth_contacts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_contacts_insert_policy" ON "oauth_contacts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_contacts_update_policy" ON "oauth_contacts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_contacts_delete_policy" ON "oauth_contacts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_states_select_policy" ON "oauth_sync_states" AS PERMISSIVE FOR SELECT TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_states_insert_policy" ON "oauth_sync_states" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_states_update_policy" ON "oauth_sync_states" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "oauth_sync_states_delete_policy" ON "oauth_sync_states" AS PERMISSIVE FOR DELETE TO "authenticated" USING (organization_id = current_setting('app.organization_id', true)::uuid);--> statement-breakpoint
