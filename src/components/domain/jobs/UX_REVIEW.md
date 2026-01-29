# Jobs Domain UX Review

> Comprehensive UX audit of SPRINT-03 Jobs Domain components using ui-ux-pro-max standards

## Review Date: 2026-01-29
## Scope: Project-centric jobs model components

---

## Executive Summary

**Overall Grade: B+**

The Jobs Domain components demonstrate solid foundational UX patterns with good use of shadcn/ui, consistent iconography (Lucide), and proper accessibility basics. Key strengths include keyboard navigation support, hover states, and clean visual hierarchy. Areas for improvement include focus state visibility, loading skeletons, and touch target optimization.

---

## Priority 1: Accessibility (CRITICAL)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| `ProjectCard` | Keyboard navigation | `role="button"`, `tabIndex={0}`, `onKeyDown` handlers |
| `ProjectCard` | Focus ring | `focus:ring-2 focus:ring-ring` classes present |
| Dialogs | Form labels | All form fields have proper `<FormLabel>` |
| `ProjectMetaPanel` | Semantic HTML | Proper heading hierarchy, lists |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `project-card.tsx:287` | Avatar alt text | Medium | `alt="Assignee"` is generic; use assignee name when available |
| `project-list.tsx:117,241` | DropdownMenuTrigger missing aria-label | Medium | Icon-only buttons need `aria-label="Actions"` |
| `project-detail-tabs.tsx` | Tab panels lack `role="tabpanel"` | Low | Add ARIA attributes to tab content |
| `bom-dialogs.tsx` | Product search results lack roles | Low | Add `role="listbox"` and `role="option"` |

### 🔧 Quick Fixes

```tsx
// project-list.tsx - Add aria-label to dropdown triggers
<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Project actions">
    <MoreHorizontal className="h-4 w-4" />
  </Button>
</DropdownMenuTrigger>
```

---

## Priority 2: Touch & Interaction (CRITICAL)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| `ProjectCard` | Cursor pointer | `cursor-pointer` class present |
| `ProjectListTable` | Row hover | `cursor-pointer` on table rows |
| All buttons | Loading states | `disabled={isPending}` on submit buttons |
| `workstream-dialogs.tsx` | Form validation | Zod schema with error messages |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `project-card.tsx:200` | Actions div click handler | Medium | Add `cursor-pointer` to actions container or make buttons more distinct |
| `project-list.tsx:164` | SortableHeader | Low | Add `select-none` to prevent text selection on click |
| `ProjectWorkstreamsView` | Drag handle size | Medium | Ensure grip handle is 44x44px minimum |
| `bom-dialogs.tsx` | Product list items | Medium | Add hover feedback for product selection |

### 🔧 Quick Fixes

```tsx
// project-list.tsx - Prevent text selection on sort headers
<TableHead
  className="cursor-pointer hover:bg-muted/50 select-none"
  onClick={() => onSort?.(column)}
>
```

---

## Priority 3: Performance (HIGH)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| `ProjectCard` | Memoization | `useMemo` for address/date formatting |
| `ProjectCard` | SVG optimization | Progress circle uses efficient SVG |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `project-list.tsx` | No virtualization | Medium | Virtualize long lists (20+ items) |
| `ProjectWorkstreamsView` | DnD re-renders | Low | Wrap sortable items in `memo()` |
| `project-detail-tabs.tsx` | All tabs render | Medium | Use lazy loading for tab content |
| `bom-dialogs.tsx` | Debounce timing | Low | 300ms is good; ensure consistent |

### 🔧 Recommendations

```tsx
// Implement tab lazy loading
<TabsContent value="workstreams" forceMount className="data-[state=inactive]:hidden">
  {activeTab === 'workstreams' && <ProjectWorkstreamsTab project={project} />}
</TabsContent>
```

---

## Priority 4: Layout & Responsive (HIGH)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| `ProjectListGrid` | Responsive grid | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| `ProjectMetaPanel` | Fixed width | Consistent 320px width |
| `project-card.tsx` | Truncation | `truncate` class on long text |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `project-card.tsx:266` | Address truncation | Low | `max-w-[150px]` may be too small on mobile |
| `ProjectMetaPanel` | Mobile panel | High | Panel should be full-screen drawer on mobile |
| `ProjectListTable` | Horizontal scroll | Medium | Add `overflow-x-auto` container |
| `time-card.tsx` | Date formatting | Low | Consider relative dates for recent dates |

### 🔧 Quick Fixes

```tsx
// ProjectMetaPanel - Mobile drawer pattern
// Use Sheet component for mobile breakpoint
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <Sheet open={isOpen} onOpenChange={onToggle}>
    <SheetContent side="right" className="w-full sm:w-80">
      <MetaPanelContent project={project} />
    </SheetContent>
  </Sheet>
) : (
  <div className="w-80">...</div>
)}
```

---

## Priority 5: Typography & Color (MEDIUM)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| `backlog-card.tsx` | Color coding | Consistent status colors |
| `time-card.tsx` | Overdue state | Red text for overdue dates |
| All components | Muted text | Proper `text-muted-foreground` usage |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `project-card.tsx:153` | Progress text | Low | 8px font may be too small; use `text-[10px]` minimum |
| `project-meta-panel.tsx` | Section headers | Low | `text-xs` uppercase is good for hierarchy |
| `ProjectCard` board view | Priority badge | Low | Consider contrast in dark mode |

---

## Priority 6: Animation (MEDIUM)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| `ProjectCard` | Transition | `transition-shadow duration-200` |
| `backlog-card.tsx:87` | Progress bar | `transition-all duration-300` |
| `project-meta-panel.tsx` | Hover states | `transition-colors` on interactive elements |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `ProjectMetaPanel` | No reduced-motion | Medium | Wrap Framer Motion in `prefers-reduced-motion` check |
| `ProjectWorkstreamsView` | DnD animation | Low | Ensure smooth 150-300ms transitions |
| Dialogs | Enter/exit | Low | Add consistent dialog animations |

### 🔧 Quick Fixes

```tsx
// Add reduced motion support
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();

<motion.div
  initial={shouldReduceMotion ? false : { x: 100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={shouldReduceMotion ? false : { x: 100, opacity: 0 }}
/>
```

---

## Priority 7: Style Consistency (MEDIUM)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| All | No emojis | ✅ Lucide icons throughout |
| All | Consistent icons | ✅ Single icon library (Lucide) |
| `ProjectCard` | Border radius | Consistent `rounded-xl` |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `backlog-card.tsx:53,61,69` | Background colors | Low | `bg-muted` is good, ensure dark mode visibility |
| `project-meta-panel.tsx:179` | Button size | Low | Use consistent `size="sm"` or `size="icon"` |

---

## Priority 8: Charts & Data (LOW)

### ✅ Good Practices

| Component | Practice | Notes |
|-----------|----------|-------|
| `ProgressCircle` | Circular progress | SVG-based, accessible |
| `backlog-card.tsx` | Stats grid | Clear visual hierarchy |

### ⚠️ Issues Found

| File | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| `ProjectTimelineGantt` | Gantt chart | N/A | Ensure table alternative for screen readers |

---

## Component-Specific Reviews

### ProjectCard

**Score: A-**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Visual Design | A | Clean, good hierarchy |
| Accessibility | B+ | Good keyboard nav; improve alt text |
| Responsiveness | A | Works in both list and board modes |
| Interactions | A | Smooth hover, clear click targets |

**Recommendations:**
1. Add `aria-label` with project title for the card button
2. Consider skeleton state for loading
3. Add `title` tooltip for truncated text

### ProjectMetaPanel

**Score: A-**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Visual Design | A | Clean sections, good separators |
| Accessibility | B | Needs mobile drawer pattern |
| Responsiveness | C | Fixed width problematic on mobile |
| Interactions | A | Good hover states |

**Recommendations:**
1. Implement mobile Sheet drawer
2. Add `aria-expanded` to toggle button
3. Consider collapsible sections for long content

### ProjectWorkstreamsView

**Score: B+**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Visual Design | A | Clean cards, good status badges |
| Accessibility | B | DnD needs keyboard alternatives |
| Responsiveness | B | Drag may conflict with touch scroll |
| Interactions | A | Smooth DnD with dnd-kit |

**Recommendations:**
1. Add keyboard reordering (up/down arrows)
2. Ensure touch-friendly drag handles
3. Add reordering toast confirmation

### Dialogs (Create/Edit)

**Score: B+**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Visual Design | A | Consistent shadcn/ui patterns |
| Accessibility | B | Focus trap works; add loading announcements |
| Responsiveness | B | Good on desktop; check mobile scroll |
| Interactions | B+ | Form validation good; add auto-focus |

**Recommendations:**
1. Auto-focus first field on open
2. Add `aria-live` for error announcements
3. Implement unsaved changes confirmation

---

## Quick Win Checklist

### Immediate (5 min fixes)

- [ ] Add `aria-label` to icon-only buttons
- [ ] Add `select-none` to sortable headers
- [ ] Fix progress circle font size (8px → 10px)
- [ ] Add `title` attributes to truncated text

### Short-term (30 min fixes)

- [ ] Implement mobile drawer for MetaPanel
- [ ] Add `useReducedMotion` support
- [ ] Add loading skeletons for cards
- [ ] Improve avatar alt text

### Medium-term (2 hour fixes)

- [ ] Add keyboard DnD support
- [ ] Virtualize long lists
- [ ] Lazy load tab content
- [ ] Add unsaved changes confirmation

---

## Design System Alignment

### Colors
- ✅ Using theme tokens (`bg-card`, `text-muted-foreground`)
- ✅ Consistent status colors
- ⚠️ Some hardcoded colors in badges (verify dark mode)

### Spacing
- ✅ Consistent 4px scale (4, 8, 12, 16, 24)
- ✅ Section padding consistent

### Typography
- ✅ Using font-medium/semibold hierarchy
- ⚠️ Some small text (8px) - verify minimum 12px

### Shadows
- ✅ Consistent `shadow-sm` and `hover:shadow-md`
- ✅ Border + shadow combo for depth

---

## Conclusion

The Jobs Domain components are well-architected with solid UX foundations. The main areas for improvement are:

1. **Mobile responsiveness** - MetaPanel needs drawer pattern
2. **Accessibility polish** - ARIA labels, reduced motion
3. **Loading states** - Skeletons for better perceived performance
4. **Touch optimization** - Larger drag handles, touch feedback

Overall, the components follow ui-ux-pro-max guidelines well and provide a professional user experience.
