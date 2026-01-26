---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, security, multi-tenancy, rls]
dependencies: []
---

# Organizations Table Missing RLS Policies

## Problem Statement

The `organizations` table has NO Row-Level Security policies defined. This is the most sensitive table in a multi-tenant system, containing all organization data including billing information, ABN, Stripe customer IDs, and settings. Any authenticated user could potentially read or modify any organization's data if RLS is enforced at the database level.

## Findings

**File:** `drizzle/schema/settings/organizations.ts` (lines 65-128)

The table definition includes indexes but NO `pgPolicy` definitions:

```typescript
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    stripeCustomerId: text("stripe_customer_id"), // SENSITIVE
    // ...
  },
  (table) => ({
    slugUnique: uniqueIndex("idx_organizations_slug_unique").on(table.slug),
    domainUnique: uniqueIndex("idx_organizations_domain_unique")...
    // NO selectPolicy, insertPolicy, updatePolicy, or deletePolicy defined
  })
);
```

**Contrast with users table** which HAS RLS policies:
```typescript
// users.ts has proper RLS
selectPolicy: pgPolicy("users_select_policy", {
  for: "select",
  to: "authenticated",
  using: sql`organization_id = current_setting('app.organization_id', true)::uuid`,
}),
```

## Proposed Solutions

### Solution 1: Add RLS Policies (Recommended)
Add RLS policies that allow access only to the user's own organization.

**Pros:**
- Defense-in-depth security layer
- Consistent with other tables
- Prevents cross-tenant access even with SQL injection

**Cons:**
- Organizations table doesn't have `organization_id` (it IS the org)
- Need different policy pattern using the `id` column directly

**Effort:** Small (30 min)

**Implementation:**
```typescript
// Add to organizations table definition
selectPolicy: pgPolicy("organizations_select_policy", {
  for: "select",
  to: "authenticated",
  using: sql`id = current_setting('app.organization_id', true)::uuid`,
}),
updatePolicy: pgPolicy("organizations_update_policy", {
  for: "update",
  to: "authenticated",
  using: sql`id = current_setting('app.organization_id', true)::uuid`,
  withCheck: sql`id = current_setting('app.organization_id', true)::uuid`,
}),
```

### Solution 2: Document and Accept
Document that organizations table relies solely on application-level filtering.

**Pros:**
- No code changes
- Faster

**Cons:**
- Security gap remains
- Inconsistent architecture

**Effort:** Minimal

## Recommended Action
[To be filled during triage]

## Technical Details

**Affected Files:**
- `drizzle/schema/settings/organizations.ts`

**Related Tables:**
- All tables with `organizationId` reference this table
- User sessions, invitations, API tokens all cascade from organizations

**Risk if Not Fixed:**
- Cross-tenant data access via direct database queries
- Compliance violations for data isolation

## Acceptance Criteria

- [ ] RLS policies added to organizations table
- [ ] Migration generated and tested
- [ ] Verified that users can only access their own organization
- [ ] Verified signup flow still works (creates org before user context exists)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-25 | Created | From security-sentinel and architecture-strategist review |

## Resources

- Security audit report from security-sentinel agent
- Architecture review from architecture-strategist agent
- Similar RLS pattern in `drizzle/schema/users/users.ts`
