---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, security, rls, multi-tenancy]
dependencies: ["001", "002"]
---

# Incomplete RLS Coverage - Only 31/94 Tables Have Policies

## Problem Statement

Only 31 of 94 tables with `organizationId` columns have RLS policies defined. This means 63 tables rely solely on application-level filtering for multi-tenant isolation, which could be bypassed via direct database access.

## Findings

**Tables WITH RLS Policies (31):**
- users, user_invitations, user_groups, user_group_members
- api_tokens
- orders (partial - portal policy only)
- audit_logs (insert only)
- (other tables in migrations)

**Tables WITHOUT RLS Policies (63+):**
- products, product_bundles, product_pricing, product_attributes
- inventory, inventory_movements, stock_counts, warehouse_locations
- customers, contacts, customer_segments
- warranties, warranty_claims, warranty_extensions
- suppliers, purchase_orders, supplier_pricing
- jobs, job_assignments, job_photos, job_documents
- quotes, quote_line_items
- opportunities, pipeline_stages
- Many financial tables
- Many support tables

## Proposed Solutions

### Solution 1: Add RLS to All Tables (Recommended)
Systematically add RLS policies to all tables with organizationId.

**Effort:** Large (3-5 days)

### Solution 2: Remove RLS Entirely
Since service role bypasses RLS, remove the RLS policies and rely on app-level filtering.

**Effort:** Small but reduces security

## Acceptance Criteria

- [ ] All 94 tables with organizationId have RLS policies
- [ ] Migration generated and tested
- [ ] Documented which tables have RLS

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From architecture-strategist review |
