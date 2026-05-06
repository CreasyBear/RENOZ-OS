ALTER TABLE "oauth_connections"
  ADD COLUMN IF NOT EXISTS "external_account_label" text;
