# Orders Domain Reference Patterns

> Reference implementations from `opc/_reference/` to adopt during Orders domain implementation.

## Summary

| Pattern | Source | Applies To | Priority |
|---------|--------|------------|----------|
| Invoice Form Context | midday | ORD-CREATION-UI | HIGH |
| Line Items w/ Reorder | midday | ORD-CREATION-UI | HIGH |
| Calculate Utilities | midday | ORD-CORE-API | HIGH |
| Kanban Board | square-ui | ORD-FULFILLMENT-DASHBOARD | HIGH |
| Table Columns Pattern | midday | ORD-LIST-UI | MEDIUM |
| Sheet CRUD | midday | ORD-DETAIL-UI, ORD-SHIPPING-UI | MEDIUM |
| Status Utils | square-ui | All stories | MEDIUM |

---

## 1. Invoice/Order Form Architecture (midday)

**Source:** `opc/_reference/.midday-reference/apps/dashboard/src/components/invoice/`

### Pattern: Form Context with Zod Schema

```
form-context.tsx → invoiceFormSchema + invoiceTemplateSchema + lineItemSchema
```

**Key Patterns:**
- **FormProvider wrapper** - React Hook Form context at top level
- **Nested schemas** - `lineItemSchema` nested in `invoiceFormSchema`
- **Template schema** - Configurable labels, tax settings, date formats

**Adopt for ORD-CREATION-UI:**
```typescript
// order-form-context.tsx
export const orderFormSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'confirmed', 'picking', 'picked', 'shipped', 'delivered', 'cancelled']),
  customerId: z.string().uuid(),
  orderNumber: z.string(),
  promisedShipDate: z.date().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  notes: z.string().optional(),
  // Tax/pricing
  taxAmount: z.number().default(0),
  shippingAmount: z.number().default(0),
  discountAmount: z.number().default(0),
  totalAmount: z.number(),
});
```

### Pattern: Line Items with Reorder

**Source:** `.midday-reference/.../invoice/line-items.tsx`

**Key Functions:**
- `LineItems()` - Main component with useFieldArray
- `reorderList()` - Drag-drop reorder handling
- `LineItemRow()` - Individual row with quantity, price, remove

**Adopt for order-line-items.tsx:**
```typescript
// Use react-hook-form useFieldArray for line items
const { fields, append, remove, move } = useFieldArray({
  control,
  name: "lineItems"
});

// Reorder with drag-drop using @dnd-kit
```

---

## 2. Calculation Utilities (midday)

**Source:** `opc/_reference/.midday-reference/packages/invoice/src/utils/calculate.ts`

### Pattern: Pure Calculation Functions

```typescript
// calculate.ts
export function calculateTotal({ lineItems, taxRate, vatRate, discount, includeVat, includeTax })
export function calculateLineItemTotal({ price, quantity })
```

**Key Patterns:**
- **Pure functions** - No side effects
- **Null-safe** - `?? 0` defaults throughout
- **Separate subtotal/tax/vat/total** - Clear breakdown

**Adopt for src/lib/order-calculations.ts:**
```typescript
export function calculateOrderTotal({
  lineItems,
  gstRate = 10, // Australian GST
  shippingAmount = 0,
  discountAmount = 0,
}: OrderCalculationInput): OrderCalculationResult {
  const subtotal = lineItems.reduce((acc, item) =>
    acc + (item.unitPrice ?? 0) * (item.quantity ?? 0), 0
  );
  const gstAmount = (subtotal * gstRate) / 100;
  const total = subtotal + gstAmount + shippingAmount - discountAmount;
  return { subtotal, gstAmount, shippingAmount, discountAmount, total };
}
```

---

## 3. Kanban Board (square-ui)

**Source:** `opc/_reference/.square-ui-reference/templates/task-management/components/task/board/`

### Pattern: Status-Based Columns

```
task-board.tsx → TaskColumn per status
task-column.tsx → Cards list + add button
task-card.tsx → Individual draggable card
```

**Key Patterns:**
- **Store-driven** - `useTasksStore().tasksByStatus`
- **Fixed width columns** - `w-[300px] lg:w-[360px]`
- **Status header** - Icon + name + action buttons
- **Scrollable content** - `overflow-y-auto`

**Adopt for ORD-FULFILLMENT-DASHBOARD:**
```typescript
// fulfillment-board.tsx
export function FulfillmentBoard() {
  const { ordersByStatus } = useOrdersStore();
  const statuses = ['confirmed', 'picking', 'picked', 'shipped'];

  return (
    <div className="flex h-full gap-3 px-3 pt-4 pb-2 min-w-max">
      {statuses.map((status) => (
        <FulfillmentColumn
          key={status}
          status={status}
          orders={ordersByStatus[status] || []}
        />
      ))}
    </div>
  );
}
```

### Pattern: Status Utilities

**Source:** `.square-ui-reference/templates/task-management/lib/status-utils.tsx`

**Adopt for order-status-utils.ts:**
```typescript
export const ORDER_STATUS_CONFIG = {
  draft: { icon: FileEdit, color: 'gray', label: 'Draft' },
  confirmed: { icon: CheckCircle, color: 'blue', label: 'Confirmed' },
  picking: { icon: PackageSearch, color: 'yellow', label: 'Picking' },
  picked: { icon: Package, color: 'orange', label: 'Picked' },
  shipped: { icon: Truck, color: 'purple', label: 'Shipped' },
  delivered: { icon: CheckCircle2, color: 'green', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'red', label: 'Cancelled' },
} as const;
```

---

## 4. Table Patterns (midday)

**Source:** `opc/_reference/.midday-reference/apps/dashboard/src/components/tables/orders/`

### Pattern: Separated Table Components

```
tables/orders/
├── data-table.tsx    # Main table wrapper
├── columns.tsx       # Column definitions (NOT PRESENT but in invoices/)
├── table-header.tsx  # Header with actions
├── skeleton.tsx      # Loading state
├── actions-menu.tsx  # Row actions dropdown
└── index.tsx         # Barrel export
```

**Adopt for src/components/domain/orders/:**
```
orders/
├── order-table.tsx
├── order-columns.tsx     # Memoized cells
├── order-table-header.tsx
├── order-skeleton.tsx
├── order-actions-menu.tsx
└── index.ts
```

---

## 5. Sheet CRUD Pattern (midday)

**Source:** `opc/_reference/.midday-reference/apps/dashboard/src/components/sheets/`

### Pattern: Details/Edit in Sheets

```typescript
// Slide-out panel instead of full page
<Sheet open={isOpen} onOpenChange={close}>
  <SheetContent style={{ maxWidth: 620 }}>
    <OrderDetails orderId={orderId} />
  </SheetContent>
</Sheet>
```

**Adopt for:**
- `order-details-sheet.tsx` - View order in sheet
- `ship-order-sheet.tsx` - Create shipment in sheet
- `amendment-sheet.tsx` - Request amendment in sheet

---

## 6. Reference File Index

### Midday - Invoice Components (Order Creation)
```
opc/_reference/.midday-reference/apps/dashboard/src/components/invoice/
├── form-context.tsx      # Form schemas + context
├── form.tsx              # Main form component
├── line-items.tsx        # Editable line items
├── product-autocomplete.tsx  # Product search
├── quantity-input.tsx    # Quantity stepper
├── summary.tsx           # Totals display
├── customer-details.tsx  # Customer selector
└── utils.ts              # Formatting utilities
```

### Midday - Invoice Package (Calculation + Templates)
```
opc/_reference/.midday-reference/packages/invoice/src/
├── utils/
│   ├── calculate.ts      # ⭐ Pure calculation functions
│   └── transform.ts      # Data transformation
├── templates/
│   ├── html/             # HTML invoice template
│   └── pdf/              # PDF generation
└── types.ts              # TypeScript types
```

### Midday - Table Patterns
```
opc/_reference/.midday-reference/apps/dashboard/src/components/tables/
├── orders/               # Order list table
└── invoices/
    ├── columns.tsx       # ⭐ Memoized column cells
    ├── data-table.tsx    # Main table
    ├── skeleton.tsx      # Loading state
    └── empty-states.tsx  # No data state
```

### Square-UI - Kanban Board
```
opc/_reference/.square-ui-reference/templates/task-management/components/task/board/
├── task-board.tsx        # ⭐ Status columns layout
├── task-column.tsx       # ⭐ Column with cards
└── task-card.tsx         # Draggable card
```

### Square-UI - Utilities
```
opc/_reference/.square-ui-reference/templates/task-management/
├── lib/status-utils.tsx  # Status icon/color config
└── mock-data/statuses.tsx # Status definitions
```

---

## Implementation Checklist

### Before ORD-CORE-API
- [ ] Copy `calculate.ts` pattern to `src/lib/order-calculations.ts`
- [ ] Adapt for Australian GST (10%)

### Before ORD-LIST-UI
- [ ] Study `tables/invoices/columns.tsx` for memoized cells
- [ ] Create `order-columns.tsx` with React.memo
- [ ] Add `order-skeleton.tsx` for loading state

### Before ORD-CREATION-UI
- [ ] Study `invoice/form-context.tsx` for schema structure
- [ ] Study `invoice/line-items.tsx` for field array pattern
- [ ] Create `order-form-context.tsx` with FormProvider

### Before ORD-DETAIL-UI
- [ ] Study `sheets/` pattern for slide-out details
- [ ] Consider sheet vs full page (sheet recommended)

### Before ORD-FULFILLMENT-DASHBOARD
- [ ] Study `task-board.tsx` for kanban layout
- [ ] Study `task-column.tsx` for column structure
- [ ] Create `order-status-utils.ts` with status config

---

## Notes

1. **Don't copy directly** - Adapt patterns to our stack (TanStack Start vs Next.js)
2. **GST not VAT** - Replace VAT references with Australian GST (10%)
3. **Drizzle not Prisma** - Midday uses different ORM
4. **Sheet preference** - Sheet CRUD is better UX than page navigation
5. **Zustand optional** - Can use TanStack Query for state instead of stores
