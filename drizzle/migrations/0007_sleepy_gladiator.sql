ALTER TABLE "organizations" ALTER COLUMN "settings" SET DEFAULT '{"portalBranding":{}}'::jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "date_format" text DEFAULT 'DD/MM/YYYY' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "time_format" text DEFAULT '12h' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "number_format" text DEFAULT '1,234.56' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_year_start" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "week_start_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_tax_rate" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_payment_terms" integer DEFAULT 30 NOT NULL;
