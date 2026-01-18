# Task: Implement Suppliers Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/suppliers.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-suppliers.progress.txt

## PRD ID
DOM-SUPPLIERS

## Phase
domain-core

## Priority
3

## Dependencies
- FOUND-SCHEMA (schema patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check schema patterns are available
# Verify FOUND-SCHEMA is complete
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Glossary**: `memory-bank/_meta/glossary.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `lib/schema/suppliers.ts` | Supplier database schema |
| `lib/schemas/suppliers.ts` | Supplier Zod schemas |
| `src/server/functions/suppliers.ts` | Supplier server functions |
| `src/components/domain/suppliers/` | Supplier UI components |

---

## Renoz Business Context

### Supplier Types & Categories

Renoz's supplier ecosystem reflects the battery distribution supply chain:

```
Manufacturers (BYD, Pylontech, Huawei)
    ↓
Distributors (Regional wholesalers)
    ↓
Component Suppliers (Inverters, cables, accessories)
    ↓
Service Providers (Freight, installation subcontractors)
```

**Supplier Categories:**

- **Battery Manufacturers**: Primary suppliers (BYD, Pylontech, Alpha ESS, Huawei, Enphase)
- **Inverter Suppliers**: System integration components
- **Component Suppliers**: BMS, cables, mounting hardware
- **Freight Partners**: UN3481 hazmat-certified carriers
- **Installation Partners**: CEC-accredited subcontractor installers

**IMPORTANT**: Unlike generic supplier management, Renoz requires tracking UN3481 hazmat certification for freight carriers, minimum order quantities (MOQ) for direct factory orders, and lead times from overseas manufacturing (typically 6-12 weeks from China).

### Supplier Lifecycle

```
Prospective → Approved → Active → On Hold → Inactive
                           ↓
                      Preferred
```

**Status Definitions:**

- **Prospective**: Under evaluation, not yet approved
- **Approved**: Passed qualification process, can create POs
- **Active**: Regular trading relationship
- **Preferred**: Top-tier supplier with priority status and better terms
- **On Hold**: Temporary suspension (quality issues, payment disputes)
- **Inactive**: No longer trading but historical data preserved

### Critical Supplier Data

**Business Identity:**
- Trading name (as registered)
- ABN (Australian Business Number)
- ACN (for incorporated entities)
- GST registration status
- Payment terms (Net 30, Net 60, COD, etc.)

**Operational Details:**
- Lead time (days from PO to delivery)
- MOQ (Minimum Order Quantity)
- Shipping terms (FOB, CIF, EXW)
- Port of origin (for imports)
- Hazmat certification (for freight partners)

**Performance Metrics:**
- On-time delivery rate
- Quality defect rate
- Average response time
- Price competitiveness

---

## UI Pattern References

### Supplier List Table

**Component**: DataGrid with category badges and performance indicators

```typescript
// Reference implementation
import { DataGrid, DataGridContainer } from '@/registry/default/ui/data-grid';
import { Badge } from '@/registry/default/ui/badge';

// Supplier category colors
const categoryBadgeVariant = {
  battery_manufacturer: 'primary',
  inverter_supplier: 'info',
  component_supplier: 'secondary',
  freight_partner: 'warning',
  installation_partner: 'success',
} as const;

// Supplier table columns
const columns = [
  {
    accessorKey: 'name',
    header: 'Supplier',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-sm text-muted-foreground">{row.original.abn}</p>
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge
        variant={categoryBadgeVariant[row.original.category]}
        appearance="light"
      >
        {row.original.categoryLabel}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Badge
          variant={row.original.status === 'active' ? 'success' : 'outline'}
          appearance="light"
        >
          {row.original.status}
        </Badge>
        {row.original.isPreferred && (
          <Badge variant="primary" size="sm">Preferred</Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'leadTime',
    header: 'Lead Time',
    cell: ({ row }) => `${row.original.leadTimeDays} days`,
  },
  {
    accessorKey: 'performance',
    header: 'On-Time',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.onTimeDeliveryRate}%</span>
        <div className="w-16 h-2 bg-gray-200 rounded">
          <div
            className="h-full bg-green-500 rounded"
            style={{ width: `${row.original.onTimeDeliveryRate}%` }}
          />
        </div>
      </div>
    ),
  },
];
```

**Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`

### Supplier Form with Tabbed Sections

**Component**: Form with tabs for different data categories

```typescript
// Supplier create/edit form
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/registry/default/ui/tabs';
import { Form, FormField } from '@/registry/default/ui/form';

<Form onSubmit={handleSubmit}>
  <Tabs defaultValue="details">
    <TabsList>
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="contacts">Contacts</TabsTrigger>
      <TabsTrigger value="operational">Operational</TabsTrigger>
      <TabsTrigger value="performance">Performance</TabsTrigger>
    </TabsList>

    <TabsContent value="details">
      <FormField label="Trading Name" required>
        <Input value={tradingName} onChange={handleChange} />
      </FormField>

      <FormField label="ABN" required hint="11-digit Australian Business Number">
        <Input
          value={abn}
          onChange={handleABNChange}
          pattern="[0-9]{11}"
        />
      </FormField>

      <FormField label="Category" required>
        <Select value={category} onValueChange={setCategory}>
          <SelectItem value="battery_manufacturer">Battery Manufacturer</SelectItem>
          <SelectItem value="inverter_supplier">Inverter Supplier</SelectItem>
          <SelectItem value="component_supplier">Component Supplier</SelectItem>
          <SelectItem value="freight_partner">Freight Partner</SelectItem>
          <SelectItem value="installation_partner">Installation Partner</SelectItem>
        </Select>
      </FormField>

      <FormField label="Status">
        <Select value={status} onValueChange={setStatus}>
          <SelectItem value="prospective">Prospective</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="preferred">Preferred</SelectItem>
        </Select>
      </FormField>
    </TabsContent>

    <TabsContent value="operational">
      <FormField label="Lead Time (Days)" required>
        <Input
          type="number"
          value={leadTimeDays}
          onChange={(e) => setLeadTimeDays(Number(e.target.value))}
          min={1}
        />
      </FormField>

      <FormField label="Minimum Order Quantity">
        <Input
          type="number"
          value={moq}
          onChange={(e) => setMoq(Number(e.target.value))}
        />
      </FormField>

      <FormField label="Payment Terms">
        <Select value={paymentTerms} onValueChange={setPaymentTerms}>
          <SelectItem value="net_30">Net 30</SelectItem>
          <SelectItem value="net_60">Net 60</SelectItem>
          <SelectItem value="cod">Cash on Delivery</SelectItem>
          <SelectItem value="prepaid">Prepaid</SelectItem>
        </Select>
      </FormField>

      {category === 'freight_partner' && (
        <FormField label="Hazmat Certified (UN3481)">
          <Switch
            checked={hazmatCertified}
            onCheckedChange={setHazmatCertified}
          />
        </FormField>
      )}
    </TabsContent>
  </Tabs>

  <Button type="submit">Save Supplier</Button>
</Form>
```

### Purchase Order Creation

**Component**: Modal with product selection and quantity input

```typescript
// PO creation from supplier page
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/registry/default/ui/dialog';

<Dialog open={isCreatingPO} onOpenChange={setIsCreatingPO}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Create Purchase Order - {supplier.name}</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Lead Time: {supplier.leadTimeDays} days
        {supplier.moq && ` • MOQ: ${supplier.moq} units`}
      </div>

      <ProductSelector
        supplierId={supplier.id}
        onProductsChange={setSelectedProducts}
      />

      <DataTable
        data={selectedProducts}
        columns={poLineColumns}
      />

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Expected Delivery</p>
          <p className="font-medium">
            {addDays(new Date(), supplier.leadTimeDays).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">
            {formatCurrency(calculatePOTotal(selectedProducts), 'AUD')}
          </p>
        </div>
      </div>

      <Button onClick={handleCreatePO} disabled={selectedProducts.length === 0}>
        Create Purchase Order
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

**Reference**: `_reference/.reui-reference/registry/default/ui/dialog.tsx`

---

## Implementation Notes

### Supplier Schema with Performance Tracking

```typescript
// Suppliers with operational and performance data
import { pgTable, uuid, text, integer, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),

  // Business identity
  tradingName: text('trading_name').notNull(),
  abn: text('abn').notNull(), // 11-digit ABN
  acn: text('acn'), // Australian Company Number (if applicable)
  gstRegistered: boolean('gst_registered').default(true),

  // Classification
  category: text('category').notNull(), // 'battery_manufacturer', 'inverter_supplier', etc.
  status: text('status').notNull().default('prospective'),
  isPreferred: boolean('is_preferred').default(false),

  // Contact details
  email: text('email'),
  phone: text('phone'),
  website: text('website'),

  // Operational data
  leadTimeDays: integer('lead_time_days').notNull(),
  moq: integer('moq'), // Minimum Order Quantity
  paymentTerms: text('payment_terms'), // 'net_30', 'net_60', 'cod', etc.
  shippingTerms: text('shipping_terms'), // 'FOB', 'CIF', 'EXW'
  portOfOrigin: text('port_of_origin'), // For imports

  // Special certifications
  hazmatCertified: boolean('hazmat_certified').default(false), // UN3481 for freight
  cecAccredited: boolean('cec_accredited').default(false), // For installation partners

  // Performance metrics (calculated)
  onTimeDeliveryRate: decimal('on_time_delivery_rate', { precision: 5, scale: 2 }), // Percentage
  qualityDefectRate: decimal('quality_defect_rate', { precision: 5, scale: 2 }),
  averageResponseHours: integer('average_response_hours'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

export const supplierContacts = pgTable('supplier_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull(),
  name: text('name').notNull(),
  role: text('role'), // 'sales', 'logistics', 'technical', 'accounts'
  email: text('email').notNull(),
  phone: text('phone'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const supplierAddresses = pgTable('supplier_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull(),
  type: text('type').notNull(), // 'business', 'warehouse', 'billing'
  street: text('street').notNull(),
  suburb: text('suburb').notNull(),
  state: text('state').notNull(),
  postcode: text('postcode').notNull(),
  country: text('country').notNull().default('Australia'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Product-Supplier Relationship

```typescript
// Link products to suppliers with cost and lead time
export const productSuppliers = pgTable('product_suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull(),
  supplierId: uuid('supplier_id').notNull(),

  // Pricing
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('AUD'),

  // Supplier-specific data
  supplierSKU: text('supplier_sku'), // Supplier's product code
  leadTimeDays: integer('lead_time_days'), // Override supplier default
  moq: integer('moq'), // Product-specific MOQ

  // Status
  isPreferred: boolean('is_preferred').default(false), // Preferred supplier for this product
  isActive: boolean('is_active').default(true),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Supplier Performance Calculation

```typescript
// Calculate on-time delivery rate from purchase orders
import { eq, and, gte, sql } from 'drizzle-orm';

export async function updateSupplierPerformance(supplierId: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Calculate on-time delivery rate
  const deliveryStats = await db
    .select({
      total: sql<number>`count(*)::int`,
      onTime: sql<number>`count(*) filter (where actual_delivery_date <= expected_delivery_date)::int`,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.supplierId, supplierId),
        eq(purchaseOrders.status, 'received'),
        gte(purchaseOrders.receivedAt, sixMonthsAgo)
      )
    );

  const onTimeRate = deliveryStats[0].total > 0
    ? (deliveryStats[0].onTime / deliveryStats[0].total) * 100
    : null;

  // Update supplier record
  await db
    .update(suppliers)
    .set({
      onTimeDeliveryRate: onTimeRate?.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, supplierId));
}
```

### ABN Lookup Integration

```typescript
// Optional: ABN lookup via ABR API
import { z } from 'zod';

export const ABNSchema = z
  .string()
  .regex(/^\d{11}$/, 'ABN must be 11 digits')
  .refine(isValidABN, 'Invalid ABN checksum');

// Lookup ABN details from Australian Business Register
export async function lookupABN(abn: string): Promise<{
  name: string;
  abn: string;
  acn?: string;
  gstRegistered: boolean;
  entityType: string;
}> {
  // This would call ABR API (requires GUID from ABR)
  // For now, return placeholder
  return {
    name: 'Company Name',
    abn,
    gstRegistered: true,
    entityType: 'Company',
  };
}
```

### Purchase Order Creation from Supplier

```typescript
// Server function to create PO for supplier
export const createPurchaseOrder = createServerFn({ method: 'POST' })
  .inputValidator(CreatePurchaseOrderSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth();

    // Only warehouse/admin can create POs
    if (!['admin', 'owner', 'warehouse'].includes(ctx.session.role)) {
      throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
    }

    return withRLSContext(ctx.session, async (tx) => {
      // Verify supplier exists and is active
      const [supplier] = await tx
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, data.supplierId),
            eq(suppliers.status, 'active')
          )
        );

      if (!supplier) {
        throw new NotFoundError('active supplier', data.supplierId);
      }

      // Calculate expected delivery date
      const expectedDelivery = new Date();
      expectedDelivery.setDate(expectedDelivery.getDate() + supplier.leadTimeDays);

      // Create PO
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          organizationId: ctx.session.orgId,
          supplierId: data.supplierId,
          status: 'draft',
          expectedDeliveryDate: expectedDelivery,
          paymentTerms: supplier.paymentTerms,
          createdBy: ctx.session.userId,
        })
        .returning();

      // Add line items
      for (const item of data.items) {
        await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: po.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      return po;
    });
  });
```

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. For schema stories: Run `npm run db:generate`
5. Run `npm run typecheck` to verify
6. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
7. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Domain Guidelines

### DO
- Track supplier contacts and addresses (multiple per supplier)
- Link products to suppliers with cost price and lead time
- Support purchase order creation from supplier context
- Track supplier performance metrics (on-time delivery, quality)
- Validate ABN format for Australian suppliers
- Store hazmat certification status for freight partners
- Maintain preferred supplier flags at supplier and product level
- Calculate lead times for expected delivery dates
- Support multiple supplier contacts with role designation

### DON'T
- Break product-supplier relationships when deactivating suppliers
- Remove existing functionality without migration
- Hard-delete suppliers (use inactive status)
- Skip ABN validation for Australian suppliers
- Allow PO creation for inactive suppliers
- Ignore MOQ constraints when creating POs
- Remove historical performance data

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_SUPPLIERS_COMPLETE</promise>
```

---

*Domain PRD - Supplier management and procurement for battery distribution*
