# Security Assessment: Orders Domain Implementation
Generated: 2026-01-17

## Executive Summary
- **Risk Level:** MEDIUM
- **Findings:** 0 critical, 2 high, 4 medium
- **Immediate Actions Required:** Yes

## Threat Model
- **Assumed Attackers:** Authenticated users attempting to access other organizations' data, malicious insiders, compromised accounts
- **Attack Vectors:** Cross-tenant data access, privilege escalation, business logic bypass, injection attacks
- **Assets to Protect:** Order data, customer information, financial records, multi-tenant isolation

## Findings

### HIGH: Missing RLS Policies on order_shipments, order_templates, order_amendments, shipment_items Tables

**Location:** 
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/order-shipments.ts`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/order-templates.ts`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/drizzle/schema/order-amendments.ts`

**Vulnerability:** Missing Database-Level Access Control (OWASP A01:2021 - Broken Access Control)

**Risk:** While the `orders` and `order_line_items` tables have RLS policies (migration 0008), the related tables (`order_shipments`, `shipment_items`, `order_templates`, `order_template_items`, `order_amendments`) do NOT have RLS enabled. The application layer DOES filter by `organizationId`, but without RLS, a direct database connection or query injection could bypass these controls.

**Evidence:**
Search for RLS policies found only migrations for:
- `orders` (0008_orders_rls_policies.sql)
- `order_line_items` (0008_orders_rls_policies.sql)

No RLS migrations exist for:
- `order_shipments`
- `shipment_items`
- `order_templates`
- `order_template_items`
- `order_amendments`

**Proof of Concept:**
If an attacker gains direct database access (via SQL injection elsewhere, compromised credentials, or Supabase client):
```sql
-- Without RLS, this would return ALL organizations' shipments
SELECT * FROM order_shipments;
```

**Remediation:**
1. Create a new migration to enable RLS on all order-related tables:
```sql
-- Enable RLS on order_shipments
ALTER TABLE "order_shipments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_shipments_org_isolation" ON "order_shipments"
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);

-- Enable RLS on shipment_items
ALTER TABLE "shipment_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipment_items_org_isolation" ON "shipment_items"
  FOR ALL
  USING (organization_id = current_setting('app.organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.organization_id', true)::uuid);

-- Repeat for order_templates, order_template_items, order_amendments
```

---

### HIGH: Amendment Apply Function Allows Modifying Any Line Item in Organization

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-amendments.ts:288-340`

**Vulnerability:** Insecure Direct Object Reference (OWASP A01:2021 - Broken Access Control)

**Risk:** The `applyAmendment` function applies changes to `orderLineItems` using `orderLineItemId` from the amendment changes without verifying the line item belongs to the order being amended.

**Evidence:**
```typescript
// order-amendments.ts:295-310
if (itemChange.action === "modify" && itemChange.orderLineItemId) {
  // Modify existing line item
  await db
    .update(orderLineItems)
    .set({
      quantity: itemChange.after?.quantity,
      // ...other fields
    })
    .where(
      and(
        eq(orderLineItems.id, itemChange.orderLineItemId),
        eq(orderLineItems.organizationId, ctx.organizationId)
        // MISSING: eq(orderLineItems.orderId, order.id)
      )
    );
}
```

**Proof of Concept:**
An attacker could create an amendment for Order A, but include `orderLineItemId` values from Order B. Since only `organizationId` is checked (not `orderId`), the line items from Order B would be modified.

**Remediation:**
Add `orderId` constraint to all line item operations in `applyAmendment`:
```typescript
.where(
  and(
    eq(orderLineItems.id, itemChange.orderLineItemId),
    eq(orderLineItems.organizationId, ctx.organizationId),
    eq(orderLineItems.orderId, order.id)  // ADD THIS
  )
)
```

---

### MEDIUM: No Permission Check on Amendment Request Creation

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-amendments.ts:145-190`

**Vulnerability:** Missing Function Level Access Control (OWASP A01:2021)

**Risk:** The `requestAmendment` function only calls `withAuth()` without permission check, allowing any authenticated user in the organization to request amendments on any order. While `approveAmendment` and `rejectAmendment` correctly require `orders:approve` permission, `requestAmendment` may need restrictions based on business rules.

**Evidence:**
```typescript
// requestAmendment - no permission check
const ctx = await withAuth();

// approveAmendment - has permission check
const ctx = await withAuth({ permission: "orders:approve" });
```

**Remediation:**
Consider adding permission check:
```typescript
const ctx = await withAuth({ permission: "orders:amend" });
```
Or add business logic to verify the user has access to the specific order.

---

### MEDIUM: Template Usage Count Increment Without Transaction

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-templates.ts:350-365`

**Vulnerability:** Race Condition (CWE-362)

**Risk:** The `createOrderFromTemplate` function reads the template, creates the order, then separately updates the usage count. In high-concurrency scenarios, this could lead to lost updates.

**Evidence:**
```typescript
// Reading current count
const currentUsage = (template.metadata as Record<string, unknown>)?.usageCount ?? 0;
// Later updating with incremented value
await db.update(orderTemplates).set({
  metadata: {
    ...(template.metadata as Record<string, unknown>),
    usageCount: (currentUsage as number) + 1,
    // ...
  },
});
```

**Remediation:**
Use SQL increment to avoid race condition:
```typescript
metadata: sql`jsonb_set(
  ${orderTemplates.metadata},
  '{usageCount}',
  to_jsonb(COALESCE((${orderTemplates.metadata}->>'usageCount')::int, 0) + 1)
)`
```

---

### MEDIUM: Shipment Item Quantity Validation Timing

**Location:** `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-shipments.ts:80-115`

**Vulnerability:** Time-of-Check Time-of-Use (TOCTOU) Race Condition (CWE-367)

**Risk:** The `validateShipmentItems` function checks available quantity, but the shipment is created separately. Between validation and creation, another concurrent request could ship the same items.

**Evidence:**
```typescript
// Validation happens here
await validateShipmentItems(ctx.organizationId, data.orderId, data.items);

// Shipment creation happens later - no transaction lock
const [shipment] = await db.insert(orderShipments).values({...});
```

**Remediation:**
Wrap validation and creation in a transaction with row-level locking:
```typescript
await db.transaction(async (tx) => {
  // Lock the order line items for update
  const lockedItems = await tx
    .select()
    .from(orderLineItems)
    .where(eq(orderLineItems.orderId, data.orderId))
    .for('update');
  
  // Validate quantities
  // Create shipment
  // Update qtyShipped atomically
});
```

---

### MEDIUM: ILIKE SQL Injection Potential in Search Fields

**Location:** 
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-shipments.ts:187`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/orders.ts:242-246`

**Vulnerability:** SQL Injection via Pattern Characters (OWASP A03:2021)

**Risk:** While Drizzle's `sql` template tag parameterizes values, ILIKE pattern characters (`%`, `_`) in user input are not escaped. An attacker could use `%` to perform broader searches than intended.

**Evidence:**
```typescript
// order-shipments.ts:187
sql`${orderShipments.carrier} ILIKE ${`%${carrier}%`}`

// orders.ts:242-246
sql`(
  ${orders.orderNumber} ILIKE ${`%${search}%`} OR
  ${orders.internalNotes} ILIKE ${`%${search}%`}
)`
```

**Remediation:**
Escape LIKE pattern characters in user input:
```typescript
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// Usage
const safeSearch = escapeLikePattern(search);
sql`${orders.orderNumber} ILIKE ${`%${safeSearch}%`}`
```

---

## Dependency Vulnerabilities

| Package | Version | CVE | Severity | Fixed In |
|---------|---------|-----|----------|----------|
| N/A | - | - | - | - |

*Note: Dependency audit not performed in this assessment. Recommend running `npm audit` separately.*

## Secrets Exposure Check

- `.env` files: VERIFIED - `.gitignore` includes `.env*` patterns
- Hardcoded secrets: NONE FOUND in orders domain code
- Secret management: Using `process.env.DATABASE_URL` correctly
- Internal API secret: Using `INTERNAL_API_SECRET` env var (verified in protected.ts)

## Authorization Model Analysis

**Positive Findings:**
1. All server functions use `withAuth()` for authentication
2. `organizationId` filtering is consistently applied in all queries
3. Permission checks exist for sensitive operations (`orders:approve`)
4. RLS context is set in `withAuth()` via `set_config('app.organization_id', ...)`
5. Input validation uses Zod schemas with proper constraints
6. UUID validation prevents ID enumeration attacks

**Gaps:**
1. Missing RLS policies on 5 tables (defense in depth)
2. Some functions lack fine-grained permission checks
3. No audit logging for sensitive operations
4. No rate limiting visible in the code

## Recommendations

### Immediate (High Priority)

1. **Create RLS migration for order-related tables**
   - `order_shipments`
   - `shipment_items`
   - `order_templates`
   - `order_template_items`
   - `order_amendments`

2. **Fix IDOR in applyAmendment**
   - Add `orderId` constraint to line item updates
   - File: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-amendments.ts`

### Short-term (Medium Priority)

3. **Add transaction with locking for shipment creation**
   - Prevent race conditions when multiple shipments are created concurrently
   - File: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/lib/server/functions/order-shipments.ts`

4. **Escape LIKE pattern characters in search inputs**
   - Create utility function for safe ILIKE queries
   - Apply to all search endpoints

5. **Add permission check to requestAmendment**
   - Consider `orders:amend` or `orders:request_change` permission

### Long-term (Hardening)

6. **Implement audit logging**
   - Log all order modifications with user ID, timestamp, and before/after values
   - Critical for financial compliance

7. **Add rate limiting**
   - Protect against abuse of order creation/modification endpoints
   - Recommend per-user and per-organization limits

8. **Consider field-level access control**
   - Some order fields (internal notes, financial data) may need role-based visibility

---

## Verification Checklist

| Check | Status | Notes |
|-------|--------|-------|
| All endpoints require authentication | PASS | withAuth() used everywhere |
| Organization isolation in queries | PASS | organizationId consistently filtered |
| Input validation | PASS | Zod schemas with constraints |
| UUID format validation | PASS | z.string().uuid() on all IDs |
| No hardcoded credentials | PASS | Using environment variables |
| SQL injection protection | PASS* | Drizzle parameterization (minor LIKE issue) |
| RLS enabled (orders, order_line_items) | PASS | Migration 0008 |
| RLS enabled (shipments, templates, amendments) | FAIL | Missing migrations |
| Permission checks on sensitive ops | PARTIAL | Approve/reject covered, others missing |
| Transaction safety | PARTIAL | Some race conditions possible |

---

*Assessment performed by Aegis security agent on 2026-01-17*
