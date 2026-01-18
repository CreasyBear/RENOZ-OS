-- ============================================================================
-- Order Database Webhooks
-- ============================================================================
-- Configures database webhooks to trigger on order events for downstream
-- processing via Edge Functions.
--
-- Uses Supabase pg_net extension for HTTP calls from PostgreSQL.
--
-- Webhook targets: Edge Function endpoint for order processing
-- Events: INSERT (new orders), UPDATE (status changes)
--
-- @see https://supabase.com/docs/guides/database/webhooks
-- ============================================================================

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- WEBHOOK CONFIGURATION
-- ============================================================================
-- Note: In production, these would be configured via Supabase Dashboard or
-- supabase_functions.http_request() calls. This migration sets up the
-- necessary infrastructure and trigger functions.
--
-- The actual webhook URL would be:
-- https://<project-ref>.supabase.co/functions/v1/order-webhook
-- ============================================================================

-- ============================================================================
-- ORDER WEBHOOK TRIGGER FUNCTION
-- ============================================================================
-- This function sends HTTP POST to the order-webhook Edge Function
-- when orders are inserted or updated.

CREATE OR REPLACE FUNCTION trigger_order_webhook()
RETURNS trigger AS $$
DECLARE
  webhook_url text;
  webhook_secret text;
  payload jsonb;
  request_id bigint;
BEGIN
  -- Get webhook configuration from vault or environment
  -- In production, use Supabase Vault for secrets
  webhook_url := current_setting('app.order_webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);

  -- If no URL configured, skip (allows graceful degradation in dev)
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build webhook payload matching Supabase webhook format
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE jsonb_build_object(
        'id', NEW.id,
        'order_number', NEW.order_number,
        'status', NEW.status,
        'payment_status', NEW.payment_status,
        'organization_id', NEW.organization_id,
        'customer_id', NEW.customer_id,
        'totals', NEW.totals,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at
      )
    END,
    'old_record', CASE
      WHEN TG_OP = 'INSERT' THEN NULL
      ELSE jsonb_build_object(
        'id', OLD.id,
        'status', OLD.status,
        'payment_status', OLD.payment_status
      )
    END
  );

  -- Send async HTTP request via pg_net
  SELECT INTO request_id net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook_secret, ''),
      'X-Webhook-Event', TG_OP,
      'X-Webhook-Table', TG_TABLE_NAME
    ),
    body := payload
  );

  -- Log the request for debugging (optional, can be disabled in production)
  RAISE LOG 'Order webhook triggered: % on %, request_id: %', TG_OP, NEW.id, request_id;

  RETURN COALESCE(NEW, OLD);

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Order webhook failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ORDER WEBHOOK TRIGGER
-- ============================================================================
-- Triggers on INSERT and UPDATE events on the orders table

DROP TRIGGER IF EXISTS orders_webhook_trigger ON orders;
CREATE TRIGGER orders_webhook_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_order_webhook();

-- ============================================================================
-- STATUS CHANGE WEBHOOK (filtered)
-- ============================================================================
-- This trigger only fires when order status actually changes.
-- More efficient for status-specific processing.

CREATE OR REPLACE FUNCTION trigger_order_status_webhook()
RETURNS trigger AS $$
DECLARE
  webhook_url text;
  webhook_secret text;
  payload jsonb;
  request_id bigint;
BEGIN
  -- Only proceed if status actually changed
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get webhook configuration
  webhook_url := current_setting('app.order_status_webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);

  -- If no URL configured, skip
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- Build status change payload
  payload := jsonb_build_object(
    'type', 'STATUS_CHANGE',
    'table', TG_TABLE_NAME,
    'order_id', NEW.id,
    'order_number', NEW.order_number,
    'organization_id', NEW.organization_id,
    'customer_id', NEW.customer_id,
    'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    'new_status', NEW.status,
    'payment_status', NEW.payment_status,
    'total', (NEW.totals->>'total')::numeric,
    'changed_at', NOW()
  );

  -- Send async HTTP request
  SELECT INTO request_id net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook_secret, ''),
      'X-Webhook-Event', 'STATUS_CHANGE',
      'X-Old-Status', COALESCE(OLD.status, ''),
      'X-New-Status', NEW.status
    ),
    body := payload
  );

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Order status webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a separate trigger for status changes only
-- Uncomment if you want a dedicated status change webhook endpoint
--
-- DROP TRIGGER IF EXISTS orders_status_webhook_trigger ON orders;
-- CREATE TRIGGER orders_status_webhook_trigger
--   AFTER UPDATE ON orders
--   FOR EACH ROW
--   WHEN (OLD.status IS DISTINCT FROM NEW.status)
--   EXECUTE FUNCTION trigger_order_status_webhook();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION trigger_order_webhook() IS
  'Sends webhook to Edge Function on order INSERT/UPDATE events';

COMMENT ON FUNCTION trigger_order_status_webhook() IS
  'Sends webhook specifically for order status changes';

-- ============================================================================
-- CONFIGURATION NOTES
-- ============================================================================
-- To configure the webhook URLs, set the following in your Supabase project:
--
-- Via SQL (dev/testing):
--   ALTER DATABASE postgres SET app.order_webhook_url = 'https://your-project.supabase.co/functions/v1/order-webhook';
--   ALTER DATABASE postgres SET app.webhook_secret = 'your-webhook-secret';
--
-- Via Supabase Dashboard:
--   Project Settings → Database → Connection Parameters
--
-- Via Vault (production):
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('order_webhook_url', 'https://...');
-- ============================================================================
