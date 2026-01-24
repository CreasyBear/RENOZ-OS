---
title: "feat: UI/UX Route Standardization"
type: feat
date: 2026-01-24
brainstorm: docs/brainstorms/2026-01-24-ui-ux-route-standardization-brainstorm.md
deepened: 2026-01-24
---

# UI/UX Route Standardization

## Enhancement Summary

**Deepened on:** 2026-01-24
**Research agents used:** 10 (frontend-design, web-design-guidelines, vercel-react-best-practices, best-practices-researcher ×2, performance-oracle, architecture-strategist, code-simplicity-reviewer, security-sentinel)

### Key Improvements

1. **Massive YAGNI Simplification**: Reduced component scope from 15 custom components to 3 thin wrappers + existing shadcn primitives
2. **Critical CLS Fix**: Identified `useIsMobile` hydration mismatch causing layout shift - needs server-safe initialization
3. **Architecture Refinement**: RouteShell wraps PageLayout (composition) instead of replacing it
4. **Security Hardening**: Added server-side per-item authorization for bulk operations, production-safe error boundaries
5. **Performance Optimizations**: Dynamic imports for overlays, memoized compound components, Set-based selections

### Critical Findings

| Finding | Impact | Action |
|---------|--------|--------|
| `useIsMobile` returns undefined on SSR | Layout shift on hydration | Initialize with deterministic desktop default |
| 80%+ of planned components are redundant | Wasted development effort | Use existing shadcn Sheet/Drawer/Dialog directly |
| Sidebar collapse animation causes CLS | Poor Lighthouse scores | Use CSS containment, will-change optimization |
| Bulk actions need server-side auth | Security vulnerability | Per-item permission check in server functions |
| Error boundaries may leak stack traces | Information disclosure | Strip in production, log to monitoring |

---

## Overview

Comprehensive design system overhaul to standardize all routes, navigation, sidebars, detail sheets, modals, and dialogs across the renoz-v3 application. This initiative addresses layout inconsistency, navigation anti-patterns, missing shared components, and data fetching violations identified across 8 domains with 181+ violations.

**Approach:** Component Library First - build standardized components in isolation with Storybook, then migrate domain-by-domain.

---

## Problem Statement

### Current Issues

| Issue | Impact | Evidence |
|-------|--------|----------|
| **Layout inconsistency** | Users experience jarring transitions between domains | Customers uses `full-width`, Orders/Pipeline use `container`, Inventory mixes both |
| **Data fetching violations** | Cache coherence failures, stale data bugs | 181 inline query key occurrences across 57 files |
| **Navigation anti-patterns** | Full page reloads, broken back button | Customers uses `window.location.href` instead of TanStack Router |
| **No standard detail pattern** | Inconsistent UX for viewing/editing records | Mix of full-page routes, Sheet overlays, Dialogs with no decision framework |
| **Missing shared components** | Developer friction, inconsistent implementations | No master-detail layout, varied loading patterns, error boundaries only in Jobs |
| **Layout shift** | Poor Lighthouse scores, perceived slowness | Sidebar collapse animation, dynamic header content during loading |

### Root Causes

1. **No documented standards** - Developers make ad-hoc decisions
2. **Organic growth** - Each domain evolved independently
3. **Missing abstractions** - Low-level primitives without high-level patterns
4. **No component testing** - Hard to verify consistency without Storybook

---

## Proposed Solution

### Core Design Principles

1. **Action-centered design** - Routes organized by what users DO (Browse, Search, Create, Analyze)
2. **Context-preserving details** - Sheets for quick edits, full pages for deep work
3. **Table-first lists** - DataTable as anchor, alternative views where justified
4. **Contextual right panels** - Main content left, context panel right
5. **Skeleton-first loading** - Domain-specific skeletons, no spinners, no layout shift

### Component Hierarchy

```
RouteShell (standardized layout wrapper)
├── RouteShell.Header (breadcrumbs, title, actions)
├── RouteShell.Content (main content area)
├── RouteShell.ContextPanel (optional right sidebar → BottomSheet on mobile)
└── RouteShell.Footer (optional sticky footer)

DetailSheet (overlay for quick edits)
├── DetailSheet.Header
├── DetailSheet.Content
└── DetailSheet.Footer

BulkActionsBar (floating bottom bar for selections)
RouteErrorBoundary (route-level error containment)
```

---

## Technical Approach

### Architecture

**Strategy:** Compose RouteShell as a thin wrapper around existing PageLayout, leveraging existing shadcn components.

### Research Insights: YAGNI Simplification

**Best Practices (Code Simplicity Review):**
- 80%+ of originally planned components are redundant wrappers around existing primitives
- `DetailSheet` = shadcn `Sheet` with side="right" + consistent header pattern
- `BottomSheet` = vaul `Drawer` with direction="bottom" (already in codebase)
- `ActionDialog` = shadcn `Dialog` (no wrapper needed)
- `ConfirmationDialog` = already exists at `src/components/ui/confirmation-dialog.tsx`

**Revised Component List (15 → 3 new + patterns):**

| Originally Planned | Simplified To |
|--------------------|---------------|
| RouteShell (compound) | **Keep** - thin wrapper around PageLayout |
| DetailSheet | Use `<Sheet side="right">` directly with pattern |
| BottomSheet | Use `<Drawer direction="bottom">` directly |
| ActionDialog | Use `<Dialog>` directly |
| ConfirmationDialog | Already exists |
| RouteErrorBoundary | Use TanStack Router's native `errorComponent` |
| BulkActionsBar | **Keep** - unique UI element |
| Skeletons (4) | **Keep** - domain-specific patterns |
| BackButton | Use `<Link to={parentRoute}>` with pattern |
| ViewSwitcher | Use `<ToggleGroup>` with pattern |
| Breadcrumbs | **Keep** - auto-generated from route hierarchy |

**Simplified Directory Structure:**

```
src/components/layout/
├── route-shell/
│   ├── route-shell.tsx           # Wraps PageLayout, adds compound context
│   ├── route-shell-header.tsx    # Title + breadcrumbs + actions
│   ├── route-shell-content.tsx   # Main content area
│   ├── route-shell-context-panel.tsx  # Responsive panel (Sheet on mobile)
│   └── index.ts
├── bulk-actions-bar.tsx          # Single file, no folder needed
├── breadcrumbs.tsx               # Auto-generated from route config
└── skeletons/
    ├── table-skeleton.tsx
    ├── detail-skeleton.tsx
    ├── form-skeleton.tsx
    └── dashboard-skeleton.tsx

# Patterns documented in docs/ui-patterns.md instead of components:
# - DetailSheet pattern (Sheet + consistent header)
# - BottomSheet pattern (Drawer + snap points)
# - BackButton pattern (Link + parent route mapping)
# - ViewSwitcher pattern (ToggleGroup + localStorage)
```

### Key Technical Decisions

#### 1. RouteShell Variants

```typescript
// src/components/layout/route-shell/route-shell.tsx
type RouteShellVariant =
  | 'full-width'   // List views - no max-width
  | 'container'    // Detail views - max-w-7xl centered
  | 'narrow'       // Settings/forms - max-w-3xl centered
  | 'with-panel';  // Master-detail with right sidebar

interface RouteShellProps {
  variant?: RouteShellVariant;
  children: React.ReactNode;
}
```

#### 2. Context Panel Responsive Behavior

```typescript
// Desktop: visible as right sidebar
// Tablet/Mobile: collapses to BottomSheet, triggered by selection

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Hook for responsive behavior
function useContextPanel() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isOpen, setIsOpen] = useState(false);

  return {
    isMobile,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    // Returns BottomSheet on mobile, inline panel on desktop
    PanelComponent: isMobile ? BottomSheet : InlinePanel,
  };
}
```

### Research Insights: Critical CLS Fix

**Performance Oracle Finding (CRITICAL):**

The existing `useIsMobile` hook at `src/hooks/_shared/use-mobile.ts` returns `undefined` during SSR, causing hydration mismatch and layout shift.

**Problem:**
```typescript
// CURRENT (causes CLS)
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  // ... returns undefined on first render, then switches
}
```

**Fix Required:**
```typescript
// FIXED (deterministic SSR)
export function useIsMobile() {
  // Initialize to desktop (most common) - deterministic for SSR
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    // ... event listener
  }, []);

  return isMobile;
}
```

**Why This Matters:**
- SSR renders desktop layout
- Client hydrates with desktop assumption
- After hydration, effect runs and may switch to mobile
- No flash/reflow because initial render matches

**Additional CLS Mitigations:**
```css
/* Prevent sidebar animation from causing CLS */
.sidebar-container {
  contain: layout style;
  will-change: width;
}

/* Reserve space for context panel */
.route-shell-with-panel {
  --panel-width: 24rem;
  grid-template-columns: 1fr var(--panel-width);
}
```

#### 3. Back Button Parent Mapping

```typescript
// src/lib/routing/parent-routes.ts
// Explicit parent mapping for predictable navigation

const PARENT_ROUTES: Record<string, string> = {
  '/customers/$customerId': '/customers',
  '/customers/$customerId/edit': '/customers/$customerId',
  '/orders/$orderId': '/orders',
  '/pipeline/$opportunityId': '/pipeline',
  // ... all detail routes
};

function getParentRoute(currentPath: string): string {
  // Match against patterns, resolve params
  // Fallback: remove last segment
}
```

#### 4. Route Error Boundary

### Research Insights: TanStack Router Native Error Handling

**Architecture Strategist Finding:**

Instead of building a custom `RouteErrorBoundary` component, use TanStack Router's built-in `errorComponent` pattern. This is simpler and integrates with the router's lifecycle.

```typescript
// src/routes/_authenticated/customers/$customerId.tsx
export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  loader: async ({ params }) => {
    return getCustomer({ data: { id: params.customerId } });
  },
  errorComponent: ({ error }) => (
    <RouteErrorFallback
      error={error}
      parentRoute="/customers"
      onRetry={() => window.location.reload()}
    />
  ),
  pendingComponent: () => <DetailSkeleton sections={['header', 'info', 'timeline']} />,
});
```

**Security Sentinel Findings (CRITICAL):**

Error boundaries must NOT expose stack traces in production:

```typescript
// src/components/layout/route-error-fallback.tsx
interface RouteErrorFallbackProps {
  error: Error;
  parentRoute: string;
  onRetry?: () => void;
}

export function RouteErrorFallback({ error, parentRoute, onRetry }: RouteErrorFallbackProps) {
  // Log to monitoring (Sentry) with full details
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error);
      console.error('[Route Error]', error.message); // Only message, not stack
    } else {
      console.error('[Route Error]', error); // Full error in dev
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      {/* NEVER show error.stack in production */}
      {process.env.NODE_ENV !== 'production' && (
        <pre className="text-xs text-muted-foreground max-w-md overflow-auto">
          {error.message}
        </pre>
      )}
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        )}
        <Button asChild>
          <Link to={parentRoute}>Go Back</Link>
        </Button>
      </div>
    </div>
  );
}
```

#### 5. Design Tokens Integration

```css
/* src/styles.css - extend existing tokens */

@theme inline {
  /* Spacing (4px base) */
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-12: 3rem;    /* 48px */
  --spacing-16: 4rem;    /* 64px */

  /* Route Shell specific */
  --route-shell-header-height: 4rem;
  --route-shell-footer-height: 4rem;
  --route-shell-panel-width: 24rem;
  --route-shell-panel-width-compact: 18rem;

  /* Bulk Actions Bar */
  --bulk-bar-height: 4rem;
  --bulk-bar-bottom-offset: 1rem;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Component Library)

**Goal:** Build and test all standardized components in Storybook before production use.

#### 1.1 Storybook Setup

| Task | File | Description |
|------|------|-------------|
| Install Storybook | `package.json` | `npx storybook@latest init` for Vite/React |
| Configure for TailwindCSS | `.storybook/preview.ts` | Import global styles |
| Add design token docs | `.storybook/docs/` | Document spacing, colors, typography |

#### 1.2 Core Layout Components

| Component | Files | Variants/Props |
|-----------|-------|----------------|
| RouteShell | `src/components/layout/route-shell/*.tsx` | `full-width`, `container`, `narrow`, `with-panel` |
| RouteShell.Header | (compound) | title, actions, breadcrumbs slot |
| RouteShell.Content | (compound) | padding, scrollable |
| RouteShell.ContextPanel | (compound) | `default`, `compact`, responsive collapse |
| RouteShell.Footer | (compound) | sticky positioning |

```tsx
// Example usage - target API
<RouteShell variant="with-panel">
  <RouteShell.Header
    title="Customers"
    actions={<Button>Add Customer</Button>}
  />
  <RouteShell.Content>
    <CustomerTable />
  </RouteShell.Content>
  <RouteShell.ContextPanel>
    <CustomerPreview customer={selected} />
  </RouteShell.ContextPanel>
</RouteShell>
```

#### 1.3 Overlay Components

| Component | Files | Variants/Props |
|-----------|-------|----------------|
| DetailSheet | `src/components/layout/detail-sheet/*.tsx` | `default`, `wide`, `full`; loading slot |
| BottomSheet | `src/components/layout/bottom-sheet/*.tsx` | swipe-to-dismiss, snap points |
| ActionDialog | `src/components/ui/action-dialog.tsx` | `sm`, `md`, `lg`; form-aware |
| ConfirmationDialog | `src/components/ui/confirmation-dialog.tsx` | `warning`, `danger`; checkbox option |

#### 1.4 Feedback Components

| Component | Files | Variants/Props |
|-----------|-------|----------------|
| RouteErrorBoundary | `src/components/layout/route-error-boundary/*.tsx` | fallback, onError |
| TableSkeleton | `src/components/layout/skeletons/table-skeleton.tsx` | columns, rows |
| DetailSkeleton | `src/components/layout/skeletons/detail-skeleton.tsx` | sections |
| FormSkeleton | `src/components/layout/skeletons/form-skeleton.tsx` | fields |
| DashboardSkeleton | `src/components/layout/skeletons/dashboard-skeleton.tsx` | widgets |

#### 1.5 Navigation Components

| Component | Files | Description |
|-----------|-------|-------------|
| BackButton | `src/components/layout/back-button/*.tsx` | Uses parent route mapping |
| ViewSwitcher | `src/components/layout/view-switcher/*.tsx` | Shared toggle for views |
| BulkActionsBar | `src/components/layout/bulk-actions-bar/*.tsx` | Floating selection bar |

#### 1.6 Design Tokens

| Task | File | Description |
|------|------|-------------|
| Define spacing scale | `src/styles.css` | 4px base, semantic names |
| Define route-specific tokens | `src/styles.css` | Panel widths, header heights |
| Add transition tokens | `src/styles.css` | fast/base/slow with spring easing |
| Verify dark mode | `src/styles.css` | All surface colors have dark variants |

### Research Insights: Performance Best Practices

**Vercel React Best Practices (57 rules applied):**

1. **Dynamic imports for overlays** - Modals, sheets, dialogs should lazy-load:
```typescript
// ✅ Dynamic import for overlay content
const CustomerEditForm = lazy(() => import('./customer-edit-form'));

function CustomerSheet({ open, customerId }: Props) {
  return (
    <Sheet open={open}>
      <SheetContent>
        <Suspense fallback={<FormSkeleton fields={6} />}>
          <CustomerEditForm customerId={customerId} />
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}
```

2. **Memoize compound component children** to prevent re-renders:
```typescript
// src/components/layout/route-shell/route-shell.tsx
const RouteShellContext = createContext<RouteShellContextValue | null>(null);

export const RouteShell = memo(function RouteShell({ variant, children }: RouteShellProps) {
  const contextValue = useMemo(() => ({ variant }), [variant]);

  return (
    <RouteShellContext.Provider value={contextValue}>
      <PageLayout variant={variant}>{children}</PageLayout>
    </RouteShellContext.Provider>
  );
});
```

3. **Direct icon imports** to reduce bundle size:
```typescript
// ✅ CORRECT - Tree-shakeable
import { ChevronLeft } from 'lucide-react';

// ❌ WRONG - Imports entire icon library
import * as Icons from 'lucide-react';
```

4. **Avoid inline objects in JSX**:
```typescript
// ❌ Creates new object every render
<RouteShell.Header actions={{ primary: <Button />, secondary: null }} />

// ✅ Stable reference with useMemo
const headerActions = useMemo(() => ({ primary: <Button />, secondary: null }), []);
<RouteShell.Header actions={headerActions} />
```

**Framework Docs Researcher - Storybook + TailwindCSS v4:**

```typescript
// .storybook/preview.ts - TailwindCSS v4 setup
import '../src/styles.css'; // Imports @theme block

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'hsl(var(--background))' },
        { name: 'dark', value: 'hsl(var(--background))' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="font-sans antialiased">
        <Story />
      </div>
    ),
  ],
};
```

**Phase 1 Deliverables (Revised):**
- [ ] Storybook running at `localhost:6006`
- [ ] RouteShell compound component with 4 variants
- [ ] BulkActionsBar component
- [ ] Breadcrumbs component (auto-generated)
- [ ] 4 skeleton components (table, detail, form, dashboard)
- [ ] Design token documentation
- [ ] Component API documentation

---

### Phase 2: Infrastructure

**Goal:** Set up supporting infrastructure for consistent route behavior.

#### 2.1 Routing Infrastructure

| Task | File | Description |
|------|------|-------------|
| Parent route mapping | `src/lib/routing/parent-routes.ts` | Explicit parent for all routes |
| Route metadata enhancement | `src/lib/routing/routes.ts` | Add skeleton type, layout variant |
| Navigation guards | `src/lib/routing/guards.ts` | Unsaved changes warning |

```typescript
// src/lib/routing/routes.ts - enhanced metadata
interface RouteMetadata {
  title: string;
  icon: LucideIcon;
  description?: string;
  breadcrumb?: string;
  requiredPermission?: string;
  showInNav?: boolean;
  navOrder?: number;
  // NEW: standardization fields
  layoutVariant: 'full-width' | 'container' | 'narrow' | 'with-panel';
  skeletonType: 'table' | 'detail' | 'form' | 'dashboard';
  parentRoute?: string;
}
```

#### 2.2 Error Handling Infrastructure

| Task | File | Description |
|------|------|-------------|
| Error monitoring setup | `src/lib/monitoring.ts` | Sentry integration (optional) |
| HTTP error handlers | `src/lib/error-handling.ts` | 401→login, 403→denied, 500→error |
| Error boundary registry | `src/components/layout/route-error-boundary/` | Domain-specific fallbacks |

#### 2.3 State Management

| Task | File | Description |
|------|------|-------------|
| View preference store | `src/store/view-preferences.ts` | Zustand store for view mode per domain |
| Selection state hook | `src/hooks/_shared/use-selection.ts` | Unified selection with persistence |
| Unsaved changes hook | `src/hooks/_shared/use-unsaved-changes.ts` | Form dirty detection |

```typescript
// src/store/view-preferences.ts
interface ViewPreferencesState {
  views: Record<string, 'table' | 'kanban' | 'cards' | 'calendar' | 'timeline'>;
  setView: (domain: string, view: string) => void;
}

// Persisted to localStorage, synced with URL param
```

**Phase 2 Deliverables:**
- [ ] Parent route mapping for all routes
- [ ] Error monitoring configured (Sentry or equivalent)
- [ ] View preferences Zustand store
- [ ] Selection state hook with persistence
- [ ] Unsaved changes detection hook

---

### Phase 3: Domain Migration

**Goal:** Migrate all 8 domains to standardized patterns, prioritized by violation count.

#### Migration Checklist (Per Domain)

For each domain, complete these tasks:

**Audit:**
- [ ] Count inline query keys (`grep -rn "queryKey: \['" src/routes/_authenticated/{domain}`)
- [ ] Count direct useQuery/useMutation (`grep -rn "useQuery({" src/routes/_authenticated/{domain}`)
- [ ] Identify `window.location.href` usage
- [ ] Identify missing error boundaries
- [ ] Document current layout variants used

**Refactor:**
- [ ] Replace all routes with RouteShell
- [ ] Add RouteErrorBoundary to each route
- [ ] Replace loading states with domain skeletons
- [ ] Fix navigation anti-patterns (window.location → navigate)
- [ ] Migrate inline query keys to centralized queryKeys
- [ ] Add unsaved changes warnings to forms
- [ ] Implement consistent empty states

**Validate:**
- [ ] Lighthouse CLS score < 0.1
- [ ] All routes render correct skeleton during load
- [ ] Error boundary catches and displays errors
- [ ] Back button navigates to correct parent
- [ ] Mobile responsive (panel → bottom sheet)

#### 3.1 Inventory Domain (Priority 1)

**Current Issues:** ~30 violations, `useState+useEffect` for data fetching, inconsistent layouts

| Route | Current | Target | Migration Tasks |
|-------|---------|--------|-----------------|
| `/inventory` | `full-width` | `full-width` | Add error boundary, fix data fetching |
| `/inventory/$itemId` | `container` | `with-panel` | Add context panel, skeleton |
| `/inventory/alerts` | mixed | `full-width` | Standardize layout |
| `/inventory/counts` | mixed | `full-width` | Fix data fetching |
| `/inventory/locations` | mixed | `full-width` | Standardize |
| `/inventory/analytics` | mixed | `full-width` | Dashboard skeleton |
| `/inventory/forecasting` | mixed | `container` | Fix data fetching |
| `/inventory/receiving` | mixed | `full-width` | Standardize |

**Files to modify:**
- `src/routes/_authenticated/inventory/index.tsx`
- `src/routes/_authenticated/inventory/$itemId.tsx`
- `src/routes/_authenticated/inventory/alerts.tsx`
- `src/routes/_authenticated/inventory/counts.tsx`
- `src/routes/_authenticated/inventory/locations.tsx`
- `src/routes/_authenticated/inventory/analytics.tsx`
- `src/routes/_authenticated/inventory/forecasting.tsx`
- `src/routes/_authenticated/inventory/receiving.tsx`

#### 3.2 Communications Domain (Priority 2)

**Current Issues:** ~30 violations, complex hub pattern, template editor

| Route | Target Layout | Notes |
|-------|---------------|-------|
| `/communications` | `full-width` | Hub with tabs |
| `/communications/campaigns` | `full-width` | List view |
| `/communications/campaigns/$id` | `with-panel` | Detail + preview panel |
| `/communications/templates` | `full-width` | List view |
| `/communications/signatures` | `narrow` | Settings-like |
| `/communications/scheduled` | `full-width` | List view |

#### 3.3 Financial Domain (Priority 3)

**Current Issues:** ~25 violations, critical business data

| Route | Target Layout | Notes |
|-------|---------------|-------|
| `/financial` | `full-width` | Dashboard |
| `/financial/invoices` | `full-width` | List |
| `/financial/invoices/$id` | `container` | Detail with precision formatting |
| `/financial/payments` | `full-width` | List |
| `/financial/reports` | `full-width` | Dashboard |

#### 3.4 Pipeline Domain (Priority 4)

**Current Issues:** ~15 violations, Kanban + detail views

| Route | Target Layout | Notes |
|-------|---------------|-------|
| `/pipeline` | `full-width` | Kanban with view switcher |
| `/pipeline/$opportunityId` | `with-panel` | Detail + activity timeline |

#### 3.5 Customers Domain (Priority 5)

**Current Issues:** ~10 violations, `window.location.href` anti-pattern

| Route | Target Layout | Notes |
|-------|---------------|-------|
| `/customers` | `full-width` | List with 360-view panel |
| `/customers/$customerId` | `with-panel` | Detail + timeline |

**Critical fix:** Replace `window.location.href` with `navigate()`

#### 3.6 Orders Domain (Priority 6)

**Current Issues:** ~10 violations, default layout variant

| Route | Target Layout | Notes |
|-------|---------------|-------|
| `/orders` | `full-width` | List |
| `/orders/$orderId` | `with-panel` | Detail + line items |

#### 3.7 Products Domain (Priority 7)

**Current Issues:** ~8 violations, mostly compliant

| Route | Target Layout | Notes |
|-------|---------------|-------|
| `/products` | `full-width` | Good baseline |
| `/products/$productId` | `container` | Detail |

#### 3.8 Jobs Domain (Priority 8)

**Current Issues:** ~5 violations, already has good patterns

| Route | Target Layout | Notes |
|-------|---------------|-------|
| `/jobs` | `full-width` | Preserve error boundary, profiling |
| `/jobs/$jobId` | `with-panel` | Detail + timeline |
| `/jobs/kanban` | `full-width` | Preserve performance patterns |

**Note:** Jobs has the best patterns - use as reference, minimal changes needed.

**Phase 3 Deliverables:**
- [ ] All 8 domains migrated
- [ ] Zero `window.location.href` calls
- [ ] Zero inline query keys in routes
- [ ] All routes have error boundaries
- [ ] All routes use RouteShell

---

### Phase 4: Polish & Documentation

**Goal:** Finalize documentation, validate quality, and establish maintenance patterns.

#### 4.1 Documentation

| Task | File | Description |
|------|------|-------------|
| UI Patterns Guide | `docs/ui-patterns.md` | Decision trees, component selection guide |
| Route Template | `docs/templates/route-template.tsx` | Copy-paste starter for new routes |
| Storybook deployment | CI/CD | Deploy Storybook to static host |
| CLAUDE.md update | `CLAUDE.md` | Add RouteShell requirements |

#### 4.2 Quality Validation

| Task | Description |
|------|-------------|
| Lighthouse audit | Run on all routes, verify CLS < 0.1 |
| Accessibility audit | Verify focus management, keyboard nav, screen reader |
| Mobile testing | Test all routes on iOS Safari, Android Chrome |
| Cross-browser testing | Chrome, Firefox, Safari, Edge |

### Research Insights: Accessibility Requirements

**Web Design Guidelines (Vercel) - Focus Management:**

```typescript
// Sheets MUST trap focus when open
function DetailSheet({ open, onOpenChange, children }: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        // Focus trapping is handled by Radix Sheet
        onOpenAutoFocus={(e) => {
          // Focus first interactive element or close button
          const firstFocusable = e.currentTarget.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }}
        onCloseAutoFocus={(e) => {
          // Return focus to trigger element
          e.preventDefault();
        }}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
```

**ARIA Requirements for Bulk Actions:**

```tsx
// BulkActionsBar must announce to screen readers
function BulkActionsBar({ selectedCount, actions, onClear }: BulkActionsBarProps) {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={`${selectedCount} items selected`}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 ..."
    >
      <span className="sr-only">
        {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
      </span>
      {/* visible content */}
    </div>
  );
}
```

**Keyboard Navigation Checklist:**
- [ ] All interactive elements reachable via Tab
- [ ] Escape closes any open overlay (handled by Radix)
- [ ] Enter/Space activates buttons and links
- [ ] Arrow keys navigate within composite widgets (DataTable rows)
- [ ] Focus visible indicator meets 3:1 contrast ratio

#### 4.3 Maintenance Patterns

| Task | File | Description |
|------|------|-------------|
| ESLint rule | `eslint.config.js` | Block `window.location.href` in routes |
| ESLint rule | `eslint.config.js` | Block direct useQuery/useMutation in routes |
| CI check | `.github/workflows/` | Run pattern detection on PR |
| Route generator | `scripts/generate-route.ts` | CLI to scaffold new routes |

**Phase 4 Deliverables:**
- [ ] `docs/ui-patterns.md` complete
- [ ] Route template available
- [ ] Storybook deployed
- [ ] ESLint rules active
- [ ] Lighthouse CLS < 0.1 on all routes

---

## Alternative Approaches Considered

### 1. Golden Route Pattern
**Description:** Fully standardize one domain as template, extract components as you go.
**Why rejected:** Higher risk of rework; extracted components may not generalize well.

### 2. Parallel Standardization
**Description:** Minimal spec + parallel domain migrations.
**Why rejected:** Risk of divergent interpretations; harder to coordinate.

### 3. Wrapper-Based Migration
**Description:** Create RouteWrapper that wraps existing routes without refactoring.
**Why rejected:** Adds complexity; doesn't fix underlying issues; tech debt accumulates.

---

## Acceptance Criteria

### Functional Requirements

- [ ] All list routes use `full-width` variant with DataTable
- [ ] All detail routes use `container` or `with-panel` variant
- [ ] Quick edits open in DetailSheet overlay
- [ ] Deep work opens as full page route
- [ ] Context panels collapse to BottomSheet on mobile
- [ ] Bulk selection shows floating BulkActionsBar
- [ ] Back button navigates to explicit parent route
- [ ] Breadcrumbs show entity names, not IDs

### Non-Functional Requirements

- [ ] Lighthouse CLS < 0.1 on all routes
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] All components have Storybook stories
- [ ] All components have TypeScript types
- [ ] 90%+ of routes covered by error boundaries

### Quality Gates

- [ ] Zero `window.location.href` calls (enforced by ESLint)
- [ ] Zero inline query keys in routes (enforced by ESLint)
- [ ] Zero `useState+useEffect` for data fetching in routes
- [ ] All new routes use RouteShell (enforced by template)
- [ ] All PRs pass CI pattern checks

---

## Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Inline query key violations | 181 | 0 | `grep -rn "queryKey: \['" src/routes/` |
| Navigation anti-patterns | Unknown | 0 | `grep -rn "window.location" src/routes/` |
| Routes with error boundaries | 1 (Jobs) | All | Manual audit |
| Lighthouse CLS (average) | Unknown | < 0.1 | Lighthouse CI |
| Time to scaffold new route | Unknown | < 5 min | Developer survey |
| Storybook component coverage | 0% | 100% | Storybook audit |

---

## Dependencies & Prerequisites

### Technical Dependencies

| Dependency | Required For | Status |
|------------|--------------|--------|
| Storybook | Component development | Not installed |
| vaul (drawer) | BottomSheet component | Installed |
| cmdk | Command palette | Not installed |
| Sentry | Error monitoring | Not configured |

### Team Dependencies

| Dependency | Description |
|------------|-------------|
| Design review | Validate component designs match product vision |
| QA testing | Mobile testing on real devices |
| Documentation review | Ensure ui-patterns.md is clear |

### Blockers

| Blocker | Mitigation |
|---------|------------|
| Design token values not finalized | Use existing shadcn tokens as baseline |
| No Storybook setup | Part of Phase 1 |
| Sentry not configured | Make monitoring optional with env var |

---

## Risk Analysis & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Regression in migrated routes | Medium | High | Comprehensive Storybook stories; visual regression testing |
| Mobile experience breaks | Medium | High | Test on real devices before merging each domain |
| Performance degradation | Low | Medium | Lighthouse CI checks; profiling in Jobs domain preserved |
| Developer adoption | Low | Medium | Clear documentation; route generator; ESLint enforcement |
| Scope creep | Medium | Medium | Stick to defined components; defer enhancements |
| Breaking changes to PageLayout | Low | High | Evolve PageLayout into RouteShell; don't delete |

---

## Resource Requirements

### Phase 1 (Foundation)
- 15 components to build
- Storybook setup
- Design token documentation

### Phase 2 (Infrastructure)
- Routing infrastructure
- State management
- Error handling

### Phase 3 (Migration)
- 8 domains to migrate
- ~40 route files to update
- Testing per domain

### Phase 4 (Polish)
- Documentation
- CI/CD updates
- ESLint rules

---

## Future Considerations

### Not In Scope (Deferred)

- [ ] Command palette implementation (Cmd+K) - separate initiative
- [ ] Advanced keyboard shortcuts beyond essentials
- [ ] Drag-and-drop reordering in lists
- [ ] Offline support / PWA
- [ ] Real-time collaborative editing

### Extensibility Points

- RouteShell supports custom variants via CSS variables
- BottomSheet snap points are configurable
- Error boundary fallbacks are pluggable
- View switcher accepts custom view definitions

---

## Documentation Plan

| Document | Location | Audience |
|----------|----------|----------|
| UI Patterns Guide | `docs/ui-patterns.md` | Developers |
| Component API Reference | Storybook | Developers |
| Route Template | `docs/templates/route-template.tsx` | Developers |
| Migration Checklist | This plan, Phase 3 | Developers |
| Design Tokens | Storybook, `.storybook/docs/` | Developers, Designers |

---

## References & Research

### Internal References

- Brainstorm: `docs/brainstorms/2026-01-24-ui-ux-route-standardization-brainstorm.md`
- Container/Presenter Pattern: `docs/solutions/architecture/container-presenter-standardization.md`
- Hook Architecture Rules: `.claude/rules/hook-architecture.md`
- Existing PageLayout: `src/components/layout/page-layout.tsx`
- Existing LoadingState: `src/components/shared/loading-state.tsx`
- Query Keys: `src/lib/query-keys.ts`
- Route Metadata: `src/lib/routing/routes.ts`

### External References

- TanStack Router Docs: https://tanstack.com/router
- TanStack Router Error Handling: https://tanstack.com/router/latest/docs/framework/react/guide/error-handling
- Radix UI Primitives: https://www.radix-ui.com/primitives
- vaul (Drawer): https://vaul.emilkowal.ski/
- Storybook for Vite: https://storybook.js.org/docs/get-started/frameworks/react-vite
- TailwindCSS v4 Beta: https://tailwindcss.com/docs/v4-beta
- Web Interface Guidelines: https://github.com/vercel-labs/web-interface-guidelines
- React Compound Component Pattern: https://www.smashingmagazine.com/2021/08/compound-component-react/

### Related Work

- Communications Container/Presenter Plan: `docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md`

---

## Appendix: Component Specifications

### RouteShell Props

```typescript
interface RouteShellProps {
  variant?: 'full-width' | 'container' | 'narrow' | 'with-panel';
  className?: string;
  children: React.ReactNode;
}

interface RouteShellHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[]; // Auto-generated if not provided
}

interface RouteShellContentProps {
  className?: string;
  children: React.ReactNode;
}

interface RouteShellContextPanelProps {
  variant?: 'default' | 'compact';
  isOpen?: boolean; // For mobile control
  onClose?: () => void;
  children: React.ReactNode;
}

interface RouteShellFooterProps {
  className?: string;
  children: React.ReactNode;
}
```

### DetailSheet Props

```typescript
interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: 'default' | 'wide' | 'full';
  children: React.ReactNode;
}

interface DetailSheetHeaderProps {
  title: string;
  description?: string;
  onClose?: () => void;
}

interface DetailSheetContentProps {
  loading?: boolean;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}

interface DetailSheetFooterProps {
  children: React.ReactNode;
}
```

### BulkActionsBar Props

```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
}

interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}
```

### Research Insights: Bulk Operations Security

**Security Sentinel Finding (CRITICAL):**

Bulk operations must perform **server-side per-item authorization**. Never trust that the client-side selection only contains items the user can access.

```typescript
// ❌ WRONG - Trusts client selection
export const bulkDeleteCustomers = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ ids: z.array(z.string().uuid()) }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete });
    // WRONG: Deletes all IDs without checking ownership
    await db.delete(customers).where(inArray(customers.id, data.ids));
  });

// ✅ CORRECT - Per-item authorization
export const bulkDeleteCustomers = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ ids: z.array(z.string().uuid()) }))
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.delete });

    // Filter to only items this user's org can access
    const authorizedIds = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          inArray(customers.id, data.ids),
          eq(customers.organizationId, ctx.organizationId), // Tenant isolation
          sql`${customers.deletedAt} IS NULL`
        )
      );

    if (authorizedIds.length === 0) {
      throw new Error('No authorized items to delete');
    }

    // Only delete authorized items
    await db.delete(customers).where(
      inArray(customers.id, authorizedIds.map(r => r.id))
    );

    return { deleted: authorizedIds.length, requested: data.ids.length };
  });
```

**Client-Side Selection Optimization:**

Use `Set` instead of array for O(1) selection operations:

```typescript
// src/hooks/_shared/use-selection.ts
export function useSelection<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  return {
    selected,
    selectedArray: useMemo(() => Array.from(selected), [selected]),
    count: selected.size,
    isSelected: useCallback((id: T) => selected.has(id), [selected]),
    toggle: useCallback((id: T) => {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []),
    selectAll: useCallback((ids: T[]) => setSelected(new Set(ids)), []),
    clear: useCallback(() => setSelected(new Set()), []),
  };
}
```

### RouteErrorBoundary Props

```typescript
interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  parentRoute?: string;
}
```
