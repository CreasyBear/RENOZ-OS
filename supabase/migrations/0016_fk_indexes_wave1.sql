-- ============================================================================
-- FK Indexes Wave 1: Fix unindexed_foreign_keys (0001)
-- Migration: 0016_fk_indexes_wave1.sql
--
-- Adds indexes on foreign key columns that lack covering indexes.
-- Uses CREATE INDEX (not CONCURRENTLY) for migration compatibility.
-- For hot tables, consider running CONCURRENTLY in a separate maintenance window.
--
-- Wave 1 tables: activities, order_line_items, order_amendments,
-- inventory_movements, job_materials, purchase_orders, customer_portal_sessions,
-- portal_identities, projects
-- ============================================================================

-- activities: created_by (activities_created_by_users_id_fk)
CREATE INDEX IF NOT EXISTS idx_activities_created_by
  ON public.activities (created_by);

-- order_line_items: picked_by (order_line_items_picked_by_users_id_fk)
CREATE INDEX IF NOT EXISTS idx_order_items_picked_by
  ON public.order_line_items (picked_by);

-- order_amendments: applied_by, requested_by, reviewed_by
CREATE INDEX IF NOT EXISTS idx_order_amendments_applied_by
  ON public.order_amendments (applied_by);
CREATE INDEX IF NOT EXISTS idx_order_amendments_requested_by
  ON public.order_amendments (requested_by);
CREATE INDEX IF NOT EXISTS idx_order_amendments_reviewed_by
  ON public.order_amendments (reviewed_by);

-- inventory_movements: inventory_id (inventory_movements_inventory_id_inventory_id_fk)
CREATE INDEX IF NOT EXISTS idx_movements_inventory
  ON public.inventory_movements (inventory_id);

-- job_materials: installed_by (job_materials_installed_by_users_id_fk)
CREATE INDEX IF NOT EXISTS idx_job_materials_installed_by
  ON public.job_materials (installed_by);

-- purchase_orders: closed_by (purchase_orders_closed_by_users_id_fk)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_closed_by
  ON public.purchase_orders (closed_by);

-- customer_portal_sessions: contact_id (customer_portal_sessions_contact_id_contacts_id_fk)
CREATE INDEX IF NOT EXISTS idx_portal_sessions_contact
  ON public.customer_portal_sessions (contact_id);

-- portal_identities: contact_id (portal_identities_contact_id_contacts_id_fk)
CREATE INDEX IF NOT EXISTS idx_portal_identities_contact
  ON public.portal_identities (contact_id);

-- projects: order_id (projects_order_id_orders_id_fk)
CREATE INDEX IF NOT EXISTS idx_projects_order
  ON public.projects (order_id);
