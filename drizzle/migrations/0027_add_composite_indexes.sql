-- Performance: Add composite indexes for common query patterns
-- These indexes support multi-tenant queries with common filter combinations

-- Orders: Common filter patterns (organization + date + status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_date_status
  ON orders(organization_id, order_date, status)
  WHERE deleted_at IS NULL;

-- Orders: Payment status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_payment_status
  ON orders(organization_id, payment_status)
  WHERE deleted_at IS NULL;

-- Purchase Orders: Approval workflow queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_org_status_approval
  ON purchase_orders(organization_id, status, approval_status)
  WHERE deleted_at IS NULL;

-- Activities: Timeline queries (entity-based lookups with time ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_entity
  ON activities(organization_id, entity_type, entity_id, created_at DESC);

-- Opportunities: Pipeline stage queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_org_stage
  ON opportunities(organization_id, stage)
  WHERE deleted_at IS NULL;

-- Jobs: Schedule queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_org_date_status
  ON job_assignments(organization_id, scheduled_date, status);

-- Customers: Search and filter patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_org_status
  ON customers(organization_id, status)
  WHERE deleted_at IS NULL;

-- Users: RLS optimization for user_sessions policy subquery
-- This enables index-only scans when RLS checks: SELECT id FROM users WHERE organization_id = X
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_id
  ON users(organization_id, id);
