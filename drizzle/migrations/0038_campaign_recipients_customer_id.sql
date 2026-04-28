ALTER TABLE "campaign_recipients"
  ADD COLUMN IF NOT EXISTS "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_campaign_recipients_customer"
  ON "campaign_recipients" ("customer_id");

UPDATE "campaign_recipients" cr
SET "customer_id" = c."customer_id"
FROM "contacts" c
WHERE cr."contact_id" = c."id"
  AND cr."customer_id" IS NULL;
