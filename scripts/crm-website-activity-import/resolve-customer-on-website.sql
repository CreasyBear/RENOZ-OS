-- Run on renoz-website: given CRM export columns, find candidate customers.
-- Replace :email and :normalized_name fragments with values from each CRM row.

-- 1) Strong: email match (lowercase)
SELECT id, name, email, 'email_match' AS resolution_method
FROM customers
WHERE deleted_at IS NULL
  AND email IS NOT NULL
  AND lower(trim(email)) = lower(trim(:crm_contact_email));

-- 2) Optional: UUID shortcut — only if (1) returned a row with same id OR names align
SELECT id, name, email, 'id_exists_on_website' AS resolution_method
FROM customers
WHERE deleted_at IS NULL
  AND id = :crm_lead_id::uuid;

-- 3) Weak: name contains / ilike (human must confirm; high false-positive risk)
SELECT id, name, email, 'fuzzy_name_review_required' AS resolution_method
FROM customers
WHERE deleted_at IS NULL
  AND (
    lower(trim(name)) = lower(trim(:crm_company_or_lead_name))
    OR lower(name) LIKE '%' || lower(trim(:crm_short_token)) || '%'
  )
ORDER BY name
LIMIT 20;
