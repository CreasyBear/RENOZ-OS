-- ============================================================================
-- RLS Current Setting Canonical Form
-- Migration: 0020_rls_current_setting_canonical_form.sql
--
-- Supabase advisor may still flag policies that use:
--   ( SELECT (current_setting('app.organization_id'::text, true))::uuid AS current_setting)
--
-- This migration rewrites those expressions to:
--   ((select current_setting('app.organization_id'::text, true))::uuid)
--
-- The rewrite is semantics-preserving and only applies to policies that
-- contain the legacy expression pattern in qual / with_check.
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
      AND (
        coalesce(qual, '') ~* '\(\s*select\s+\(current_setting\([^)]*\)\)::uuid\s+as\s+current_setting\s*\)'
        OR coalesce(with_check, '') ~* '\(\s*select\s+\(current_setting\([^)]*\)\)::uuid\s+as\s+current_setting\s*\)'
      )
  LOOP
    IF p.roles IS NULL OR cardinality(p.roles) = 0 THEN
      roles_sql := 'public';
    ELSE
      SELECT string_agg(quote_ident(r), ', ')
      INTO roles_sql
      FROM unnest(p.roles) AS r;
    END IF;

    using_expr := p.qual;
    IF using_expr IS NOT NULL THEN
      using_expr := regexp_replace(
        using_expr,
        '\(\s*select\s+\(current_setting\(([^)]*)\)\)::uuid\s+as\s+current_setting\s*\)',
        '((select current_setting(\1))::uuid)',
        'gi'
      );
    END IF;

    check_expr := p.with_check;
    IF check_expr IS NOT NULL THEN
      check_expr := regexp_replace(
        check_expr,
        '\(\s*select\s+\(current_setting\(([^)]*)\)\)::uuid\s+as\s+current_setting\s*\)',
        '((select current_setting(\1))::uuid)',
        'gi'
      );
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

