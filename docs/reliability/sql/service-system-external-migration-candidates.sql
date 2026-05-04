-- Service-system external migration candidate queries
--
-- Purpose:
-- - identify legacy activated warranties that still need service linkage
-- - support external migration dry-run scoping
-- - support post-run verification
--
-- Notes:
-- - adjust WHERE clauses for your organization / rollout scope
-- - these are inspection queries, not the migration implementation itself

-- ============================================================
-- 1. Primary candidate query
-- ============================================================
-- Activated warranties that are not already linked to a service system.

select
  w.id as warranty_id,
  w.organization_id,
  w.warranty_number,
  w.customer_id as commercial_customer_id,
  c.name as commercial_customer_name,
  w.service_system_id,
  w.source_entitlement_id,
  w.owner_record_id,
  wor.full_name as owner_full_name,
  wor.email as owner_email,
  wor.phone as owner_phone,
  wor.address as owner_address,
  wor.notes as owner_notes,
  we.order_id as source_order_id,
  o.order_number as source_order_number,
  ss.id as existing_service_system_id
from warranties w
left join customers c
  on c.id = w.customer_id
left join warranty_owner_records wor
  on wor.id = w.owner_record_id
left join warranty_entitlements we
  on we.id = w.source_entitlement_id
left join orders o
  on o.id = we.order_id
left join service_systems ss
  on ss.id = w.service_system_id
where w.status = 'active'
  and w.service_system_id is null
order by w.id asc;

-- ============================================================
-- 2. Candidate query scoped to one organization
-- ============================================================

select
  w.id as warranty_id,
  w.warranty_number,
  w.customer_id as commercial_customer_id,
  w.source_entitlement_id,
  w.owner_record_id
from warranties w
where w.organization_id = :organization_id
  and w.status = 'active'
  and w.service_system_id is null
order by w.id asc
limit :limit;

-- ============================================================
-- 3. Candidate query with checkpoint
-- ============================================================

select
  w.id as warranty_id,
  w.warranty_number,
  w.organization_id
from warranties w
where w.organization_id = :organization_id
  and w.status = 'active'
  and w.service_system_id is null
  and w.id > :after_warranty_id
order by w.id asc
limit :limit;

-- ============================================================
-- 4. Sanity check: linked warranties with no current ownership
-- ============================================================
-- Use after live batches.

select
  w.id as warranty_id,
  w.warranty_number,
  w.service_system_id
from warranties w
left join service_system_ownerships sso
  on sso.service_system_id = w.service_system_id
 and sso.ended_at is null
where w.service_system_id is not null
  and sso.id is null
order by w.id asc;

-- ============================================================
-- 5. Sanity check: systems with duplicate current ownership rows
-- ============================================================
-- This should return zero rows.

select
  sso.service_system_id,
  count(*) as current_ownership_count
from service_system_ownerships sso
where sso.ended_at is null
group by sso.service_system_id
having count(*) > 1;

-- ============================================================
-- 6. Sanity check: unresolved linkage reviews created by migration
-- ============================================================

select
  slr.id as review_id,
  slr.reason_code,
  slr.source_warranty_id,
  w.warranty_number,
  slr.candidate_system_ids,
  slr.created_at
from service_linkage_reviews slr
left join warranties w
  on w.id = slr.source_warranty_id
where slr.status = 'pending'
order by slr.created_at desc;

-- ============================================================
-- 7. Spot check: warranty -> service system -> current owner
-- ============================================================

select
  w.id as warranty_id,
  w.warranty_number,
  ss.id as service_system_id,
  ss.display_name as service_system_name,
  so.id as current_owner_id,
  so.full_name as current_owner_name,
  so.email as current_owner_email
from warranties w
left join service_systems ss
  on ss.id = w.service_system_id
left join service_system_ownerships sso
  on sso.service_system_id = ss.id
 and sso.ended_at is null
left join service_owners so
  on so.id = sso.service_owner_id
where w.id = :warranty_id;
