# UI/UX Route Standardization Brainstorm

**Date:** 2026-01-24
**Status:** Ready for planning
**Scope:** Full migration of all routes

---

## What We're Building

A comprehensive UI/UX design system that standardizes all routes, navigation, sidebars, detail sheets, modals, and dialogs across the renoz-v3 application. The goal is to eliminate layout shift, satisfy Jobs-to-be-Done for each view, maximize available insights, and create consistency for both end users and developers.

### Core Design Principles

1. **Action-centered design** - Routes organized by what users DO (Browse, Search, Create, Analyze), not by entity
2. **Context-preserving details** - Sheets for quick edits/previews (keep list visible), full pages for deep work requiring focus
3. **Table-first lists** - DataTable as the anchor view, alternative views (kanban, cards) available where domain needs them
4. **Contextual right panels** - Main content left, context panel right showing related info/quick actions based on selection
5. **Skeleton-first loading** - Domain-specific skeletons that mirror final layout, no spinners, no layout shift

---

## Why This Approach

### Problems Identified (Research Summary)

| Issue | Finding |
|-------|---------|
| **Layout inconsistency** | Variant usage varies wildly: Customers uses `full-width`, Orders/Pipeline use default `container`, Inventory switches between them |
| **Data fetching violations** | 181 inline query key occurrences across 57 files; Inventory routes use `useState+useEffect` (violates CLAUDE.md) |
| **Navigation anti-patterns** | Customers routes use `window.location.href` instead of TanStack Router `navigate()` |
| **No standard detail pattern** | Mix of full-page routes, Sheet overlays, Dialogs with no clear decision framework |
| **Missing shared components** | No master-detail layout, inconsistent empty states, varied loading patterns, error boundaries only in Jobs |
| **Layout shift sources** | Sidebar collapse animation, dynamic header content during loading |

### Chosen Approach: Component Library First

Build standardized layout components in isolation (with Storybook), then migrate domain-by-domain.

**Rationale:**
- Components tested before production use
- Clear "done" definition per component
- Migrations parallelizable
- Avoids speculative design while ensuring quality

---

## Key Decisions

### 1. Route Layout Variants

| Route Type | Layout Variant | Sidebar |
|------------|---------------|---------|
| List views | `full-width` | Optional right context panel |
| Detail views (deep work) | `container` | Right panel with related items |
| Detail views (quick edit) | Sheet overlay | N/A |
| Settings | `narrow` | Left vertical tabs |
| Dashboards | `full-width` | Widget-based, no sidebar |

### 2. Detail View Decision Framework

```
Is this a quick glance/minor edit? → Sheet overlay
  - Preview a record
  - Update a single field
  - Quick status change

Is this focused work requiring attention? → Full page route
  - Editing complex forms
  - Viewing detailed analytics
  - Multi-step workflows
```

### 3. List View Pattern

- **Primary:** DataTable with sorting, filtering, pagination
- **Secondary:** View switcher only where domain justifies it:
  - Pipeline: Kanban view available
  - Jobs: Calendar/Timeline views available
  - Inventory: Card grid for visual stock counts
- **Persistence:** User's view preference saved per-domain in localStorage

### 4. Loading State Standard

```tsx
// Every route must have a matching skeleton
<RouteShell>
  <RouteShell.Header>
    <Skeleton className="h-8 w-48" /> {/* Title */}
    <Skeleton className="h-10 w-32" /> {/* Actions */}
  </RouteShell.Header>
  <RouteShell.Content>
    <DataTableSkeleton columns={5} rows={10} />
  </RouteShell.Content>
</RouteShell>
```

### 5. Navigation Standard

- **NEVER** use `window.location.href` or `window.history.back()`
- **ALWAYS** use TanStack Router `navigate()`, `Link`, or `useNavigate()`
- **Back buttons:** Navigate to explicit parent route, not browser history

### 6. Component Hierarchy

```
RouteShell (layout container)
├── RouteShell.Header (breadcrumb, title, actions)
├── RouteShell.Content (main content area)
├── RouteShell.ContextPanel (optional right sidebar)
└── RouteShell.Footer (optional sticky footer)

DetailSheet (overlay for quick edits)
├── DetailSheet.Header
├── DetailSheet.Content
└── DetailSheet.Footer

ConfirmationDialog (destructive actions)
ActionDialog (forms, quick creates)
```

### 7. Mobile Responsiveness

- **Context panels:** Collapse to bottom sheet on mobile (triggered by selection or explicit tap)
- **DataTable:** Horizontal scroll with sticky first column
- **Sheets:** Full-screen on mobile with swipe-to-dismiss
- **Dialogs:** Remain centered modal on all screen sizes

### 8. Keyboard Navigation

**Global shortcuts (minimal essential):**
| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette |
| `Escape` | Close any overlay (sheet, dialog, panel) |
| `⌘/` | Open keyboard shortcuts help |

Route-specific shortcuts are opt-in per domain, not globally mandated.

### 9. Error Boundaries

- **Scope:** Route-level boundaries (each route has its own)
- **Behavior:** Error UI with retry button that reloads only that route
- **Logging:** Errors reported to monitoring (when configured)
- **Fallback:** Graceful degradation message + link to parent route

### 10. Bulk Operations

- **UI:** Floating bottom bar appears when 1+ items selected
- **Content:** Selection count, available actions (context-aware by permissions), clear selection button
- **Behavior:** Sticky to viewport, above mobile nav if present
- **Animation:** Slide up from bottom with spring easing

### 11. Empty States

- **Structure:** Illustration + descriptive message + primary CTA button
- **Copy:** Action-oriented ("Create your first customer" not "No customers")
- **Permissions:** CTA only shown if user has create permission
- **Search empty:** Distinct state for "no results" vs "empty collection"

### 12. Breadcrumbs

- **Structure:** Home > Domain > Sub-section > Item (reflects URL hierarchy)
- **Clickable:** All segments are links to their respective routes
- **Mobile:** Collapse middle segments to `...` dropdown on small screens
- **Current page:** Last segment is non-clickable text (not a link)

### 13. Design Token System

Comprehensive CSS variables for consistency:

```css
/* Spacing scale (4px base) */
--spacing-1: 4px;   --spacing-2: 8px;   --spacing-3: 12px;
--spacing-4: 16px;  --spacing-6: 24px;  --spacing-8: 32px;
--spacing-12: 48px; --spacing-16: 64px;

/* Semantic colors */
--color-primary: /* brand blue */
--color-secondary: /* muted gray */
--color-success: /* green for positive */
--color-warning: /* amber for caution */
--color-danger: /* red for destructive */
--color-info: /* blue for informational */

/* Surface colors */
--surface-background: /* page background */
--surface-card: /* elevated cards */
--surface-overlay: /* sheets, dialogs */
--surface-subtle: /* hover states */

/* Typography scale */
--text-xs: 12px;  --text-sm: 14px;  --text-base: 16px;
--text-lg: 18px;  --text-xl: 20px;  --text-2xl: 24px;

/* Shadows */
--shadow-sm: /* subtle elevation */
--shadow-md: /* cards, dropdowns */
--shadow-lg: /* modals, sheets */

/* Border radius */
--radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 12px;
--radius-full: 9999px;

/* Transitions */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

---

## Migration Domains (Priority Order)

Based on current violation count and user-facing impact:

| Priority | Domain | Violations | Notes |
|----------|--------|------------|-------|
| 1 | Inventory | ~30 | useState+useEffect issues, inconsistent layouts |
| 2 | Communications | ~30 | Complex hub, template editor, schedules |
| 3 | Financial | ~25 | Critical business data, needs precision |
| 4 | Pipeline | ~15 | High visibility, Kanban + detail views |
| 5 | Customers | ~10 | window.location.href issues |
| 6 | Orders | ~10 | Default layout variant issues |
| 7 | Products | ~8 | Mostly compliant, good baseline |
| 8 | Jobs | ~5 | Already has good patterns (error boundary, profiling) |

---

## Success Criteria

- [ ] Zero `window.location.href` or `window.history.back()` calls
- [ ] Zero `useState+useEffect` for data fetching in routes
- [ ] All routes use `RouteShell` component
- [ ] All loading states use domain-specific skeletons
- [ ] Lighthouse Layout Shift score < 0.1 on all routes
- [ ] Developer can scaffold new route in < 5 minutes using templates

---

## Component Library Scope

Components to build (with Storybook stories):

### Layout Components
| Component | Purpose | Variants |
|-----------|---------|----------|
| `RouteShell` | Main route layout wrapper | `full-width`, `container`, `narrow`, `with-panel` |
| `RouteShell.Header` | Breadcrumbs, title, actions | - |
| `RouteShell.Content` | Main content area | - |
| `RouteShell.ContextPanel` | Right sidebar panel | `default`, `compact` |
| `RouteShell.Footer` | Sticky footer | - |

### Overlay Components
| Component | Purpose | Variants |
|-----------|---------|----------|
| `DetailSheet` | Quick view/edit overlay | `default`, `wide`, `full` (mobile) |
| `ActionDialog` | Form submissions, creates | `sm`, `md`, `lg` |
| `ConfirmationDialog` | Destructive action confirmation | `warning`, `danger` |
| `BottomSheet` | Mobile context panel | - |

### Feedback Components
| Component | Purpose | Variants |
|-----------|---------|----------|
| `EmptyState` | No data placeholder | `collection`, `search`, `error` |
| `LoadingSkeleton` | Layout-preserving loading | `table`, `form`, `card`, `detail` |
| `RouteErrorBoundary` | Route-level error handling | - |
| `BulkActionsBar` | Floating selection actions | - |

### Navigation Components
| Component | Purpose | Variants |
|-----------|---------|----------|
| `Breadcrumbs` | Dynamic route hierarchy | `default`, `collapsed` (mobile) |
| `ViewSwitcher` | Toggle between list views | - |
| `BackButton` | Consistent back navigation | - |

---

## Next Steps

1. Run `/workflows:plan` to create implementation plan
2. Set up Storybook for component development
3. Define design tokens in CSS variables
4. Build core layout components (RouteShell, DetailSheet)
5. Create skeleton templates
6. Migrate Inventory domain as proof of concept
7. Document patterns in `docs/ui-patterns.md`
