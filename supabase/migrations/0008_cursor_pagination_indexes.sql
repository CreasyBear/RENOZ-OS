-- ============================================================================
-- Cursor Pagination Indexes
-- Migration: 0008_cursor_pagination_indexes.sql
-- Created: 2026-01-17
--
-- PERFORMANCE: These composite indexes support efficient cursor-based pagination
-- for multi-tenant queries. The pattern (organization_id, created_at DESC, id DESC)
-- allows the database to seek directly to the cursor position without scanning.
--
-- Without these indexes, cursor pagination degrades to O(n) scans on large tables.
-- ============================================================================

-- ============================================================================
-- ORDERS - High volume table, frequent pagination
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_cursor
ON orders (organization_id, created_at DESC, id DESC);

-- Also add index for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_status_cursor
ON orders (organization_id, status, created_at DESC, id DESC);

-- ============================================================================
-- OPPORTUNITIES - Pipeline views frequently paginated
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_org_cursor
ON opportunities (organization_id, created_at DESC, id DESC);

-- Pipeline stage filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_org_stage_cursor
ON opportunities (organization_id, stage, created_at DESC, id DESC);

-- ============================================================================
-- QUOTES - Linked to opportunities, needs similar optimization
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_org_cursor
ON quotes (organization_id, created_at DESC, id DESC);

-- Status-based filtering for quote management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_org_status_cursor
ON quotes (organization_id, status, created_at DESC, id DESC);

-- ============================================================================
-- CUSTOMERS - Core entity, heavily queried
-- ============================================================================

-- Main cursor pagination index (may already exist, IF NOT EXISTS handles this)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_org_cursor
ON customers (organization_id, created_at DESC, id DESC);

-- Name sorting (common alternative sort)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_org_name
ON customers (organization_id, name ASC, id ASC);

-- Status filter with cursor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_org_status_cursor
ON customers (organization_id, status, created_at DESC, id DESC);

-- ============================================================================
-- ACTIVITIES - Audit log, always paginated by recency
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_org_cursor
ON activities (organization_id, created_at DESC, id DESC);

-- Entity-specific activity lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_entity_cursor
ON activities (organization_id, entity_type, entity_id, created_at DESC);

-- ============================================================================
-- INVENTORY MOVEMENTS - Stock audit trail
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_movements_org_cursor
ON inventory_movements (organization_id, created_at DESC, id DESC);

-- Product-specific movement history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_movements_product_cursor
ON inventory_movements (organization_id, product_id, created_at DESC);

-- ============================================================================
-- JOBS - Background job tracking
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_org_user_cursor
ON jobs (organization_id, user_id, created_at DESC);

-- Active jobs lookup (common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_org_status
ON jobs (organization_id, status, created_at DESC)
WHERE status IN ('pending', 'running');

-- ============================================================================
-- NOTIFICATIONS - User-scoped, paginated by recency
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_cursor
ON notifications (organization_id, user_id, created_at DESC);

-- Unread notifications (common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
ON notifications (organization_id, user_id, created_at DESC)
WHERE status = 'pending';
