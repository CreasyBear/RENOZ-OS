-- Serialized lineage CRM bridge for RENOZ-CRM (legacy schema).
-- Safe to run multiple times (idempotent).
--
-- Purpose:
-- 1) Create canonical serialized lineage tables in the old CRM DB.
-- 2) Backfill from legacy serial sources:
--    - inventory_items.serial_number
--    - order_line_items.assigned_serial_numbers
--    - shipment_items.serial_numbers
-- 3) Produce canonical events so lineage is queryable with the same contract.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'serialized_item_status') THEN
    CREATE TYPE serialized_item_status AS ENUM (
      'available',
      'allocated',
      'shipped',
      'returned',
      'quarantined',
      'scrapped'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'serialized_item_event_type') THEN
    CREATE TYPE serialized_item_event_type AS ENUM (
      'received',
      'allocated',
      'deallocated',
      'shipped',
      'returned',
      'warranty_registered',
      'warranty_claimed',
      'rma_requested',
      'rma_received',
      'status_changed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS serialized_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  serial_number_raw text NOT NULL,
  serial_number_normalized text NOT NULL,
  status serialized_item_status NOT NULL DEFAULT 'available',
  current_inventory_item_id uuid,
  source_shipment_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_serialized_items_org_serial_unique
  ON serialized_items (organization_id, serial_number_normalized);
CREATE INDEX IF NOT EXISTS idx_crm_serialized_items_org_status
  ON serialized_items (organization_id, status);

CREATE TABLE IF NOT EXISTS order_line_serial_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  serialized_item_id uuid NOT NULL,
  order_line_item_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_order_line_serial_alloc_active_unique
  ON order_line_serial_allocations (organization_id, serialized_item_id)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crm_order_line_serial_alloc_order_line
  ON order_line_serial_allocations (order_line_item_id);

CREATE TABLE IF NOT EXISTS shipment_item_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  shipment_item_id uuid NOT NULL,
  serialized_item_id uuid NOT NULL,
  shipped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_shipment_item_serial_unique
  ON shipment_item_serials (shipment_item_id, serialized_item_id);
CREATE INDEX IF NOT EXISTS idx_crm_shipment_item_serial_org_serialized
  ON shipment_item_serials (organization_id, serialized_item_id);

CREATE TABLE IF NOT EXISTS serialized_item_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  serialized_item_id uuid NOT NULL,
  event_type serialized_item_event_type NOT NULL,
  entity_type text,
  entity_id uuid,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_serialized_events_org_serialized_occurred
  ON serialized_item_events (organization_id, serialized_item_id, occurred_at);

-- 1) Seed canonical serial identity from inventory_items.
INSERT INTO serialized_items (
  organization_id,
  product_id,
  serial_number_raw,
  serial_number_normalized,
  status,
  current_inventory_item_id,
  created_at,
  updated_at
)
SELECT
  i.organization_id,
  i.product_id,
  i.serial_number,
  UPPER(TRIM(i.serial_number)),
  CASE
    WHEN i.status = 'ALLOCATED' THEN 'allocated'::serialized_item_status
    WHEN i.status = 'SOLD' THEN 'shipped'::serialized_item_status
    WHEN i.status = 'RETURNED' THEN 'returned'::serialized_item_status
    WHEN i.status = 'IN_STOCK' THEN 'available'::serialized_item_status
    ELSE 'quarantined'::serialized_item_status
  END,
  i.id,
  COALESCE(i.created_at, now()),
  COALESCE(i.updated_at, now())
FROM inventory_items i
WHERE i.serial_number IS NOT NULL
  AND TRIM(i.serial_number) <> ''
ON CONFLICT (organization_id, serial_number_normalized) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  status = EXCLUDED.status,
  current_inventory_item_id = EXCLUDED.current_inventory_item_id,
  updated_at = now();

-- 2) Backfill active order allocations from order_line_items.assigned_serial_numbers.
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
  true,
  COALESCE(oli.updated_at, now()),
  now(),
  now()
FROM order_line_items oli
JOIN LATERAL unnest(COALESCE(oli.assigned_serial_numbers, '{}'::text[])) sn(value) ON TRUE
JOIN serialized_items si
  ON si.organization_id = oli.organization_id
 AND si.serial_number_normalized = UPPER(TRIM(sn.value))
WHERE sn.value IS NOT NULL
  AND TRIM(sn.value) <> ''
ON CONFLICT DO NOTHING;

-- 3) Backfill shipment serial links from shipment_items.serial_numbers + shipments organization context.
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
  si2.id,
  szi.id,
  COALESCE(sh.arrival_date, sh.created_at, now()),
  now(),
  now()
FROM shipment_items si2
JOIN shipments sh ON sh.id = si2.shipment_id
JOIN LATERAL unnest(COALESCE(si2.serial_numbers, '{}'::text[])) sn(value) ON TRUE
JOIN serialized_items szi
  ON szi.organization_id = sh.organization_id
 AND szi.serial_number_normalized = UPPER(TRIM(sn.value))
WHERE sn.value IS NOT NULL
  AND TRIM(sn.value) <> ''
ON CONFLICT DO NOTHING;

-- 4) Normalize status from allocation/shipment evidence.
UPDATE serialized_items si
SET status = CASE
  WHEN EXISTS (
    SELECT 1
    FROM shipment_item_serials sis
    WHERE sis.organization_id = si.organization_id
      AND sis.serialized_item_id = si.id
  ) THEN 'shipped'::serialized_item_status
  WHEN EXISTS (
    SELECT 1
    FROM order_line_serial_allocations a
    WHERE a.organization_id = si.organization_id
      AND a.serialized_item_id = si.id
      AND a.is_active = true
  ) THEN 'allocated'::serialized_item_status
  ELSE si.status
END,
updated_at = now();

-- 5) Backfill events.
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
  'allocated'::serialized_item_event_type,
  'order_line_item',
  a.order_line_item_id,
  'crm_import_allocated',
  COALESCE(a.allocated_at, a.created_at, now()),
  now(),
  now()
FROM order_line_serial_allocations a
JOIN serialized_items si ON si.id = a.serialized_item_id
WHERE a.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM serialized_item_events sie
    WHERE sie.organization_id = si.organization_id
      AND sie.serialized_item_id = si.id
      AND sie.event_type = 'allocated'::serialized_item_event_type
      AND sie.entity_type = 'order_line_item'
      AND sie.entity_id = a.order_line_item_id
  );

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
  'shipped'::serialized_item_event_type,
  'shipment_item',
  sis.shipment_item_id,
  'crm_import_shipped',
  COALESCE(sis.shipped_at, sis.created_at, now()),
  now(),
  now()
FROM shipment_item_serials sis
JOIN serialized_items si ON si.id = sis.serialized_item_id
WHERE NOT EXISTS (
  SELECT 1
  FROM serialized_item_events sie
  WHERE sie.organization_id = si.organization_id
    AND sie.serialized_item_id = si.id
    AND sie.event_type = 'shipped'::serialized_item_event_type
    AND sie.entity_type = 'shipment_item'
    AND sie.entity_id = sis.shipment_item_id
);
