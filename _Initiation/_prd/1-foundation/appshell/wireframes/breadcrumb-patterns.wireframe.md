# Breadcrumb Navigation Patterns

**Version:** 1.0
**Last Updated:** 2026-01-10
**Status:** Draft

---

## Overview

Breadcrumb navigation provides contextual hierarchy and allows users to navigate up the page tree. This document defines patterns for implementing consistent breadcrumb behavior across the Renoz CRM application.

---

## 1. Standard Breadcrumb

### Visual Structure

```
[🏠] / Customers / Brisbane Solar Co
└─┬─┘   └───┬───┘   └──────┬──────┘
  │         │               │
 Home    Clickable      Current
(icon)     link        (not linked)
```

### Anatomy

- **Home Icon:** First item, always clickable, links to dashboard
- **Separator:** `/` character with spacing (not `>` to avoid confusion with nested menus)
- **Intermediate Links:** All parent pages are clickable
- **Current Page:** Last item, plain text (no link), uses emphasized text color

### Visual Specifications

```
Component: Breadcrumb
├─ Container
│  ├─ Display: flex
│  ├─ Align: center
│  ├─ Gap: 8px
│  └─ Font: text-sm
│
├─ Home Icon
│  ├─ Size: 16x16
│  ├─ Color: text-muted-foreground
│  └─ Hover: text-foreground
│
├─ Separator
│  ├─ Character: /
│  ├─ Color: text-muted-foreground
│  └─ Padding: 0 8px
│
├─ Link Item
│  ├─ Color: text-muted-foreground
│  ├─ Hover: text-foreground + underline
│  └─ Transition: 150ms
│
└─ Current Item
   ├─ Color: text-foreground
   └─ Font-weight: 500
```

### Example: Customer Detail Page

```
🏠 / Customers / Brisbane Solar Co
```

- Home icon → `/dashboard`
- "Customers" → `/customers`
- "Brisbane Solar Co" → current page (no link)

---

## 2. Truncation Patterns

### Long Path Truncation

When path exceeds 5 levels, collapse middle segments:

```
Normal (≤5 levels):
🏠 / Customers / Brisbane Solar Co / Orders / ORD-2024-001

Truncated (>5 levels):
🏠 / ... / Brisbane Solar Co / Orders / ORD-2024-001
         └─────────┬─────────┘
                   │
            Collapsed 2+ levels
            (hover to see tooltip)
```

### Collapsed Segment Behavior

```
[...] ← Hover shows tooltip
      ↓
┌─────────────────────────┐
│ Full Path:              │
│ Home > Customers >      │
│ Brisbane Solar Co >     │
│ Orders                  │
└─────────────────────────┘
```

- Collapsed segment shows "..."
- Tooltip displays full path
- Not clickable (informational only)

### Long Name Truncation

When individual segment exceeds available width:

```
Desktop (no truncation):
🏠 / Customers / Brisbane Solar Co

Tablet (moderate truncation):
🏠 / Customers / Brisbane Solar C...
                 └──────┬──────┘
                        │
                 Hover for full name

Mobile (aggressive truncation):
🏠 / Customers / Brisban...
```

### Truncation Rules

```
Breakpoint: md (768px)
├─ Desktop: No truncation (or max 60 characters)
├─ Tablet: Max 30 characters per segment
└─ Mobile: Max 15 characters per segment

Truncation Method:
- Use CSS: text-overflow: ellipsis
- Add title attribute for tooltip
- Preserve first/last segments (never truncate current page)
```

---

## 3. Mobile Breadcrumb Pattern

### Standard Mobile View

On screens <768px, simplify breadcrumbs to back navigation:

```
Desktop:
┌──────────────────────────────────────┐
│ 🏠 / Customers / Brisbane Solar Co   │
└──────────────────────────────────────┘

Mobile:
┌──────────────────────────────────────┐
│ ← Customers     Brisbane Solar Co    │
│   └───┬────┘    └────────┬─────────┘ │
│       │                  │            │
│    Back to          Current page      │
│   parent page          (label)        │
└──────────────────────────────────────┘
```

### Mobile Breadcrumb Behavior

- **Back Arrow:** Links to immediate parent page
- **Parent Label:** Shows parent page name (e.g., "Customers")
- **Current Label:** Shows current page name (right-aligned)
- **No Separator:** Cleaner visual for small screens

### Deep Navigation on Mobile

When more than 2 levels deep, show hierarchical back:

```
Level 3+ (e.g., Order Detail):
┌──────────────────────────────────────┐
│ ← Brisbane Solar Co    Order #ORD-001│
│   └────────┬────────┘                │
│            │                          │
│      Back to customer                │
│      (not to Customers list)         │
└──────────────────────────────────────┘
```

- Back button always goes to immediate parent
- Parent name is truncated if needed
- Tapping parent name (text) also triggers back navigation

---

## 4. Dynamic Breadcrumbs

### Route-Based Generation

Breadcrumbs are auto-generated from route path and metadata:

```typescript
// Route definition
const route = {
  path: '/customers/:customerId/orders/:orderId',
  metadata: {
    breadcrumb: {
      segments: [
        { label: 'Customers', path: '/customers' },
        { label: ':customerName', path: '/customers/:customerId' },
        { label: 'Orders', path: '/customers/:customerId/orders' },
        { label: ':orderNumber', path: '/customers/:customerId/orders/:orderId' }
      ]
    }
  }
}

// Rendered breadcrumb (with data)
🏠 / Customers / Brisbane Solar Co / Orders / Order #ORD-2024-001
     └────┬───┘   └───────┬───────┘   └──┬──┘   └────────┬────────┘
          │               │              │                │
    Static label    Dynamic from      Static        Dynamic from
                   customer.name      label         order.number
```

### Dynamic Segment Resolution

```typescript
// Pseudo-code for breadcrumb generation
function resolveBreadcrumb(segment, params, data) {
  if (segment.label.startsWith(':')) {
    // Dynamic segment - resolve from data
    const key = segment.label.slice(1) // Remove ':'
    return data[key] || params[segment.param]
  }
  // Static segment
  return segment.label
}

// Examples
':customerName' → data.customerName → "Brisbane Solar Co"
':orderNumber' → data.orderNumber → "Order #ORD-2024-001"
'Customers' → "Customers" (static)
```

### Nested Routes (Tabs Don't Add Breadcrumbs)

When using tab navigation within a page, tabs don't add breadcrumb segments:

```
Route: /customers/:id/orders (tab view)

Breadcrumb remains:
🏠 / Customers / Brisbane Solar Co

NOT:
🏠 / Customers / Brisbane Solar Co / Orders ❌
                                      └──┬──┘
                                         │
                                    Tab navigation
                                 (shouldn't add level)
```

### Tab vs Nested Page Rule

```
Tabs (no breadcrumb):
- Same page context
- Content switches inline
- URL changes via query param or hash
- Example: /customers/:id?tab=orders

Nested Pages (add breadcrumb):
- New page context
- Full page navigation
- URL changes via path segment
- Example: /customers/:id/orders/:orderId
```

---

## 5. Breadcrumb + Actions Layout

### Desktop Layout

Breadcrumb and page actions share the same horizontal row:

```
┌──────────────────────────────────────────────────────────┐
│ 🏠 / Customers / Brisbane Solar Co        [+ New Order]  │
│ └───────────┬────────────────┘            └─────┬──────┘ │
│             │                                    │        │
│        Breadcrumb                          Action Buttons │
│        (left-aligned)                      (right-aligned)│
└──────────────────────────────────────────────────────────┘
```

### Component Structure

```
Container (Header)
├─ Display: flex
├─ Justify: space-between
├─ Align: center
├─ Padding: 16px 24px
├─ Border-bottom: 1px solid border
│
├─ Left Section (Breadcrumb)
│  ├─ Flex: 1
│  └─ Min-width: 0 (allows truncation)
│
└─ Right Section (Actions)
   ├─ Display: flex
   ├─ Gap: 8px
   └─ Flex-shrink: 0 (never shrink)
```

### Mobile Layout

On mobile, stack breadcrumb and actions vertically:

```
┌────────────────────────────┐
│ ← Customers                │
│   Brisbane Solar Co        │
├────────────────────────────┤
│ [+ New Order]              │
│ [Export]  [Settings]       │
└────────────────────────────┘
   └────┬────┘   └─────┬─────┘
        │              │
   Breadcrumb      Actions
   (full width)   (full width)
```

### Responsive Breakpoints

```
≥768px (md):
- Horizontal layout (flex-row)
- Breadcrumb + Actions same row

<768px:
- Vertical layout (flex-col)
- Breadcrumb full width
- Actions full width below
- Gap: 12px
```

---

## 6. Renoz-Specific Examples

### Dashboard

```
🏠
└─ Just home icon (no breadcrumb trail)
```

- No additional breadcrumb needed (we're at home)

### Customers List

```
🏠 / Customers

Actions:
[+ Add Customer]  [Import]  [Export]
```

### Customer Detail

```
🏠 / Customers / Brisbane Solar Co

Actions:
[Edit]  [+ New Order]  [⋮ More]
```

### Customer Detail > Orders Tab

```
🏠 / Customers / Brisbane Solar Co

Tabs: [Overview] [Orders] [Quotes] [Contacts]
      (breadcrumb doesn't change when switching tabs)

Actions:
[+ New Order]  [Export]
```

### Order Detail (Nested Page)

```
🏠 / Customers / Brisbane Solar Co / Order #ORD-2024-001

Actions:
[Edit]  [Duplicate]  [Send Invoice]  [⋮ More]
```

### Quote Detail

```
🏠 / Customers / Brisbane Solar Co / Quote #QUO-2024-015

Actions:
[Edit]  [Convert to Order]  [Send to Customer]
```

### Contact Detail (within Customer)

```
🏠 / Customers / Brisbane Solar Co / John Smith

Actions:
[Edit]  [Email]  [Call]  [⋮ More]
```

### Settings Page

```
🏠 / Settings / Company Profile

Tabs: [Company] [Users] [Integrations] [Billing]
      (tabs don't add breadcrumb levels)
```

---

## 7. Integration with Components

### Header Component

Breadcrumb lives in the page header component:

```typescript
// Header component structure
<Header>
  <Breadcrumb />
  <PageActions />
</Header>

// Automatic rendering from route
function Header() {
  const breadcrumbs = useBreadcrumbs() // Hook reads route + metadata
  const actions = usePageActions()     // Hook reads page context

  return (
    <header className="flex justify-between items-center border-b">
      <Breadcrumb items={breadcrumbs} />
      <PageActions actions={actions} />
    </header>
  )
}
```

### Route Metadata

Define breadcrumb metadata in route configuration:

```typescript
// Route config example
{
  path: '/customers/:customerId',
  element: <CustomerDetail />,
  handle: {
    breadcrumb: {
      label: ':customerName',      // Dynamic from data
      dataKey: 'customer.name'     // Where to get data
    },
    actions: [
      { label: 'Edit', variant: 'outline', icon: 'Edit' },
      { label: 'New Order', variant: 'default', icon: 'Plus' }
    ]
  }
}
```

### Breadcrumb Hook

```typescript
// useBreadcrumbs hook
function useBreadcrumbs() {
  const matches = useMatches()
  const location = useLocation()

  const breadcrumbs = matches
    .filter(match => match.handle?.breadcrumb)
    .map(match => ({
      label: resolveLabel(match.handle.breadcrumb, match.data),
      path: match.pathname,
      current: match.pathname === location.pathname
    }))

  return [
    { label: 'Home', path: '/dashboard', icon: 'Home' },
    ...breadcrumbs
  ]
}
```

---

## 8. Accessibility

### Semantic HTML

```html
<nav aria-label="Breadcrumb">
  <ol class="breadcrumb">
    <li>
      <a href="/dashboard">
        <HomeIcon aria-label="Home" />
      </a>
    </li>
    <li aria-hidden="true">/</li>
    <li>
      <a href="/customers">Customers</a>
    </li>
    <li aria-hidden="true">/</li>
    <li aria-current="page">
      Brisbane Solar Co
    </li>
  </ol>
</nav>
```

### ARIA Attributes

- `<nav aria-label="Breadcrumb">` - Identifies breadcrumb navigation
- `<ol>` - Ordered list (shows hierarchy)
- `aria-current="page"` - Marks current page
- `aria-hidden="true"` - Hides separators from screen readers

### Keyboard Navigation

- All links are keyboard focusable (tab navigation)
- Visual focus indicator on links
- Mobile back button is keyboard accessible

---

## 9. Edge Cases

### No Parent Page

If current page has no parent (e.g., orphaned page):

```
🏠 / Orphaned Page
```

- Show home + current only
- No empty segments

### Loading State

While fetching dynamic breadcrumb data:

```
🏠 / Customers / Loading...
                 └────┬───┘
                      │
                 Skeleton text
```

- Show skeleton for dynamic segments
- Keep static segments visible

### Error State

If dynamic data fails to load:

```
🏠 / Customers / [Customer Not Found]
                 └──────────┬─────────┘
                            │
                      Error fallback
```

- Show error message in place of name
- Breadcrumb still functional for navigation

### Very Long Current Page Name

If current page name is extremely long:

```
Desktop:
🏠 / Customers / This Is An Extremely Long Customer Name...
                 └─────────────────┬─────────────────┘
                                   │
                          Max 60 chars with ellipsis

Mobile:
← Customers
  This Is An Extr...
  └──────┬────────┘
         │
    Max 20 chars
```

---

## 10. Implementation Checklist

### Phase 1: Core Breadcrumb
- [ ] Create Breadcrumb component (shadcn/ui based)
- [ ] Implement useBreadcrumbs hook
- [ ] Add route metadata structure
- [ ] Home icon + separator styling

### Phase 2: Dynamic Segments
- [ ] Implement dynamic label resolution
- [ ] Add data fetching integration
- [ ] Loading state skeletons
- [ ] Error fallback handling

### Phase 3: Responsive Behavior
- [ ] Desktop layout (full breadcrumb)
- [ ] Mobile layout (back button)
- [ ] Truncation logic (long paths)
- [ ] Truncation logic (long names)

### Phase 4: Integration
- [ ] Add to Header component
- [ ] Integrate with PageActions
- [ ] Add to all main routes
- [ ] Test with nested routes

### Phase 5: Polish
- [ ] Accessibility audit (ARIA labels)
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Visual QA across breakpoints

---

## Component API Reference

### Breadcrumb Component

```typescript
interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  maxItems?: number
  mobileMode?: 'back' | 'full'
}

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: React.ReactNode
  current?: boolean
}

// Usage
<Breadcrumb
  items={breadcrumbs}
  separator="/"
  maxItems={5}
  mobileMode="back"
/>
```

### useBreadcrumbs Hook

```typescript
interface UseBreadcrumbsOptions {
  includeHome?: boolean
  maxItems?: number
}

// Usage
const breadcrumbs = useBreadcrumbs({
  includeHome: true,
  maxItems: 5
})
```

---

## Design Tokens

```typescript
const breadcrumbTokens = {
  fontSize: 'text-sm',
  homeIconSize: 16,
  separatorSpacing: '8px',
  gap: '8px',

  colors: {
    link: 'text-muted-foreground',
    linkHover: 'text-foreground',
    current: 'text-foreground',
    separator: 'text-muted-foreground'
  },

  mobile: {
    backIconSize: 20,
    maxLabelLength: 20
  }
}
```

---

**End of Breadcrumb Patterns Wireframe**
