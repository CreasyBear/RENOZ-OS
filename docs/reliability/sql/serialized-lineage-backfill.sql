-- Serialized lineage backfill (run after 0025_serialized_lineage_hardening.sql)
-- Idempotent best-effort backfill from existing inventory/order/shipment state.

-- 1) Seed serialized_items from inventory rows that already carry serial_number.
INSERT INTO serialized_items (
  organization_id,
  product_id,
  serial_number_raw,
  serial_number_normalized,
  status,
  current_inventory_id,
  created_at,
  updated_at
)
SELECT
  i.organization_id,
  i.product_id,
  i.serial_number,
  UPPER(TRIM(i.serial_number)),
  CASE
    WHEN i.status = 'available' THEN 'available'::serialized_item_status
    WHEN i.status = 'allocated' THEN 'allocated'::serialized_item_status
    ELSE 'quarantined'::serialized_item_status
  END,
  i.id,
  i.created_at,
  i.updated_at
FROM inventory i
WHERE i.serial_number IS NOT NULL
  AND TRIM(i.serial_number) <> ''
ON CONFLICT (organization_id, serial_number_normalized) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  current_inventory_id = EXCLUDED.current_inventory_id,
  updated_at = now();

-- 1b) Backfill source receipt linkage from purchase_order_receipt_items.serial_numbers.
WITH receipt_serials AS (
  SELECT
    pri.organization_id,
    pri.id AS receipt_item_id,
    UPPER(TRIM(sn.serial_number)) AS serial_number_normalized
  FROM purchase_order_receipt_items pri
  JOIN LATERAL unnest(COALESCE(pri.serial_numbers, ARRAY[]::text[])) AS sn(serial_number) ON TRUE
  WHERE sn.serial_number IS NOT NULL
    AND TRIM(sn.serial_number) <> ''
)
UPDATE serialized_items si
SET
  source_receipt_item_id = rs.receipt_item_id,
  updated_at = now()
FROM receipt_serials rs
WHERE si.organization_id = rs.organization_id
  AND si.serial_number_normalized = rs.serial_number_normalized
  AND si.source_receipt_item_id IS NULL;

-- 2) Backfill active order allocations from order_line_items.allocated_serial_numbers.
INSERT INTO order_line_serial_allocations (
  organization_id,
  serialized_item_id,
  order_line_item_id,
  is_active,
  allocated_at,
  created_at,
  updated_at
)
SELECT
  oli.organization_id,
  si.id,
  oli.id,
  TRUE,
  now(),
  now(),
  now()
FROM order_line_items oli
JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(oli.allocated_serial_numbers) = 'array' THEN oli.allocated_serial_numbers
    ELSE '[]'::jsonb
  END
) sn(value) ON TRUE
JOIN serialized_items si
  ON si.organization_id = oli.organization_id
 AND si.serial_number_normalized = UPPER(TRIM(sn.value))
WHERE oli.allocated_serial_numbers IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) Backfill shipment serial links from shipment_items.serial_numbers.
INSERT INTO shipment_item_serials (
  organization_id,
  shipment_item_id,
  serialized_item_id,
  shipped_at,
  created_at,
  updated_at
)
SELECT
  sh.organization_id,
  si2.id AS shipment_item_id,
  szi.id AS serialized_item_id,
  COALESCE(sh.shipped_at, sh.created_at),
  now(),
  now()
FROM shipment_items si2
JOIN order_shipments sh ON sh.id = si2.shipment_id
JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(si2.serial_numbers) = 'array' THEN si2.serial_numbers
    ELSE '[]'::jsonb
  END
) sn(value) ON TRUE
JOIN serialized_items szi
  ON szi.organization_id = sh.organization_id
 AND szi.serial_number_normalized = UPPER(TRIM(sn.value))
WHERE si2.serial_numbers IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4) Normalize serialized_items.status using allocation/shipment evidence.
UPDATE serialized_items si
SET status = CASE
  WHEN EXISTS (
    SELECT 1
    FROM order_line_serial_allocations a
    WHERE a.organization_id = si.organization_id
      AND a.serialized_item_id = si.id
      AND a.is_active = TRUE
  ) THEN 'allocated'::serialized_item_status
  WHEN EXISTS (
    SELECT 1
    FROM shipment_item_serials sis
    WHERE sis.organization_id = si.organization_id
      AND sis.serialized_item_id = si.id
  ) THEN 'shipped'::serialized_item_status
  ELSE si.status
END,
updated_at = now();

-- 5) Backfill warranty registration events from warranties.product_serial.
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
  w.organization_id,
  si.id,
  'warranty_registered'::serialized_item_event_type,
  'warranty',
  w.id,
  'Backfilled from warranties.product_serial',
  COALESCE(w.registration_date, w.created_at, now()),
  now(),
  now()
FROM warranties w
JOIN serialized_items si
  ON si.organization_id = w.organization_id
 AND si.serial_number_normalized = UPPER(TRIM(w.product_serial))
WHERE w.product_serial IS NOT NULL
  AND TRIM(w.product_serial) <> ''
  AND w.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM serialized_item_events sie
    WHERE sie.organization_id = w.organization_id
      AND sie.serialized_item_id = si.id
      AND sie.event_type = 'warranty_registered'::serialized_item_event_type
      AND sie.entity_type = 'warranty'
      AND sie.entity_id = w.id
  );

-- 5b) Backfill received events from source receipt linkage.
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
  si.organization_id,
  si.id,
  'received'::serialized_item_event_type,
  'purchase_order_receipt_item',
  pri.id,
  'Backfilled from purchase_order_receipt_items.serial_numbers',
  COALESCE(pr.received_at, pri.created_at, now()),
  now(),
  now()
FROM serialized_items si
JOIN purchase_order_receipt_items pri ON pri.id = si.source_receipt_item_id
JOIN purchase_order_receipts pr ON pr.id = pri.receipt_id
WHERE si.source_receipt_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM serialized_item_events sie
    WHERE sie.organization_id = si.organization_id
      AND sie.serialized_item_id = si.id
      AND sie.event_type = 'received'::serialized_item_event_type
      AND sie.entity_type = 'purchase_order_receipt_item'
      AND sie.entity_id = pri.id
  );

-- 6) Backfill warranty claim events by claim submission.
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
  wc.organization_id,
  si.id,
  'warranty_claimed'::serialized_item_event_type,
  'warranty_claim',
  wc.id,
  'Backfilled from warranty_claims via warranty serial',
  COALESCE(wc.submitted_at, wc.created_at, now()),
  now(),
  now()
FROM warranty_claims wc
JOIN warranties w ON w.id = wc.warranty_id
JOIN serialized_items si
  ON si.organization_id = wc.organization_id
 AND si.serial_number_normalized = UPPER(TRIM(w.product_serial))
WHERE w.product_serial IS NOT NULL
  AND TRIM(w.product_serial) <> ''
  AND w.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM serialized_item_events sie
    WHERE sie.organization_id = wc.organization_id
      AND sie.serialized_item_id = si.id
      AND sie.event_type = 'warranty_claimed'::serialized_item_event_type
      AND sie.entity_type = 'warranty_claim'
      AND sie.entity_id = wc.id
  );

-- 7) Backfill RMA requested events from rma_line_items.serial_number.
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
  ra.organization_id,
  si.id,
  'rma_requested'::serialized_item_event_type,
  'rma_line_item',
  rli.id,
  'Backfilled from rma_line_items.serial_number',
  COALESCE(ra.created_at, rli.created_at, now()),
  now(),
  now()
FROM rma_line_items rli
JOIN return_authorizations ra ON ra.id = rli.rma_id
JOIN serialized_items si
  ON si.organization_id = ra.organization_id
 AND si.serial_number_normalized = UPPER(TRIM(rli.serial_number))
WHERE rli.serial_number IS NOT NULL
  AND TRIM(rli.serial_number) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM serialized_item_events sie
    WHERE sie.organization_id = ra.organization_id
      AND sie.serialized_item_id = si.id
      AND sie.event_type = 'rma_requested'::serialized_item_event_type
      AND sie.entity_type = 'rma_line_item'
      AND sie.entity_id = rli.id
  );

-- 8) Backfill RMA received events for RMAs already received/processed.
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
  ra.organization_id,
  si.id,
  'rma_received'::serialized_item_event_type,
  'rma',
  ra.id,
  'Backfilled from return_authorizations status',
  COALESCE(NULLIF(ra.received_at, '')::timestamptz, ra.updated_at, now()),
  now(),
  now()
FROM rma_line_items rli
JOIN return_authorizations ra ON ra.id = rli.rma_id
JOIN serialized_items si
  ON si.organization_id = ra.organization_id
 AND si.serial_number_normalized = UPPER(TRIM(rli.serial_number))
WHERE rli.serial_number IS NOT NULL
  AND TRIM(rli.serial_number) <> ''
  AND ra.status IN ('received', 'processed')
  AND NOT EXISTS (
    SELECT 1
    FROM serialized_item_events sie
    WHERE sie.organization_id = ra.organization_id
      AND sie.serialized_item_id = si.id
      AND sie.event_type = 'rma_received'::serialized_item_event_type
      AND sie.entity_type = 'rma'
      AND sie.entity_id = ra.id
  );
