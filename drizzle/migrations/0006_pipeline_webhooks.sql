-- ============================================================================
-- Pipeline Stage Change Webhooks
-- ============================================================================
-- Configures database webhooks to trigger on opportunity stage changes.
-- Used for updating metrics, notifications, and triggering Xero sync.
--
-- @see https://supabase.com/docs/guides/database/webhooks
-- ============================================================================

-- ============================================================================
-- PIPELINE STAGE CHANGE WEBHOOK TRIGGER FUNCTION
-- ============================================================================
-- This function sends HTTP POST to the pipeline-webhook Edge Function
-- when an opportunity's stage changes.

CREATE OR REPLACE FUNCTION trigger_pipeline_stage_webhook()
RETURNS trigger AS $$
DECLARE
  webhook_url text;
  webhook_secret text;
  payload jsonb;
  request_id bigint;
  transition_time interval;
BEGIN
  -- Only proceed on UPDATE with stage change
  IF TG_OP != 'UPDATE' OR OLD.stage = NEW.stage THEN
    RETURN NEW;
  END IF;

  -- Get webhook configuration
  webhook_url := current_setting('app.pipeline_webhook_url', true);
  webhook_secret := current_setting('app.webhook_secret', true);

  -- If no URL configured, skip
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- Calculate time in previous stage
  transition_time := NOW() - COALESCE(OLD.updated_at, OLD.created_at);

  -- Build webhook payload
  payload := jsonb_build_object(
    'type', 'STAGE_CHANGE',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'opportunity_id', NEW.id,
    'opportunity_name', NEW.name,
    'organization_id', NEW.organization_id,
    'customer_id', NEW.customer_id,
    'owner_id', NEW.owner_id,
    'old_stage', OLD.stage,
    'new_stage', NEW.stage,
    'value', NEW.value,
    'probability', NEW.probability,
    'close_date', NEW.close_date,
    'stage_transition_seconds', EXTRACT(EPOCH FROM transition_time)::integer,
    'is_won', NEW.stage = 'closed_won',
    'is_lost', NEW.stage = 'closed_lost',
    'lost_reason', CASE WHEN NEW.stage = 'closed_lost' THEN NEW.lost_reason ELSE NULL END,
    'changed_at', NOW()
  );

  -- Send async HTTP request via pg_net
  SELECT INTO request_id net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook_secret, ''),
      'X-Webhook-Event', 'STAGE_CHANGE',
      'X-Old-Stage', OLD.stage,
      'X-New-Stage', NEW.stage
    ),
    body := payload
  );

  -- Log the stage change
  RAISE LOG 'Pipeline stage change: opportunity %, % -> %, request_id: %',
    NEW.id, OLD.stage, NEW.stage, request_id;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Pipeline webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PIPELINE WEBHOOK TRIGGER
-- ============================================================================
-- Triggers on UPDATE events on the opportunities table when stage changes

DROP TRIGGER IF EXISTS opportunities_stage_webhook_trigger ON opportunities;
CREATE TRIGGER opportunities_stage_webhook_trigger
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION trigger_pipeline_stage_webhook();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION trigger_pipeline_stage_webhook() IS
  'Sends webhook to Edge Function when opportunity stage changes';

-- ============================================================================
-- CONFIGURATION NOTES
-- ============================================================================
-- To configure the webhook URL:
--
-- Via SQL (dev/testing):
--   ALTER DATABASE postgres SET app.pipeline_webhook_url = 'https://your-project.supabase.co/functions/v1/pipeline-webhook';
-- ============================================================================
