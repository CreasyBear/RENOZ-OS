# Sidebar Navigation Wireframe

**Component:** `SidebarNavigation`
**Context:** Battery CRM - Primary navigation for all authenticated users
**Last Updated:** 2026-01-10

---

## Overview

The sidebar navigation provides primary app navigation with role-based visibility, expandable/collapsible states, and accessibility support. It adapts between desktop sidebar and mobile drawer patterns.

---

## Desktop - Expanded State

```
┌─────────────────────────────┐
│  [LOGO] Renoz Energy    [<] │ ← Toggle collapse
├─────────────────────────────┤
│                             │
│  [🏠] Dashboard             │ ← Active (highlighted)
│  [👥] Customers             │
│  [📊] Pipeline              │
│  [🛒] Orders                │
│  [📦] Products              │
│  [🏢] Inventory             │
│  [🔧] Jobs            [3]   │ ← Badge (Warehouse/Admin)
│  [🆘] Support         [5]   │ ← Notification badge
│  [📈] Reports               │ ← Admin only
│  [⚙️] Settings              │ ← Admin only
│                             │
├─────────────────────────────┤
│  [👤] John Doe              │ ← User profile
│  Admin                      │ ← Role label
└─────────────────────────────┘
Width: 240px (expanded)
```

### States

**Active Item:**
```
┌─────────────────────────────┐
│  [🏠] Dashboard             │ ← bg-primary-100, text-primary-700
└─────────────────────────────┘
```

**Hover State:**
```
┌─────────────────────────────┐
│  [👥] Customers             │ ← bg-gray-100, cursor-pointer
└─────────────────────────────┘
```

**With Badge:**
```
┌─────────────────────────────┐
│  [🆘] Support         [5]   │ ← Red badge, count indicator
└─────────────────────────────┘
```

---

## Desktop - Collapsed State

```
┌─────┐
│ [R] │ ← Logo icon only
├─────┤
│     │
│ [🏠]│ ← Active
│ [👥]│
│ [📊]│
│ [🛒]│
│ [📦]│
│ [🏢]│
│ [🔧]│ ← Badge shows as dot
│ [🆘]│ ← Red dot indicator
│ [📈]│
│ [⚙️]│
│     │
├─────┤
│ [👤]│ ← User avatar
└─────┘
Width: 64px (collapsed)
```

### Collapsed - Hover Tooltip
```
┌─────┐        ┌─────────────┐
│ [🔧]│───────→│ Jobs (3)    │ ← Tooltip on hover
└─────┘        └─────────────┘
```

---

## Mobile - Drawer Variant

```
[☰]  Renoz Energy                    ← Hamburger menu trigger

When opened:
┌─────────────────────────────┐
│  [X] Close                  │ ← Close button
├─────────────────────────────┤
│                             │
│  [🏠] Dashboard             │
│  [👥] Customers             │
│  [📊] Pipeline              │
│  [🛒] Orders                │
│  [📦] Products              │
│  [🏢] Inventory             │
│  [🔧] Jobs            [3]   │
│  [🆘] Support         [5]   │
│  [📈] Reports               │
│  [⚙️] Settings              │
│                             │
├─────────────────────────────┤
│  [👤] John Doe              │
│  Admin                      │
│  [Logout]                   │
└─────────────────────────────┘

Overlay: Semi-transparent backdrop
Animation: Slide from left (300ms)
```

---

## Navigation Items

### All Roles

| Icon | Label | Path | Description |
|------|-------|------|-------------|
| 🏠 | Dashboard | `/` | Overview, metrics, recent activity |
| 👥 | Customers | `/customers` | Customer list and details |
| 📊 | Pipeline | `/pipeline` | Sales pipeline, lead tracking |
| 🛒 | Orders | `/orders` | Order management |
| 📦 | Products | `/products` | Product catalog |
| 🏢 | Inventory | `/inventory` | Stock levels, locations |
| 🆘 | Support | `/support` | Tickets, customer issues |

### Warehouse + Admin Only

| Icon | Label | Path | Description |
|------|-------|------|-------------|
| 🔧 | Jobs | `/jobs` | Installation jobs, scheduling |

### Admin Only

| Icon | Label | Path | Description |
|------|-------|------|-------------|
| 📈 | Reports | `/reports` | Analytics, custom reports |
| ⚙️ | Settings | `/settings` | System configuration |

---

## Role-Based Visibility

### Sales Role
```
┌─────────────────────────────┐
│  [🏠] Dashboard             │
│  [👥] Customers             │
│  [📊] Pipeline              │
│  [🛒] Orders                │
│  [📦] Products              │
│  [🏢] Inventory             │
│  [🆘] Support               │
└─────────────────────────────┘
(No Jobs, Reports, Settings)
```

### Warehouse Role
```
┌─────────────────────────────┐
│  [🏠] Dashboard             │
│  [👥] Customers             │
│  [🛒] Orders                │
│  [📦] Products              │
│  [🏢] Inventory             │
│  [🔧] Jobs            [3]   │ ← Has access
│  [🆘] Support               │
└─────────────────────────────┘
(No Pipeline, Reports, Settings)
```

### Admin Role
```
┌─────────────────────────────┐
│  [🏠] Dashboard             │
│  [👥] Customers             │
│  [📊] Pipeline              │
│  [🛒] Orders                │
│  [📦] Products              │
│  [🏢] Inventory             │
│  [🔧] Jobs            [3]   │
│  [🆘] Support         [5]   │
│  [📈] Reports               │ ← Admin only
│  [⚙️] Settings              │ ← Admin only
└─────────────────────────────┘
(Full access)
```

---

## Component Structure

```typescript
interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  badge?: number
  roles: Role[] // ['sales', 'warehouse', 'admin']
}

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  currentPath: string
  userRole: Role
  notifications: Record<string, number> // { support: 5, jobs: 3 }
}
```

---

## Interaction Patterns

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Focus next nav item |
| `Shift+Tab` | Focus previous nav item |
| `Enter` / `Space` | Navigate to selected item |
| `Escape` | Close mobile drawer |
| `[` | Collapse sidebar (desktop) |
| `]` | Expand sidebar (desktop) |

### Focus States
```
┌─────────────────────────────┐
│  [🏠] Dashboard             │ ← Focus ring (2px blue)
└─────────────────────────────┘
```

### Click/Tap Behavior
1. Navigate to route
2. Update active state
3. Close mobile drawer (mobile only)
4. Track analytics event

---

## Badge System

### Types

**Count Badge:**
```
[🆘] Support         [5]
                     ^^^
                     bg-red-500, text-white
                     Rounded pill, min-width 20px
```

**Dot Indicator (Collapsed):**
```
[🆘] ← Red dot (6px) at top-right of icon
```

### Badge Colors

| Priority | Color | Use Case |
|----------|-------|----------|
| High | Red (`bg-red-500`) | Support tickets |
| Medium | Orange (`bg-orange-500`) | Jobs pending |
| Low | Blue (`bg-blue-500`) | General notifications |

---

## Responsive Behavior

### Breakpoints

| Screen | Behavior |
|--------|----------|
| `< 768px` | Mobile drawer (overlay) |
| `768px - 1024px` | Collapsed by default |
| `> 1024px` | Expanded by default |

### Persistence
```typescript
// Save collapse state to localStorage
const [isCollapsed, setIsCollapsed] = useLocalStorage('sidebar-collapsed', false)
```

---

## Accessibility Requirements

### ARIA Attributes
```html
<nav aria-label="Primary navigation">
  <button
    aria-label="Toggle navigation"
    aria-expanded={!isCollapsed}
  >
    Toggle
  </button>

  <a
    href="/dashboard"
    aria-current={isActive ? 'page' : undefined}
  >
    <HomeIcon aria-hidden="true" />
    Dashboard
  </a>

  <a href="/support">
    <LifeBuoyIcon aria-hidden="true" />
    Support
    <span aria-label="5 unread tickets" className="badge">
      5
    </span>
  </a>
</nav>
```

### Screen Reader Announcements
- "Navigation collapsed" / "Navigation expanded" on toggle
- "Dashboard, current page" for active items
- "Support, 5 unread tickets" for badge items
- "Jobs, restricted to warehouse and admin roles" for role-restricted items

---

## Animation & Transitions

### Expand/Collapse
```css
transition: width 200ms ease-in-out
```

### Mobile Drawer
```css
/* Slide in from left */
transform: translateX(0);
transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Backdrop fade */
opacity: 1;
transition: opacity 200ms ease-in-out;
```

### Item Hover
```css
transition: background-color 150ms ease;
```

---

## Edge Cases

### No Notifications
```
[🆘] Support              ← No badge shown
```

### Very Long Labels (Truncate)
```
┌─────────────────────────────┐
│  [📦] Product Catalog an... │ ← Ellipsis after 20 chars
└─────────────────────────────┘
```

### No Role Access
```typescript
// Item not rendered if user lacks role
{hasAccess(item.roles, userRole) && (
  <NavItem {...item} />
)}
```

### Network Error (Badges)
```
[🆘] Support         [?]   ← Question mark if fetch fails
```

---

## Visual Design Tokens

### Colors
```css
--nav-bg: white;
--nav-border: #e5e7eb;
--nav-text: #374151;
--nav-text-active: #1d4ed8;
--nav-bg-hover: #f3f4f6;
--nav-bg-active: #dbeafe;
--nav-focus-ring: #3b82f6;
```

### Spacing
```css
--nav-item-height: 44px;
--nav-item-padding: 12px 16px;
--nav-gap: 4px;
--nav-icon-size: 20px;
```

### Typography
```css
--nav-font-size: 14px;
--nav-font-weight: 500;
--nav-line-height: 20px;
```

---

## Implementation Notes

### Component Dependencies
- `lucide-react` for icons
- `react-router-dom` for navigation
- `@radix-ui/react-dialog` for mobile drawer
- `useMediaQuery` hook for responsive behavior
- `useLocalStorage` hook for persistence

### State Management
```typescript
// Context for sidebar state
const SidebarContext = createContext<{
  isCollapsed: boolean
  toggle: () => void
  isMobile: boolean
}>()

// In layout component
<SidebarProvider>
  <Sidebar />
  <MainContent />
</SidebarProvider>
```

### Performance
- Lazy load badge counts (only fetch on mount)
- Debounce collapse toggle (prevent rapid toggling)
- Memoize navigation items (only recalculate on role change)

---

## Test Scenarios

### Functional Tests
1. Navigate to each route via click
2. Toggle collapse/expand
3. Verify role-based visibility
4. Verify badge counts update
5. Verify keyboard navigation
6. Test mobile drawer open/close

### Accessibility Tests
1. Screen reader announcement checks
2. Keyboard-only navigation
3. Focus trap in mobile drawer
4. ARIA attribute validation

### Visual Tests
1. Active state highlighting
2. Hover state transitions
3. Collapsed state icon alignment
4. Badge positioning
5. Mobile drawer animation

---

## Future Enhancements

1. **Sub-navigation:** Expandable sections (e.g., Settings sub-menu)
2. **Search:** Quick navigation search (`Cmd+K`)
3. **Favorites:** Pin frequently used items
4. **Customization:** Drag-to-reorder items
5. **Shortcuts:** Display keyboard shortcuts in tooltips
6. **Analytics:** Track most-used navigation items

---

## Related Components

- `UserProfileMenu` - Footer user section
- `MobileHeader` - Top bar with hamburger menu
- `BreadcrumbNavigation` - Secondary navigation
- `PageLayout` - Wraps sidebar + content area
