# Component Patterns Specification

> **Purpose**: Catalog proven UI patterns from reference applications for reuse in Renoz CRM
> **Source**: Patterns extracted from Midday (SaaS finance app) and RE-UI (component library)
> **Updated**: 2026-01-10

---

## Overview

This document specifies five core component patterns discovered from production reference applications. Each pattern includes purpose, API design, reference implementation location, and concrete CRM use cases.

---

## Pattern 1: DataTable (Virtualized Table)

### Purpose
High-performance table component for displaying and interacting with large datasets (100+ rows). Optimized for infinite scroll, multi-select operations, and column management.

### When to Use
- List views with 20+ items (customers, orders, products, jobs)
- Tables requiring bulk actions (bulk edit, export, delete)
- Data requiring filtering, sorting, and column customization
- Infinite scroll pagination needs

### Core Features
- **Virtualization**: Uses `@tanstack/react-virtual` for 60fps scrolling
- **Infinite Scroll**: Lazy loads pages as user scrolls
- **Sticky Columns**: Pin select, date, or key columns to left
- **Multi-Select**: Shift-click range selection, bulk operations
- **DnD Reordering**: Drag-and-drop column reorder with `@dnd-kit/core`
- **Column Management**: Show/hide, resize, reorder columns
- **Persistent State**: Column preferences saved per-table

### Component API

```tsx
interface DataTableProps<TData> {
  // TanStack Table integration
  columns: ColumnDef<TData>[];
  data: TData[];

  // Infinite scroll
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;

  // Selection
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;

  // Column state (persisted)
  columnVisibility?: VisibilityState;
  columnSizing?: ColumnSizingState;
  columnOrder?: string[];
  onColumnVisibilityChange?: (state: VisibilityState) => void;
  onColumnSizingChange?: (state: ColumnSizingState) => void;
  onColumnOrderChange?: (order: string[]) => void;

  // Sticky columns
  stickyColumnIds?: string[];

  // Empty states
  emptyState?: React.ReactNode;
  noResultsState?: React.ReactNode;

  // Settings
  tableId: string; // For persisting preferences
}

// Example usage
<DataTable
  tableId="customers"
  columns={customerColumns}
  data={customers}
  fetchNextPage={fetchNextPage}
  hasNextPage={hasNextPage}
  stickyColumnIds={["select", "name", "email"]}
  emptyState={<NoCustomers onAction={openCreateDialog} />}
  noResultsState={<NoResults onClear={clearFilters} />}
/>
```

### Implementation Details

**Key Hooks:**
- `useVirtualizer` - Virtual scrolling
- `useReactTable` - TanStack Table instance
- `useTableSettings` - Persist column preferences
- `useInfiniteScroll` - Trigger fetchNextPage
- `useStickyColumns` - Calculate column offsets
- `useTableDnd` - Column drag-and-drop

**Performance Optimizations:**
- Virtualized rows (only render visible + overscan)
- Memoized column definitions
- Debounced selection updates
- Deferred search queries with `useDeferredValue`

**Reference Implementation:**
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/_reference/.midday-reference/apps/dashboard/src/components/tables/transactions/data-table.tsx` (639 lines)

### CRM Use Cases

| Screen | Columns | Sticky | Bulk Actions |
|--------|---------|--------|--------------|
| Customers List | 8-12 | name, email | edit, delete, export |
| Orders List | 10-15 | order_number, customer | status update, export |
| Products List | 8-10 | sku, name | price update, archive |
| Jobs List | 12-18 | job_number, customer, status | assign, status change |
| Pipeline List | 10-12 | deal_name, value, stage | stage move, export |
| Inventory List | 8-10 | sku, location, quantity | adjust stock, transfer |
| Invoices List | 10-12 | invoice_number, customer | send, mark paid |
| Support Tickets | 8-10 | ticket_id, customer, status | assign, close |

---

## Pattern 2: Toast System (Global State)

### Purpose
Non-intrusive notification system for user feedback (success, error, info, loading). Supports progress tracking, update in-place, and auto-dismiss.

### When to Use
- API operation feedback (save, delete, update)
- Background job status (upload, export, sync)
- Error messages requiring user attention
- Multi-step operation progress

### Core Features
- **Global State**: No provider needed, works via module state
- **Auto-Deduplication**: Same ID updates existing toast
- **Progress Tracking**: Show percentage for long operations
- **Persistent Toasts**: Optional never-dismiss for critical errors
- **Programmatic Control**: `toast.update()`, `toast.dismiss()`

### Component API

```tsx
// No provider needed - global state pattern
import { toast } from "@/components/ui/use-toast";

// Basic usage
toast({
  title: "Customer saved",
  description: "John Doe has been updated successfully.",
  variant: "success", // success | error | warning | info
});

// With progress (for uploads, exports)
const uploadToast = toast({
  id: "upload-123", // Stable ID for updates
  title: "Uploading invoice...",
  progress: 0,
});

// Update progress
uploadToast.update({
  progress: 45,
  description: "Processing page 3 of 5...",
});

// Complete
uploadToast.update({
  title: "Upload complete",
  variant: "success",
  progress: 100,
});

// Dismiss
uploadToast.dismiss();

// Error with action
toast({
  title: "Failed to save order",
  description: "Network timeout. Try again?",
  variant: "error",
  action: <Button onClick={retryFn}>Retry</Button>,
});
```

### Implementation Details

**State Management:**
```tsx
// Global state (no React context)
let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach(listener => listener(memoryState));
}
```

**Auto-Deduplication:**
```tsx
// Adding with same ID updates existing
if (existingIndex !== -1) {
  return {
    ...state,
    toasts: state.toasts.map(t =>
      t.id === action.toast.id
        ? { ...t, ...action.toast, open: true }
        : t
    ),
  };
}
```

**Reference Implementation:**
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/_reference/.midday-reference/packages/ui/src/components/use-toast.tsx`

### CRM Use Cases

| Scenario | Toast Type | Progress? |
|----------|-----------|-----------|
| Save customer | Success | No |
| Delete order | Success | No |
| Validation error | Error | No |
| Upload invoice PDF | Info -> Success | Yes |
| Bulk update products | Info -> Success | Yes |
| Export report CSV | Info -> Success | Yes |
| Sync Xero data | Info -> Success/Error | Yes |
| Send email campaign | Info -> Success | Yes |
| Critical auth error | Error (persistent) | No |

---

## Pattern 3: Empty States

### Purpose
Contextual messaging when tables/lists have no data. Guides users to take action or adjust filters.

### When to Use
- First-time user experience (no data yet)
- Filtered results return nothing
- Completed workflows (review queue empty)
- Feature-specific empty states

### Core Features
- **Three Variants**: NoData, NoResults, Completed
- **Action-Oriented**: CTA button to resolve state
- **Contextual Messaging**: Specific to feature/domain
- **Consistent Design**: Centered, icon + text + button

### Component API

```tsx
// Generic empty state
interface EmptyStateProps {
  title: string;
  description: ReactNode; // Supports <br /> for multi-line
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode; // Optional custom icon
}

<EmptyState
  title="No customers yet"
  description="Get started by adding your first customer"
  actionLabel="Add Customer"
  onAction={() => openDialog('create-customer')}
/>

// No results (filtered)
interface NoResultsProps {
  onClear: () => void;
}

<NoResults onClear={() => clearAllFilters()} />
// Renders: "No results" + "Try another search, or adjusting the filters" + "Clear filters" button

// Review complete (success state)
interface ReviewCompleteProps {
  message?: string;
}

<ReviewComplete message="All invoices have been reviewed" />
// Renders: "All done!" + custom message + checkmark icon
```

### Implementation Details

**Base Component:**
```tsx
function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">{title}</h2>
          <p className="text-[#606060] text-sm">{description}</p>
        </div>
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
```

**Reference Implementation:**
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/_reference/.midday-reference/apps/dashboard/src/components/tables/core/empty-states.tsx`

### CRM Use Cases

| Screen | Empty State Type | Action |
|--------|-----------------|--------|
| Customers List | NoData | "Add Customer" |
| Customers (filtered) | NoResults | "Clear filters" |
| Orders List | NoData | "Create Order" |
| Pipeline Deals | NoData | "Add Deal" |
| Pipeline (won) | Completed | "All deals closed!" |
| Jobs List | NoData | "Schedule Job" |
| Support Tickets | NoData | "No tickets yet" |
| Support (resolved) | Completed | "All resolved!" |
| Inventory (low stock) | NoResults | "Adjust filters" |
| Reports (no data) | NoData | "Run first report" |

---

## Pattern 4: Loading States (Dual Approach)

### Purpose
Provide visual feedback during data fetching. Skeleton loaders for initial load, spinner for subsequent fetches.

### When to Use
- Initial page load (skeleton matches final layout)
- Table data fetching (skeleton preserves columns)
- Infinite scroll (append spinner at bottom)
- Form submissions (button spinner)

### Core Features
- **Layout Preservation**: Skeleton maintains exact column structure
- **Column Awareness**: Respects column visibility, sizing, order
- **Sticky Columns**: Skeleton matches production sticky behavior
- **Row Count**: Configurable skeleton row count
- **Empty State Toggle**: Show empty state skeleton vs full table

### Component API

```tsx
// Table skeleton
interface TableSkeletonProps {
  columns: ColumnDef<any>[]; // Use actual columns
  columnVisibility?: VisibilityState;
  columnSizing?: ColumnSizingState;
  columnOrder?: string[];
  stickyColumnIds?: string[];
  actionsColumnId?: string; // Special handling for action cells
  rowCount?: number; // Default: 10
  isEmpty?: boolean; // Show empty state skeleton
}

<TableSkeleton
  columns={customerColumns}
  columnVisibility={columnVisibility}
  columnSizing={columnSizing}
  columnOrder={columnOrder}
  stickyColumnIds={["select", "name", "email"]}
  actionsColumnId="actions"
  isEmpty={!hasData}
/>

// Button loading
<Button disabled={isLoading}>
  {isLoading && <Spinner className="mr-2" />}
  Save Customer
</Button>

// Inline spinner (for appending to table)
{isFetchingNextPage && <Spinner />}
```

### Implementation Details

**Skeleton Rendering:**
```tsx
// Render skeleton cells matching column config
visibleColumns.map(column => (
  <TableCell
    key={column.id}
    style={{
      width: columnSizing[column.id] || column.size,
      position: stickyColumnIds.includes(column.id) ? 'sticky' : 'relative'
    }}
  >
    {column.id === actionsColumnId
      ? <SkeletonActions /> // Icon placeholders
      : <Skeleton className="h-4 w-full" />
    }
  </TableCell>
))
```

**Reference Implementation:**
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/_reference/.midday-reference/apps/dashboard/src/components/tables/transactions/loading.tsx`
- RE-UI data-grid loading examples (skeleton + spinner)

### CRM Use Cases

| Screen | Initial Load | Infinite Scroll | Action Loading |
|--------|-------------|----------------|----------------|
| Customers List | Skeleton (10 rows) | Bottom spinner | - |
| Customer Detail | Skeleton form | - | Save button spinner |
| Orders List | Skeleton (15 rows) | Bottom spinner | - |
| Order Form | Skeleton form | - | Submit spinner |
| Products List | Skeleton (10 rows) | Bottom spinner | - |
| Jobs Calendar | Skeleton events | - | - |
| Pipeline Board | Skeleton cards | - | Drag placeholder |
| Reports Dashboard | Skeleton charts | - | Generate spinner |

---

## Pattern 5: Form Pattern (Context-Based)

### Purpose
Consistent form handling with React Hook Form + Zod. Auto-accessibility, clean error display, reusable field components.

### When to Use
- All create/edit forms (customers, orders, products, jobs)
- Multi-step wizards
- Settings forms
- Inline editing forms

### Core Features
- **React Hook Form**: Form state, validation, submission
- **Zod Schema**: Type-safe validation with error messages
- **Auto-Accessibility**: ARIA labels, error announcements
- **Context-Based**: FormField accesses form context
- **Async Validation**: Server-side checks (email unique, etc.)
- **Conditional Fields**: Show/hide based on values

### Component API

```tsx
// Define schema
const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  // ... more fields
});

type CustomerFormData = z.infer<typeof customerSchema>;

// Form component
function CustomerForm() {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  async function onSubmit(data: CustomerFormData) {
    await saveCustomer(data);
    toast({ title: "Customer saved" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormDescription>Customer's full name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Save Customer
        </Button>
      </form>
    </Form>
  );
}
```

### Implementation Details

**FormField Context:**
```tsx
// FormField provides form context to nested components
const FormField = ({ control, name, render }) => (
  <FormFieldContext.Provider value={{ name }}>
    <Controller control={control} name={name} render={render} />
  </FormFieldContext.Provider>
);

// FormMessage auto-reads error from context
const FormMessage = () => {
  const { name } = useFormField();
  const { formState } = useFormContext();
  const error = formState.errors[name];
  return error ? <p className="text-destructive">{error.message}</p> : null;
};
```

**Async Validation:**
```tsx
const form = useForm({
  resolver: zodResolver(schema),
  mode: "onBlur", // Validate on blur for async checks
});

// Async refinement in schema
const schema = z.object({
  email: z.string().email(),
}).refine(
  async (data) => {
    const exists = await checkEmailExists(data.email);
    return !exists;
  },
  { message: "Email already in use", path: ["email"] }
);
```

**Reference Implementation:**
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/_reference/.midday-reference/apps/dashboard/src/components/forms/customer-form.tsx`
- Midday `packages/ui/src/components/form.tsx` (Form primitives)

### CRM Use Cases

| Form | Fields | Validation | Special |
|------|--------|-----------|---------|
| Create Customer | 12 | Email unique, phone format | Address autocomplete |
| Create Order | 8 | Customer exists, positive qty | Product lookup |
| Create Product | 10 | SKU unique, positive price | Image upload |
| Create Job | 15 | Date range valid, customer | Multi-step wizard |
| Create Deal | 8 | Value positive, valid stage | Conditional close fields |
| Create Invoice | 12 | Line items sum, valid date | PDF preview |
| Edit Supplier | 10 | Email format, URL valid | Contact list |
| Settings Form | 20 | Email server config | Test connection |

---

## Integration Guidelines

### Shared Component Library Structure

```
src/components/
├── ui/                          # shadcn/ui primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── form.tsx
│   ├── table.tsx
│   └── toast.tsx
├── shared/                      # Renoz patterns
│   ├── data-table/              # Pattern 1
│   │   ├── data-table.tsx
│   │   ├── use-table-settings.tsx
│   │   ├── use-sticky-columns.tsx
│   │   └── table-skeleton.tsx
│   ├── empty-states/            # Pattern 3
│   │   ├── empty-state.tsx
│   │   ├── no-results.tsx
│   │   └── review-complete.tsx
│   ├── toaster/                 # Pattern 2
│   │   ├── toaster.tsx
│   │   └── use-toast.tsx
│   └── forms/                   # Pattern 5 presets
│       ├── customer-form.tsx
│       ├── order-form.tsx
│       └── product-form.tsx
└── domain/                      # Domain-specific
    ├── customers/
    ├── orders/
    └── jobs/
```

### Pattern Composition Example

```tsx
// Customers list page (using all 5 patterns)
function CustomersPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({...});

  const handleBulkDelete = async (ids: string[]) => {
    const deleteToast = toast({
      id: "bulk-delete",
      title: "Deleting customers...",
      progress: 0,
    });

    try {
      await deleteCustomers(ids, (progress) => {
        deleteToast.update({ progress }); // Pattern 2: Progress toast
      });
      deleteToast.update({
        title: "Customers deleted",
        variant: "success"
      });
    } catch (error) {
      deleteToast.update({
        title: "Delete failed",
        variant: "error"
      });
    }
  };

  if (!data) {
    return <TableSkeleton {...skeletonProps} />; // Pattern 4: Loading
  }

  const customers = data.pages.flatMap(p => p.items);

  return (
    <DataTable // Pattern 1: Virtualized table
      tableId="customers"
      columns={customerColumns}
      data={customers}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      emptyState={
        <EmptyState // Pattern 3: Empty state
          title="No customers yet"
          description="Add your first customer to get started"
          actionLabel="Add Customer"
          onAction={() => setDialogOpen(true)}
        />
      }
      noResultsState={<NoResults onClear={clearFilters} />}
    />
  );
}
```

---

## Migration Priority

For Foundation phase (FOUND-SHARED stories), implement in order:

1. **Pattern 5: Form Pattern** (FOUND-SHARED-002)
   - Most foundational, affects all features
   - Setup shadcn/ui Form components
   - Create useZodForm wrapper

2. **Pattern 2: Toast System** (Part of FOUND-SHARED-005)
   - Simple, widely used across all domains
   - No dependencies

3. **Pattern 3: Empty States** (Part of FOUND-SHARED-005)
   - Reusable across all list views
   - Simple components

4. **Pattern 4: Loading States** (Part of FOUND-SHARED-003)
   - Needed before DataTable
   - Create TableSkeleton

5. **Pattern 1: DataTable** (FOUND-SHARED-003)
   - Most complex, depends on other patterns
   - Requires Pattern 3, 4 to be complete

---

## Testing Strategy

### Pattern 1: DataTable
- Virtualization scrolls 1000+ rows at 60fps
- Shift-click selects range correctly
- Column resize/reorder persists
- Infinite scroll triggers at scroll threshold
- Sticky columns remain fixed during horizontal scroll

### Pattern 2: Toast System
- Auto-deduplication (same ID updates, not duplicates)
- Progress updates in-place
- Dismiss clears toast
- Max 1 toast displayed (TOAST_LIMIT)

### Pattern 3: Empty States
- NoData renders when data.length === 0 && !hasFilters
- NoResults renders when data.length === 0 && hasFilters
- Action callback triggered on button click

### Pattern 4: Loading States
- Skeleton matches column count/sizing
- Sticky columns in skeleton match table
- Spinner shows during isFetchingNextPage

### Pattern 5: Form Pattern
- Zod validation errors display in FormMessage
- Async validation (email unique) works
- Submit disabled during isSubmitting
- Success toast on submit

---

## Performance Benchmarks

| Pattern | Metric | Target | Midday Actual |
|---------|--------|--------|---------------|
| DataTable | Scroll FPS | 60fps | 60fps |
| DataTable | Initial render (100 rows) | <200ms | ~150ms |
| DataTable | Row selection (1000 rows) | <50ms | ~30ms |
| Toast System | State update | <16ms | ~5ms |
| Empty States | Render time | <10ms | ~2ms |
| Loading States | Skeleton render | <20ms | ~10ms |
| Form Pattern | Validation (10 fields) | <50ms | ~30ms |

---

## Related Documentation

- Foundation Stories: `/opc/_Initiation/_prd/foundation/shared-components-foundation.prd.json`
- TanStack Table: https://tanstack.com/table/latest
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- shadcn/ui: https://ui.shadcn.com/

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Status:** Specification (Implementation pending FOUND-SHARED phase)
