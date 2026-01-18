# Navigation Wireframe

**Version:** 1.0
**Date:** 2026-01-10
**Component Type:** Foundation - Navigation System
**Status:** Design System Aligned

---

## Overview

This document defines the complete navigation system for Renoz Energy CRM, including sidebar navigation, topbar elements, and breadcrumb patterns. All components follow the Renoz v3 design system with stone neutrals, teal primary colors, and refined professional aesthetics.

---

## Navigation Structure

### Primary Navigation Items

Located in the sidebar. Icon + Label format with role-based visibility.

```
Primary (All Users):
┌──────────────────┐
│ 📊 Dashboard     │ - Overview, metrics, KPIs
│ 👥 Customers     │ - Customer list and details
│ 🔄 Pipeline      │ - Sales pipeline, lead tracking
│ 📦 Orders        │ - Order management
└──────────────────┘

Secondary (Role-Specific):
┌──────────────────┐
│ 🏢 Inventory     │ - Stock levels, locations (Warehouse/Admin)
│ 🛠️ Warranties    │ - Warranty management
│ 🛡️ Issues        │ - Issue tracking
└──────────────────┘

Admin:
┌──────────────────┐
│ ⚙️ Settings      │ - System configuration (Admin only)
└──────────────────┘
```

### Navigation Icons

Using Lucide React icon set:

| Icon | Component Name | Usage |
|------|---------------|-------|
| 📊 | BarChart3 | Dashboard |
| 👥 | Users | Customers |
| 🔄 | GitBranch | Pipeline |
| 📦 | Package | Orders |
| 🏢 | Warehouse | Inventory |
| 🛠️ | Wrench | Warranties |
| 🛡️ | ShieldAlert | Issues |
| ⚙️ | Settings | Settings |

---

## Sidebar Navigation States

### Expanded State (240px)

```
┌────────────────────────────┐
│  ┌──────────────────────┐  │
│  │   [R] Renoz Energy   │  │ ← Logo (Fraunces, --text-xl, 700)
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ 📊 Dashboard         │  │ ← Active: primary-100 bg, primary-700 text
│  └──────────────────────┘  │   Left border: primary-600 (3px)
│                            │
│  ┌──────────────────────┐  │
│  │ 👥 Customers         │  │ ← Default: stone-600 text, transparent bg
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 🔄 Pipeline          │  │ ← Hover: stone-100 bg, stone-900 text
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 📦 Orders            │  │
│  └──────────────────────┘  │
│                            │
│  ── Secondary ──           │ ← Divider (stone-200)
│                            │
│  ┌──────────────────────┐  │
│  │ 🏢 Inventory         │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 🛠️ Warranties        │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 🛡️ Issues            │  │
│  └──────────────────────┘  │
│                            │
│         (spacer)           │
│                            │
│  ┌──────────────────────┐  │
│  │ ◀ Collapse           │  │ ← Toggle button
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ [JD] John Doe        │  │ ← User section
│  │      Sales Rep       │  │   (Avatar + Name + Role)
│  └──────────────────────┘  │
└────────────────────────────┘
```

### Collapsed State (64px)

```
┌──────┐
│ [R]  │ ← Logo icon only
│      │
│ 📊   │ ← Active indicator (teal dot or border)
│ 👥   │
│ 🔄   │
│ 📦   │
│ ──   │ ← Divider
│ 🏢   │
│ 🛠️   │
│ 🛡️   │
│      │
│  ︙   │
│      │
│ ▶    │ ← Expand toggle
│ [JD] │ ← Avatar only
└──────┘
```

**Tooltip on Hover:**
```
[📊] ─────→ Dashboard
            (stone-900 bg, white text)
            --shadow-md
```

---

## Design System Tokens

### Sidebar Styles

```css
/* Container */
.sidebar {
  width: 240px; /* expanded */
  background: var(--card); /* white */
  border-right: 1px solid var(--card-border); /* stone-200 */
  box-shadow: var(--shadow-sm);
}

.sidebar.collapsed {
  width: 64px;
}

/* Logo */
.sidebar-logo {
  font-family: var(--font-display); /* Fraunces */
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-stone-900);
  padding: var(--spacing-4);
}

/* Navigation Items */
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  margin: 0 var(--spacing-2);
  border-radius: var(--radius-lg);

  font-family: var(--font-body); /* Plus Jakarta Sans */
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-stone-600);

  transition: all var(--duration-fast) var(--ease-out);
  cursor: pointer;
}

/* Nav Item - Hover */
.nav-item:hover {
  background: var(--color-stone-100);
  color: var(--color-stone-900);
}

/* Nav Item - Active */
.nav-item.active {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  border-left: 3px solid var(--color-primary-600);
  padding-left: calc(var(--spacing-4) - 3px);
}

/* Nav Item - Focus */
.nav-item:focus-visible {
  outline: none;
  box-shadow: var(--shadow-ring);
}

/* Icon */
.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Divider */
.nav-divider {
  height: 1px;
  background: var(--color-stone-200);
  margin: var(--spacing-4) var(--spacing-4);
}

/* Section Label */
.nav-section-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-stone-500);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  padding: var(--spacing-2) var(--spacing-4);
  margin-top: var(--spacing-4);
}
```

### User Section Styles

```css
.sidebar-user {
  margin-top: auto;
  padding: var(--spacing-4);
  border-top: 1px solid var(--border-subtle);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-primary-100);
  color: var(--color-primary-700);

  display: flex;
  align-items: center;
  justify-content: center;

  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
}

.user-name {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-stone-900);
}

.user-role {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-stone-500);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}
```

---

## TopBar (Header)

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Breadcrumbs                  Search              Utilities    │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Home > Customers │  │ 🔍 Search ⌘K │  │ 🔔(3)  [JD] ▼   │ │
│  └──────────────────┘  └──────────────┘  └──────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### TopBar Components

**1. Breadcrumbs**
```
Home > Customers > Brisbane Solar Co
└┬─┘   └───┬───┘   └────────┬───────┘
 │         │                 │
 Link    Link           Current (not linked)

Color: stone-500 (links), stone-700 (current)
Font: --font-body, --text-sm
Separator: `/` in stone-400
Hover: stone-900, underline
```

**2. Search Trigger**
```
┌──────────────────────┐
│ 🔍  Search...   ⌘K   │
└──────────────────────┘

Background: white
Border: 1px solid --border (stone-200)
Border-radius: --radius-md (8px)
Padding: --spacing-2 --spacing-4
Width: 240px (desktop), 180px (tablet)
Font: --text-sm, stone-500
Focus: border --color-primary-500, --shadow-ring
```

**3. Notifications**
```
┌──────┐
│  🔔  │
│  (3) │ ← Badge
└──────┘

Icon: 20px, stone-600
Badge:
  - Background: --color-error-500 (red)
  - Color: white
  - Size: 18px min-width
  - Font: --text-xs, 700
  - Position: top-right of icon
  - Border-radius: --radius-full
```

**4. User Menu Trigger**
```
┌────────────────┐
│ [JD] John ▼    │
└────────────────┘

Avatar: 32px, --radius-full
Name: --text-sm, 500, stone-900
Dropdown icon: ChevronDown, 16px, stone-500
Hover: bg stone-100
```

### TopBar Styles

```css
.topbar {
  height: 64px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-xs);

  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-6);
  gap: var(--spacing-4);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex: 1;
  min-width: 0; /* Allow breadcrumbs to truncate */
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-shrink: 0;
}
```

---

## Mobile Navigation

### Mobile Header

```
┌────────────────────────────────┐
│ ☰  Renoz    🔍    🔔(3)  [JD]  │
│ ↑           ↑      ↑      ↑    │
│ Menu      Search  Notif  User  │
└────────────────────────────────┘
```

### Mobile Drawer (Sidebar Overlay)

```
[Backdrop: rgba(28, 25, 23, 0.4), backdrop-filter: blur(4px)]

┌───────────────────────┐
│  ┌─────────────────┐  │
│  │ [R] Renoz    [X]│  │ ← Header with close button
│  └─────────────────┘  │
│                       │
│  ┌─────────────────┐  │
│  │ 📊 Dashboard    │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ 👥 Customers    │  │
│  └─────────────────┘  │
│  ┌─────────────────┐  │
│  │ 🔄 Pipeline     │  │
│  └─────────────────┘  │
│                       │
│  [All nav items...]   │
│                       │
│  ┌─────────────────┐  │
│  │ [JD] John Doe   │  │ ← User section at bottom
│  │     Sales Rep   │  │
│  │ [Logout]        │  │
│  └─────────────────┘  │
└───────────────────────┘
   Width: 280px
   Animation: slide from left (--duration-slow)
```

---

## Active State Indicators

### Desktop Expanded
```
┌──────────────────────┐
│ 📊 Dashboard         │ ← primary-100 background
│ ▌                    │ ← 3px left border (primary-600)
└──────────────────────┘
   Color: primary-700 text
```

### Desktop Collapsed
```
┌──────┐
│ 📊   │ ← Teal dot indicator (6px) at top-right
└──────┘
   Or: Vertical teal line (3px) on left edge
```

### Mobile
```
┌─────────────────┐
│ 📊 Dashboard    │ ← Same as desktop expanded
│ ▌               │
└─────────────────┘
```

---

## Role-Based Visibility

### Navigation Access Matrix

| Item        | Admin | Sales | Warehouse | Viewer | Path               |
|-------------|-------|-------|-----------|--------|--------------------|
| Dashboard   | ✓     | ✓     | ✓         | ✓      | `/`                |
| Customers   | ✓     | ✓     | ✗         | ✓      | `/customers`       |
| Pipeline    | ✓     | ✓     | ✗         | ✓      | `/pipeline`        |
| Orders      | ✓     | ✓     | ✓         | ✓      | `/orders`          |
| Inventory   | ✓     | ✗     | ✓         | ✓      | `/inventory`       |
| Warranties  | ✓     | ✓     | ✓         | ✓      | `/warranties`      |
| Issues      | ✓     | ✓     | ✓         | ✓      | `/issues`          |
| Settings    | ✓     | ✗     | ✗         | ✗      | `/settings`        |

### Implementation Pattern

```typescript
const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/',
    roles: ['admin', 'sales', 'warehouse', 'viewer']
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    path: '/customers',
    roles: ['admin', 'sales', 'viewer']
  },
  // ... etc
]

// Filter based on user role
const visibleItems = navigationItems.filter(item =>
  item.roles.includes(currentUser.role)
)
```

---

## Responsive Breakpoints

### Sidebar Behavior

| Breakpoint       | Width       | Sidebar State              | Behavior                    |
|------------------|-------------|----------------------------|-----------------------------|
| Desktop          | ≥1024px     | Expanded (default)         | Persistent, collapsible     |
| Tablet           | 768-1023px  | Collapsed (icon-only)      | Overlay on toggle           |
| Mobile           | <768px      | Hidden (drawer)            | Hamburger menu trigger      |

### TopBar Behavior

| Breakpoint | Search      | Breadcrumbs          | Utilities       |
|------------|-------------|----------------------|-----------------|
| Desktop    | Full width  | Full path (max 4)    | All visible     |
| Tablet     | Compact     | Truncated (...)      | All visible     |
| Mobile     | Icon only   | Current page only    | Icons only      |

---

## Accessibility

### Keyboard Navigation

| Key              | Action                                    |
|------------------|-------------------------------------------|
| Tab              | Navigate through nav items                |
| Shift+Tab        | Navigate backwards                        |
| Enter / Space    | Activate nav item                         |
| Escape           | Close mobile drawer / dropdowns           |
| [ or ]           | Collapse/expand sidebar (desktop)         |
| Cmd+K / Ctrl+K   | Open search                               |

### ARIA Attributes

```html
<!-- Sidebar -->
<nav aria-label="Main navigation" role="navigation">
  <button
    aria-label="Toggle sidebar"
    aria-expanded="true"
    aria-controls="sidebar-content"
  >
    Collapse
  </button>

  <a
    href="/dashboard"
    aria-current="page"
    class="nav-item active"
  >
    <BarChart3Icon aria-hidden="true" />
    Dashboard
  </a>
</nav>

<!-- Breadcrumbs -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li aria-hidden="true">/</li>
    <li aria-current="page">Customers</li>
  </ol>
</nav>

<!-- Notifications -->
<button aria-label="Notifications, 3 unread">
  <BellIcon aria-hidden="true" />
  <span class="badge" aria-label="3 unread">3</span>
</button>
```

### Screen Reader Announcements

- "Navigation collapsed" / "Navigation expanded"
- "Dashboard, current page"
- "Customers link"
- "Notifications, 3 unread"
- "User menu, John Doe, Sales Rep"

---

## Animations

### Sidebar Transitions

```css
/* Collapse/Expand */
.sidebar {
  transition: width var(--duration-moderate) var(--ease-out);
}

/* Nav item hover */
.nav-item {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

/* Mobile drawer */
.mobile-drawer {
  transform: translateX(0);
  transition: transform var(--duration-slow) var(--ease-out);
}

.mobile-drawer.closed {
  transform: translateX(-100%);
}

/* Backdrop */
.drawer-backdrop {
  opacity: 1;
  transition: opacity var(--duration-moderate) var(--ease-out);
}

.drawer-backdrop.hidden {
  opacity: 0;
  pointer-events: none;
}
```

---

## Component Dependencies

- **Framework:** React + TanStack Router
- **UI Components:** shadcn/ui (Sheet for mobile drawer, Dropdown for user menu)
- **Icons:** Lucide React
- **State:** Zustand or Context API for sidebar state
- **Storage:** localStorage for sidebar collapsed preference

---

## Future Enhancements

1. **Search History:** Show recent searches in search modal
2. **Favorites/Pinned:** Allow users to pin frequently used items to top
3. **Keyboard Shortcuts:** Display shortcuts in tooltips (e.g., "D" for Dashboard)
4. **Sub-Navigation:** Expandable nested nav items (e.g., Settings sub-menu)
5. **Breadcrumb Overflow Menu:** Show all segments in dropdown when truncated
6. **Quick Actions:** Global "+ New" button in topbar
7. **Navigation Analytics:** Track most-used items to optimize layout

---

## Related Wireframes

- `/foundation/app-shell-layout.wireframe.md` - Overall layout structure
- `/foundation/breadcrumb-patterns.wireframe.md` - Breadcrumb details
- `/foundation/modal-patterns.wireframe.md` - Search modal
- `/modules/dashboard/dashboard-layout.wireframe.md` - Dashboard view

---

**Change Log:**
- 2026-01-10: Initial navigation wireframe with Renoz v3 design system tokens
