-- CRM → renoz-website user mapping (by email). IDs differ per Supabase project.
-- Step A: run on renoz-crm
-- Step B: run on renoz-website
-- Step C: join in spreadsheet or ETL on email.

-- === A) renoz-crm ===
SELECT id AS crm_user_id, email
FROM users
ORDER BY email;

-- === B) renoz-website ===
SELECT id AS website_user_id, email
FROM users
ORDER BY email;

-- === C) Example join (paste CSVs into temp tables or use dblink — not shown) ===
-- crm_user_id | email                  | website_user_id
-- ------------+------------------------+------------------
-- (match rows where lower(trim(email)) is equal)

-- Actors observed in both projects (verify in your environment):
-- jeremy.e@renoz.energy
-- joel.c@renoz.energy
-- jack.sc@renoz.energy
-- ansen.s@renoz.energy
-- simon.c@renoz.energy
-- CRM-only example: lili.j@renoz.energy — may have no website user; block import
--   for rows created_by that user unless policy allows null user_id.
