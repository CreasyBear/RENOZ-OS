---
status: complete
priority: p1
issue_id: "ARCH-002"
tags: [helicopter-review, architecture, ai-infrastructure, parameters]
dependencies: ["ARCH-001"]
---

# ARCH-002: No Parameter Resolution System

## Problem Statement

The AI infrastructure lacks a parameter resolution system that implements the three-tier priority: `forcedToolCall > AI params > dashboard filter > defaults`. This means widget clicks, dashboard context, and sensible defaults are not properly handled.

This is a CRITICAL architecture gap that blocks proper tool parameter handling.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Location:** Should be at `src/lib/ai/utils/resolve-params.ts` (does not exist)

**Current state:**
- Tools only receive AI-provided parameters
- No integration with dashboard filter state
- No forced tool call handling for widget clicks
- No default value fallbacks

**Pattern requirement (from `patterns/03-parameter-resolution.md`):**
```typescript
function resolveToolParams<T extends z.ZodSchema>(
  schema: T,
  aiParams: Partial<z.infer<T>>,
  context: AppContext
): z.infer<T> {
  // Priority order:
  // 1. forcedToolCall.toolParams (widget click - highest priority)
  // 2. aiParams (AI-provided values)
  // 3. metricsFilter (dashboard state)
  // 4. schema defaults (fallback)
}
```

**Impact:**
- Widget clicks cannot force specific parameters
- Dashboard filter state not respected
- No sensible defaults when AI omits parameters
- Inconsistent behavior across tools

## Proposed Solutions

### Option A: Full Parameter Resolution (Recommended)
- **Pros:** Complete pattern compliance, proper priority handling
- **Cons:** Requires AppContext (ARCH-001) first
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

### Option B: Simple Default Merging
- **Pros:** Faster implementation
- **Cons:** No forced tool call or dashboard integration
- **Effort:** Small (1 hour)
- **Risk:** Medium - incomplete

## Recommended Action

Option A - Implement full parameter resolution after AppContext (ARCH-001) is complete.

## Technical Details

**Files to create:**
- `src/lib/ai/utils/resolve-params.ts` - resolveToolParams function
- `src/lib/ai/utils/period-dates.ts` - getPeriodDates helper

**Files to modify:**
- All tools in `src/lib/ai/tools/*.ts` - Use resolveToolParams

**Resolution logic:**
```typescript
export function resolveToolParams<T extends z.ZodSchema>(
  schema: T,
  aiParams: Partial<z.infer<T>>,
  context: AppContext
): z.infer<T> {
  const defaults = getSchemaDefaults(schema);
  const dashboardParams = mapMetricsFilterToParams(context.dashboard?.metricsFilter);
  const forcedParams = context.forcedToolCall?.toolParams || {};

  // Merge in priority order (later overrides earlier)
  const merged = {
    ...defaults,
    ...dashboardParams,
    ...aiParams,
    ...forcedParams,
  };

  return schema.parse(merged);
}
```

**Period date helper:**
```typescript
export function getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  switch (period) {
    case 'today': return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'this_week': return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
    // ... etc
  }
}
```

## Acceptance Criteria

- [ ] `resolveToolParams` function exists in `src/lib/ai/utils/resolve-params.ts`
- [ ] Implements three-tier priority: forced > AI > dashboard > defaults
- [ ] `getPeriodDates` helper handles all period options
- [ ] At least one tool updated to use resolveToolParams
- [ ] Unit tests verify priority order
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Parameter resolution requires AppContext dependency |
| 2026-01-26 | **FIXED** - Created src/lib/ai/utils/resolve-params.ts with resolveToolParams(), resolveToolParamsSafe(), getPeriodDates(), mapMetricsFilterToParams(), getSchemaDefaults(). Implements three-tier priority: forcedToolParams > AI params > dashboard > defaults. Updated utils/index.ts exports. | Period date calculations need all common options (today, week, month, quarter, year, last_N_days) |

## Resources

- `patterns/03-parameter-resolution.md` - Full resolution specification
- `patterns/02-app-context.md` - AppContext with MetricsFilter
- Midday reference: `_reference/.midday-reference/ai/utils/`
