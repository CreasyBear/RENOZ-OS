# DataTable Components

Reusable data table components built on TanStack Table with sorting, filtering, pagination, and row selection.

## Components

| Component | Description |
|-----------|-------------|
| `DataTable` | Main table component with full feature set |
| `DataTablePagination` | Pagination controls |
| Column Presets | Pre-built column definitions |

## Basic Usage

```tsx
import { DataTable } from '~/components/shared/data-table'
import type { ColumnDef } from '@tanstack/react-table'

interface Customer {
  id: string
  name: string
  email: string
  status: string
}

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
]

function CustomerList({ customers }) {
  return (
    <DataTable
      data={customers}
      columns={columns}
      pagination={{ pageSize: 20 }}
    />
  )
}
```

## Column Presets

Pre-built column definitions for common data types:

### checkboxColumn

Row selection column with select-all support.

```tsx
import { checkboxColumn } from '~/components/shared/data-table'

const columns = [
  checkboxColumn(),
  // ...other columns
]
```

### currencyColumn

Currency formatting with locale support.

```tsx
import { currencyColumn } from '~/components/shared/data-table'

const columns = [
  currencyColumn('amount', 'Total', 'AUD'),
  // Or with accessor function:
  currencyColumn((row) => row.price * row.quantity, 'Subtotal'),
]
```

### dateColumn

Date formatting with configurable format.

```tsx
import { dateColumn } from '~/components/shared/data-table'

const columns = [
  dateColumn('createdAt', 'Created'),
  // Custom format:
  dateColumn('updatedAt', 'Updated', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }),
]
```

### statusColumn

Status badges with configurable colors.

```tsx
import { statusColumn, type StatusConfig } from '~/components/shared/data-table'

const statusMap: Record<string, StatusConfig> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
  pending: { label: 'Pending', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'error' },
}

const columns = [
  statusColumn('status', 'Status', statusMap),
]
```

### entityLinkColumn

Clickable links for navigation.

```tsx
import { entityLinkColumn } from '~/components/shared/data-table'

const columns = [
  entityLinkColumn('name', 'Customer', (row) => `/customers/${row.id}`),
]
```

### actionsColumn

Dropdown menu with row actions.

```tsx
import { actionsColumn } from '~/components/shared/data-table'

const columns = [
  actionsColumn([
    { label: 'Edit', onClick: (row) => editCustomer(row.id) },
    { label: 'Delete', onClick: (row) => deleteCustomer(row.id), variant: 'destructive' },
  ]),
]
```

## Full Example

```tsx
import {
  DataTable,
  checkboxColumn,
  entityLinkColumn,
  currencyColumn,
  dateColumn,
  statusColumn,
  actionsColumn,
  type StatusConfig,
} from '~/components/shared/data-table'

const statusMap: Record<string, StatusConfig> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
}

const columns = [
  checkboxColumn(),
  entityLinkColumn('name', 'Customer', (row) => `/customers/${row.id}`),
  { accessorKey: 'email', header: 'Email' },
  currencyColumn('balance', 'Balance'),
  dateColumn('createdAt', 'Created'),
  statusColumn('status', 'Status', statusMap),
  actionsColumn([
    { label: 'Edit', onClick: (row) => handleEdit(row) },
    { label: 'Delete', onClick: (row) => handleDelete(row), variant: 'destructive' },
  ]),
]

function CustomerTable({ customers, onEdit, onDelete }) {
  return (
    <DataTable
      data={customers}
      columns={columns}
      enableRowSelection
      enableSorting
      pagination={{ pageSize: 20 }}
      onSelectionChange={(selected) => console.log('Selected:', selected)}
      onRowClick={(row) => navigate(`/customers/${row.id}`)}
    />
  )
}
```

## Props

### DataTable

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `TData[]` | required | Data array |
| `columns` | `ColumnDef<TData>[]` | required | Column definitions |
| `pagination` | `{ pageSize?, pageIndex? }` | `{ pageSize: 20 }` | Pagination options |
| `enableRowSelection` | `boolean` | `false` | Enable row selection |
| `enableSorting` | `boolean` | `true` | Enable column sorting |
| `enableFiltering` | `boolean` | `false` | Enable column filtering |
| `onRowClick` | `(row: TData) => void` | - | Row click handler |
| `onSelectionChange` | `(rows: TData[]) => void` | - | Selection change handler |
| `globalFilter` | `string` | - | Global filter value |
| `isLoading` | `boolean` | `false` | Loading state |
| `emptyMessage` | `string` | `"No results found."` | Empty state message |

## Accessibility

- Table uses proper ARIA roles (`table`, `row`, `cell`, `columnheader`)
- Sortable headers have `aria-sort` attribute
- Sortable headers are keyboard navigable (Tab, Enter/Space)
- Clickable rows are keyboard accessible
- Screen reader text for action buttons

## Performance

- Column definitions should be memoized or defined outside components
- Table state is managed internally with `useMemo` for optimization
- Target: <100ms render for 100 rows
