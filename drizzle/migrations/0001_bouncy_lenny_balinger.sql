CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hashed_token" text NOT NULL,
	"token_prefix" text NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"scopes" jsonb DEFAULT '["read"]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_used_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoked_reason" text
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" "activity_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "activity_action" NOT NULL,
	"created_by" uuid,
	"changes" jsonb,
	"metadata" jsonb,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"failure_reason" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sender_id" uuid,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"customer_id" uuid,
	"subject" text NOT NULL,
	"body_html" text,
	"body_text" text,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"campaign_id" uuid,
	"template_id" text,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"bounce_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_tokens_hashed_token_idx" ON "api_tokens" USING btree ("hashed_token");--> statement-breakpoint
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_tokens_organization_id_idx" ON "api_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_tokens_active_idx" ON "api_tokens" USING btree ("organization_id","revoked_at","expires_at");--> statement-breakpoint
CREATE INDEX "api_tokens_prefix_idx" ON "api_tokens" USING btree ("token_prefix");--> statement-breakpoint
CREATE INDEX "idx_activities_entity" ON "activities" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_activities_timeline" ON "activities" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activities_user" ON "activities" USING btree ("organization_id","created_by");--> statement-breakpoint
CREATE INDEX "idx_activities_action" ON "activities" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_status" ON "notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_org_user" ON "notifications" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_email_history_campaign" ON "email_history" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_template" ON "email_history" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_org_status" ON "email_history" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_email_history_org_created" ON "email_history" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_email_history_customer" ON "email_history" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_email_history_sender" ON "email_history" USING btree ("sender_id");--> statement-breakpoint
CREATE POLICY "api_tokens_org_isolation" ON "api_tokens" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      )) WITH CHECK (organization_id = (
        SELECT organization_id FROM users WHERE auth_id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "api_tokens_owner_access" ON "api_tokens" AS PERMISSIVE FOR ALL TO "authenticated" USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM users
          WHERE auth_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND organization_id = api_tokens.organization_id
        )
      );