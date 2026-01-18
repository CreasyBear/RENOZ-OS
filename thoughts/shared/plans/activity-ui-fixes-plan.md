# Feature Plan: Activity UI Fixes

Created: 2026-01-18
Author: architect-agent

## Overview

Fix 10 identified issues in the Activity UI system, covering security vulnerabilities, UX improvements, performance optimizations, and accessibility polish. The fixes are organized into 4 phases by priority.

## Requirements

- [ ] Admin route has RBAC authorization check
- [ ] CSV export sanitizes dangerous cell values
- [ ] Activity filters sync to/from URL search params
- [ ] Cache invalidation helpers for real-time updates
- [ ] TooltipProvider moved to parent level in heatmap
- [ ] groupActivitiesByDate memoized correctly
- [ ] Timeline virtualization for 50+ items
- [ ] IntersectionObserver dependencies fixed
- [ ] Skeleton dimensions match actual content
- [ ] Collapsible sections have aria-expanded

## Design

### Architecture

```
Phase 1 (Security) - BLOCKING
├── Admin route authorization (beforeLoad)
└── CSV sanitization utility

Phase 2 (Critical UX)
├── URL filter sync (filters <-> search params)
└── Activity cache invalidation helpers

Phase 3 (Performance)
├── TooltipProvider hoisting
├── useMemo for groupActivitiesByDate
└── Timeline virtualization

Phase 4 (Polish)
├── IntersectionObserver deps fix
├── Skeleton dimension matching
└── ARIA expanded attributes
```

### Existing Patterns Identified

1. **Authorization Pattern**: Uses `beforeLoad` in route definition with redirect (see `_authenticated.tsx:21`)
2. **Permission Checking**: `useHasPermission` hook with `hasPermission(role, permission)` helper
3. **URL Search Params**: Zod schema validation with `validateSearch` (see `products/index.tsx:37-51`)
4. **Cache Invalidation**: `useQueryClient().invalidateQueries({ queryKey })` pattern (see `use-customers.ts:128-135`)
5. **CSV Escaping**: Basic `escapeCSV()` exists but lacks security sanitization (see `product-bulk-ops.ts:780-786`)
6. **Aria-expanded**: Used consistently in collapsible components (see `activity-timeline.tsx:285`)

---

## Implementation Phases

### Phase 1: Security (BLOCKING)

#### 1.1 Admin Route Authorization

**File:** `src/routes/_authenticated/admin/activities/index.tsx`

**Current Issue:** Route has no RBAC check - any authenticated user can access admin analytics.

**Pattern to Follow:** Add `beforeLoad` with role check, similar to `_authenticated.tsx` but checking user role.

**Changes:**

```typescript
// Line ~16, modify Route definition:
export const Route = createFileRoute("/_authenticated/admin/activities/")({
  beforeLoad: async () => {
    // Get current user with role
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    
    // Fetch user role from users table
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", session.user.id)
      .single();
    
    // Only owner and admin roles can access
    const adminRoles = ["owner", "admin"];
    if (!user || !adminRoles.includes(user.role)) {
      throw redirect({ to: "/activities" }); // Redirect to regular activity feed
    }
  },
  component: ActivityAnalyticsPage,
});
```

**Alternative (cleaner):** Create a reusable `requireRole` helper.

**File to create:** `src/lib/auth/route-guards.ts`

```typescript
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase/client";
import type { Role } from "./permissions";

export async function requireRoles(allowedRoles: Role[]) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw redirect({ to: "/login" });
  }
  
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("auth_id", session.user.id)
    .single();
  
  if (!user || !allowedRoles.includes(user.role as Role)) {
    throw redirect({ to: "/dashboard" });
  }
  
  return { user, session };
}

export const requireAdmin = () => requireRoles(["owner", "admin"]);
export const requireManager = () => requireRoles(["owner", "admin", "manager"]);
```

**Then in route:**
```typescript
import { requireAdmin } from "@/lib/auth/route-guards";

export const Route = createFileRoute("/_authenticated/admin/activities/")({
  beforeLoad: requireAdmin,
  component: ActivityAnalyticsPage,
});
```

**Acceptance:**
- [ ] Unauthenticated users redirected to /login
- [ ] Viewer/sales/support/operations users redirected to /activities
- [ ] Owner and admin users can access

**Estimated effort:** Small

---

#### 1.2 CSV Injection Vulnerability

**File:** `src/components/activity/activity-timeline.tsx`

**Current Issue (lines 106-128):**
```typescript
function exportToCSV(activities: ActivityWithUser[], entityType: string) {
  // ... creates CSV without sanitizing cell values
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}
```

CSV injection allows malicious data like `=CMD|'cmd'!A0` to execute formulas when opened in Excel.

**Solution:** Create shared utility and sanitize values.

**File to create:** `src/lib/utils/csv-sanitize.ts`

```typescript
/**
 * Sanitize a value for safe CSV export.
 * Prevents CSV injection by prefixing dangerous characters with single quote.
 * 
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */
export function sanitizeCSVValue(value: string | null | undefined): string {
  if (value == null) return "";
  
  const str = String(value);
  
  // Characters that trigger formula execution in spreadsheets
  const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];
  
  // If starts with dangerous character, prefix with single quote
  if (dangerousChars.some(char => str.startsWith(char))) {
    return `'${str}`;
  }
  
  return str;
}

/**
 * Escape and sanitize a value for CSV output.
 * Combines CSV escaping (quotes, commas) with injection prevention.
 */
export function escapeAndSanitizeCSV(value: string | null | undefined): string {
  const sanitized = sanitizeCSVValue(value);
  
  // Standard CSV escaping
  if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  
  return sanitized;
}

/**
 * Build a safe CSV string from rows.
 */
export function buildSafeCSV(headers: string[], rows: string[][]): string {
  const safeHeaders = headers.map(escapeAndSanitizeCSV);
  const safeRows = rows.map(row => row.map(escapeAndSanitizeCSV));
  
  return [safeHeaders, ...safeRows]
    .map(row => row.join(","))
    .join("\n");
}
```

**Modify:** `src/components/activity/activity-timeline.tsx` (lines 106-128)

```typescript
import { buildSafeCSV } from "@/lib/utils/csv-sanitize";

function exportToCSV(activities: ActivityWithUser[], entityType: string) {
  const headers = ["Date", "Time", "Action", "User", "Description", "Changes"];
  const rows = activities.map((a) => {
    const date = new Date(a.createdAt);
    return [
      format(date, "yyyy-MM-dd"),
      format(date, "HH:mm:ss"),
      a.action,
      a.user?.name ?? a.user?.email ?? "System",
      a.description ?? "",
      a.changes?.fields?.join(", ") ?? "",
    ];
  });

  const csv = buildSafeCSV(headers, rows);
  // ... rest unchanged
}
```

**Also update:** `src/components/activity/activity-dashboard.tsx` (line 254 area)

**Acceptance:**
- [ ] Values starting with `=`, `+`, `-`, `@` are prefixed with `'`
- [ ] Existing CSV escaping (quotes, newlines) still works
- [ ] Export still downloads valid CSV

**Estimated effort:** Small

---

### Phase 2: Critical UX

#### 2.1 URL Filter Persistence

**Files:**
- `src/routes/_authenticated/activities/index.tsx` (already has search schema)
- `src/components/activity/activity-feed.tsx` (needs to sync to URL)

**Current Issue:** 
- Route has search params validation (lines 22-28) ✓
- Route passes search to ActivityFeed (lines 56-63) ✓
- ActivityFeed uses local state instead of syncing back to URL (lines 305-311) ✗

**Solution:** Accept `onFiltersChange` callback in ActivityFeed that updates URL.

**Modify:** `src/components/activity/activity-feed.tsx`

```typescript
// Update props interface (~line 32):
export interface ActivityFeedProps {
  filters?: UseActivityFeedOptions;
  /** Callback when filters change - use to sync with URL */
  onFiltersChange?: (filters: ActivityFiltersValue) => void;
  showFilters?: boolean;
  // ... rest unchanged
}

// Update component (~line 296):
export function ActivityFeed({
  filters: initialFilters = {},
  onFiltersChange,
  showFilters = true,
  // ...
}: ActivityFeedProps) {
  const [filters, setFilters] = React.useState<ActivityFiltersValue>({
    entityType: initialFilters.entityType,
    action: initialFilters.action,
    userId: initialFilters.userId,
    dateFrom: initialFilters.dateFrom,
    dateTo: initialFilters.dateTo,
  });

  // Sync filters when prop changes (URL navigation)
  React.useEffect(() => {
    setFilters({
      entityType: initialFilters.entityType,
      action: initialFilters.action,
      userId: initialFilters.userId,
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
    });
  }, [
    initialFilters.entityType,
    initialFilters.action,
    initialFilters.userId,
    initialFilters.dateFrom?.getTime(),
    initialFilters.dateTo?.getTime(),
  ]);

  // Handle filter changes - notify parent for URL sync
  const handleFiltersChange = (newFilters: ActivityFiltersValue) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };
  
  // ... rest uses handleFiltersChange
}
```

**Modify:** `src/routes/_authenticated/activities/index.tsx`

```typescript
import { useNavigate } from "@tanstack/react-router";

function ActivitiesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const handleFiltersChange = (filters: ActivityFiltersValue) => {
    navigate({
      to: ".",
      search: {
        entityType: filters.entityType,
        action: filters.action,
        userId: filters.userId,
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
      },
      replace: true, // Don't add to history for every filter change
    });
  };

  return (
    <PageLayout variant="full-width">
      {/* ... */}
      <ActivityFeed
        filters={{
          entityType: search.entityType,
          action: search.action,
          userId: search.userId,
          dateFrom: search.dateFrom,
          dateTo: search.dateTo,
        }}
        onFiltersChange={handleFiltersChange}
        showFilters
        height="100%"
      />
    </PageLayout>
  );
}
```

**Acceptance:**
- [ ] Changing filters updates URL search params
- [ ] Refreshing page preserves filters
- [ ] Direct URL with params shows correct filters
- [ ] Back/forward navigation works

**Estimated effort:** Medium

---

#### 2.2 Cache Invalidation

**File:** `src/hooks/use-activities.ts`

**Current Issue:** No mutation hooks or invalidation helpers. New activities don't appear without manual refresh.

**Solution:** Add invalidation helper and expose query keys.

**Add to end of file:**

```typescript
// ============================================================================
// CACHE INVALIDATION
// ============================================================================

import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to invalidate activity queries after mutations.
 * Use when creating/updating entities that should trigger activity refresh.
 *
 * @example
 * ```tsx
 * const invalidateActivities = useInvalidateActivities();
 * 
 * // After creating a customer:
 * await createCustomer(data);
 * invalidateActivities.all(); // Refresh all activity queries
 * 
 * // After updating a specific entity:
 * invalidateActivities.entity("customer", customerId);
 * ```
 */
export function useInvalidateActivities() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all activity queries */
    all: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },

    /** Invalidate feed queries only */
    feeds: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
    },

    /** Invalidate queries for a specific entity */
    entity: (entityType: ActivityEntityType, entityId: string) => {
      queryClient.invalidateQueries({
        queryKey: activityKeys.entity(entityType, entityId),
      });
      // Also invalidate feeds since they include this entity
      queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
    },

    /** Invalidate stats and leaderboard */
    stats: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "activities" &&
          (query.queryKey[1] === "stats" || query.queryKey[1] === "leaderboard"),
      });
    },
  };
}

/**
 * Exported query keys for external invalidation.
 * Use with TanStack Query's queryClient.invalidateQueries()
 */
export { activityKeys };
```

**Usage in other mutation hooks (example):**

```typescript
// In use-customers.ts, update useCreateCustomer:
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const invalidateActivities = useInvalidateActivities();

  return useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      // Activities will show "Customer created" without refresh
      invalidateActivities.feeds();
    },
  });
}
```

**Acceptance:**
- [ ] `useInvalidateActivities` hook exported
- [ ] `activityKeys` exported for external use
- [ ] Can invalidate all, feeds, entity-specific, or stats
- [ ] Other mutation hooks can easily integrate

**Estimated effort:** Small

---

### Phase 3: Performance

#### 3.1 TooltipProvider Per-Cell

**File:** `src/components/activity/activity-heatmap.tsx`

**Current Issue (lines 111-134):** Each `HeatmapCell` creates its own `TooltipProvider`:

```typescript
function HeatmapCell({ ... }) {
  return (
    <TooltipProvider delayDuration={100}>  {/* One per cell = 168 providers! */}
      <Tooltip>
        ...
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Solution:** Move `TooltipProvider` to wrap the entire grid.

**Modify:**

```typescript
// Remove TooltipProvider from HeatmapCell (lines 111-133):
function HeatmapCell({
  day,
  hour,
  count,
  maxCount,
}: {
  day: number;
  hour: number;
  count: number;
  maxCount: number;
}) {
  const colorClass = getColorClass(count, maxCount);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "w-3 h-6 rounded-sm transition-colors cursor-default",
            colorClass
          )}
          role="gridcell"
          aria-label={`${DAYS[day]} ${formatHourRange(hour)}: ${count} activities`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="font-medium">
          {DAYS[day]} {formatHourRange(hour)}
        </div>
        <div className="text-muted-foreground">
          {count.toLocaleString()} {count === 1 ? "activity" : "activities"}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// In ActivityHeatmap component (around line 150+), wrap grid:
export function ActivityHeatmap({ ... }) {
  // ... existing code ...

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn("space-y-2", className)}>
        {/* ... grid rendering ... */}
      </div>
    </TooltipProvider>
  );
}
```

**Acceptance:**
- [ ] Single TooltipProvider wraps heatmap
- [ ] Tooltips still work on hover
- [ ] No visual regression

**Estimated effort:** Small

---

#### 3.2 Memoize groupActivitiesByDate

**File:** `src/components/activity/activity-feed.tsx`

**Current Issue (lines 343-346):**
```typescript
const groups = React.useMemo(
  () => groupActivitiesByDate(activities as ActivityWithUser[]),
  [activities]  // activities is a new array reference on every render
);
```

The `useFlattenedActivities` hook returns a new array via `flatMap` on every render, causing unnecessary recalculation.

**Solution:** Use a stable reference or compare by content.

**Option A - Memoize in useFlattenedActivities:**

```typescript
// In use-activities.ts, update useFlattenedActivities:
export function useFlattenedActivities(
  infiniteQueryResult: ActivityFeedResult | EntityActivitiesResult
) {
  const { data } = infiniteQueryResult;
  
  return React.useMemo(() => {
    return data?.pages.flatMap(
      (page: CursorPaginationResponse<ActivityWithUser | Activity>) => page.items
    ) ?? [];
  }, [data]);  // data reference is stable from TanStack Query
}
```

**Option B - Use JSON comparison (less ideal):**

```typescript
// In activity-feed.tsx:
const activitiesJson = JSON.stringify(activities.map(a => a.id));
const groups = React.useMemo(
  () => groupActivitiesByDate(activities as ActivityWithUser[]),
  [activitiesJson]
);
```

**Recommended: Option A** - Fix at the source in useFlattenedActivities.

**Acceptance:**
- [ ] groupActivitiesByDate only recalculates when data changes
- [ ] React DevTools shows stable reference
- [ ] No visual regression

**Estimated effort:** Small

---

#### 3.3 Timeline Virtualization

**File:** `src/components/activity/activity-timeline.tsx`

**Current Issue:** No virtualization - renders all items regardless of count.

**Solution:** Add @tanstack/react-virtual like ActivityFeed does.

**Modify (after line 135, add imports):**

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";
```

**Add virtualization wrapper (around line 280+):**

```typescript
// Add threshold prop to ActivityTimelineProps:
export interface ActivityTimelineProps {
  // ... existing props
  /** Minimum items before enabling virtualization */
  virtualizationThreshold?: number;
}

// In the main component, add virtualization:
export function ActivityTimeline({
  entityType,
  entityId,
  showExport = true,
  maxHeight = 500,
  showSkeleton = true,
  virtualizationThreshold = 50,
  className,
}: ActivityTimelineProps) {
  // ... existing code ...
  
  const scrollParentRef = React.useRef<HTMLDivElement>(null);
  const useVirtualization = activities.length > virtualizationThreshold;

  // Build flat list with date markers
  const items = React.useMemo(() => {
    const result: Array<
      | { type: "date"; date: Date }
      | { type: "activity"; activity: ActivityWithUser; isLast: boolean }
    > = [];
    
    let prevActivity: ActivityWithUser | undefined;
    
    activities.forEach((activity, index) => {
      if (shouldShowDateMarker(activity, prevActivity)) {
        result.push({ type: "date", date: new Date(activity.createdAt) });
      }
      result.push({
        type: "activity",
        activity,
        isLast: index === activities.length - 1,
      });
      prevActivity = activity;
    });
    
    return result;
  }, [activities]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: (index) => (items[index].type === "date" ? 32 : 80),
    overscan: 5,
    enabled: useVirtualization,
  });

  // Render logic branches based on useVirtualization
  if (useVirtualization) {
    return (
      <div
        ref={scrollParentRef}
        className={cn("overflow-auto", className)}
        style={{ maxHeight }}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                }}
              >
                {item.type === "date" ? (
                  <DateMarker date={item.date} />
                ) : (
                  <TimelineItem
                    activity={item.activity}
                    isLast={item.isLast}
                    showDateMarker={false}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard render for small lists
  return (/* existing non-virtualized render */);
}
```

**Acceptance:**
- [ ] Lists under 50 items render normally
- [ ] Lists over 50 items use virtualization
- [ ] Scrolling is smooth with large datasets
- [ ] Date markers still appear correctly

**Estimated effort:** Medium

---

### Phase 4: Polish

#### 4.1 IntersectionObserver Dependencies

**File:** `src/components/activity/activity-feed.tsx`

**Current Issue (lines 325-340):**
```typescript
React.useEffect(() => {
  // ...
  const observer = new IntersectionObserver(...);
  observer.observe(element);
  return () => observer.disconnect();
}, [canLoadMore, feedQuery.fetchNextPage]);  // fetchNextPage changes reference
```

`fetchNextPage` is a function that may change reference, causing the effect to re-run unnecessarily.

**Solution:** Use `useCallback` ref or wrap in useCallback.

```typescript
// Option A - Reference the stable query object:
React.useEffect(() => {
  const element = loadMoreRef.current;
  if (!element) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && canLoadMore) {
        feedQuery.fetchNextPage();
      }
    },
    { threshold: 0, rootMargin: "100px" }
  );

  observer.observe(element);
  return () => observer.disconnect();
}, [canLoadMore]);  // Remove fetchNextPage - access via closure

// Option B - Use ref for canLoadMore to avoid dep:
const canLoadMoreRef = React.useRef(canLoadMore);
canLoadMoreRef.current = canLoadMore;

React.useEffect(() => {
  const element = loadMoreRef.current;
  if (!element) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && canLoadMoreRef.current) {
        feedQuery.fetchNextPage();
      }
    },
    { threshold: 0, rootMargin: "100px" }
  );

  observer.observe(element);
  return () => observer.disconnect();
}, [feedQuery]);  // feedQuery is stable from TanStack Query
```

**Recommended: Option A** - Simpler and uses closure for stable reference.

**Acceptance:**
- [ ] Effect doesn't re-run on every render
- [ ] Infinite scroll still triggers correctly
- [ ] No stale closure issues

**Estimated effort:** Small

---

#### 4.2 Skeleton Dimension Matching

**Files:**
- `src/components/activity/activity-feed.tsx` (LoadingState, lines 108-122)
- `src/components/activity/activity-timeline.tsx` (TimelineLoading, lines 140-160)
- `src/components/activity/activity-heatmap.tsx` (HeatmapSkeleton, lines 82-95)

**Current Issue:** Skeleton dimensions don't match actual rendered content, causing layout shift.

**Solution:** Match dimensions to actual component sizes.

**activity-feed.tsx LoadingState:**
```typescript
function LoadingState() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading activities">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />  {/* Was w-8 h-8 */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />  {/* Match title height */}
            <Skeleton className="h-4 w-64" />  {/* Match description */}
          </div>
          <Skeleton className="h-4 w-20 flex-shrink-0" />  {/* Match timestamp */}
        </div>
      ))}
    </div>
  );
}
```

**activity-timeline.tsx TimelineLoading:**
```typescript
function TimelineLoading() {
  return (
    <div className="space-y-6 p-4" aria-busy="true" aria-label="Loading timeline">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Skeleton className="w-10 h-10 rounded-full" />  {/* Match avatar size */}
            <Skeleton className="w-0.5 h-20 mt-2" />  {/* Match connector line */}
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-40" />  {/* Match action text */}
            <Skeleton className="h-4 w-56" />  {/* Match description */}
            <Skeleton className="h-4 w-24" />  {/* Match timestamp */}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**activity-heatmap.tsx HeatmapSkeleton:**
```typescript
function HeatmapSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading heatmap">
      {/* Hour labels row */}
      <div className="flex gap-1 ml-12">
        {Array.from({ length: 24 }).map((_, j) => (
          <Skeleton key={j} className="w-3 h-4" />
        ))}
      </div>
      {/* Day rows */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Skeleton className="w-10 h-5" />  {/* Day label */}
          {Array.from({ length: 24 }).map((_, j) => (
            <Skeleton key={j} className="w-3 h-6" />  {/* Match cell size */}
          ))}
        </div>
      ))}
    </div>
  );
}
```

**Acceptance:**
- [ ] No visual "jump" when content loads
- [ ] Skeleton layout matches loaded content
- [ ] Aspect ratios preserved

**Estimated effort:** Small

---

#### 4.3 Collapsible aria-expanded

**File:** `src/components/activity/activity-feed.tsx`

**Current Issue:** Date group headers are collapsible visually but lack `aria-expanded`.

The `DateGroupHeader` component (lines 96-105) is static, but if we add collapsibility:

**If groups are made collapsible (optional feature):**

```typescript
interface DateGroupHeaderProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  activitiesCount: number;
}

function DateGroupHeader({ 
  label, 
  isExpanded, 
  onToggle, 
  activitiesCount 
}: DateGroupHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 px-4 border-b flex items-center justify-between"
      aria-expanded={isExpanded}
      aria-controls={`group-${label.replace(/\s/g, "-")}`}
    >
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">
        {activitiesCount} {activitiesCount === 1 ? "activity" : "activities"}
      </span>
    </button>
  );
}
```

**For existing static headers (just ensure ARIA is correct):**

The current implementation uses `role="heading"` which is appropriate. No change needed unless collapsibility is added.

**Check existing collapsibles in timeline:**

`activity-timeline.tsx` already has `aria-expanded={isOpen}` at line 285 - this is correct.

**Acceptance:**
- [ ] Collapsible elements have aria-expanded
- [ ] aria-controls points to controlled content
- [ ] Screen readers announce state correctly

**Estimated effort:** Small (mostly already done)

---

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| `@tanstack/react-virtual` | External (already in project) | Timeline virtualization |
| `@tanstack/react-router` | External (already in project) | URL param sync |
| `@tanstack/react-query` | External (already in project) | Cache invalidation |

## Files Summary

### New Files to Create
1. `src/lib/auth/route-guards.ts` - Reusable route authorization helpers
2. `src/lib/utils/csv-sanitize.ts` - CSV injection prevention utilities

### Files to Modify
| File | Changes |
|------|---------|
| `src/routes/_authenticated/admin/activities/index.tsx` | Add beforeLoad with role check |
| `src/components/activity/activity-timeline.tsx` | Use safe CSV export, add virtualization |
| `src/components/activity/activity-feed.tsx` | URL sync callback, fix useEffect deps, skeleton sizes |
| `src/components/activity/activity-heatmap.tsx` | Hoist TooltipProvider, fix skeleton |
| `src/hooks/use-activities.ts` | Add useInvalidateActivities, fix useFlattenedActivities memo |
| `src/routes/_authenticated/activities/index.tsx` | Add onFiltersChange handler |
| `src/components/activity/activity-dashboard.tsx` | Use safe CSV export |

## Test Verification Steps

### Phase 1 Tests
1. **Admin auth**: Log in as viewer, try to access `/admin/activities` - should redirect
2. **Admin auth**: Log in as admin, access `/admin/activities` - should load
3. **CSV safety**: Export activity with description `=SUM(A1:A10)` - CSV should show `'=SUM(A1:A10)`
4. **CSV safety**: Open exported CSV in Excel - no formula execution

### Phase 2 Tests
1. **URL sync**: Change filter, check URL updates
2. **URL sync**: Paste URL with filters, verify they apply
3. **URL sync**: Use browser back, filters should revert
4. **Cache**: Create a customer, check activity feed updates without refresh

### Phase 3 Tests
1. **Heatmap**: Hover multiple cells quickly - tooltips should work smoothly
2. **Feed memo**: Open React DevTools Profiler, filter activities - groupActivitiesByDate shouldn't recalculate unless data changes
3. **Timeline virtual**: Load entity with 100+ activities - should scroll smoothly

### Phase 4 Tests
1. **Observer**: Scroll to bottom of activity feed - loads more without flickering
2. **Skeletons**: Observe loading state - no layout shift when content appears
3. **A11y**: Use screen reader on collapsible sections - announces expanded/collapsed

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Route guard adds latency | Low | Supabase session is cached; user query is fast |
| CSV sanitization breaks legitimate data | Medium | Only prefix, don't modify; document behavior |
| Virtualization breaks date markers | High | Flatten to single list with marker items |
| URL sync causes too many navigations | Medium | Use `replace: true` to avoid history spam |

## Open Questions

- [ ] Should admin route redirect to `/activities` or `/dashboard` on unauthorized?
- [ ] Should CSV export include a header comment warning about sanitization?
- [ ] Is 50 items the right threshold for virtualization?

## Success Criteria

1. No unauthenticated/unauthorized access to admin routes
2. CSV exports are safe to open in Excel without formula execution
3. Activity filters are preserved in URL and shareable
4. New activities appear without manual page refresh
5. Heatmap with 168 cells performs smoothly
6. Timeline with 100+ items scrolls without jank
7. No layout shift during loading states
8. All collapsible elements announce state to screen readers
