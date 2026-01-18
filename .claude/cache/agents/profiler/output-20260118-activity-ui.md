# Performance Analysis: Activity UI Components
Generated: 2026-01-18

## Executive Summary
- **Bottleneck Type:** Re-renders, Memory (event listeners), Bundle Size
- **Current Performance:** Not benchmarked (static analysis)
- **Expected Improvement:** 15-30% render reduction, ~40KB bundle reduction possible

## Findings

### 1. Missing useCallback for IntersectionObserver Dependency
**Location:** `src/components/activity/activity-feed.tsx:340`
**Type:** Re-render / Stale Closure
**Impact:** HIGH - Creates new IntersectionObserver on every render, potential stale closure bugs

**Evidence:**
```typescript
// Line 340 - fetchNextPage in dependency array creates new observer every time
React.useEffect(() => {
  // ...
  observer.observe(element);
  return () => observer.disconnect();
}, [canLoadMore, feedQuery.fetchNextPage]);  // <-- fetchNextPage reference changes
```

**Problem:** `feedQuery.fetchNextPage` is a function reference that may change on every render from useInfiniteQuery. This causes the IntersectionObserver to be recreated unnecessarily.

**Optimization:**
```typescript
const fetchNextPageStable = React.useCallback(() => {
  if (canLoadMore) {
    feedQuery.fetchNextPage();
  }
}, [canLoadMore, feedQuery.fetchNextPage]);

React.useEffect(() => {
  const element = loadMoreRef.current;
  if (!element) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPageStable();
      }
    },
    { threshold: 0, rootMargin: "100px" }
  );

  observer.observe(element);
  return () => observer.disconnect();
}, [fetchNextPageStable]);
```

**Expected Improvement:** Eliminates spurious observer recreation

---

### 2. TooltipProvider Per-Cell in Heatmap
**Location:** `src/components/activity/activity-heatmap.tsx:112-134`
**Type:** Memory / Performance
**Impact:** MEDIUM - Creates 24 TooltipProvider instances per row (168 for full 7-day heatmap)

**Evidence:**
```typescript
function HeatmapCell({ ... }) {
  return (
    <TooltipProvider delayDuration={100}>  {/* Created per cell! */}
      <Tooltip>
        <TooltipTrigger asChild>
          ...
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Problem:** Each cell creates its own TooltipProvider, adding unnecessary React context overhead.

**Optimization:** Move TooltipProvider to parent component:
```typescript
// In ActivityHeatmap:
return (
  <TooltipProvider delayDuration={100}>
    <div className={cn("space-y-3", className)}>
      {/* ... cells without individual providers */}
    </div>
  </TooltipProvider>
);
```

**Expected Improvement:** Reduces context providers from 168 to 1

---

### 3. Bundle Size - Recharts Named Imports
**Location:** `src/components/activity/activity-charts.tsx:10-23`
**Type:** Bundle Size
**Impact:** MEDIUM - Current pattern is correct but verify tree-shaking

**Evidence:**
```typescript
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
```

**Analysis:** Named imports are correct for tree-shaking. However, Recharts itself is ~400KB unparsed. Consider:
1. Lazy loading chart components if not visible on initial render
2. Using `next/dynamic` or `React.lazy` for dashboard tab

**Potential Optimization:**
```typescript
// activity-charts.tsx - lazy load entire chart bundle
const ActivityTrendChart = React.lazy(() => 
  import('./charts/trend-chart').then(m => ({ default: m.ActivityTrendChart }))
);
```

**Expected Improvement:** ~40-80KB off initial bundle if charts are below fold

---

### 4. useFlattenedActivities Missing Memoization
**Location:** `src/hooks/use-activities.ts:347-357`
**Type:** Re-render
**Impact:** LOW - Recalculates flatMap on every component render

**Evidence:**
```typescript
export function useFlattenedActivities(
  infiniteQueryResult: ActivityFeedResult | EntityActivitiesResult
) {
  const { data } = infiniteQueryResult;
  return (
    data?.pages.flatMap(
      (page: CursorPaginationResponse<ActivityWithUser | Activity>) =>
        page.items
    ) ?? []
  );
}
```

**Problem:** Returns new array reference on every call, causing downstream useMemo/useCallback dependencies to re-trigger.

**Optimization:**
```typescript
export function useFlattenedActivities(
  infiniteQueryResult: ActivityFeedResult | EntityActivitiesResult
) {
  const { data } = infiniteQueryResult;
  return React.useMemo(
    () => data?.pages.flatMap(page => page.items) ?? [],
    [data]
  );
}
```

**Expected Improvement:** Stable reference when data unchanged

---

### 5. Timeline TimelineItem State Per-Item
**Location:** `src/components/activity/activity-timeline.tsx:204-206`
**Type:** Memory
**Impact:** LOW - Each timeline item has its own useState for collapsible

**Evidence:**
```typescript
function TimelineItem({ activity, isLast, showDateMarker }: TimelineItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  // ...
}
```

**Analysis:** This is acceptable for typical use (50 items per page). However, for virtualization scenarios, lifting state to parent with a Map would be more efficient.

**Potential Optimization (only if >100 items expected):**
```typescript
// Parent manages open state
const [openItems, setOpenItems] = React.useState<Set<string>>(new Set());
// Pass down: isOpen={openItems.has(activity.id)}, onToggle={() => toggle(activity.id)}
```

---

### 6. VirtualizedFeed Items Array Recreation
**Location:** `src/components/activity/activity-feed.tsx:180-191`
**Type:** Performance
**Impact:** LOW - Correctly uses useMemo

**Evidence:**
```typescript
const items = React.useMemo(() => {
  const result: Array<{ type: "header"; label: string } | { type: "activity"; activity: ActivityWithUser }> = [];
  for (const group of groups) {
    result.push({ type: "header", label: group.label });
    for (const activity of group.activities) {
      result.push({ type: "activity", activity });
    }
  }
  return result;
}, [groups]);
```

**Status:** GOOD - Properly memoized with correct dependency

---

### 7. handleFiltersChange Not Memoized
**Location:** `src/components/activity/activity-feed.tsx:356-358`
**Type:** Re-render
**Impact:** LOW - Causes ActivityFilters to re-render unnecessarily

**Evidence:**
```typescript
const handleFiltersChange = (newFilters: ActivityFiltersValue) => {
  setFilters(newFilters);
};
```

**Optimization:**
```typescript
const handleFiltersChange = React.useCallback((newFilters: ActivityFiltersValue) => {
  setFilters(newFilters);
}, []);
```

**Expected Improvement:** Prevents ActivityFilters child re-renders

---

### 8. Dashboard Date Range Recalculation
**Location:** `src/components/activity/activity-dashboard.tsx:226-235`
**Type:** Performance
**Impact:** LOW - Correctly uses useMemo

**Evidence:**
```typescript
const dateRange = React.useMemo(() => {
  if (preset === "custom" && customRange?.from) {
    return {
      from: startOfDay(customRange.from),
      to: customRange.to ? endOfDay(customRange.to) : endOfDay(new Date()),
    };
  }
  const presetOption = DATE_PRESETS.find((p) => p.value === preset);
  return presetOption?.getRange() ?? DATE_PRESETS[2].getRange();
}, [preset, customRange]);
```

**Status:** GOOD - Properly memoized

---

### 9. Query Stale Times
**Location:** `src/hooks/use-activities.ts:137,185,228,247,290,332`
**Type:** Cache Strategy
**Impact:** LOW - Configuration appropriate for use case

**Evidence:**
```typescript
staleTime: 30 * 1000,  // Feed queries - 30 seconds (lines 137, 185, 228)
staleTime: 60 * 1000,  // Stats/detail queries - 1 minute (lines 247, 290, 332)
```

**Analysis:** 
- Feed at 30s is reasonable for real-time feel
- Stats at 60s appropriate for aggregates
- Consider increasing feed staleTime to 60s if real-time not critical (reduces network)

---

### 10. No Virtualization in ActivityTimeline
**Location:** `src/components/activity/activity-timeline.tsx:401-408`
**Type:** Performance
**Impact:** MEDIUM for long histories - Renders all items in DOM

**Evidence:**
```typescript
{activities.map((activity, index) => (
  <TimelineItem
    key={activity.id}
    activity={activity}
    isLast={index === activities.length - 1 && !canLoadMore}
    showDateMarker={shouldShowDateMarker(activity, activities[index - 1])}
  />
))}
```

**Problem:** Unlike ActivityFeed which has virtualization, Timeline renders all loaded items. With pageSize 50, this could be 200+ DOM nodes after 4 pages.

**Optimization:** Add optional virtualization similar to VirtualizedFeed:
```typescript
const useVirtualization = activities.length > 100;
// Use @tanstack/react-virtual for timeline too
```

**Expected Improvement:** ~50% DOM reduction for long histories

---

## Recommendations

### Quick Wins (Low effort, high impact)
1. **Fix IntersectionObserver dep** - `activity-feed.tsx:340` - Wrap in useCallback
2. **Lift TooltipProvider** - `activity-heatmap.tsx:112` - Single provider at parent
3. **Memoize useFlattenedActivities** - `use-activities.ts:347` - Add useMemo
4. **Memoize handleFiltersChange** - `activity-feed.tsx:356` - Add useCallback

### Medium-term (Higher effort)
1. **Lazy load Recharts** - `activity-charts.tsx` - Use React.lazy for dashboard charts
2. **Add Timeline virtualization** - `activity-timeline.tsx:401` - Port VirtualizedFeed approach

### Architecture Changes
1. **Consider react-window** - Lighter alternative to @tanstack/react-virtual (~3KB vs ~8KB)
2. **Recharts alternatives** - Consider visx or lightweight-charts for smaller bundle

---

## Memory Leak Check

| Pattern | File | Status |
|---------|------|--------|
| IntersectionObserver cleanup | activity-feed.tsx:339 | GOOD - disconnect() called |
| Event listeners | All files | GOOD - None found outside React |
| Timers (setInterval) | All files | GOOD - None found |
| Object URLs | activity-timeline.tsx:127 | GOOD - revokeObjectURL called |
| Object URLs | activity-dashboard.tsx:271 | GOOD - revokeObjectURL called |

---

## Benchmarks (TBD)
| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Initial render (100 items) | TBD | TBD | TBD |
| Scroll to load more | TBD | TBD | TBD |
| Filter change | TBD | TBD | TBD |

---

## Files Analyzed
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-feed.tsx`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-timeline.tsx`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-dashboard.tsx`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-charts.tsx`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/components/activity/activity-heatmap.tsx`
- `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/continuous-claude/renoz-v3/src/hooks/use-activities.ts`
