-- RLS Remediation Script (public schema)
-- 목적: greenfield reset 이후 RLS 상태를 기준선으로 복구
-- 안전성: 데이터 삭제 없음, 정책은 존재 시 유지, 없는 것만 생성
--
-- 실행 전 확인:
-- 1) public.get_user_organization_id() 함수 존재
-- 2) auth.uid() 사용 가능
-- 3) users / organizations 테이블은 FORCE RLS 제외 (서비스 역할 필요)

-- 1) Enable RLS on all public base tables
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
  END LOOP;
END $$;

-- 2) Create baseline policies for org-scoped or user-scoped tables (if missing)
DO $$
DECLARE
  r record;
  has_org boolean;
  has_user boolean;
  policy_name text;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = r.table_name
        AND column_name = 'organization_id'
    ) INTO has_org;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = r.table_name
        AND column_name = 'user_id'
    ) INTO has_user;

    IF has_org THEN
      policy_name := 'org_isolation';
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = r.table_name
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL USING (organization_id = public.get_user_organization_id()) WITH CHECK (organization_id = public.get_user_organization_id())',
          policy_name,
          r.table_name
        );
      END IF;
    ELSIF has_user THEN
      policy_name := 'user_isolation';
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = r.table_name
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
          policy_name,
          r.table_name
        );
      END IF;
    ELSE
      RAISE NOTICE 'No organization_id/user_id on table %, policy not created', r.table_name;
    END IF;
  END LOOP;
END $$;

-- 3) FORCE RLS on org/user tables (skip users, organizations)
DO $$
DECLARE
  r record;
  has_org boolean;
  has_user boolean;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    IF r.table_name IN ('users', 'organizations') THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = r.table_name
        AND column_name = 'organization_id'
    ) INTO has_org;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = r.table_name
        AND column_name = 'user_id'
    ) INTO has_user;

    IF has_org OR has_user THEN
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.table_name);
    END IF;
  END LOOP;
END $$;
