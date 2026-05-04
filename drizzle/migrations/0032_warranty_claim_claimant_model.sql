CREATE TYPE "public"."warranty_claimant_role" AS ENUM('channel_partner', 'owner', 'internal', 'other');--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD COLUMN "claimant_role" "warranty_claimant_role" DEFAULT 'channel_partner' NOT NULL;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD COLUMN "claimant_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD COLUMN "claimant_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD COLUMN "channel_bypass_reason" text;--> statement-breakpoint
UPDATE "warranty_claims"
SET
  "claimant_role" = 'channel_partner',
  "claimant_customer_id" = "customer_id"
WHERE "claimant_customer_id" IS NULL;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_claimant_customer_id_customers_id_fk" FOREIGN KEY ("claimant_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_claimant_customer" ON "warranty_claims" USING btree ("claimant_customer_id");
