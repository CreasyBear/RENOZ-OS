-- Dashboard Materialized Views Migration
-- Creates pre-computed aggregations for dashboard performance
--
-- @see dashboard.prd.json DASH-PERF-MVS
-- @see docs/plans/2026-01-25-feat-dashboard-performance-infrastructure-plan.md

-- ============================================================================
-- MV_DAILY_METRICS: Daily order/revenue aggregations
-- ============================================================================
-- Refresh: Every 15 minutes via Trigger.dev
-- Indexed on: organization_id, metric_date

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_metrics AS
SELECT
  organization_id,
  DATE(order_date) as metric_date,
  COUNT(*) as orders_count,
  COALESCE(SUM(total), 0) as revenue,
  COUNT(DISTINCT customer_id) as customer_count,
  COALESCE(AVG(total), 0) as average_order_value
FROM orders
WHERE deleted_at IS NULL
  AND order_date >= (NOW() - INTERVAL '2 years')::date
GROUP BY organization_id, DATE(order_date);

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_metrics_pk
  ON mv_daily_metrics(organization_id, metric_date);

-- Date range lookup index
CREATE INDEX IF NOT EXISTS mv_daily_metrics_date_range
  ON mv_daily_metrics(metric_date);

COMMENT ON MATERIALIZED VIEW mv_daily_metrics IS
  'Pre-computed daily order metrics by organization. Refreshed every 15 minutes.';

-- ============================================================================
-- MV_DAILY_PIPELINE: Daily opportunity/pipeline aggregations
-- ============================================================================
-- Refresh: Every 15 minutes + on opportunity stage change event
-- Indexed on: organization_id, metric_date, stage

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_pipeline AS
SELECT
  organization_id,
  DATE(created_at AT TIME ZONE 'Australia/Sydney') as metric_date,
  stage,
  COUNT(*) as opportunity_count,
  COALESCE(SUM(value), 0) as total_value,
  COALESCE(SUM(value * probability / 100), 0) as weighted_pipeline
FROM opportunities
WHERE deleted_at IS NULL
  AND created_at >= (NOW() - INTERVAL '2 years')
GROUP BY organization_id, DATE(created_at AT TIME ZONE 'Australia/Sydney'), stage;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_pipeline_pk
  ON mv_daily_pipeline(organization_id, metric_date, stage);

-- Date range lookup
CREATE INDEX IF NOT EXISTS mv_daily_pipeline_date_range
  ON mv_daily_pipeline(metric_date);

COMMENT ON MATERIALIZED VIEW mv_daily_pipeline IS
  'Pre-computed daily pipeline metrics by stage. Refreshed every 15 minutes + on stage change.';

-- ============================================================================
-- MV_DAILY_WARRANTY: Daily warranty claim aggregations
-- ============================================================================
-- Refresh: Every hour via Trigger.dev
-- Indexed on: organization_id, metric_date, status, claim_type

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_warranty AS
SELECT
  organization_id,
  DATE(submitted_at AT TIME ZONE 'Australia/Sydney') as metric_date,
  status,
  claim_type,
  COUNT(*) as claim_count,
  COALESCE(
    AVG(
      CASE WHEN resolved_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (resolved_at - submitted_at))/3600
        ELSE NULL
      END
    ),
    0
  ) as avg_resolution_hours
FROM warranty_claims
WHERE submitted_at >= (NOW() - INTERVAL '2 years')
GROUP BY organization_id, DATE(submitted_at AT TIME ZONE 'Australia/Sydney'), status, claim_type;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_warranty_pk
  ON mv_daily_warranty(organization_id, metric_date, status, claim_type);

-- Date range lookup
CREATE INDEX IF NOT EXISTS mv_daily_warranty_date_range
  ON mv_daily_warranty(metric_date);

COMMENT ON MATERIALIZED VIEW mv_daily_warranty IS
  'Pre-computed daily warranty claim metrics. Refreshed every hour.';

-- ============================================================================
-- MV_DAILY_JOBS: Daily job assignment aggregations
-- ============================================================================
-- Refresh: Every 15 minutes + on job status change event
-- Indexed on: organization_id, metric_date, status

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_jobs AS
SELECT
  organization_id,
  DATE(scheduled_date) as metric_date,
  status,
  job_type,
  COUNT(*) as job_count,
  COALESCE(SUM(estimated_duration), 0) as total_estimated_minutes
FROM job_assignments
WHERE scheduled_date >= (NOW() - INTERVAL '2 years')::date
GROUP BY organization_id, DATE(scheduled_date), status, job_type;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_jobs_pk
  ON mv_daily_jobs(organization_id, metric_date, status, job_type);

-- Date range lookup
CREATE INDEX IF NOT EXISTS mv_daily_jobs_date_range
  ON mv_daily_jobs(metric_date);

COMMENT ON MATERIALIZED VIEW mv_daily_jobs IS
  'Pre-computed daily job metrics by status and type. Refreshed every 15 minutes + on status change.';

-- ============================================================================
-- MV_CURRENT_STATE: Live snapshot of current metrics
-- ============================================================================
-- Refresh: Every 5 minutes via Trigger.dev
-- Indexed on: organization_id

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_current_state AS
SELECT
  o.id as organization_id,
  -- Active jobs (scheduled or in_progress)
  COALESCE(
    (SELECT COUNT(*) FROM job_assignments j
     WHERE j.organization_id = o.id
       AND j.status IN ('scheduled', 'in_progress')),
    0
  ) as active_jobs,
  -- Open warranty claims
  COALESCE(
    (SELECT COUNT(*) FROM warranty_claims wc
     WHERE wc.organization_id = o.id
       AND wc.status IN ('submitted', 'under_review', 'approved')),
    0
  ) as open_claims,
  -- Current pipeline value (weighted)
  COALESCE(
    (SELECT SUM(value * probability / 100) FROM opportunities op
     WHERE op.organization_id = o.id
       AND op.stage NOT IN ('won', 'lost')
       AND op.deleted_at IS NULL),
    0
  ) as current_pipeline,
  -- Today's orders
  COALESCE(
    (SELECT COUNT(*) FROM orders ord
     WHERE ord.organization_id = o.id
       AND ord.order_date = CURRENT_DATE
       AND ord.deleted_at IS NULL),
    0
  ) as today_orders,
  -- Today's revenue
  COALESCE(
    (SELECT SUM(total) FROM orders ord
     WHERE ord.organization_id = o.id
       AND ord.order_date = CURRENT_DATE
       AND ord.deleted_at IS NULL),
    0
  ) as today_revenue,
  -- Total active customers
  COALESCE(
    (SELECT COUNT(*) FROM customers c
     WHERE c.organization_id = o.id
       AND c.deleted_at IS NULL),
    0
  ) as total_customers,
  -- Last refresh timestamp
  NOW() as refreshed_at
FROM organizations o;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_current_state_pk
  ON mv_current_state(organization_id);

COMMENT ON MATERIALIZED VIEW mv_current_state IS
  'Live snapshot of current metrics per organization. Refreshed every 5 minutes.';

-- ============================================================================
-- INITIAL REFRESH
-- ============================================================================
-- Run initial refresh to populate views

REFRESH MATERIALIZED VIEW mv_daily_metrics;
REFRESH MATERIALIZED VIEW mv_daily_pipeline;
REFRESH MATERIALIZED VIEW mv_daily_warranty;
REFRESH MATERIALIZED VIEW mv_daily_jobs;
REFRESH MATERIALIZED VIEW mv_current_state;
