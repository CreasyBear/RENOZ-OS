-- Remediate permissive RLS policies using baseline definitions
-- Generated from drizzle/migrations/0000_common_magneto.sql

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_select_policy') THEN
    EXECUTE 'ALTER POLICY "audit_logs_select_policy" ON public."audit_logs" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_insert_policy') THEN
    EXECUTE 'ALTER POLICY "audit_logs_insert_policy" ON public."audit_logs" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_tag_assignments' AND policyname = 'customer_tag_assignments_select_policy') THEN
    EXECUTE 'ALTER POLICY "customer_tag_assignments_select_policy" ON public."customer_tag_assignments" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_tag_assignments' AND policyname = 'customer_tag_assignments_insert_policy') THEN
    EXECUTE 'ALTER POLICY "customer_tag_assignments_insert_policy" ON public."customer_tag_assignments" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_tag_assignments' AND policyname = 'customer_tag_assignments_update_policy') THEN
    EXECUTE 'ALTER POLICY "customer_tag_assignments_update_policy" ON public."customer_tag_assignments" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_tag_assignments' AND policyname = 'customer_tag_assignments_delete_policy') THEN
    EXECUTE 'ALTER POLICY "customer_tag_assignments_delete_policy" ON public."customer_tag_assignments" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_relations' AND policyname = 'product_relations_select_policy') THEN
    EXECUTE 'ALTER POLICY "product_relations_select_policy" ON public."product_relations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_relations' AND policyname = 'product_relations_insert_policy') THEN
    EXECUTE 'ALTER POLICY "product_relations_insert_policy" ON public."product_relations" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_relations' AND policyname = 'product_relations_update_policy') THEN
    EXECUTE 'ALTER POLICY "product_relations_update_policy" ON public."product_relations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_relations' AND policyname = 'product_relations_delete_policy') THEN
    EXECUTE 'ALTER POLICY "product_relations_delete_policy" ON public."product_relations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_line_items' AND policyname = 'order_line_items_portal_select_policy') THEN
    EXECUTE 'ALTER POLICY "order_line_items_portal_select_policy" ON public."order_line_items" USING ((\n        "order_line_items"."organization_id" = current_setting(\'app.organization_id\', true)::uuid\n        OR EXISTS (\n          SELECT 1 FROM orders o\n          WHERE o.id = "order_line_items"."order_id"\n            AND o.organization_id = "order_line_items"."organization_id"\n            AND (\n              EXISTS (\n                SELECT 1 FROM portal_identities pi\n                WHERE pi.auth_user_id = auth.uid()\n                  AND pi.status = \'active\'\n                  AND pi.organization_id = "order_line_items"."organization_id"\n                  AND pi.scope = \'customer\'\n                  AND pi.customer_id = o.customer_id\n              )\n              OR EXISTS (\n                SELECT 1 FROM portal_identities pi\n                JOIN job_assignments ja ON ja.id = pi.job_assignment_id\n                WHERE pi.auth_user_id = auth.uid()\n                  AND pi.status = \'active\'\n                  AND pi.organization_id = "order_line_items"."organization_id"\n                  AND pi.scope = \'subcontractor\'\n                  AND ja.order_id = o.id\n              )\n            )\n        )\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_portal_select_policy') THEN
    EXECUTE 'ALTER POLICY "orders_portal_select_policy" ON public."orders" USING ((\n        "orders"."organization_id" = current_setting(\'app.organization_id\', true)::uuid\n        OR EXISTS (\n          SELECT 1 FROM portal_identities pi\n          WHERE pi.auth_user_id = auth.uid()\n            AND pi.status = \'active\'\n            AND pi.organization_id = "orders"."organization_id"\n            AND pi.scope = \'customer\'\n            AND pi.customer_id = "orders"."customer_id"\n        )\n        OR EXISTS (\n          SELECT 1 FROM portal_identities pi\n          JOIN job_assignments ja ON ja.id = pi.job_assignment_id\n          WHERE pi.auth_user_id = auth.uid()\n            AND pi.status = \'active\'\n            AND pi.organization_id = "orders"."organization_id"\n            AND pi.scope = \'subcontractor\'\n            AND ja.order_id = "orders"."id"\n        )\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'opportunities_select_policy') THEN
    EXECUTE 'ALTER POLICY "opportunities_select_policy" ON public."opportunities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'opportunities_insert_policy') THEN
    EXECUTE 'ALTER POLICY "opportunities_insert_policy" ON public."opportunities" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'opportunities_update_policy') THEN
    EXECUTE 'ALTER POLICY "opportunities_update_policy" ON public."opportunities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'opportunities_delete_policy') THEN
    EXECUTE 'ALTER POLICY "opportunities_delete_policy" ON public."opportunities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunity_activities' AND policyname = 'opportunity_activities_select_policy') THEN
    EXECUTE 'ALTER POLICY "opportunity_activities_select_policy" ON public."opportunity_activities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunity_activities' AND policyname = 'opportunity_activities_insert_policy') THEN
    EXECUTE 'ALTER POLICY "opportunity_activities_insert_policy" ON public."opportunity_activities" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunity_activities' AND policyname = 'opportunity_activities_delete_policy') THEN
    EXECUTE 'ALTER POLICY "opportunity_activities_delete_policy" ON public."opportunity_activities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_versions' AND policyname = 'quote_versions_select_policy') THEN
    EXECUTE 'ALTER POLICY "quote_versions_select_policy" ON public."quote_versions" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_versions' AND policyname = 'quote_versions_insert_policy') THEN
    EXECUTE 'ALTER POLICY "quote_versions_insert_policy" ON public."quote_versions" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_versions' AND policyname = 'quote_versions_update_policy') THEN
    EXECUTE 'ALTER POLICY "quote_versions_update_policy" ON public."quote_versions" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_versions' AND policyname = 'quote_versions_delete_policy') THEN
    EXECUTE 'ALTER POLICY "quote_versions_delete_policy" ON public."quote_versions" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_versions' AND policyname = 'quote_versions_portal_select_policy') THEN
    EXECUTE 'ALTER POLICY "quote_versions_portal_select_policy" ON public."quote_versions" USING ((\n        "quote_versions"."organization_id" = current_setting(\'app.organization_id\', true)::uuid\n        OR EXISTS (\n          SELECT 1 FROM portal_identities pi\n          JOIN opportunities o ON o.id = "quote_versions"."opportunity_id"\n          WHERE pi.auth_user_id = auth.uid()\n            AND pi.status = \'active\'\n            AND pi.organization_id = "quote_versions"."organization_id"\n            AND pi.scope = \'customer\'\n            AND pi.customer_id = o.customer_id\n        )\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_select_policy') THEN
    EXECUTE 'ALTER POLICY "quotes_select_policy" ON public."quotes" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_insert_policy') THEN
    EXECUTE 'ALTER POLICY "quotes_insert_policy" ON public."quotes" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_update_policy') THEN
    EXECUTE 'ALTER POLICY "quotes_update_policy" ON public."quotes" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_delete_policy') THEN
    EXECUTE 'ALTER POLICY "quotes_delete_policy" ON public."quotes" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'quotes_portal_select_policy') THEN
    EXECUTE 'ALTER POLICY "quotes_portal_select_policy" ON public."quotes" USING ((\n        "quotes"."organization_id" = current_setting(\'app.organization_id\', true)::uuid\n        OR EXISTS (\n          SELECT 1 FROM portal_identities pi\n          WHERE pi.auth_user_id = auth.uid()\n            AND pi.status = \'active\'\n            AND pi.organization_id = "quotes"."organization_id"\n            AND pi.scope = \'customer\'\n            AND pi.customer_id = "quotes"."customer_id"\n        )\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'win_loss_reasons' AND policyname = 'win_loss_reasons_select_policy') THEN
    EXECUTE 'ALTER POLICY "win_loss_reasons_select_policy" ON public."win_loss_reasons" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'win_loss_reasons' AND policyname = 'win_loss_reasons_insert_policy') THEN
    EXECUTE 'ALTER POLICY "win_loss_reasons_insert_policy" ON public."win_loss_reasons" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'win_loss_reasons' AND policyname = 'win_loss_reasons_update_policy') THEN
    EXECUTE 'ALTER POLICY "win_loss_reasons_update_policy" ON public."win_loss_reasons" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'win_loss_reasons' AND policyname = 'win_loss_reasons_delete_policy') THEN
    EXECUTE 'ALTER POLICY "win_loss_reasons_delete_policy" ON public."win_loss_reasons" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'system_settings_select_policy') THEN
    EXECUTE 'ALTER POLICY "system_settings_select_policy" ON public."system_settings" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'system_settings_insert_policy') THEN
    EXECUTE 'ALTER POLICY "system_settings_insert_policy" ON public."system_settings" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'system_settings_update_policy') THEN
    EXECUTE 'ALTER POLICY "system_settings_update_policy" ON public."system_settings" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'system_settings_delete_policy') THEN
    EXECUTE 'ALTER POLICY "system_settings_delete_policy" ON public."system_settings" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_fields' AND policyname = 'custom_fields_select_policy') THEN
    EXECUTE 'ALTER POLICY "custom_fields_select_policy" ON public."custom_fields" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_fields' AND policyname = 'custom_fields_insert_policy') THEN
    EXECUTE 'ALTER POLICY "custom_fields_insert_policy" ON public."custom_fields" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_fields' AND policyname = 'custom_fields_update_policy') THEN
    EXECUTE 'ALTER POLICY "custom_fields_update_policy" ON public."custom_fields" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_fields' AND policyname = 'custom_fields_delete_policy') THEN
    EXECUTE 'ALTER POLICY "custom_fields_delete_policy" ON public."custom_fields" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_field_values' AND policyname = 'custom_field_values_select_policy') THEN
    EXECUTE 'ALTER POLICY "custom_field_values_select_policy" ON public."custom_field_values" USING (EXISTS (\n        SELECT 1 FROM custom_fields cf\n        WHERE cf.id = custom_field_id\n        AND cf.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_field_values' AND policyname = 'custom_field_values_insert_policy') THEN
    EXECUTE 'ALTER POLICY "custom_field_values_insert_policy" ON public."custom_field_values" WITH CHECK (EXISTS (\n        SELECT 1 FROM custom_fields cf\n        WHERE cf.id = custom_field_id\n        AND cf.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_field_values' AND policyname = 'custom_field_values_update_policy') THEN
    EXECUTE 'ALTER POLICY "custom_field_values_update_policy" ON public."custom_field_values" USING (EXISTS (\n        SELECT 1 FROM custom_fields cf\n        WHERE cf.id = custom_field_id\n        AND cf.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      )) WITH CHECK (EXISTS (\n        SELECT 1 FROM custom_fields cf\n        WHERE cf.id = custom_field_id\n        AND cf.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_field_values' AND policyname = 'custom_field_values_delete_policy') THEN
    EXECUTE 'ALTER POLICY "custom_field_values_delete_policy" ON public."custom_field_values" USING (EXISTS (\n        SELECT 1 FROM custom_fields cf\n        WHERE cf.id = custom_field_id\n        AND cf.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'data_exports' AND policyname = 'data_exports_select_policy') THEN
    EXECUTE 'ALTER POLICY "data_exports_select_policy" ON public."data_exports" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'data_exports' AND policyname = 'data_exports_insert_policy') THEN
    EXECUTE 'ALTER POLICY "data_exports_insert_policy" ON public."data_exports" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'data_exports' AND policyname = 'data_exports_update_policy') THEN
    EXECUTE 'ALTER POLICY "data_exports_update_policy" ON public."data_exports" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'data_exports' AND policyname = 'data_exports_delete_policy') THEN
    EXECUTE 'ALTER POLICY "data_exports_delete_policy" ON public."data_exports" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_policy') THEN
    EXECUTE 'ALTER POLICY "users_select_policy" ON public."users" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_insert_policy') THEN
    EXECUTE 'ALTER POLICY "users_insert_policy" ON public."users" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_policy') THEN
    EXECUTE 'ALTER POLICY "users_update_policy" ON public."users" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_delete_policy') THEN
    EXECUTE 'ALTER POLICY "users_delete_policy" ON public."users" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_delegations' AND policyname = 'user_delegations_select_policy') THEN
    EXECUTE 'ALTER POLICY "user_delegations_select_policy" ON public."user_delegations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_delegations' AND policyname = 'user_delegations_insert_policy') THEN
    EXECUTE 'ALTER POLICY "user_delegations_insert_policy" ON public."user_delegations" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_delegations' AND policyname = 'user_delegations_update_policy') THEN
    EXECUTE 'ALTER POLICY "user_delegations_update_policy" ON public."user_delegations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_delegations' AND policyname = 'user_delegations_delete_policy') THEN
    EXECUTE 'ALTER POLICY "user_delegations_delete_policy" ON public."user_delegations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_members' AND policyname = 'user_group_members_select_policy') THEN
    EXECUTE 'ALTER POLICY "user_group_members_select_policy" ON public."user_group_members" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_members' AND policyname = 'user_group_members_insert_policy') THEN
    EXECUTE 'ALTER POLICY "user_group_members_insert_policy" ON public."user_group_members" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_members' AND policyname = 'user_group_members_update_policy') THEN
    EXECUTE 'ALTER POLICY "user_group_members_update_policy" ON public."user_group_members" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_members' AND policyname = 'user_group_members_delete_policy') THEN
    EXECUTE 'ALTER POLICY "user_group_members_delete_policy" ON public."user_group_members" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_select_policy') THEN
    EXECUTE 'ALTER POLICY "user_groups_select_policy" ON public."user_groups" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_insert_policy') THEN
    EXECUTE 'ALTER POLICY "user_groups_insert_policy" ON public."user_groups" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_update_policy') THEN
    EXECUTE 'ALTER POLICY "user_groups_update_policy" ON public."user_groups" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_delete_policy') THEN
    EXECUTE 'ALTER POLICY "user_groups_delete_policy" ON public."user_groups" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_invitations' AND policyname = 'user_invitations_select_policy') THEN
    EXECUTE 'ALTER POLICY "user_invitations_select_policy" ON public."user_invitations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_invitations' AND policyname = 'user_invitations_insert_policy') THEN
    EXECUTE 'ALTER POLICY "user_invitations_insert_policy" ON public."user_invitations" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_invitations' AND policyname = 'user_invitations_update_policy') THEN
    EXECUTE 'ALTER POLICY "user_invitations_update_policy" ON public."user_invitations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_invitations' AND policyname = 'user_invitations_delete_policy') THEN
    EXECUTE 'ALTER POLICY "user_invitations_delete_policy" ON public."user_invitations" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_tokens' AND policyname = 'api_tokens_org_isolation') THEN
    EXECUTE 'ALTER POLICY "api_tokens_org_isolation" ON public."api_tokens" USING (organization_id = (\n        SELECT organization_id FROM users WHERE auth_id = auth.uid()\n      )) WITH CHECK (organization_id = (\n        SELECT organization_id FROM users WHERE auth_id = auth.uid()\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_tokens' AND policyname = 'api_tokens_owner_access') THEN
    EXECUTE 'ALTER POLICY "api_tokens_owner_access" ON public."api_tokens" USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid())\n        OR EXISTS (\n          SELECT 1 FROM users\n          WHERE auth_id = auth.uid()\n          AND role IN (\'owner\', \'admin\')\n          AND organization_id = api_tokens.organization_id\n        ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_select_policy') THEN
    EXECUTE 'ALTER POLICY "activities_select_policy" ON public."activities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_insert_policy') THEN
    EXECUTE 'ALTER POLICY "activities_insert_policy" ON public."activities" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_recipients' AND policyname = 'campaign_recipients_select_policy') THEN
    EXECUTE 'ALTER POLICY "campaign_recipients_select_policy" ON public."campaign_recipients" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_recipients' AND policyname = 'campaign_recipients_insert_policy') THEN
    EXECUTE 'ALTER POLICY "campaign_recipients_insert_policy" ON public."campaign_recipients" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_recipients' AND policyname = 'campaign_recipients_update_policy') THEN
    EXECUTE 'ALTER POLICY "campaign_recipients_update_policy" ON public."campaign_recipients" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_recipients' AND policyname = 'campaign_recipients_delete_policy') THEN
    EXECUTE 'ALTER POLICY "campaign_recipients_delete_policy" ON public."campaign_recipients" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_campaigns' AND policyname = 'email_campaigns_select_policy') THEN
    EXECUTE 'ALTER POLICY "email_campaigns_select_policy" ON public."email_campaigns" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_campaigns' AND policyname = 'email_campaigns_insert_policy') THEN
    EXECUTE 'ALTER POLICY "email_campaigns_insert_policy" ON public."email_campaigns" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_campaigns' AND policyname = 'email_campaigns_update_policy') THEN
    EXECUTE 'ALTER POLICY "email_campaigns_update_policy" ON public."email_campaigns" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_campaigns' AND policyname = 'email_campaigns_delete_policy') THEN
    EXECUTE 'ALTER POLICY "email_campaigns_delete_policy" ON public."email_campaigns" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_history' AND policyname = 'email_history_select_policy') THEN
    EXECUTE 'ALTER POLICY "email_history_select_policy" ON public."email_history" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_history' AND policyname = 'email_history_insert_policy') THEN
    EXECUTE 'ALTER POLICY "email_history_insert_policy" ON public."email_history" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_signatures' AND policyname = 'email_signatures_select_policy') THEN
    EXECUTE 'ALTER POLICY "email_signatures_select_policy" ON public."email_signatures" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_signatures' AND policyname = 'email_signatures_insert_policy') THEN
    EXECUTE 'ALTER POLICY "email_signatures_insert_policy" ON public."email_signatures" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_signatures' AND policyname = 'email_signatures_update_policy') THEN
    EXECUTE 'ALTER POLICY "email_signatures_update_policy" ON public."email_signatures" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_signatures' AND policyname = 'email_signatures_delete_policy') THEN
    EXECUTE 'ALTER POLICY "email_signatures_delete_policy" ON public."email_signatures" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_templates' AND policyname = 'email_templates_select_policy') THEN
    EXECUTE 'ALTER POLICY "email_templates_select_policy" ON public."email_templates" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_templates' AND policyname = 'email_templates_insert_policy') THEN
    EXECUTE 'ALTER POLICY "email_templates_insert_policy" ON public."email_templates" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_templates' AND policyname = 'email_templates_update_policy') THEN
    EXECUTE 'ALTER POLICY "email_templates_update_policy" ON public."email_templates" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_templates' AND policyname = 'email_templates_delete_policy') THEN
    EXECUTE 'ALTER POLICY "email_templates_delete_policy" ON public."email_templates" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_calls' AND policyname = 'scheduled_calls_select_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_calls_select_policy" ON public."scheduled_calls" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_calls' AND policyname = 'scheduled_calls_insert_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_calls_insert_policy" ON public."scheduled_calls" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_calls' AND policyname = 'scheduled_calls_update_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_calls_update_policy" ON public."scheduled_calls" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_calls' AND policyname = 'scheduled_calls_delete_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_calls_delete_policy" ON public."scheduled_calls" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_emails' AND policyname = 'scheduled_emails_select_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_emails_select_policy" ON public."scheduled_emails" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_emails' AND policyname = 'scheduled_emails_insert_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_emails_insert_policy" ON public."scheduled_emails" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_emails' AND policyname = 'scheduled_emails_update_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_emails_update_policy" ON public."scheduled_emails" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scheduled_emails' AND policyname = 'scheduled_emails_delete_policy') THEN
    EXECUTE 'ALTER POLICY "scheduled_emails_delete_policy" ON public."scheduled_emails" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'job_assignments' AND policyname = 'job_assignments_portal_select_policy') THEN
    EXECUTE 'ALTER POLICY "job_assignments_portal_select_policy" ON public."job_assignments" USING ((\n        "job_assignments"."organization_id" = current_setting(\'app.organization_id\', true)::uuid\n        OR EXISTS (\n          SELECT 1 FROM portal_identities pi\n          WHERE pi.auth_user_id = auth.uid()\n            AND pi.status = \'active\'\n            AND pi.organization_id = "job_assignments"."organization_id"\n            AND pi.scope = \'customer\'\n            AND pi.customer_id = "job_assignments"."customer_id"\n        )\n        OR EXISTS (\n          SELECT 1 FROM portal_identities pi\n          WHERE pi.auth_user_id = auth.uid()\n            AND pi.status = \'active\'\n            AND pi.organization_id = "job_assignments"."organization_id"\n            AND pi.scope = \'subcontractor\'\n            AND pi.job_assignment_id = "job_assignments"."id"\n        )\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'attachments_select_policy') THEN
    EXECUTE 'ALTER POLICY "attachments_select_policy" ON public."attachments" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'attachments_insert_policy') THEN
    EXECUTE 'ALTER POLICY "attachments_insert_policy" ON public."attachments" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'attachments_update_policy') THEN
    EXECUTE 'ALTER POLICY "attachments_update_policy" ON public."attachments" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attachments' AND policyname = 'attachments_delete_policy') THEN
    EXECUTE 'ALTER POLICY "attachments_delete_policy" ON public."attachments" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rma_line_items' AND policyname = 'rma_line_items_select_policy') THEN
    EXECUTE 'ALTER POLICY "rma_line_items_select_policy" ON public."rma_line_items" USING (EXISTS (\n        SELECT 1 FROM return_authorizations ra\n        WHERE ra.id = rma_id\n        AND ra.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rma_line_items' AND policyname = 'rma_line_items_insert_policy') THEN
    EXECUTE 'ALTER POLICY "rma_line_items_insert_policy" ON public."rma_line_items" WITH CHECK (EXISTS (\n        SELECT 1 FROM return_authorizations ra\n        WHERE ra.id = rma_id\n        AND ra.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rma_line_items' AND policyname = 'rma_line_items_update_policy') THEN
    EXECUTE 'ALTER POLICY "rma_line_items_update_policy" ON public."rma_line_items" USING (EXISTS (\n        SELECT 1 FROM return_authorizations ra\n        WHERE ra.id = rma_id\n        AND ra.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      )) WITH CHECK (EXISTS (\n        SELECT 1 FROM return_authorizations ra\n        WHERE ra.id = rma_id\n        AND ra.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rma_line_items' AND policyname = 'rma_line_items_delete_policy') THEN
    EXECUTE 'ALTER POLICY "rma_line_items_delete_policy" ON public."rma_line_items" USING (EXISTS (\n        SELECT 1 FROM return_authorizations ra\n        WHERE ra.id = rma_id\n        AND ra.organization_id = current_setting(\'app.organization_id\', true)::uuid\n      ))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index' AND policyname = 'search_index_select_policy') THEN
    EXECUTE 'ALTER POLICY "search_index_select_policy" ON public."search_index" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index' AND policyname = 'search_index_insert_policy') THEN
    EXECUTE 'ALTER POLICY "search_index_insert_policy" ON public."search_index" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index' AND policyname = 'search_index_update_policy') THEN
    EXECUTE 'ALTER POLICY "search_index_update_policy" ON public."search_index" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index' AND policyname = 'search_index_delete_policy') THEN
    EXECUTE 'ALTER POLICY "search_index_delete_policy" ON public."search_index" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recent_items' AND policyname = 'recent_items_select_policy') THEN
    EXECUTE 'ALTER POLICY "recent_items_select_policy" ON public."recent_items" USING (organization_id = (\n          SELECT organization_id FROM users WHERE auth_id = auth.uid()\n        )\n        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recent_items' AND policyname = 'recent_items_insert_policy') THEN
    EXECUTE 'ALTER POLICY "recent_items_insert_policy" ON public."recent_items" WITH CHECK (organization_id = (\n          SELECT organization_id FROM users WHERE auth_id = auth.uid()\n        )\n        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recent_items' AND policyname = 'recent_items_update_policy') THEN
    EXECUTE 'ALTER POLICY "recent_items_update_policy" ON public."recent_items" USING (organization_id = (\n          SELECT organization_id FROM users WHERE auth_id = auth.uid()\n        )\n        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())) WITH CHECK (organization_id = (\n          SELECT organization_id FROM users WHERE auth_id = auth.uid()\n        )\n        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recent_items' AND policyname = 'recent_items_delete_policy') THEN
    EXECUTE 'ALTER POLICY "recent_items_delete_policy" ON public."recent_items" USING (organization_id = (\n          SELECT organization_id FROM users WHERE auth_id = auth.uid()\n        )\n        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index_outbox' AND policyname = 'search_outbox_select_policy') THEN
    EXECUTE 'ALTER POLICY "search_outbox_select_policy" ON public."search_index_outbox" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index_outbox' AND policyname = 'search_outbox_insert_policy') THEN
    EXECUTE 'ALTER POLICY "search_outbox_insert_policy" ON public."search_index_outbox" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index_outbox' AND policyname = 'search_outbox_update_policy') THEN
    EXECUTE 'ALTER POLICY "search_outbox_update_policy" ON public."search_index_outbox" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index_outbox' AND policyname = 'search_outbox_delete_policy') THEN
    EXECUTE 'ALTER POLICY "search_outbox_delete_policy" ON public."search_index_outbox" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_portal_sessions' AND policyname = 'portal_sessions_select_policy') THEN
    EXECUTE 'ALTER POLICY "portal_sessions_select_policy" ON public."customer_portal_sessions" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_portal_sessions' AND policyname = 'portal_sessions_insert_policy') THEN
    EXECUTE 'ALTER POLICY "portal_sessions_insert_policy" ON public."customer_portal_sessions" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_portal_sessions' AND policyname = 'portal_sessions_update_policy') THEN
    EXECUTE 'ALTER POLICY "portal_sessions_update_policy" ON public."customer_portal_sessions" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customer_portal_sessions' AND policyname = 'portal_sessions_delete_policy') THEN
    EXECUTE 'ALTER POLICY "portal_sessions_delete_policy" ON public."customer_portal_sessions" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portal_identities' AND policyname = 'portal_identities_select_policy') THEN
    EXECUTE 'ALTER POLICY "portal_identities_select_policy" ON public."portal_identities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid OR auth_user_id = auth.uid())';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portal_identities' AND policyname = 'portal_identities_insert_policy') THEN
    EXECUTE 'ALTER POLICY "portal_identities_insert_policy" ON public."portal_identities" WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portal_identities' AND policyname = 'portal_identities_update_policy') THEN
    EXECUTE 'ALTER POLICY "portal_identities_update_policy" ON public."portal_identities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid) WITH CHECK (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portal_identities' AND policyname = 'portal_identities_delete_policy') THEN
    EXECUTE 'ALTER POLICY "portal_identities_delete_policy" ON public."portal_identities" USING (organization_id = current_setting(\'app.organization_id\', true)::uuid)';
  END IF;
END $$;

-- Add missing policies for organizations and stock_count_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'organizations_select_policy') THEN
    EXECUTE 'CREATE POLICY organizations_select_policy ON public.organizations FOR SELECT TO authenticated USING (id = public.get_user_organization_id())';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'organizations_update_policy') THEN
    EXECUTE 'CREATE POLICY organizations_update_policy ON public.organizations FOR UPDATE TO authenticated USING (id = public.get_user_organization_id() AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = ''admin'')) WITH CHECK (id = public.get_user_organization_id())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_count_items' AND policyname = 'stock_count_items_org_isolation') THEN
    EXECUTE 'CREATE POLICY stock_count_items_org_isolation ON public.stock_count_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stock_counts sc WHERE sc.id = stock_count_id AND sc.organization_id = public.get_user_organization_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.stock_counts sc WHERE sc.id = stock_count_id AND sc.organization_id = public.get_user_organization_id()))';
  END IF;
END $$;
