-- ============================================================================
-- Realtime Broadcast Triggers
-- ============================================================================
-- Creates database triggers that broadcast changes via Supabase Realtime
-- using the realtime.broadcast_changes() function.
--
-- Channels are scoped by organization_id for multi-tenant isolation:
-- - orders:{organization_id}
-- - pipeline:{organization_id}
-- - inventory:{organization_id}
--
-- @see https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
-- ============================================================================

-- ============================================================================
-- ORDERS TABLE TRIGGER
-- ============================================================================
-- Broadcasts INSERT and UPDATE events to orders:{org_id} channel

CREATE OR REPLACE FUNCTION broadcast_order_changes()
RETURNS trigger AS $$
DECLARE
  channel_name text;
  payload jsonb;
BEGIN
  -- Build org-scoped channel name
  channel_name := 'orders:' || COALESCE(NEW.organization_id::text, OLD.organization_id::text);

  -- Build payload with relevant order data (avoid sensitive fields)
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', jsonb_build_object(
      'id', COALESCE(NEW.id, OLD.id),
      'order_number', COALESCE(NEW.order_number, OLD.order_number),
      'status', COALESCE(NEW.status, OLD.status),
      'payment_status', COALESCE(NEW.payment_status, OLD.payment_status),
      'customer_id', COALESCE(NEW.customer_id, OLD.customer_id),
      'total', COALESCE((NEW.totals->>'total')::numeric, (OLD.totals->>'total')::numeric),
      'updated_at', COALESCE(NEW.updated_at, OLD.updated_at)
    ),
    'old_record', CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'id', OLD.id,
        'status', OLD.status,
        'payment_status', OLD.payment_status
      )
      ELSE NULL
    END
  );

  -- Broadcast to the channel
  PERFORM realtime.broadcast_changes(
    channel_name,
    'db_changes',
    payload,
    'private'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for orders
DROP TRIGGER IF EXISTS orders_broadcast_trigger ON orders;
CREATE TRIGGER orders_broadcast_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_order_changes();

-- ============================================================================
-- OPPORTUNITIES (PIPELINE) TABLE TRIGGER
-- ============================================================================
-- Broadcasts INSERT and UPDATE events to pipeline:{org_id} channel

CREATE OR REPLACE FUNCTION broadcast_pipeline_changes()
RETURNS trigger AS $$
DECLARE
  channel_name text;
  payload jsonb;
BEGIN
  -- Build org-scoped channel name
  channel_name := 'pipeline:' || COALESCE(NEW.organization_id::text, OLD.organization_id::text);

  -- Build payload with relevant opportunity data
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', jsonb_build_object(
      'id', COALESCE(NEW.id, OLD.id),
      'name', COALESCE(NEW.name, OLD.name),
      'stage', COALESCE(NEW.stage, OLD.stage),
      'value', COALESCE(NEW.value, OLD.value),
      'probability', COALESCE(NEW.probability, OLD.probability),
      'customer_id', COALESCE(NEW.customer_id, OLD.customer_id),
      'owner_id', COALESCE(NEW.owner_id, OLD.owner_id),
      'close_date', COALESCE(NEW.close_date, OLD.close_date),
      'updated_at', COALESCE(NEW.updated_at, OLD.updated_at)
    ),
    'old_record', CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'id', OLD.id,
        'stage', OLD.stage,
        'value', OLD.value,
        'probability', OLD.probability
      )
      ELSE NULL
    END
  );

  -- Broadcast to the channel
  PERFORM realtime.broadcast_changes(
    channel_name,
    'db_changes',
    payload,
    'private'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for opportunities
DROP TRIGGER IF EXISTS opportunities_broadcast_trigger ON opportunities;
CREATE TRIGGER opportunities_broadcast_trigger
  AFTER INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_pipeline_changes();

-- ============================================================================
-- INVENTORY TABLE TRIGGER
-- ============================================================================
-- Broadcasts UPDATE events to inventory:{org_id} channel
-- Only broadcasts on UPDATE since inventory rarely has INSERTs from user actions

CREATE OR REPLACE FUNCTION broadcast_inventory_changes()
RETURNS trigger AS $$
DECLARE
  channel_name text;
  payload jsonb;
BEGIN
  -- Build org-scoped channel name
  channel_name := 'inventory:' || COALESCE(NEW.organization_id::text, OLD.organization_id::text);

  -- Build payload with relevant inventory data
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', jsonb_build_object(
      'id', COALESCE(NEW.id, OLD.id),
      'product_id', COALESCE(NEW.product_id, OLD.product_id),
      'location_id', COALESCE(NEW.location_id, OLD.location_id),
      'quantity', COALESCE(NEW.quantity, OLD.quantity),
      'reserved_quantity', COALESCE(NEW.reserved_quantity, OLD.reserved_quantity),
      'reorder_point', COALESCE(NEW.reorder_point, OLD.reorder_point),
      'reorder_quantity', COALESCE(NEW.reorder_quantity, OLD.reorder_quantity),
      'updated_at', COALESCE(NEW.updated_at, OLD.updated_at)
    ),
    'old_record', CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'id', OLD.id,
        'quantity', OLD.quantity,
        'reserved_quantity', OLD.reserved_quantity
      )
      ELSE NULL
    END,
    'alert', CASE
      WHEN NEW.quantity < COALESCE(NEW.reorder_point, 0) THEN true
      ELSE false
    END
  );

  -- Broadcast to the channel
  PERFORM realtime.broadcast_changes(
    channel_name,
    'db_changes',
    payload,
    'private'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for inventory
DROP TRIGGER IF EXISTS inventory_broadcast_trigger ON inventory;
CREATE TRIGGER inventory_broadcast_trigger
  AFTER UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_inventory_changes();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION broadcast_order_changes() IS
  'Broadcasts order changes to org-scoped realtime channel (orders:{org_id})';

COMMENT ON FUNCTION broadcast_pipeline_changes() IS
  'Broadcasts opportunity changes to org-scoped realtime channel (pipeline:{org_id})';

COMMENT ON FUNCTION broadcast_inventory_changes() IS
  'Broadcasts inventory changes to org-scoped realtime channel (inventory:{org_id})';
