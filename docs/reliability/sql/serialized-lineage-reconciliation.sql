-- Serialized lineage reconciliation (idempotent).
-- Run this to repair known drift classes before release or during incident response.

-- 1) For shipment-linked serials:
--    - release stale active allocations
--    - set serialized status to shipped (unless already returned)
--    - clear current inventory pointer
WITH shipped_serials AS (
  SELECT
    sis.organization_id,
    sis.serialized_item_id,
    max(sis.shipped_at) AS shipped_at
  FROM shipment_item_serials sis
  GROUP BY sis.organization_id, sis.serialized_item_id
),
release_allocations AS (
  UPDATE order_line_serial_allocations a
  SET
    is_active = FALSE,
    released_at = COALESCE(a.released_at, now()),
    updated_at = now()
  FROM shipped_serials ss
  WHERE a.organization_id = ss.organization_id
    AND a.serialized_item_id = ss.serialized_item_id
    AND a.is_active = TRUE
  RETURNING a.id
)
UPDATE serialized_items si
SET
  status = 'shipped',
  current_inventory_id = NULL,
  updated_at = now()
FROM shipped_serials ss
WHERE si.organization_id = ss.organization_id
  AND si.id = ss.serialized_item_id
  AND si.status <> 'returned'
  AND si.status <> 'shipped';

-- 2) Add missing shipped events for shipment-linked serials.
WITH shipped_serials AS (
  SELECT
    sis.organization_id,
    sis.serialized_item_id,
    max(sis.shipped_at) AS shipped_at
  FROM shipment_item_serials sis
  GROUP BY sis.organization_id, sis.serialized_item_id
)
INSERT INTO serialized_item_events (
  organization_id,
  serialized_item_id,
  event_type,
  entity_type,
  entity_id,
  notes,
  occurred_at,
  created_at,
  updated_at
)
SELECT
  ss.organization_id,
  ss.serialized_item_id,
  'shipped'::serialized_item_event_type,
  'shipment_item_serials',
  NULL,
  'Reconciled shipped event from shipment linkage',
  ss.shipped_at,
  now(),
  now()
FROM shipped_serials ss
WHERE NOT EXISTS (
  SELECT 1
  FROM serialized_item_events sie
  WHERE sie.organization_id = ss.organization_id
    AND sie.serialized_item_id = ss.serialized_item_id
    AND sie.event_type = 'shipped'::serialized_item_event_type
);

-- 3) Align status for actively allocated serials (that are not shipped/returned).
UPDATE serialized_items si
SET
  status = 'allocated',
  updated_at = now()
WHERE si.status NOT IN ('allocated', 'shipped', 'returned')
  AND EXISTS (
    SELECT 1
    FROM order_line_serial_allocations a
    WHERE a.organization_id = si.organization_id
      AND a.serialized_item_id = si.id
      AND a.is_active = TRUE
  );
