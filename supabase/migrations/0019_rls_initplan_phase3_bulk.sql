-- ============================================================================
-- RLS InitPlan Phase 3 (Bulk)
-- Migration: 0019_rls_initplan_phase3_bulk.sql
--
-- Goal:
--   Rewrite remaining RLS policies that still evaluate current_setting() or
--   auth helper functions per-row by wrapping function calls in (select ...).
--
-- Scope:
--   Only policies in public schema that still match the unwrapped pattern.
--   Leaves already-wrapped policies unchanged.
-- ============================================================================

DO $$
DECLARE
  p record;
  roles_sql text;
  using_expr text;
  check_expr text;
  create_sql text;
BEGIN
  FOR p IN
    WITH src AS (
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    )
    SELECT *
    FROM src
    WHERE
      (
        qual IS NOT NULL
        AND (
          qual ~* '(^|[^a-z_])(auth\.(uid|jwt|role|email)\s*\()'
          OR qual ~* '(^|[^a-z_])(current_setting\s*\()'
        )
        AND qual !~* '\(\s*select\s+(auth\.(uid|jwt|role|email)\s*\(|current_setting\s*\()'
      )
      OR
      (
        with_check IS NOT NULL
        AND (
          with_check ~* '(^|[^a-z_])(auth\.(uid|jwt|role|email)\s*\()'
          OR with_check ~* '(^|[^a-z_])(current_setting\s*\()'
        )
        AND with_check !~* '\(\s*select\s+(auth\.(uid|jwt|role|email)\s*\(|current_setting\s*\()'
      )
  LOOP
    -- Build TO roles clause.
    IF p.roles IS NULL OR cardinality(p.roles) = 0 THEN
      roles_sql := 'public';
    ELSE
      SELECT string_agg(quote_ident(r), ', ')
      INTO roles_sql
      FROM unnest(p.roles) AS r;
    END IF;

    -- Rewrite USING expression (if present).
    using_expr := p.qual;
    IF using_expr IS NOT NULL THEN
      using_expr := regexp_replace(using_expr, '\bauth\.uid\(\)', '(select auth.uid())', 'gi');
      using_expr := regexp_replace(using_expr, '\bauth\.jwt\(\)', '(select auth.jwt())', 'gi');
      using_expr := regexp_replace(using_expr, '\bauth\.role\(\)', '(select auth.role())', 'gi');
      using_expr := regexp_replace(using_expr, '\bauth\.email\(\)', '(select auth.email())', 'gi');
      using_expr := regexp_replace(using_expr, '\bcurrent_setting\s*\(([^)]*)\)', '(select current_setting(\1))', 'gi');
    END IF;

    -- Rewrite WITH CHECK expression (if present).
    check_expr := p.with_check;
    IF check_expr IS NOT NULL THEN
      check_expr := regexp_replace(check_expr, '\bauth\.uid\(\)', '(select auth.uid())', 'gi');
      check_expr := regexp_replace(check_expr, '\bauth\.jwt\(\)', '(select auth.jwt())', 'gi');
      check_expr := regexp_replace(check_expr, '\bauth\.role\(\)', '(select auth.role())', 'gi');
      check_expr := regexp_replace(check_expr, '\bauth\.email\(\)', '(select auth.email())', 'gi');
      check_expr := regexp_replace(check_expr, '\bcurrent_setting\s*\(([^)]*)\)', '(select current_setting(\1))', 'gi');
    END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      p.policyname, p.schemaname, p.tablename
    );

    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname, p.schemaname, p.tablename, lower(p.permissive), p.cmd, roles_sql
    );

    IF using_expr IS NOT NULL THEN
      create_sql := create_sql || ' USING (' || using_expr || ')';
    END IF;

    IF check_expr IS NOT NULL THEN
      create_sql := create_sql || ' WITH CHECK (' || check_expr || ')';
    END IF;

    EXECUTE create_sql;
  END LOOP;
END $$;

