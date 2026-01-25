-- Dashboard Performance Indexes Migration
-- Creates composite indexes optimized for date range + organizationId queries
--
-- All indexes use CREATE INDEX CONCURRENTLY for zero-downtime deployment
-- (Note: CONCURRENTLY requires this to run outside a transaction in production)
--
-- @see dashboard.prd.json DASH-PERF-INDEXES
-- @see docs/plans/2026-01-25-feat-dashboard-performance-infrastructure-plan.md

-- ============================================================================
-- ORDERS INDEXES
-- ============================================================================

-- Composite index for date range + org queries (dashboard metrics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_date_status_desc
  ON orders(organization_id, order_date DESC, status);

-- Partial index for delivered orders (revenue calculations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_delivered_revenue
  ON orders(organization_id, order_date DESC)
  WHERE status IN ('delivered', 'completed') AND deleted_at IS NULL;

-- Covering index for revenue aggregations (includes total to avoid heap lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_revenue_cover
  ON orders(organization_id, order_date DESC)
  INCLUDE (total, status, customer_id)
  WHERE deleted_at IS NULL;

-- Index for today's orders (current state MV)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_today
  ON orders(organization_id)
  WHERE order_date = CURRENT_DATE AND deleted_at IS NULL;

-- ============================================================================
-- OPPORTUNITIES INDEXES
-- ============================================================================

-- Composite index for pipeline queries by stage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_org_stage_date
  ON opportunities(organization_id, stage, created_at DESC);

-- Partial index for closed opportunities (win rate calculations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_closed
  ON opportunities(organization_id, updated_at DESC)
  WHERE stage IN ('won', 'lost') AND deleted_at IS NULL;

-- Partial index for active pipeline (current state MV)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_active_pipeline
  ON opportunities(organization_id)
  WHERE stage NOT IN ('won', 'lost') AND deleted_at IS NULL;

-- Covering index for pipeline value (includes value, probability)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_pipeline_cover
  ON opportunities(organization_id, stage)
  INCLUDE (value, probability)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- JOB ASSIGNMENTS INDEXES
-- ============================================================================

-- Composite index for job queries by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_org_status_date
  ON job_assignments(organization_id, status, scheduled_date DESC);

-- Partial index for active jobs (current state MV)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_active
  ON job_assignments(organization_id, scheduled_date DESC)
  WHERE status IN ('scheduled', 'in_progress');

-- Covering index for job metrics (includes estimated_duration)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_metrics_cover
  ON job_assignments(organization_id, scheduled_date DESC, status)
  INCLUDE (estimated_duration, job_type);

-- Index for installer workload queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_installer_scheduled
  ON job_assignments(installer_id, scheduled_date)
  WHERE status IN ('scheduled', 'in_progress');

-- ============================================================================
-- WARRANTY CLAIMS INDEXES
-- ============================================================================

-- Composite index for claims by status and date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warranty_claims_org_status_date
  ON warranty_claims(organization_id, status, submitted_at DESC);

-- Partial index for open claims (current state MV)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warranty_claims_open
  ON warranty_claims(organization_id, submitted_at DESC)
  WHERE status IN ('submitted', 'under_review', 'approved');

-- Covering index for resolution time calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warranty_claims_resolution_cover
  ON warranty_claims(organization_id, submitted_at DESC, status)
  INCLUDE (resolved_at, claim_type);

-- Index for claim type analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warranty_claims_type_date
  ON warranty_claims(organization_id, claim_type, submitted_at DESC);

-- ============================================================================
-- CUSTOMERS INDEXES
-- ============================================================================

-- Index for customer count queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_org_active
  ON customers(organization_id)
  WHERE deleted_at IS NULL;

-- Index for customer acquisition date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_org_created
  ON customers(organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- ACTIVITIES INDEXES (for activity feed)
-- ============================================================================

-- Composite index for activity feed pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_org_created_desc
  ON activities(organization_id, created_at DESC, id DESC);

-- Partial index for entity-specific activities
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_entity
  ON activities(organization_id, entity_type, entity_id, created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_orders_org_date_status_desc IS
  'Dashboard metrics: orders by date range with status filter';

COMMENT ON INDEX idx_orders_delivered_revenue IS
  'Dashboard metrics: delivered orders for revenue calculations';

COMMENT ON INDEX idx_orders_revenue_cover IS
  'Dashboard metrics: covering index to avoid heap lookup for revenue SUM';

COMMENT ON INDEX idx_opportunities_org_stage_date IS
  'Dashboard metrics: pipeline by stage with date filter';

COMMENT ON INDEX idx_opportunities_active_pipeline IS
  'Current state MV: active pipeline value calculation';

COMMENT ON INDEX idx_jobs_active IS
  'Current state MV: active job count';

COMMENT ON INDEX idx_warranty_claims_open IS
  'Current state MV: open claims count';

COMMENT ON INDEX idx_activities_org_created_desc IS
  'Activity feed: paginated activity list by organization';
