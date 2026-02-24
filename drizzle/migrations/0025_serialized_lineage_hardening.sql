-- Canonical serialized lineage hardening (additive, dual-write compatible)

DO $$ BEGIN
  CREATE TYPE serialized_item_status AS ENUM (
    'available',
    'allocated',
    'shipped',
    'returned',
    'quarantined',
    'scrapped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS serialized_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  serial_number_raw text NOT NULL,
  serial_number_normalized text NOT NULL,
  status serialized_item_status NOT NULL DEFAULT 'available',
  current_inventory_id uuid REFERENCES inventory(id) ON DELETE SET NULL,
  source_receipt_item_id uuid REFERENCES purchase_order_receipt_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_serialized_items_org_serial_unique
  ON serialized_items(organization_id, serial_number_normalized);
CREATE INDEX IF NOT EXISTS idx_serialized_items_org_product
  ON serialized_items(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_serialized_items_org_status
  ON serialized_items(organization_id, status);

CREATE TABLE IF NOT EXISTS order_line_serial_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  serialized_item_id uuid NOT NULL REFERENCES serialized_items(id) ON DELETE CASCADE,
  order_line_item_id uuid NOT NULL REFERENCES order_line_items(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_line_serial_allocations_active_unique
  ON order_line_serial_allocations(organization_id, serialized_item_id)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_order_line_serial_allocations_order_line
  ON order_line_serial_allocations(order_line_item_id);
CREATE INDEX IF NOT EXISTS idx_order_line_serial_allocations_org_active
  ON order_line_serial_allocations(organization_id, is_active);

CREATE TABLE IF NOT EXISTS shipment_item_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_item_id uuid NOT NULL REFERENCES shipment_items(id) ON DELETE CASCADE,
  serialized_item_id uuid NOT NULL REFERENCES serialized_items(id) ON DELETE CASCADE,
  shipped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_item_serials_unique
  ON shipment_item_serials(shipment_item_id, serialized_item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_item_serials_org_serialized
  ON shipment_item_serials(organization_id, serialized_item_id);

CREATE TABLE IF NOT EXISTS serialized_item_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  serialized_item_id uuid NOT NULL REFERENCES serialized_items(id) ON DELETE CASCADE,
  event_type serialized_item_event_type NOT NULL,
  entity_type text,
  entity_id uuid,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_serialized_item_events_org_serialized_occurred
  ON serialized_item_events(organization_id, serialized_item_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_serialized_item_events_entity
  ON serialized_item_events(entity_type, entity_id);
