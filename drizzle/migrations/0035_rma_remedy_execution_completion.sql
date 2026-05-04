CREATE TYPE "public"."rma_execution_status" AS ENUM('pending', 'blocked', 'completed');--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD COLUMN "execution_status" "rma_execution_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD COLUMN "execution_blocked_reason" text;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD COLUMN "execution_completed_at" text;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD COLUMN "execution_completed_by" uuid;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD COLUMN "refund_payment_id" uuid;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD COLUMN "credit_note_id" uuid;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD COLUMN "replacement_order_id" uuid;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_execution_completed_by_users_id_fk" FOREIGN KEY ("execution_completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_refund_payment_id_order_payments_id_fk" FOREIGN KEY ("refund_payment_id") REFERENCES "public"."order_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_credit_note_id_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_replacement_order_id_orders_id_fk" FOREIGN KEY ("replacement_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rma_org_execution_status" ON "return_authorizations" USING btree ("organization_id","execution_status");