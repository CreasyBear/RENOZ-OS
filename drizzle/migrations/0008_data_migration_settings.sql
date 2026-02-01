-- ============================================================================
-- Data Migration: Backfill JSONB settings to new columns
-- ============================================================================
-- This script copies values from the 'settings' JSONB blob to the new
-- first-class columns on the 'organizations' table.
--
-- Run this AFTER the schema migration (0007_sleepy_gladiator.sql) has been applied.
-- This is part of the "Parallel Change" (Expand-Contract) pattern.
-- ============================================================================

-- Step 1: Backfill values from JSONB to new columns
-- Only update if the JSONB key exists and the column has its default value
UPDATE organizations
SET
  date_format = COALESCE((settings->>'dateFormat')::text, date_format),
  time_format = COALESCE((settings->>'timeFormat')::text, time_format),
  number_format = COALESCE((settings->>'numberFormat')::text, number_format),
  fiscal_year_start = COALESCE((settings->>'fiscalYearStart')::integer, fiscal_year_start),
  week_start_day = COALESCE((settings->>'weekStartDay')::integer, week_start_day),
  default_tax_rate = COALESCE((settings->>'defaultTaxRate')::integer, default_tax_rate),
  default_payment_terms = COALESCE((settings->>'defaultPaymentTerms')::integer, default_payment_terms)
WHERE settings IS NOT NULL;

-- Step 2: Clean up deprecated keys from JSONB (Contract phase)
-- Remove keys that are now stored in first-class columns
UPDATE organizations
SET settings = settings
  - 'timezone'
  - 'locale'
  - 'currency'
  - 'dateFormat'
  - 'timeFormat'
  - 'numberFormat'
  - 'fiscalYearStart'
  - 'weekStartDay'
  - 'defaultTaxRate'
  - 'defaultPaymentTerms'
WHERE settings IS NOT NULL;

-- Verification: Check the migration results
-- SELECT id, name, timezone, locale, currency, date_format, time_format,
--        fiscal_year_start, week_start_day, default_tax_rate, default_payment_terms,
--        settings
-- FROM organizations
-- LIMIT 5;
