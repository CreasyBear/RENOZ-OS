# Layout Components

This directory contains the application shell and layout components for renoz-v3.

## Overview

The layout system provides a consistent structure for authenticated pages with:
- **AppShell**: Main wrapper with sidebar, header, and content area
- **PageLayout**: Flexible content layouts with variants
- **Command Palette**: Cmd+K searchable navigation

## Component Architecture

```
AppShell
├── Sidebar (collapsible navigation)
├── Header
│   ├── Breadcrumbs
│   ├── Search (placeholder)
│   ├── Notifications (placeholder)
│   └── UserMenu
└── Main Content Area
    └── PageLayout (your page content)
```

## AppShell

The main application shell wraps all authenticated pages.

```tsx
// In _authenticated.tsx route
import { AppShell } from '@/components/layout'

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
```

### Features
- Responsive sidebar (collapsed on mobile)
- Command palette (Cmd/Ctrl+K)
- Mobile menu overlay
- ARIA labels for accessibility

## PageLayout

A compound component for page content with multiple layout variants.

### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| `container` | Centered with max-width | Default, most pages |
| `full-width` | Edge-to-edge content | Dashboards, tables |
| `narrow` | Narrower max-width | Forms, settings |
| `with-sidebar` | Content + right sidebar | Detail pages |

### Basic Usage

```tsx
import { PageLayout } from '@/components/layout'

function MyPage() {
  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Page Title"
        description="Optional description"
        actions={<Button>Action</Button>}
      />
      <PageLayout.Content>
        {/* Your content here */}
      </PageLayout.Content>
    </PageLayout>
  )
}
```

### With Sidebar

```tsx
function DetailPage() {
  return (
    <PageLayout variant="with-sidebar">
      <PageLayout.Header title="Customer Details" />
      <PageLayout.Content>
        {/* Main content */}
      </PageLayout.Content>
      <PageLayout.Sidebar>
        {/* Sidebar content */}
      </PageLayout.Sidebar>
    </PageLayout>
  )
}
```

### Full-Width Dashboard

```tsx
function Dashboard() {
  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Dashboard"
        description="Welcome back!"
        actions={<QuickActions />}
      />
      <PageLayout.Content>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Metric cards */}
        </div>
      </PageLayout.Content>
    </PageLayout>
  )
}
```

## Navigation Configuration

Navigation items are centrally configured in `src/lib/routing/routes.ts`.

### Adding a New Navigation Item

1. Add route metadata:

```tsx
// src/lib/routing/routes.ts
export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  // ... existing routes
  '/my-new-page': {
    title: 'My New Page',
    description: 'Description for breadcrumbs',
    icon: MyIcon, // from lucide-react
    showInNav: true,
    navOrder: 5, // Controls sidebar order
    requiredPermission: 'feature.read', // Optional
  },
}
```

2. Create the route file:

```tsx
// src/routes/_authenticated/my-new-page.tsx
import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout'

export const Route = createFileRoute('/_authenticated/my-new-page')({
  component: MyNewPage,
})

function MyNewPage() {
  return (
    <PageLayout>
      <PageLayout.Header title="My New Page" />
      <PageLayout.Content>
        {/* Content */}
      </PageLayout.Content>
    </PageLayout>
  )
}
```

The sidebar and breadcrumbs will automatically pick up the new route.

### Route Metadata Interface

```tsx
interface RouteMetadata {
  title: string
  description?: string
  icon?: LucideIcon
  showInNav?: boolean
  navOrder?: number
  requiredPermission?: string
  parentPath?: string // For nested breadcrumbs
}
```

## Breadcrumb Configuration

Breadcrumbs are automatically generated based on the URL path and route metadata.

### How It Works

1. The URL is split into segments: `/customers/123/edit` → `['customers', '123', 'edit']`
2. Each segment is looked up in `ROUTE_METADATA`
3. If found, the `title` is used; otherwise, the segment is formatted

### Custom Breadcrumb Labels

For dynamic routes, add entries to `ROUTE_METADATA`:

```tsx
'/customers': {
  title: 'Customers',
  // ...
},
'/customers/$customerId': {
  title: 'Customer Details',
  parentPath: '/customers',
},
```

## Command Palette

The command palette provides quick navigation and actions via Cmd/Ctrl+K.

### Default Behavior

- Opens on Cmd/Ctrl+K
- Searches navigation items from `ROUTE_METADATA`
- Includes quick actions (Create Customer, Create Quote, etc.)

### Adding Quick Actions

Edit `src/components/layout/command-palette.tsx`:

```tsx
const QUICK_ACTIONS = [
  {
    id: 'create-customer',
    label: 'Create Customer',
    description: 'Add a new customer',
    icon: <Plus className="h-4 w-4" />,
    route: '/customers/new',
  },
  // Add more actions here
]
```

### Programmatic Control

```tsx
import { CommandPalette } from '@/components/layout'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Search</button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  )
}
```

## Typical Route File Structure

```tsx
/**
 * Page Name Route
 *
 * Brief description of what this page does.
 */
import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout'

export const Route = createFileRoute('/_authenticated/page-name')({
  component: PageName,
  // Optional: loader, beforeLoad, etc.
})

function PageName() {
  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title="Page Name"
        description="What this page shows"
        actions={<PageActions />}
      />
      <PageLayout.Content>
        {/* Main content */}
      </PageLayout.Content>
    </PageLayout>
  )
}

// Sub-components specific to this page
function PageActions() {
  return (
    <div className="flex gap-2">
      <Button variant="outline">Secondary</Button>
      <Button>Primary</Button>
    </div>
  )
}
```

## Component Exports

All layout components are exported from `@/components/layout`:

```tsx
import {
  AppShell,
  Sidebar,
  SidebarNavItem,
  Header,
  Breadcrumbs,
  UserMenu,
  PageLayout,
  CommandPalette,
} from '@/components/layout'
```

## Accessibility

- All interactive elements have appropriate ARIA labels
- Keyboard navigation supported throughout
- Focus management on dialog open/close
- Screen reader friendly navigation structure
