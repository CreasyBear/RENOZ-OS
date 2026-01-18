-- ============================================================================
-- Inventory Alert Webhooks
-- ============================================================================
-- Configures database webhooks to trigger on inventory updates when
-- stock quantity falls below reorder point (low stock alert).
--
-- Uses Supabase pg_net extension for HTTP calls from PostgreSQL.
--
-- @see https://supabase.com/docs/guides/database/webhooks
-- ============================================================================

-- ============================================================================
-- INVENTORY LOW STOCK WEBHOOK TRIGGER FUNCTION
-- ============================================================================
-- This function sends HTTP POST to the inventory-alert Edge Function
-- when inventory is updated AND quantity < reorder_point.

CREATE OR REPLACE FUNCTION trigger_inventory_alert_webhook()
RETURNS trigger AS $$
DECLARE
  webhook_url text;
  webhook_secret text;
  payload jsonb;
  request_id bigint;
  is_low_stock boolean;
  was_low_stock boolean;
BEGIN
  -- Only process UPDATEs (inventory rarely has user-initiated INSERTs)
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Check if this is a low stock situation
  is_low_stock := NEW.quantity < COALESCE(NEW.reorder_point, 0);
  was_low_stock := OLD.quantity < COALESCE(OLD.reorder_point, 0);

  -- Only trigger if:
  -- 1. Currently low stock, AND
  -- 2. Either wasn't low stock before OR quantity changed
  IF NOT is_low_stock THEN
    RETURN NEW;
  END IF;

  -- Skip if already low and quantity didn't change (prevent duplicate alerts)
  IF was_low_stock AND OLD.quantity = NEW.quantity THEN
    RETURN NEW;
  END IF;

  -- Get webhook configuration
  webhook_url := current_setting('app.inventory_alert_webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);

  -- If no URL configured, skip
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- Build webhook payload
  payload := jsonb_build_object(
    'type', 'LOW_STOCK_ALERT',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'inventory_id', NEW.id,
    'product_id', NEW.product_id,
    'location_id', NEW.location_id,
    'organization_id', NEW.organization_id,
    'current_quantity', NEW.quantity,
    'reorder_point', NEW.reorder_point,
    'reorder_quantity', NEW.reorder_quantity,
    'previous_quantity', OLD.quantity,
    'deficit', NEW.reorder_point - NEW.quantity,
    'is_critical', NEW.quantity <= 0,
    'triggered_at', NOW()
  );

  -- Send async HTTP request via pg_net
  SELECT INTO request_id net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook_secret, ''),
      'X-Webhook-Event', 'LOW_STOCK_ALERT',
      'X-Product-Id', NEW.product_id::text
    ),
    body := payload
  );

  -- Log the alert
  RAISE LOG 'Inventory alert triggered: product %, location %, qty % < reorder_point %, request_id: %',
    NEW.product_id, NEW.location_id, NEW.quantity, NEW.reorder_point, request_id;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Inventory alert webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INVENTORY ALERT WEBHOOK TRIGGER
-- ============================================================================
-- Triggers on UPDATE events on the inventory table

DROP TRIGGER IF EXISTS inventory_alert_webhook_trigger ON inventory;
CREATE TRIGGER inventory_alert_webhook_trigger
  AFTER UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION trigger_inventory_alert_webhook();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION trigger_inventory_alert_webhook() IS
  'Sends webhook to Edge Function when inventory falls below reorder point';

-- ============================================================================
-- CONFIGURATION NOTES
-- ============================================================================
-- To configure the webhook URL:
--
-- Via SQL (dev/testing):
--   ALTER DATABASE postgres SET app.inventory_alert_webhook_url = 'https://your-project.supabase.co/functions/v1/inventory-alert';
--
-- The webhook_secret should be shared with app.webhook_secret.
-- ============================================================================
