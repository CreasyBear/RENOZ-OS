# Jobs Domain UX Action Plan

> Prioritized improvements based on ui-ux-pro-max review

---

## Phase 1: Critical Fixes (Do First)

### 1.1 Add ARIA Labels to Icon-Only Buttons

**Files:**
- `src/components/domain/jobs/projects/project-list.tsx`
- `src/components/domain/jobs/projects/project-detail-tabs.tsx`

**Changes:**

```tsx
// project-list.tsx - Line 117 and 242
<Button 
  variant="ghost" 
  size="icon" 
  className="h-8 w-8"
  aria-label="Project actions"
>
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

### 1.2 Improve ProjectCard Accessibility

**File:** `src/components/domain/jobs/projects/project-card.tsx`

**Changes:**

```tsx
// Line 189-204: Add better aria-label
div
  role="button"
  tabIndex={0}
  aria-label={`${project.title} - ${project.projectNumber}, ${status.label}`}
  onClick={onClick}
  // ... rest
```

### 1.3 Add Loading Skeletons

**New File:** `src/components/domain/jobs/projects/project-skeleton.tsx`

```tsx
export function ProjectCardSkeleton({ variant = 'list' }: { variant?: 'list' | 'board' }) {
  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 animate-pulse',
      variant === 'board' ? 'h-40' : 'h-32'
    )}>
      <div className="flex justify-between">
        <div className="h-5 w-5 bg-muted rounded" />
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
      <div className="mt-3 h-5 w-3/4 bg-muted rounded" />
      <div className="mt-2 h-4 w-1/2 bg-muted rounded" />
    </div>
  );
}
```

---

## Phase 2: Mobile Responsiveness

### 2.1 Mobile Drawer for MetaPanel

**File:** `src/components/domain/jobs/projects/project-meta-panel.tsx`

**Changes:**

```tsx
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';

export function ProjectMetaPanel({ project, isOpen, onToggle }: ProjectMetaPanelProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const content = <MetaPanelContent project={project} />;
  
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent side="right" className="w-full sm:w-80 p-0">
          {content}
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l overflow-hidden"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 2.2 Responsive Table

**File:** `src/components/domain/jobs/projects/project-list.tsx`

**Changes:**

```tsx
// Wrap Table in scrollable container
<div className="border rounded-lg overflow-x-auto">
  <Table>
    {/* ... */}
  </Table>
</div>
```

---

## Phase 3: Animation & Motion

### 3.1 Add Reduced Motion Support

**File:** `src/routes/_authenticated/projects/$projectId.tsx`

**Changes:**

```tsx
import { useReducedMotion } from 'framer-motion';

function ProjectDetailPage() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <AnimatePresence>
      {metaPanelOpen && (
        <motion.div
          initial={shouldReduceMotion ? false : { x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={shouldReduceMotion ? false : { x: 100, opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
        >
          <ProjectMetaPanel />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 3.2 Dialog Focus Management

**File:** `src/components/domain/jobs/projects/project-create-dialog.tsx`

**Changes:**

```tsx
import { useEffect, useRef } from 'react';

export function ProjectCreateDialog({ open, onOpenChange }: ProjectCreateDialogProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (open) {
      // Small delay for animation
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input 
                  ref={titleInputRef}
                  placeholder="Project title..."
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## Phase 4: Touch & Interaction

### 4.1 Larger Touch Targets

**File:** `src/components/jobs/presentation/workstreams/ProjectWorkstreamsView.tsx`

**Changes:**

```tsx
// Ensure drag handle is 44x44px
<button
  {...attributes}
  {...listeners}
  className="p-2 touch-none" // 44px minimum
  aria-label="Reorder workstream"
>
  <GripVertical className="h-5 w-5 text-muted-foreground" />
</button>
```

### 4.2 Better Hover States

**File:** `src/components/domain/jobs/projects/bom-dialogs.tsx`

**Changes:**

```tsx
// Product selection items
<button
  type="button"
  className="w-full flex items-center gap-3 p-2 hover:bg-muted active:bg-muted/80 rounded-md text-left transition-colors cursor-pointer"
  onClick={() => handleSelectProduct(product)}
>
```

---

## Phase 5: Performance

### 5.1 Lazy Load Tab Content

**File:** `src/routes/_authenticated/projects/$projectId.tsx`

**Changes:**

```tsx
import { Suspense, lazy } from 'react';

// Lazy load tab components
const ProjectWorkstreamsTab = lazy(() => import('@/components/domain/jobs/projects/project-detail-tabs').then(m => ({ default: m.ProjectWorkstreamsTab })));

// Wrap in Suspense
<TabsContent value="workstreams">
  <Suspense fallback={<TabSkeleton />}>
    <ProjectWorkstreamsTab project={project} />
  </Suspense>
</TabsContent>
```

### 5.2 Memoize Workstream Items

**File:** `src/components/jobs/presentation/workstreams/ProjectWorkstreamsView.tsx`

**Changes:**

```tsx
import { memo } from 'react';

const SortableWorkstreamCard = memo(function SortableWorkstreamCard({ 
  workstream, 
  onEdit, 
  onDelete 
}: WorkstreamCardProps) {
  // Component implementation
});
```

---

## Implementation Priority

### Week 1: Critical
- [ ] Add ARIA labels
- [ ] Fix keyboard navigation
- [ ] Add loading skeletons

### Week 2: Mobile
- [ ] Mobile drawer for MetaPanel
- [ ] Responsive table
- [ ] Touch target sizing

### Week 3: Polish
- [ ] Reduced motion support
- [ ] Dialog focus management
- [ ] Hover state improvements

### Week 4: Performance
- [ ] Lazy load tabs
- [ ] Virtualize lists
- [ ] Memoize components

---

## Success Metrics

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Lighthouse A11y Score | ~85 | 95+ | Chrome DevTools |
| Mobile Usability | ~70 | 90+ | PageSpeed Insights |
| Interaction Ready | ~2s | <1s | Web Vitals |
| Motion Preference | N/A | Supported | CSS prefers-reduced-motion |

---

## Resources

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Framer Motion Accessibility](https://www.framer.com/motion/guide-accessibility/)
