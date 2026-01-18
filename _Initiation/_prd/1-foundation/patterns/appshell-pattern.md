# AppShell Pattern Specification

## Overview

This specification defines the application shell (AppShell) pattern based on the Square UI sidebar system - a production-ready, 727-line implementation providing responsive layout with collapsible navigation.

**Source**: Square UI (`_reference/.square-ui-reference/templates/dashboard-4/`)

**Pattern Type**: Collapsible sidebar layout with mobile sheet drawer

**Key Features**:
- Three collapse modes (offcanvas, icon, none)
- Mobile sheet drawer (18rem width)
- Desktop fixed sidebar (16rem, collapsible to 3rem icon mode)
- Cmd+B / Ctrl+B keyboard shortcut
- Cookie-based persistence
- Tooltip support in icon mode
- Responsive breakpoint at 768px

---

## Component Inventory

### Core Components

| Component | Purpose | Props | Export Location |
|-----------|---------|-------|-----------------|
| `SidebarProvider` | Context provider for sidebar state | `defaultOpen`, `open`, `onOpenChange` | `@/components/ui/sidebar` |
| `Sidebar` | Main sidebar container | `side`, `variant`, `collapsible` | `@/components/ui/sidebar` |
| `SidebarTrigger` | Toggle button component | `onClick` | `@/components/ui/sidebar` |
| `SidebarRail` | Edge hover/click rail for toggle | `onClick` | `@/components/ui/sidebar` |
| `SidebarInset` | Main content area wrapper | `className` | `@/components/ui/sidebar` |
| `useSidebar` | Hook for sidebar context | - | `@/components/ui/sidebar` |

### Sidebar Sub-Components

| Component | Purpose | Notes |
|-----------|---------|-------|
| `SidebarHeader` | Top section (logo, workspace picker) | Fixed at top |
| `SidebarContent` | Scrollable main navigation area | `overflow-auto` |
| `SidebarFooter` | Bottom section (user menu, promos) | Fixed at bottom |
| `SidebarSeparator` | Visual divider | Uses `Separator` primitive |
| `SidebarInput` | Search/filter input | Styled for sidebar context |

### Navigation Sub-Components

| Component | Purpose | Compound Pattern |
|-----------|---------|------------------|
| `SidebarGroup` | Section grouping | Container for menu sections |
| `SidebarGroupLabel` | Section label | Hidden in icon mode |
| `SidebarGroupContent` | Section content | Wraps menu items |
| `SidebarMenu` | Navigation menu list | `<ul>` wrapper |
| `SidebarMenuItem` | Individual menu item | `<li>` wrapper |
| `SidebarMenuButton` | Clickable menu button | Supports `isActive`, `tooltip` |
| `SidebarMenuSub` | Nested sub-menu | For hierarchical navigation |
| `SidebarMenuSubItem` | Sub-menu item | Nested menu item |
| `SidebarMenuSubButton` | Sub-menu button | Links for sub-items |
| `SidebarMenuBadge` | Badge/count display | Hidden in icon mode |
| `SidebarMenuAction` | Action button (kebab menu) | Hidden in icon mode |
| `SidebarMenuSkeleton` | Loading state skeleton | Random width animation |

---

## Layout Structure (ASCII Diagram)

### Desktop (Expanded - 16rem)

```
┌─────────────────┬──────────────────────────────────────┐
│  SidebarHeader  │        TopBar / Breadcrumbs          │
│   [Logo/Org]    ├──────────────────────────────────────┤
├─────────────────┤                                      │
│                 │                                      │
│ SidebarContent  │        SidebarInset (Main)           │
│  [Navigation]   │                                      │
│                 │          [Page Content]              │
│                 │                                      │
│                 │                                      │
├─────────────────┤                                      │
│  SidebarFooter  │                                      │
│   [User Menu]   │                                      │
└─────────────────┴──────────────────────────────────────┘
    16rem wide           flex-1 (fills remaining)
```

### Desktop (Collapsed Icon - 3rem)

```
┌───┬────────────────────────────────────────────────┐
│ H │          TopBar / Breadcrumbs                  │
│ e ├────────────────────────────────────────────────┤
├───┤                                                │
│   │                                                │
│ N │        SidebarInset (Main - expanded)          │
│ a │                                                │
│ v │            [Page Content]                      │
│   │                                                │
│   │                                                │
├───┤                                                │
│ F │                                                │
└───┴────────────────────────────────────────────────┘
3rem          flex-1 (more space for content)
```

### Desktop (Offcanvas - Hidden)

```
┌────────────────────────────────────────────────────┐
│             TopBar / Breadcrumbs                   │
├────────────────────────────────────────────────────┤
│                                                    │
│                                                    │
│        SidebarInset (Main - full width)            │
│                                                    │
│              [Page Content]                        │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
└────────────────────────────────────────────────────┘
         100vw (sidebar hidden off-screen)
```

### Mobile (Sheet Drawer - 18rem)

```
Sheet Overlay Mode:
┌─────────────────────────────────────────────┐
│ ████████████ TopBar █████████████████████   │
├─────────────────────────────────────────────┤
│ ┌──────────────┐                            │
│ │  Sidebar     │       Dimmed Background    │
│ │  Header      │                            │
│ ├──────────────┤                            │
│ │              │                            │
│ │  Content     │       (Touch to close)     │
│ │              │                            │
│ │              │                            │
│ ├──────────────┤                            │
│ │  Footer      │                            │
│ └──────────────┘                            │
└─────────────────────────────────────────────┘
   18rem wide      Overlay (Sheet component)
```

---

## Responsive Behavior Specifications

### Breakpoint Logic

| Viewport | Behavior | Implementation |
|----------|----------|----------------|
| `< 768px` (Mobile) | Sheet drawer overlay | `useIsMobile()` returns `true`, renders `<Sheet>` |
| `>= 768px` (Desktop) | Fixed sidebar | `useIsMobile()` returns `false`, renders fixed sidebar |

### Mobile Behavior

**Component**: `<Sheet>` from shadcn/ui (Radix Dialog primitive)

**Features**:
- Overlay dimmed background
- Slide-in animation from left/right
- Tap outside to close
- ESC key to close
- No cookie persistence (always closed on page load)
- 18rem width (`SIDEBAR_WIDTH_MOBILE`)

**State Management**:
```tsx
const [openMobile, setOpenMobile] = useState(false)
```

### Desktop Behavior

**Collapse Modes**:

| Mode | Behavior | Width | Use Case |
|------|----------|-------|----------|
| `offcanvas` | Slides off-screen | 0px (hidden) | Maximum content space |
| `icon` | Collapses to icon-only | 3rem | Persistent nav with space saving |
| `none` | Always expanded | 16rem | Non-collapsible sidebar |

**State Persistence**:
- Stored in cookie: `sidebar_state=true/false`
- Max age: 7 days (`60 * 60 * 24 * 7`)
- Path: `/` (site-wide)
- Applied on mount

**Keyboard Shortcut**:
- `Cmd+B` (Mac) or `Ctrl+B` (Windows/Linux)
- Toggles sidebar state
- Works globally via `window.addEventListener("keydown")`

### Variant Styles

| Variant | Description | Use Case |
|---------|-------------|----------|
| `sidebar` (default) | Full-height, border-right | Standard app shell |
| `floating` | Inset with padding, rounded, shadow | Dashboard aesthetic |
| `inset` | Inset main content with margin | Modern card-based layout |

---

## Navigation Configuration Structure

### Route Configuration Type

```typescript
type NavItem = {
  title: string;
  icon: LucideIcon;
  href: string;
  shortcut?: string;
  isActive?: boolean;
  badge?: number | string;
  children?: NavItem[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

type NavigationConfig = {
  topNav: NavItem[];
  workgroups?: NavGroup[];
};
```

### CRM Navigation Config Example

```typescript
const navigationConfig: NavigationConfig = {
  topNav: [
    {
      title: "Search",
      icon: Search,
      href: "/search",
      shortcut: "/"
    },
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      isActive: true
    },
    {
      title: "Customers",
      icon: Users,
      href: "/customers"
    },
    {
      title: "Pipeline",
      icon: Target,
      href: "/pipeline"
    },
    {
      title: "Orders",
      icon: ShoppingCart,
      href: "/orders"
    },
    {
      title: "Issues",
      icon: AlertCircle,
      href: "/issues",
      badge: 3
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings"
    }
  ],
  workgroups: [
    {
      label: "Modules",
      items: [
        {
          title: "Products",
          icon: Package,
          href: "/products"
        },
        {
          title: "Inventory",
          icon: Warehouse,
          href: "/inventory"
        },
        {
          title: "Suppliers",
          icon: Truck,
          href: "/suppliers"
        },
        {
          title: "Jobs",
          icon: Briefcase,
          href: "/jobs",
          children: [
            {
              title: "Active Jobs",
              icon: Clock,
              href: "/jobs/active"
            },
            {
              title: "Completed",
              icon: CheckCircle,
              href: "/jobs/completed"
            }
          ]
        },
        {
          title: "Financials",
          icon: DollarSign,
          href: "/financials",
          children: [
            {
              title: "Invoices",
              icon: FileText,
              href: "/financials/invoices"
            },
            {
              title: "Payments",
              icon: CreditCard,
              href: "/financials/payments"
            }
          ]
        }
      ]
    }
  ]
};
```

### Domain Groupings for CRM

| Domain | Icon | Route | Badge Logic |
|--------|------|-------|-------------|
| Dashboard | `LayoutDashboard` | `/` | - |
| Customers | `Users` | `/customers` | - |
| Pipeline | `Target` | `/pipeline` | Count of hot leads |
| Orders | `ShoppingCart` | `/orders` | Count of pending orders |
| Products | `Package` | `/products` | - |
| Inventory | `Warehouse` | `/inventory` | Count of low stock items |
| Suppliers | `Truck` | `/suppliers` | - |
| Jobs | `Briefcase` | `/jobs` | Count of active jobs |
| Issues | `AlertCircle` | `/issues` | Count of open issues |
| Financials | `DollarSign` | `/financials` | Count of overdue invoices |
| Settings | `Settings` | `/settings` | - |

---

## State Management Approach

### Context Architecture

**Provider**: `SidebarProvider` (React Context)

**State Variables**:

```typescript
type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};
```

**Controlled vs Uncontrolled**:

```tsx
// Uncontrolled (internal state)
<SidebarProvider defaultOpen={true}>
  {children}
</SidebarProvider>

// Controlled (external state)
const [open, setOpen] = useState(true);
<SidebarProvider open={open} onOpenChange={setOpen}>
  {children}
</SidebarProvider>
```

### Cookie Persistence

**Implementation**:

```typescript
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const setOpen = (value: boolean) => {
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  _setOpen(value);
};
```

**Reading on SSR** (Next.js):

```typescript
import { cookies } from "next/headers";

export default function Layout() {
  const cookieStore = cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {/* ... */}
    </SidebarProvider>
  );
}
```

### Mobile Detection Hook

**Implementation** (`hooks/use-mobile.ts`):

```typescript
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
```

**Key Details**:
- Returns `undefined` on first render (SSR safety)
- Returns `false` for `< 768px`
- Uses `matchMedia` for responsive updates
- Cleans up event listener on unmount

### Active Route Detection

**Pattern for TanStack Router**:

```tsx
import { useMatchRoute } from "@tanstack/react-router";

function NavItem({ item }: { item: NavItem }) {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({ to: item.href, fuzzy: true });

  return (
    <SidebarMenuButton
      asChild
      isActive={!!isActive}
      tooltip={item.title}
    >
      <Link to={item.href}>
        <item.icon />
        <span>{item.title}</span>
      </Link>
    </SidebarMenuButton>
  );
}
```

---

## Reference File Paths

### Square UI Source Files

```
_reference/.square-ui-reference/
├── templates/
│   └── dashboard-4/
│       ├── components/
│       │   ├── ui/
│       │   │   └── sidebar.tsx              # 727 lines - core sidebar primitives
│       │   └── dashboard/
│       │       └── sidebar.tsx              # 289 lines - example implementation
│       └── hooks/
│           └── use-mobile.ts                # 21 lines - mobile detection hook
│
└── templates-baseui/
    └── dashboard-4/
        ├── components/
        │   ├── ui/
        │   │   └── sidebar.tsx              # Same as above (baseUI variant)
        │   └── dashboard/
        │       └── sidebar.tsx
        └── hooks/
            └── use-mobile.ts
```

### Key Implementation Files

| File | Lines | Purpose |
|------|-------|---------|
| `components/ui/sidebar.tsx` | 727 | Core sidebar primitives and context |
| `components/dashboard/sidebar.tsx` | 289 | Example CRM-style implementation |
| `hooks/use-mobile.ts` | 21 | Responsive breakpoint detection |

### Dependencies

**Required shadcn/ui Components**:
- `Sheet` (mobile drawer)
- `Tooltip` (icon mode tooltips)
- `Separator` (visual dividers)
- `Button` (trigger, actions)
- `Input` (sidebar search)
- `Skeleton` (loading states)
- `DropdownMenu` (user menu, actions)
- `Collapsible` (nested navigation)

**Icons**:
- `lucide-react` (primary icon library)

**Utilities**:
- `class-variance-authority` (CVA for variants)
- `@radix-ui/react-slot` (polymorphic components)

---

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Create `hooks/use-mobile.ts` hook
- [ ] Create `components/ui/sidebar.tsx` primitives
- [ ] Install required dependencies (Sheet, Tooltip, etc.)
- [ ] Create `SidebarProvider` context
- [ ] Implement cookie persistence logic
- [ ] Add keyboard shortcut handler

### Phase 2: Navigation Config

- [ ] Create `lib/navigation/types.ts` for types
- [ ] Create `lib/navigation/config.ts` for CRM routes
- [ ] Implement active route detection with TanStack Router
- [ ] Add badge logic for notification counts

### Phase 3: CRM Sidebar Implementation

- [ ] Create `components/app/sidebar.tsx` (CRM-specific)
- [ ] Implement `SidebarHeader` with org/workspace picker
- [ ] Implement `SidebarContent` with navigation groups
- [ ] Implement `SidebarFooter` with user menu
- [ ] Add nested navigation for Jobs, Financials
- [ ] Add search/filter functionality

### Phase 4: Layout Integration

- [ ] Create `components/app/app-shell.tsx` wrapper
- [ ] Integrate `SidebarProvider` at root layout
- [ ] Create `SidebarInset` for main content area
- [ ] Add `SidebarTrigger` to top bar
- [ ] Add `SidebarRail` for edge toggle
- [ ] Test responsive behavior at 768px breakpoint

### Phase 5: Advanced Features

- [ ] Add tooltip support in icon mode
- [ ] Implement collapsible nested groups
- [ ] Add badge counts from API
- [ ] Add search/filter for navigation
- [ ] Add keyboard navigation (arrow keys)
- [ ] Add accessibility labels

### Phase 6: Testing & Polish

- [ ] Test mobile sheet drawer behavior
- [ ] Test cookie persistence across sessions
- [ ] Test keyboard shortcuts (Cmd+B, ESC)
- [ ] Test all three collapse modes
- [ ] Test nested navigation expand/collapse
- [ ] Test active route highlighting
- [ ] Verify SSR compatibility
- [ ] Add loading states (skeleton)

---

## Design Tokens

### Sidebar CSS Variables

```css
:root {
  --sidebar-width: 16rem;
  --sidebar-width-mobile: 18rem;
  --sidebar-width-icon: 3rem;

  --sidebar-background: hsl(var(--background));
  --sidebar-foreground: hsl(var(--foreground));
  --sidebar-border: hsl(var(--border));

  --sidebar-accent: hsl(var(--accent));
  --sidebar-accent-foreground: hsl(var(--accent-foreground));

  --sidebar-ring: hsl(var(--ring));
}
```

### Transition Timing

```css
.sidebar-container {
  transition: left 200ms ease-linear,
              right 200ms ease-linear,
              width 200ms ease-linear;
}

.sidebar-gap {
  transition: width 200ms ease-linear;
}
```

---

## Accessibility Requirements

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Cmd+B` / `Ctrl+B` | Toggle sidebar |
| `Tab` | Navigate menu items |
| `Enter` / `Space` | Activate menu item |
| `Arrow Up/Down` | Navigate menu items |
| `ESC` | Close mobile sheet |

### ARIA Labels

```tsx
<button aria-label="Toggle Sidebar">
  <PanelLeftIcon />
  <span className="sr-only">Toggle Sidebar</span>
</button>

<nav aria-label="Main Navigation">
  <SidebarMenu>
    {/* menu items */}
  </SidebarMenu>
</nav>
```

### Screen Reader Support

- All icons have `sr-only` text alternatives
- Sheet header has `sr-only` title and description
- Active states announced via `aria-current="page"`
- Collapsed state announced via `aria-expanded`

---

## Performance Considerations

### Lazy Loading

```tsx
// Lazy load heavy nested navigation
const NestedNav = lazy(() => import("./nested-nav"));

<Suspense fallback={<SidebarMenuSkeleton />}>
  <NestedNav />
</Suspense>
```

### Memoization

```tsx
const navItems = useMemo(() =>
  navigationConfig.topNav.filter(item =>
    hasPermission(user, item.requiredPermission)
  ),
  [user, navigationConfig]
);
```

### Debounced Resize

The `useIsMobile` hook already uses `matchMedia` which is optimized. Avoid adding resize listeners.

---

## Testing Strategy

### Unit Tests

```tsx
describe("useSidebar", () => {
  it("throws error when used outside provider");
  it("toggles sidebar state");
  it("persists state to cookie");
  it("reads initial state from cookie");
});

describe("useIsMobile", () => {
  it("returns true for < 768px");
  it("returns false for >= 768px");
  it("updates on window resize");
});
```

### Integration Tests

```tsx
describe("AppShell", () => {
  it("renders mobile sheet on small viewport");
  it("renders fixed sidebar on large viewport");
  it("toggles sidebar with Cmd+B");
  it("closes mobile sheet on outside click");
  it("highlights active route");
  it("shows tooltip in icon mode");
});
```

### Visual Regression Tests

- Mobile sheet animation
- Icon mode collapse animation
- Nested navigation expand/collapse
- Active state styling
- Tooltip positioning

---

## Migration Path (from PageLayout)

### Current State

Renoz CRM currently uses `PageLayout` compound component pattern without collapsible sidebar.

### Migration Steps

1. **Install sidebar primitives** (copy from Square UI reference)
2. **Create navigation config** (centralize routes)
3. **Wrap root layout** with `SidebarProvider`
4. **Replace static sidebar** with collapsible `Sidebar`
5. **Migrate PageLayout** to use `SidebarInset`
6. **Add topbar trigger** for sidebar toggle
7. **Test responsive behavior** at 768px breakpoint

### Backward Compatibility

Keep `PageLayout` as a wrapper around `SidebarInset` for gradual migration:

```tsx
// components/page-layout.tsx
export function PageLayout({ children, ...props }: PageLayoutProps) {
  return (
    <SidebarInset>
      <div className="page-layout-legacy">
        {children}
      </div>
    </SidebarInset>
  );
}
```

---

## Open Questions

- [ ] Should navigation config be centralized in a single file or co-located by domain?
- [ ] Should badge counts be real-time (WebSocket) or polling?
- [ ] Should sidebar state sync across tabs (localStorage + storage event)?
- [ ] Should we support right-side sidebar for secondary navigation?
- [ ] Should we add search/command palette integration?

---

## Related Documentation

- `FOUND-APPSHELL-001`: Centralize Route Configuration
- `FOUND-APPSHELL-002`: Create Layout Route Groups
- `FOUND-APPSHELL-003`: Audit and Standardize PageLayout Usage
- `FOUND-APPSHELL-004`: Create Command Palette Context
- `FOUND-APPSHELL-007`: Create App Shell README

---

**Last Updated**: 2026-01-10
**Specification Version**: 1.0
**Status**: Draft
**Owner**: Foundation Team
