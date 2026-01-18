# Task: Implement Orders Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/orders.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-orders.progress.txt

## PRD ID
DOM-ORDERS

## Phase
domain-core

## Priority
1

## Dependencies
- DOM-CUSTOMERS (customer reference)
- DOM-PRODUCTS (product reference)
- FOUND-SCHEMA (schema patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check for blocking dependencies
# Verify DOM-CUSTOMERS and DOM-PRODUCTS are complete
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
| `lib/schema/orders.ts` | Order database schema |
| `lib/schemas/orders.ts` | Order Zod schemas |
| `src/server/functions/orders.ts` | Order server functions |
| `src/components/domain/orders/` | Order UI components |

---

## Renoz Business Context

### Order Lifecycle

Renoz orders follow a shipment-centric lifecycle reflecting battery system delivery:

```
Draft → Confirmed → Shipped → Delivered → Installed → Complete
           ↓
       Cancelled
```

**Status Definitions:**

- **Draft**: Quote/estimate stage, pricing being finalized
- **Confirmed**: Customer accepted, order locked, inventory allocated
- **Shipped**: Battery system dispatched (hazmat compliance required)
- **Delivered**: Product received at customer site (delivery photos captured)
- **Installed**: System installed and commissioned (serial numbers captured for warranty)
- **Complete**: Payment processed, all documentation filed

**IMPORTANT**: Unlike generic e-commerce, Renoz orders are not "fulfilled" until installation is complete. Each battery requires serial number capture for warranty activation.

### Product Specifics

**Battery Systems:**
- Each unit has a unique serial number (required for warranty)
- Hazmat classification: UN3481 (lithium-ion batteries)
- Temperature-sensitive shipping requirements
- Typically delivered via forklift (heavy cargo)

**Documentation Requirements:**
- Serial number tracking per unit
- Delivery photos (proof of condition)
- Installation compliance checklist
- Temperature logs during transit (for warranty claims)

### Shipping Considerations

- **Hazmat handling**: Must comply with UN3481 regulations
- **Temperature monitoring**: Battery health requires controlled temps
- **Delivery method**: Forklift delivery, loading dock required
- **Documentation**: Photos at delivery, signed acceptance forms

---

## UI Pattern References

### Order List View

**Component**: RE-UI DataGrid with status badges

```typescript
// Reference implementation
import { DataGrid, DataGridContainer } from '@/registry/default/ui/data-grid';
import { Badge } from '@/registry/default/ui/badge';

// Status badge mapping
const statusBadgeVariant = {
  draft: 'outline',       // Gray outline
  confirmed: 'info',      // Blue
  shipped: 'warning',     // Yellow
  delivered: 'success',   // Green
  installed: 'success',   // Green
  complete: 'primary',    // Primary blue
  cancelled: 'destructive' // Red
};

// Usage in column definition
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => (
    <Badge
      variant={statusBadgeVariant[row.original.status]}
      appearance="light"
      size="sm"
    >
      {row.original.status}
    </Badge>
  )
}
```

**Reference**: `_reference/.reui-reference/registry/default/ui/data-grid.tsx`

### Order Lifecycle Stepper

**Component**: Horizontal stepper with pulse animation for active step

```typescript
// Reference implementation
import {
  Stepper,
  StepperNav,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle
} from '@/registry/default/ui/stepper';

// Lifecycle visualization
<Stepper value={currentStepIndex} orientation="horizontal">
  <StepperNav>
    <StepperItem step={1} completed={status !== 'draft'}>
      <StepperTrigger>
        <StepperIndicator>1</StepperIndicator>
        <StepperTitle>Draft</StepperTitle>
      </StepperTrigger>
      <StepperSeparator />
    </StepperItem>

    <StepperItem step={2} completed={isAfterConfirmed}>
      <StepperTrigger>
        <StepperIndicator>2</StepperIndicator>
        <StepperTitle>Confirmed</StepperTitle>
      </StepperTrigger>
      <StepperSeparator />
    </StepperItem>

    {/* ... other steps */}
  </StepperNav>
</Stepper>
```

**Pulse Animation**: Active step indicator should pulse to draw attention.

```css
/* Add to stepper indicator when active */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.stepper-indicator[data-state="active"] {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Reference**: `_reference/.reui-reference/registry/default/ui/stepper.tsx`

### Shipment Tracking Timeline

**Pattern**: Midday vertical timeline for shipment events

```typescript
// Suggested structure (implement using RE-UI primitives)
<div className="relative pl-8">
  {shipmentEvents.map((event, idx) => (
    <div key={event.id} className="relative pb-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-0 h-4 w-4 rounded-full bg-primary" />

      {/* Timeline line */}
      {idx < events.length - 1 && (
        <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-border" />
      )}

      {/* Event content */}
      <div className="ml-8">
        <p className="font-medium">{event.title}</p>
        <p className="text-sm text-muted-foreground">{event.timestamp}</p>
        {event.photo && <img src={event.photo} className="mt-2 rounded" />}
      </div>
    </div>
  ))}
</div>
```

**Note**: Midday pattern for chronological event display with photos/attachments.

---

## Implementation Notes

### Status Management

Use `Badge` component with semantic variants:

```typescript
import { Badge } from '@/registry/default/ui/badge';

// Status badge helper
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = {
    draft: { variant: 'outline', label: 'Draft' },
    confirmed: { variant: 'info', label: 'Confirmed' },
    shipped: { variant: 'warning', label: 'Shipped' },
    delivered: { variant: 'success', label: 'Delivered' },
    installed: { variant: 'success', label: 'Installed' },
    complete: { variant: 'primary', label: 'Complete' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  } as const;

  const { variant, label } = config[status];

  return (
    <Badge variant={variant} appearance="light" size="sm">
      {label}
    </Badge>
  );
}
```

### Serial Number Validation

**Required for warranty activation:**

```typescript
// Serial number must be captured before marking order as "installed"
const validateSerialNumbers = (order: Order) => {
  if (order.status === 'installed' || order.status === 'complete') {
    const allProductsHaveSerials = order.items.every(
      item => item.product.serialNumber !== null
    );

    if (!allProductsHaveSerials) {
      throw new Error('All battery units require serial numbers before installation can be marked complete');
    }
  }
};
```

### DataGrid Integration

```typescript
// Order list with server-side pagination
const ordersQuery = useQuery({
  queryKey: ['orders', pageIndex, sorting, filters],
  queryFn: async () => {
    const params: DataGridApiFetchParams = {
      pageIndex,
      pageSize: 25,
      sorting,
      filters
    };

    return fetchOrders(params);
  }
});

// Render with DataGrid
<DataGridContainer>
  <DataGrid
    table={table}
    recordCount={ordersQuery.data?.pagination.total ?? 0}
    isLoading={ordersQuery.isLoading}
    onRowClick={(order) => router.push(`/orders/${order.id}`)}
  >
    {/* DataGrid children: toolbar, table, pagination */}
  </DataGrid>
</DataGridContainer>
```

---

## Order Lifecycle (Original)

```
Draft → Pending → Confirmed → Allocated → Fulfilled → Invoiced → Paid
                     ↓
                  Amended
                     ↓
                 Cancelled
```

**Note**: The original generic lifecycle above is replaced by the Renoz-specific lifecycle documented in the Business Context section.

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
- Follow the Renoz order status state machine (Draft → Confirmed → Shipped → Delivered → Installed → Complete)
- Capture serial numbers before marking orders as "installed"
- Use StatusBadge component for order status display
- Integrate with inventory for stock allocation
- Support order amendments with audit trail
- Calculate totals including tax
- Store delivery photos and installation documentation
- Track hazmat compliance data (UN3481)
- Validate temperature monitoring requirements

### DON'T
- Allow state transitions that skip steps
- Mark order as "installed" without serial numbers
- Break existing order creation flow
- Modify confirmed orders without amendment process
- Skip hazmat documentation requirements

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_ORDERS_COMPLETE</promise>
```

---

*Domain PRD - Order management and fulfillment for battery system shipments*
