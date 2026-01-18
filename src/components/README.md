# Components Architecture

This document describes the component organization, patterns, and conventions used in the renoz-v3 application.

## Directory Structure

```
src/components/
├── ui/           # Base primitives (shadcn/ui)
├── shared/       # Reusable business components
│   ├── forms/    # Form field components
│   ├── data-table/ # Table components
│   └── modals/   # Modal patterns
└── domain/       # Domain-specific components (added by feature PRDs)
    ├── customers/
    ├── orders/
    └── inventory/
```

### Component Layers

| Layer | Purpose | Example |
|-------|---------|---------|
| `ui/` | Unstyled primitives from shadcn/ui | `Button`, `Input`, `Dialog` |
| `shared/` | Reusable patterns with business logic | `DataTable`, `FormSection`, `QueryState` |
| `domain/` | Feature-specific components | `CustomerCard`, `OrderStatusBadge` |

## Import Patterns

```tsx
// UI primitives
import { Button, Input, Dialog } from "~/components/ui"

// Shared components (preferred)
import { DataTable, FormSection, QueryState } from "~/components/shared"

// Domain components
import { CustomerCard } from "~/components/domain/customers"
```

## Naming Conventions

| Pattern | Example | When to Use |
|---------|---------|-------------|
| `*Field` | `TextField`, `EmailField` | Form field wrappers |
| `*State` | `LoadingState`, `ErrorState` | State display components |
| `*Modal` | `ConfirmationModal`, `FormModal` | Modal patterns |
| `*Badge` | `StatusBadge` | Status indicators |
| `Entity*` | `EntityAvatar`, `EntityCard` | Generic entity display |

## Key Shared Components

### Forms

Form components integrate with TanStack Form and Zod validation.

```tsx
import { useForm } from "@tanstack/react-form"
import { zodValidator } from "@tanstack/zod-form-adapter"
import { TextField, EmailField, FormSection } from "~/components/shared"

function CustomerForm() {
  const form = useForm({
    defaultValues: { name: "", email: "" },
    validatorAdapter: zodValidator(),
  })

  return (
    <form onSubmit={form.handleSubmit}>
      <FormSection title="Contact Information" columns={2}>
        <form.Field name="name">
          {(field) => (
            <TextField field={field} label="Name" required />
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <EmailField field={field} label="Email" />
          )}
        </form.Field>
      </FormSection>
    </form>
  )
}
```

### Data Tables

DataTable wraps TanStack Table with built-in pagination, sorting, and filtering.

```tsx
import { DataTable, currencyColumn, dateColumn, actionsColumn } from "~/components/shared"

const columns = [
  { accessorKey: "name", header: "Customer" },
  currencyColumn("totalSpent", "Total Spent"),
  dateColumn("lastOrder", "Last Order"),
  actionsColumn([
    { label: "Edit", onClick: (row) => edit(row) },
    { label: "Delete", onClick: (row) => remove(row), variant: "destructive" },
  ]),
]

function CustomerTable({ customers }) {
  return (
    <DataTable
      data={customers}
      columns={columns}
      enableSorting
      enableFiltering
      onRowClick={(row) => navigate(`/customers/${row.id}`)}
    />
  )
}
```

### State Displays

QueryState unifies loading, error, and empty states for async data.

```tsx
import { QueryState } from "~/components/shared"
import { useQuery } from "@tanstack/react-query"

function CustomerList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  })

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      data={data}
      emptyMessage="No customers found"
      emptyAction={{ label: "Add Customer", onClick: openAddModal }}
      onRetry={refetch}
    >
      <CustomerTable customers={data} />
    </QueryState>
  )
}
```

### Modals

Modal patterns for confirmations, alerts, and forms.

```tsx
import { ConfirmationModal, FormModal } from "~/components/shared"

// Destructive action
<ConfirmationModal
  open={showDelete}
  onOpenChange={setShowDelete}
  title="Delete Customer"
  message="This action cannot be undone."
  variant="danger"
  onConfirm={handleDelete}
/>

// Form in modal
<FormModal
  open={showEdit}
  onOpenChange={setShowEdit}
  title="Edit Customer"
  onSubmit={handleSubmit}
  isSubmitting={isPending}
>
  {/* Form fields */}
</FormModal>
```

### Entity Components

Reusable components for displaying domain entities.

```tsx
import { EntityAvatar, EntityCard, EntityCombobox } from "~/components/shared"

// Avatar with initials
<EntityAvatar name="John Doe" size="lg" />

// Preview card
<EntityCard
  name="Acme Corp"
  subtitle="Customer since 2023"
  metadata={[
    { label: "Orders", value: 42 },
    { label: "Revenue", value: "$12,500" },
  ]}
/>

// Searchable selector
<EntityCombobox
  value={selectedCustomer}
  onSelect={setSelectedCustomer}
  searchFn={searchCustomers}
  getDisplayValue={(c) => c.name}
  placeholder="Select customer..."
/>
```

### Status Badges

Configurable badges for status display.

```tsx
import { StatusBadge, ORDER_STATUS_CONFIG } from "~/components/shared"

// Using pre-built config
<StatusBadge status={order.status} statusConfig={ORDER_STATUS_CONFIG} />

// Direct variant
<StatusBadge status="active" variant="success" />
```

## Accessibility Requirements

All components follow WCAG 2.1 AA guidelines:

### Keyboard Navigation

| Component | Keys |
|-----------|------|
| DataTable | `Tab` moves between cells, `Enter` activates row |
| Modal | `Escape` closes, `Tab` traps focus within |
| Combobox | `Arrow` keys navigate, `Enter` selects |

### ARIA Attributes

```tsx
// Tables
<table role="table">
  <th aria-sort="ascending">Name</th>
</table>

// Loading states
<div role="status" aria-label="Loading content">

// Alerts
<div role="alert" aria-live="polite">
```

### Focus Management

- Modals trap focus within the dialog
- Focus returns to trigger element on close
- Form validation errors are announced to screen readers

## Compound Component Patterns

Use compound components for complex UI that shares state:

```tsx
// Example: Tabs compound component
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>
  <TabsContent value="details">...</TabsContent>
  <TabsContent value="history">...</TabsContent>
</Tabs>
```

Benefits:
- Shared state via React Context
- Flexible composition
- Clear parent-child relationship

## References

- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [TanStack Table](https://tanstack.com/table/latest/docs)
- [TanStack Form](https://tanstack.com/form/latest/docs)
- [Zod Validation](https://zod.dev/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
