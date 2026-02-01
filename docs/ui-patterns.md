# UI Patterns Guide

This document defines the standard UI patterns for renoz-v3 routes. Follow these patterns for consistency across the application.

---

## Layout Variants

Choose the appropriate variant based on route purpose:

| Variant | Use For | Max Width | Example Routes |
|---------|---------|-----------|----------------|
| `full-width` | List views, dashboards | None | `/customers`, `/orders`, `/dashboard` |
| `container` | Detail views, forms | 7xl (80rem) | `/customers/$id`, `/products/$id` |
| `narrow` | Settings, simple forms | 3xl (48rem) | `/settings/*`, `/profile` |
| `with-panel` | Master-detail layouts | Full + 20rem panel | `/pipeline/$id`, `/jobs/$id` |

### Decision Tree

```
Is this a list/table view?
├── Yes → full-width
└── No, is this a detail view?
    ├── Yes, with context/timeline → with-panel
    └── No, is this a form or settings?
        ├── Simple form → narrow
        └── Complex form/detail → container
```

---

## Route Structure

Every authenticated route should follow this structure:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

export const Route = createFileRoute('/_authenticated/domain/')({
  component: DomainPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/domain" />
  ),
  pendingComponent: () => <DomainSkeleton />,
});

function DomainPage() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Domain"
        description="Brief description"
        actions={<ActionButtons />}
      />
      <PageLayout.Content>
        <MainContent />
      </PageLayout.Content>
    </PageLayout>
  );
}
```

---

## Breadcrumbs

Breadcrumbs are rendered by the **Global Header** component (not PageLayout.Header). They're automatically generated from the route path using `ROUTE_METADATA`.

### Layout Hierarchy

```
Global Header    → Breadcrumbs (navigation concern)
PageLayout.Header → Title + Actions (page concern)
EntityHeader     → Name + Status (entity concern, detail views only)
```

### Behavior

- **Desktop**: All segments visible
- **Mobile**: Middle segments collapse to `...` dropdown
- **Dashboard only**: Hidden (no breadcrumbs needed)

### Detail Pages

For detail pages, set `title={null}` on PageLayout.Header and use EntityHeader for entity identity:

```tsx
<PageLayout.Header
  title={null}  // Entity info shown by EntityHeader instead
  actions={<BackButton to="/customers" />}
/>
```

See [DETAIL-VIEW-STANDARDS.md](./docs/design-system/DETAIL-VIEW-STANDARDS.md) for complete patterns.

---

## Detail Views: Sheet vs Full Page

Use this decision tree to choose between overlay sheets and full page routes:

```
Is this a quick glance or minor edit?
├── Yes → Sheet overlay
│   Examples:
│   - Preview a record
│   - Edit a single field
│   - Quick status change
│   - View contact info
│
└── No, requires focus → Full page route
    Examples:
    - Editing complex forms
    - Multi-step workflows
    - Detailed analytics
    - Creating new records
```

### Sheet Pattern

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function CustomerPreviewSheet({ open, onOpenChange, customerId }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Customer Details</SheetTitle>
        </SheetHeader>
        <CustomerPreview customerId={customerId} />
      </SheetContent>
    </Sheet>
  );
}
```

---

## Loading States (Skeletons)

Every route must have a `pendingComponent` with an appropriate skeleton:

| Domain | Skeleton | File |
|--------|----------|------|
| Admin tables | `AdminTableSkeleton` | `@/components/skeletons/admin` |
| Admin detail | `AdminDetailSkeleton` | `@/components/skeletons/admin` |
| Admin forms | `AdminFormSkeleton` | `@/components/skeletons/admin` |
| Inventory | `InventoryTableSkeleton` | `@/components/skeletons/inventory` |
| Mobile | `InventoryTableSkeleton` | `@/components/skeletons/inventory` |
| Dashboard | `DashboardSkeleton` | `@/components/skeletons/admin` |

### Usage

```tsx
export const Route = createFileRoute('/_authenticated/customers/')({
  component: CustomersPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/customers" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});
```

---

## Error Handling

All routes use `RouteErrorFallback` for error boundaries:

```tsx
import { RouteErrorFallback } from '@/components/layout';

errorComponent: ({ error }) => (
  <RouteErrorFallback
    error={error}
    parentRoute="/parent"  // Where to navigate on "Go Back"
  />
),
```

### Features

- Secure: Never exposes stack traces in production
- Accessible: Clear error message with retry option
- Navigation: "Go Back" button to parent route

---

## Bulk Actions

Use `BulkActionsBar` with `useSelection` for bulk operations:

```tsx
import { BulkActionsBar } from '@/components/layout';
import { useSelection } from '@/hooks';
import { Trash2, Download } from 'lucide-react';

function CustomersPage() {
  const { selectedArray, count, toggle, clear, isSelected } = useSelection<string>();

  return (
    <>
      <DataTable
        onRowSelect={(row) => toggle(row.id)}
        isRowSelected={(row) => isSelected(row.id)}
      />

      <BulkActionsBar
        selectedCount={count}
        onClear={clear}
        actions={[
          { label: 'Delete', icon: Trash2, onClick: handleBulkDelete, variant: 'destructive' },
          { label: 'Export', icon: Download, onClick: handleExport },
        ]}
      />
    </>
  );
}
```

### Security Note

Bulk operations must perform **server-side per-item authorization**. Never trust client-side selection arrays without re-validating permissions on the server.

---

## Navigation Patterns

### Never Use

```tsx
// ❌ WRONG - Causes full page reload
window.location.href = '/customers';

// ❌ WRONG - Unpredictable navigation
window.history.back();
```

### Always Use

```tsx
import { Link, useNavigate } from '@tanstack/react-router';

// ✅ Links
<Link to="/customers">Customers</Link>

// ✅ Programmatic navigation
const navigate = useNavigate();
navigate({ to: '/customers/$customerId', params: { customerId: id } });
```

### Back Navigation

Use explicit parent routes, not browser history:

```tsx
// In a detail page component
<Button asChild>
  <Link to="/customers">Back to Customers</Link>
</Button>
```

---

## Data Fetching

Follow the project's TanStack Query patterns (see `CLAUDE.md`):

```tsx
// ✅ CORRECT - Use centralized hooks
import { useCustomers } from '@/hooks/customers';

function CustomersPage() {
  const { data, isLoading } = useCustomers(filters);
  // ...
}

// ❌ WRONG - Never use useState + useEffect for fetching
const [data, setData] = useState([]);
useEffect(() => {
  fetchData().then(setData);
}, []);
```

---

## Component Aliases

`RouteShell` is an alias for `PageLayout` with semantic naming:

| RouteShell | PageLayout | Purpose |
|------------|------------|---------|
| `RouteShell` | `PageLayout` | Root container |
| `RouteShell.Header` | `PageLayout.Header` | Title, actions, breadcrumbs |
| `RouteShell.Content` | `PageLayout.Content` | Main content area |
| `RouteShell.ContextPanel` | `PageLayout.Sidebar` | Right sidebar (detail views) |

Both work identically. Use whichever reads better in your context.

---

## Responsive Context Panel

The `ContextPanel`/`Sidebar` component is responsive:
- **Desktop (≥1024px)**: Fixed right panel (always visible)
- **Mobile (<1024px)**: Bottom drawer controlled by `useContextPanel`

### Usage Pattern

```tsx
import { PageLayout } from '@/components/layout';
import { useContextPanel } from '@/hooks/_shared';
import { Button } from '@/components/ui/button';
import { PanelRight } from 'lucide-react';

function CustomerDetailPage() {
  const { isOpen, open, setIsOpen } = useContextPanel();

  return (
    <PageLayout variant="with-sidebar">
      <PageLayout.Header
        title="Customer Details"
        actions={
          <Button variant="outline" className="lg:hidden" onClick={open}>
            <PanelRight className="mr-2 h-4 w-4" />
            Activity
          </Button>
        }
      />
      <PageLayout.Content>
        <CustomerForm />
      </PageLayout.Content>
      <PageLayout.Sidebar
        title="Activity"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <ActivityTimeline />
      </PageLayout.Sidebar>
    </PageLayout>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Details"` | Title shown in drawer header on mobile |
| `isOpen` | `boolean` | `false` | Controls mobile drawer visibility |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when drawer state changes |

### Notes

- The trigger button should be hidden on desktop (`lg:hidden`) since the panel is always visible
- Use `useContextPanel` hook for managing the open state
- Drawer supports swipe-to-dismiss on mobile

---

## Quick Reference

| Need | Use |
|------|-----|
| Page container | `PageLayout` or `RouteShell` |
| Error boundary | `RouteErrorFallback` |
| Loading state | Domain-specific skeleton |
| Breadcrumbs | Automatic via `PageLayout.Header` |
| Quick preview | `Sheet` component |
| Bulk actions | `BulkActionsBar` + `useSelection` |
| Navigation | TanStack Router `Link` / `navigate()` |
| Data fetching | Domain hooks from `@/hooks/*` |
