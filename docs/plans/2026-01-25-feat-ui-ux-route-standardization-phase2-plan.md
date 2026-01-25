---
title: "feat: UI/UX Route Standardization - Phase 2"
type: feat
date: 2026-01-25
parent_plan: docs/plans/2026-01-24-feat-ui-ux-route-standardization-plan.md
brainstorm: docs/brainstorms/2026-01-24-ui-ux-route-standardization-brainstorm.md
---

# UI/UX Route Standardization - Phase 2: Breadcrumbs, RouteShell & Polish

## Overview

Continuation of the UI/UX route standardization initiative. Phase 1 (error boundaries + skeletons) is complete across all 102 routes. This phase focuses on the remaining foundation work: integrating Breadcrumbs, creating RouteShell, building BulkActionsBar, and documenting patterns.

**Completed (Phase 1):**
- ✅ `RouteErrorFallback` component - used in all 102 routes
- ✅ `pendingComponent` with domain-specific skeletons - all routes
- ✅ Skeletons for all domains (Admin, Inventory, Mobile, etc.)

**Remaining (This Phase):**
- Breadcrumbs integration into PageLayout.Header
- RouteShell compound component (wraps PageLayout)
- BulkActionsBar floating selection component
- Mobile-responsive sidebar behavior
- UI patterns documentation

---

## Problem Statement

Currently:
1. **Breadcrumbs exist but aren't used** - The `Breadcrumbs` component exists but 0 routes import it
2. **No standard route wrapper** - Routes use `PageLayout` directly with varying patterns
3. **No bulk selection UI** - DataTables allow selection but no floating action bar
4. **PageLayout.Sidebar doesn't collapse on mobile** - Fixed position that gets hidden

---

## Implementation Phases

### Phase 2.1: Breadcrumbs Integration

**Goal:** Integrate breadcrumbs into PageLayout.Header by default.

#### Tasks

- [x] **2.1.1** Update `PageLayout.Header` to optionally render breadcrumbs above title
- [x] **2.1.2** Add `showBreadcrumbs?: boolean` prop (default: `true`)
- [x] **2.1.3** Verify `getBreadcrumbLabel` works for all route patterns
- [x] **2.1.4** Add mobile collapse behavior (ellipsis for long paths)

**Files to modify:**
- `src/components/layout/page-layout.tsx`
- `src/components/layout/breadcrumbs.tsx`

**Target API:**
```tsx
<PageLayout>
  <PageLayout.Header
    title="Customer Details"
    showBreadcrumbs={true}  // default
    description="View and edit customer information"
    actions={<Button>Edit</Button>}
  />
</PageLayout>
```

**Acceptance Criteria:**
- [x] Breadcrumbs render above title in PageLayout.Header
- [x] Breadcrumbs collapse on mobile (show "..." for middle segments)
- [x] Works for all route depths (1-5 segments)
- [x] No regressions to existing PageLayout usage

---

### Phase 2.2: RouteShell Wrapper

**Goal:** Create thin wrapper around PageLayout that enforces consistency.

The plan specified RouteShell as a thin wrapper that:
1. Wraps PageLayout with standard structure
2. Provides consistent error handling integration
3. Adds route-level context for child components

**Decision:** After review, `PageLayout` already provides the compound pattern we need. Instead of creating a new `RouteShell`, we'll enhance `PageLayout`:

#### Tasks

- [x] **2.2.1** Add `RouteShell` as an alias export for `PageLayout` (for future migration)
- [x] **2.2.2** Update `PageLayout.Sidebar` for responsive behavior
- [x] **2.2.3** Add `useRouteShell` context hook for accessing layout state

**Files to create/modify:**
- `src/components/layout/route-shell.tsx` (new - re-exports PageLayout with enhancements)
- `src/components/layout/page-layout.tsx` (add responsive sidebar)
- `src/components/layout/index.ts` (add RouteShell export)

**Target API:**
```tsx
// RouteShell is PageLayout with route-aware defaults
import { RouteShell } from '@/components/layout';

<RouteShell variant="with-panel">
  <RouteShell.Header title="Customers" />
  <RouteShell.Content>
    <CustomerTable />
  </RouteShell.Content>
  <RouteShell.ContextPanel>
    <CustomerPreview />
  </RouteShell.ContextPanel>
</RouteShell>
```

**Acceptance Criteria:**
- [x] `RouteShell` exported from layout index
- [x] `ContextPanel` collapses to BottomSheet on mobile
- [x] No breaking changes to existing `PageLayout` usage
- [x] Types exported for both `RouteShell` and `PageLayout`

---

### Phase 2.3: BulkActionsBar Component

**Goal:** Create floating bottom bar for bulk selection actions.

#### Tasks

- [x] **2.3.1** Create `BulkActionsBar` component
- [x] **2.3.2** Add animations (slide up on mount, spring easing)
- [x] **2.3.3** Add accessibility (aria-live, keyboard support)
- [x] **2.3.4** Create `useSelection` hook for managing selection state

**Files to create:**
- `src/components/layout/bulk-actions-bar.tsx`
- `src/hooks/_shared/use-selection.ts`

**Component API:**
```tsx
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

// Usage
<BulkActionsBar
  selectedCount={selectedIds.length}
  onClear={() => setSelectedIds([])}
  actions={[
    { label: 'Delete', icon: Trash2, onClick: handleBulkDelete, variant: 'destructive' },
    { label: 'Export', icon: Download, onClick: handleExport },
  ]}
/>
```

**useSelection Hook API:**
```tsx
const {
  selected,          // Set<string>
  selectedArray,     // string[]
  count,            // number
  isSelected,       // (id: string) => boolean
  toggle,           // (id: string) => void
  selectAll,        // (ids: string[]) => void
  clear,            // () => void
} = useSelection<string>();
```

**Acceptance Criteria:**
- [x] Bar appears fixed at bottom when 1+ items selected
- [x] Slide-up animation on mount
- [x] Screen reader announces selection count
- [x] Keyboard accessible (Tab to navigate, Enter/Space to activate)
- [x] Clear button deselects all
- [x] Works with all DataTable instances

---

### Phase 2.4: ContextPanel Responsive Behavior

**Goal:** Make `PageLayout.Sidebar` (ContextPanel) collapse to BottomSheet on mobile.

#### Tasks

- [x] **2.4.1** Update `PageLayout.Sidebar` to use vaul Drawer on mobile
- [x] **2.4.2** Add `useContextPanel` hook for controlling open state
- [x] **2.4.3** Add swipe-to-dismiss on mobile (built into vaul Drawer)
- [x] **2.4.4** ~~Update existing routes that use `with-sidebar` variant~~ N/A - no routes currently use this pattern. See "Future Work" section for candidates.

**Files to modify:**
- `src/components/layout/page-layout.tsx`
- `src/hooks/_shared/use-context-panel.ts` (new)

**Responsive Behavior:**
```
Desktop (≥1024px): Sidebar visible as right panel (current behavior)
Tablet (768-1023px): Sidebar hidden, triggered by button
Mobile (<768px): Drawer from bottom with snap points
```

**Acceptance Criteria:**
- [x] Desktop: Current behavior unchanged
- [x] Mobile: Opens as vaul Drawer with snap points
- [x] Swipe-to-dismiss works on mobile (built into vaul)
- [x] Focus trapped when open (built into vaul)
- [x] ESC closes on all breakpoints (built into vaul)

---

### Phase 2.5: Documentation & Patterns

**Goal:** Document UI patterns for developer reference.

#### Tasks

- [x] **2.5.1** Create `docs/ui-patterns.md` with decision trees
- [x] **2.5.2** Add code examples for each pattern
- [x] **2.5.3** Update `CLAUDE.md` with RouteShell requirements
- [x] **2.5.4** Create route template file

**Files to create:**
- `docs/ui-patterns.md`
- `docs/templates/route-template.tsx`

**Documentation Sections:**
1. Layout Variants - when to use each
2. Detail View Pattern - Sheet vs Full Page decision tree
3. List View Pattern - DataTable, view switcher, bulk actions
4. Loading States - skeleton selection guide
5. Error Handling - errorComponent usage
6. Navigation - breadcrumbs, back buttons, parent routes

**Acceptance Criteria:**
- [x] `docs/ui-patterns.md` covers all layout decisions
- [x] Route template is copy-paste ready
- [x] CLAUDE.md references the patterns doc
- [x] Examples are runnable code

---

## Priority Order

Execute in this order for incremental value:

| Phase | Priority | Reason |
|-------|----------|--------|
| 2.1 Breadcrumbs Integration | 1 | Immediate UX improvement, low risk |
| 2.3 BulkActionsBar | 2 | New capability, independent of other work |
| 2.2 RouteShell Wrapper | 3 | Foundation for future migrations |
| 2.4 ContextPanel Responsive | 4 | Depends on RouteShell patterns |
| 2.5 Documentation | 5 | Captures decisions after implementation |

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Routes with breadcrumbs | 0 | 102 (automatic via PageLayout.Header) |
| Routes with bulk selection UI | 0 | All list routes (infrastructure ready) |
| Mobile-responsive sidebars | 0 | Infrastructure complete, 0 routes converted yet |
| Documentation coverage | Minimal | Complete patterns guide |

---

## Future Work: Route Conversions to `with-sidebar`

Based on UX evaluation (2026-01-25), these routes are candidates for conversion to the `with-sidebar` pattern:

### High Priority

**`pipeline/$opportunityId.tsx`** - Opportunity Detail
- **Current:** Tabbed interface (Overview | Quote | Activities | Versions)
- **Problem:** Activity is hidden in a tab. When editing a quote, you lose context of recent conversations.
- **Proposed:** Move activity out of tabs into persistent sidebar
- **Effort:** Low - just move activity tab content to sidebar
- **Benefit:** High - see recent calls/emails while working on quote

### Medium Priority

**`customers/$customerId.tsx`** - Customer Detail (Customer360View)
- **Current:** Grid layout with activity timeline taking 2/3 of bottom section
- **Problem:** Activity competes with main content; scrolling loses activity context
- **Proposed:** Move ActivityTimeline to sidebar, restructure grid for main content
- **Effort:** Medium - requires restructuring Customer360View component
- **Benefit:** Medium - persistent activity context while viewing customer details

### Not Recommended

Routes using tabs for intentional context-switching (user explicitly chooses one view at a time) are fine as-is. The sidebar pattern is for "always visible context" not "one of many views."

---

## References

- Original Plan: `docs/plans/2026-01-24-feat-ui-ux-route-standardization-plan.md`
- Brainstorm: `docs/brainstorms/2026-01-24-ui-ux-route-standardization-brainstorm.md`
- Existing Components:
  - `src/components/layout/page-layout.tsx`
  - `src/components/layout/breadcrumbs.tsx`
  - `src/components/layout/route-error-fallback.tsx`
- vaul (Drawer): https://vaul.emilkowal.ski/

---

## Appendix: File Manifest

### Files to Create
- `src/components/layout/bulk-actions-bar.tsx`
- `src/components/layout/route-shell.tsx`
- `src/hooks/_shared/use-selection.ts`
- `src/hooks/_shared/use-context-panel.ts`
- `docs/ui-patterns.md`
- `docs/templates/route-template.tsx`

### Files to Modify
- `src/components/layout/page-layout.tsx`
- `src/components/layout/breadcrumbs.tsx`
- `src/components/layout/index.ts`
- `CLAUDE.md`
