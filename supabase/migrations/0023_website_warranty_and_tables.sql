-- ============================================================================
-- Website Warranty Extension and Tables
-- Migration: 0023_website_warranty_and_tables.sql
--
-- 1. Extends warranties table for website form submissions (Option C)
-- 2. Creates inquiries, posts, website_products tables for renoz-website
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1: Extend warranties for website submissions
-- ----------------------------------------------------------------------------

-- Add pending_approval to warranty_status enum (must run first)
ALTER TYPE warranty_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- Add source and registration_payload columns
ALTER TABLE warranties
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'crm' CHECK (source IN ('crm', 'website')),
  ADD COLUMN IF NOT EXISTS registration_payload JSONB;

-- Allow customer_id and product_id to be NULL for pending_approval (website) submissions.
-- On approval, admin assigns real customer and product before changing status to active.
ALTER TABLE warranties
  ALTER COLUMN customer_id DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL;

-- Ensure approved warranties always have customer and product; pending may have NULL
ALTER TABLE warranties
  ADD CONSTRAINT chk_warranties_pending_or_linked
  CHECK (
    (status = 'pending_approval' AND customer_id IS NULL AND product_id IS NULL)
    OR (status != 'pending_approval' AND customer_id IS NOT NULL AND product_id IS NOT NULL)
  );

-- RLS policy for anonymous website form insert
CREATE POLICY "warranties_anon_insert_website_pending" ON warranties
  FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending_approval'
    AND source = 'website'
    AND organization_id = '7efe18a0-cb19-49de-ab45-7bfa82f62e72'
  );

-- ----------------------------------------------------------------------------
-- Part 2: Website tables (inquiries, posts, website_products)
-- ----------------------------------------------------------------------------

-- 2.1 inquiries (contact form)
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  inquiry_type TEXT CHECK (inquiry_type IN ('general', 'residential', 'commercial', 'partnership')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inquiries_anon_insert" ON inquiries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "inquiries_authenticated_select" ON inquiries FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);

-- 2.2 posts (blog CMS)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_public_select_published" ON posts FOR SELECT USING (published = true);
CREATE POLICY "posts_authenticated_all" ON posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);

-- 2.3 website_products (product CMS for marketing)
CREATE TABLE IF NOT EXISTS website_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('residential', 'rural', 'commercial')) NOT NULL,
  description TEXT,
  specs JSONB,
  images TEXT[],
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE website_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "website_products_public_select" ON website_products FOR SELECT USING (true);
CREATE POLICY "website_products_authenticated_all" ON website_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_website_products_category ON website_products(category);
CREATE INDEX IF NOT EXISTS idx_website_products_featured ON website_products(featured);
CREATE INDEX IF NOT EXISTS idx_website_products_slug ON website_products(slug);
