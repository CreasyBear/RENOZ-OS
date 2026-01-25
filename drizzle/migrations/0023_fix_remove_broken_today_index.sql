-- Remove Broken idx_orders_org_today Index
--
-- Problem: The partial index WHERE order_date = CURRENT_DATE
-- evaluates CURRENT_DATE at index creation time, not query time.
-- This means the index only includes orders from the day it was created,
-- making it useless for "today's orders" queries after day 1.
--
-- Solution: Drop this index. Queries for today's orders should use
-- the existing idx_orders_org_date_status_desc which covers
-- (organization_id, order_date DESC, status) and handles all date queries.
--
-- @see 0021_dashboard_performance_indexes.sql (original creation)

DROP INDEX CONCURRENTLY IF EXISTS idx_orders_org_today;
