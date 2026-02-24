# Order Detail View — Schema Display Plan

**Purpose:** Frontend design planning to display and maximise the order schema in the detail view.  
**References:** DETAIL-VIEW-STANDARDS.md, domain-interaction-review, ui-ux-pro-max, web-design-guidelines

---

## 1. Design Principles (from skills)

### Progressive Disclosure
- **Quick Scan:** Status, blockers, next action, key metrics
- **Deep Work:** Full schema, audit trail, metadata, line-item details

### Scanning > Reading
- Visual hierarchies, consistent alignment
- Status indicators at a glance
- Action proximity to context

### Information Architecture (domain-interaction-review)
Map schema fields to user value:

| Category | Fields | User Value |
|----------|--------|------------|
| **Identity** | orderNumber, id | "What am I looking at?" |
| **Status** | status, paymentStatus, invoiceStatus | "Where are we?" |
| **Metrics** | total, balanceDue, paidAmount, lineItems.length | "Key numbers" |
| **Relations** | customer, lineItems.product | "Context" |
| **Temporal** | orderDate, dueDate, shippedDate, deliveredDate, paidAt | "When?" |
| **Details** | addresses, notes, metadata, audit | "Everything else" |

---

## 2. Current vs Proposed — Schema Coverage

### Order-Level Fields

| Field | Current | Proposed Placement | Rationale |
|-------|---------|-------------------|-----------|
| `orderNumber` | ✓ Header | Keep | Identity |
| `status` | ✓ Header | Keep | Status |
| `paymentStatus` | ✓ Header | Keep | Status |
| `customerId` + `customer` | ✓ Header, sidebar | Keep | Relations |
| `orderDate` | ✓ Header | Keep | Temporal |
| `dueDate` | ✓ Header | Keep | Temporal |
| `total` | ✓ Header | Keep | Metric |
| `balanceDue` | ✓ Header | Keep | Metric |
| `paidAmount` | ✓ Header (derived %) | Keep | Metric |
| `lineItems` | ✓ Tabs | Keep | Core data |
| `shippedDate` | ✓ Sidebar | Keep | Temporal |
| `deliveredDate` | ✓ Sidebar | Keep | Temporal |
| `createdAt`, `updatedAt` | ✓ Sidebar | Keep | Audit |
| `version` | ✓ Sidebar | Keep | Audit |
| `quotePdfUrl` | ✓ Sidebar | Keep | Documents |
| `invoicePdfUrl`, `invoiceNumber` | ✓ Sidebar | Keep | Documents |
| `xeroInvoiceUrl` | ✓ Sidebar | Keep | Documents |
| `billingAddress` | ✓ Overview | Add `country`, `contactPhone` | Address completeness |
| `shippingAddress` | ✓ Overview | Add `country`, `contactPhone` | Address completeness |
| `subtotal`, `discountAmount`, `taxAmount`, `shippingAmount` | ✓ Overview | Keep | Financial |
| `customerNotes`, `internalNotes` | ✓ Overview | Keep | Notes |
| **`paidAt`** | ❌ | **Sidebar** | When full payment received |
| **`invoiceStatus`** | ❌ | **Sidebar or Overview** | Draft/sent/paid |
| **`invoiceDueDate`** | ❌ | **Sidebar** | Invoice due |
| **`invoiceSentAt`** | ❌ | **Sidebar** | When sent |
| **`metadata`** | ❌ | **Sidebar (expandable)** | Source, priority, assignedTo |
| **`xeroInvoiceId`, `xeroSyncStatus`, `xeroSyncError`** | ❌ | **Sidebar** | Xero sync status |
| **`organizationId`** | ❌ | Skip (internal) | Not user-facing |
| **`createdBy`, `updatedBy`** | ❌ | **Sidebar** | Link to user profiles |
| **`deletedAt`** | ❌ | Skip | Soft delete |

### Customer Fields

| Field | Current | Proposed |
|-------|---------|----------|
| `name`, `email`, `phone` | ✓ Sidebar | Keep |
| **`taxId`** | ❌ | **Sidebar** | ABN/tax ID |

### Line Item Fields

| Field | Items Tab | Fulfillment Tab | Proposed |
|-------|-----------|------------------|----------|
| `id`, `lineNumber`, `product`, `description`, `sku` | ✓ | ✓ | Keep |
| `quantity`, `unitPrice`, `lineTotal` | ✓ | ✓ | Keep |
| `qtyPicked`, `qtyShipped`, `qtyDelivered` | ❌ | ✓ | Keep |
| `pickStatus` | ❌ | ✓ | Keep |
| **`allocatedSerialNumbers`** | ❌ | ✓ | **Add to Items tab** |
| **`discountPercent`, `discountAmount`** | ❌ | ❌ | **Items tab** (expandable) |
| **`taxType`, `taxAmount`** | ❌ | ❌ | **Items tab** (expandable) |
| **`notes`** | ❌ | ❌ | **Items tab** (expandable row) |
| **`product.isSerialized`** | ❌ | ❌ | **Items tab** (badge) |
| `pickedAt`, `pickedBy` | ❌ | ❌ | **Fulfillment** (tooltip) |

---

## 3. Zone-by-Zone Placement

### Zone 1: Header
- **Keep:** orderNumber, status, paymentStatus, customer link, orderDate, dueDate, items count, total, balance, paid %
- **Optional:** Add `invoiceStatus` badge when invoice exists (e.g. "Invoice: Sent")

### Zone 2: Progress
- Keep current fulfillment stages

### Zone 3: Alerts
- Keep current alerts

### Zone 4: Tabs
- Keep: Overview, Items, Fulfillment, Activity, Documents, Payments
- **Optional:** Add "Shipping" tab if shipping-specific data grows (per DETAIL-VIEW-STANDARDS Order tabs: Overview, Line Items, Fulfillment, Payment, Shipping, Documents, History)

### Zone 5A: Main Content

#### Overview Tab
- **Financial Summary:** Keep
- **Addresses:** Add `country`, `contactPhone` to billing/shipping blocks
- **Notes:** Keep

#### Items Tab
- **Add Serials column:** Badge + tooltip (same pattern as Fulfillment)
- **Optional:** Expandable row for discount, tax, notes
- **Optional:** `product.isSerialized` badge (e.g. "Serial" chip)

#### Fulfillment Tab
- Keep current

### Zone 5B: Sidebar

**Current sections:** Customer, Documents, Key Dates, Audit

**Proposed additions:**

```
┌─ Customer ──────────────────────────┐
│ [Avatar] Name                        │
│ email, phone                        │
│ ABN: {order.customer.taxId}          │  ← NEW
├─────────────────────────────────────┤
│ Documents                            │
│ Quote, Invoice, Packing Slip, etc.   │
│ [Xero sync status]                   │  ← NEW (if xeroInvoiceId)
├─────────────────────────────────────┤
│ Invoice Status                       │  ← NEW
│ Status: {invoiceStatus}              │
│ Due: {invoiceDueDate}                │
│ Sent: {invoiceSentAt}                │
│ Paid: {paidAt}                       │
├─────────────────────────────────────┤
│ Key Dates                            │
│ Created, Due, Shipped, Delivered     │
├─────────────────────────────────────┤
│ Record Info (expandable)             │  ← NEW
│ Source: {metadata.source}            │
│ Priority: {metadata.priority}         │
│ Assigned to: {metadata.assignedTo}   │
│ Created by: {createdBy}              │
│ Updated by: {updatedBy}              │
├─────────────────────────────────────┤
│ Audit                                │
│ Updated, Version                     │
└─────────────────────────────────────┘
```

---

## 4. Layout Patterns (domain-interaction-review)

### Items Tab — Table Layout

| Pattern | Best For | Recommendation |
|---------|----------|----------------|
| **Table View** | 20+ items, comparison | Use for Items tab |
| **Columns** | Max 7–8 visible | Prioritise columns |

**Proposed Items table columns:**

| # | Column | Content | Width |
|---|--------|---------|-------|
| 1 | # | lineNumber | 50px |
| 2 | Product | name, SKU, isSerialized badge | flex |
| 3 | Qty | quantity | 80px |
| 4 | Price | unitPrice | 100px |
| 5 | Total | lineTotal | 100px |
| 6 | Serials | allocatedSerialNumbers (badge + tooltip) | 80px |

**Progressive disclosure (expandable row):**
- Discount, tax, notes
- `pickedAt` / `pickedBy` (for audit)

### Mobile (< 640px)
- Card layout for line items
- Stack: Product | Qty × Price = Total | Serials
- Sidebar: Sheet (already implemented)

---

## 5. UX Checklist (ui-ux-pro-max, web-interface)

### Accessibility
- [ ] Serials tooltip: `aria-label` on Badge
- [ ] Expandable rows: `aria-expanded`, `aria-controls`
- [ ] Status badges: icon + text (not color alone)

### Data Tables
- [ ] Empty cells: "—" not blank
- [ ] Sort indicators if sortable
- [ ] Row hover state for readability

### Virtualization
- [ ] Line items > 50: use `@tanstack/react-virtual` (per DETAIL-VIEW-STANDARDS)

### Touch
- [ ] Touch targets 44×44px on mobile
- [ ] Row actions accessible (not hover-only on mobile)

---

## 6. Implementation Phases

### Phase 1 — Quick Wins (1–2 iterations)
1. **Items tab:** Add Serials column (badge + tooltip)
2. **Sidebar:** Add `customer.taxId` (ABN)
3. **Addresses:** Add `country`, `contactPhone`

### Phase 2 — Sidebar (sprint-sized)
4. Sidebar: Invoice Status section
5. Sidebar: Record Info (metadata, createdBy, updatedBy)
6. Sidebar: Xero sync status

### Phase 3 — Deep Work (epic-sized)
7. Items tab: Expandable rows (discount, tax, notes)
8. Items tab: `product.isSerialized` badge
9. Fulfillment tab: `pickedAt` / `pickedBy` tooltip
10. Virtualization for long line item lists

---

## 7. Schema Summary

**Total order fields:** ~40  
**Currently displayed:** ~25  
**Proposed to add:** ~15

**Total line item fields:** ~20  
**Currently displayed (Items):** ~8  
**Proposed to add (Items):** ~4 (serials, serialized badge, expandable row)

---

## 8. Anti-Patterns to Avoid (DETAIL-VIEW-STANDARDS)

- ❌ Data dump — show every field in one form
- ❌ Bury status — keep status in header
- ❌ Hide problems — keep alerts in Zone 3
- ❌ Action hunt — keep primary actions prominent
- ❌ Scroll for reference — keep sidebar sticky

---

## 9. Related Files

- `order-detail-view.tsx` — Main view
- `order-items-tab.tsx` — Items tab
- `order-overview-tab.tsx` — Overview tab
- `order-fulfillment-tab.tsx` — Fulfillment tab
- `DETAIL-VIEW-STANDARDS.md` — Layout pattern
