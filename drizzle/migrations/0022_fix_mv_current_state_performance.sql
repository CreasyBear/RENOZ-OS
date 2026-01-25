-- Fix mv_current_state Performance
-- Replaces correlated subqueries with efficient JOIN-based aggregation
--
-- Problem: Original MV used 6 correlated subqueries, each doing full table scans
-- Solution: Use LEFT JOIN with pre-aggregated CTEs for O(1) lookup per org
--
-- @see dashboard.prd.json DASH-PERF-MVS

-- Drop existing MV and recreate with optimized query
DROP MATERIALIZED VIEW IF EXISTS mv_current_state CASCADE;

CREATE MATERIALIZED VIEW mv_current_state AS
WITH
  -- Pre-aggregate active jobs by org
  active_jobs_agg AS (
    SELECT
      organization_id,
      COUNT(*) as count
    FROM job_assignments
    WHERE status IN ('scheduled', 'in_progress')
    GROUP BY organization_id
  ),
  -- Pre-aggregate open warranty claims by org
  open_claims_agg AS (
    SELECT
      organization_id,
      COUNT(*) as count
    FROM warranty_claims
    WHERE status IN ('submitted', 'under_review', 'approved')
    GROUP BY organization_id
  ),
  -- Pre-aggregate current pipeline by org
  pipeline_agg AS (
    SELECT
      organization_id,
      SUM(value * probability / 100) as weighted_value
    FROM opportunities
    WHERE stage NOT IN ('won', 'lost')
      AND deleted_at IS NULL
    GROUP BY organization_id
  ),
  -- Pre-aggregate today's orders by org
  today_orders_agg AS (
    SELECT
      organization_id,
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE order_date = CURRENT_DATE
      AND deleted_at IS NULL
    GROUP BY organization_id
  ),
  -- Pre-aggregate customer counts by org
  customers_agg AS (
    SELECT
      organization_id,
      COUNT(*) as count
    FROM customers
    WHERE deleted_at IS NULL
    GROUP BY organization_id
  )
SELECT
  o.id as organization_id,
  COALESCE(ja.count, 0) as active_jobs,
  COALESCE(wc.count, 0) as open_claims,
  COALESCE(p.weighted_value, 0) as current_pipeline,
  COALESCE(tod.count, 0) as today_orders,
  COALESCE(tod.revenue, 0) as today_revenue,
  COALESCE(c.count, 0) as total_customers,
  NOW() as refreshed_at
FROM organizations o
LEFT JOIN active_jobs_agg ja ON ja.organization_id = o.id
LEFT JOIN open_claims_agg wc ON wc.organization_id = o.id
LEFT JOIN pipeline_agg p ON p.organization_id = o.id
LEFT JOIN today_orders_agg tod ON tod.organization_id = o.id
LEFT JOIN customers_agg c ON c.organization_id = o.id;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX mv_current_state_pk
  ON mv_current_state(organization_id);

COMMENT ON MATERIALIZED VIEW mv_current_state IS
  'Live snapshot of current metrics per organization. Uses JOIN-based aggregation. Refreshed every 5 minutes.';

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_current_state;
