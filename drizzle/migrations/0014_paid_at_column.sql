-- Add paid_at timestamp to orders table for tracking when payment was received
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;

-- Optional: Set paid_at for existing paid orders based on updated_at
UPDATE "orders"
SET "paid_at" = "updated_at"
WHERE "payment_status" = 'paid'
  AND "balance_due" = 0
  AND "paid_at" IS NULL;
