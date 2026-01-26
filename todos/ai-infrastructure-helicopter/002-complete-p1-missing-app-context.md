---
status: complete
priority: p1
issue_id: "ARCH-001"
tags: [helicopter-review, architecture, ai-infrastructure, context]
dependencies: []
---

# ARCH-001: Missing AppContext Implementation

## Problem Statement

The AI infrastructure lacks the full `AppContext` interface required for proper context propagation. Currently only basic `UserContext` exists, missing critical fields like `timezone`, `locale`, `baseCurrency`, `metricsFilter`, and `forcedToolCall`.

This is a CRITICAL architecture gap that blocks proper parameter resolution and dashboard integration.

## Findings

**Source:** Architecture Strategist Agent + Helicopter Review

**Location:** Should be at `src/lib/ai/context/types.ts` (does not exist)

**Current state:**
- Basic `UserContext` with `userId` and `organizationId`
- No `MetricsFilter` for dashboard state
- No `ForcedToolCall` for widget click handling
- No locale/timezone/currency settings

**Pattern requirement (from `patterns/02-app-context.md`):**
```typescript
interface AppContext {
  user: {
    id: string;
    organizationId: string;
    name: string;
    role: string;
    permissions: string[];
  };
  organization: {
    id: string;
    name: string;
    timezone: string;
    locale: string;
    baseCurrency: string;
  };
  dashboard?: {
    metricsFilter: MetricsFilter;
    activePage: string;
    selectedEntities: string[];
  };
  forcedToolCall?: ForcedToolCall;
}
```

**Impact:**
- Cannot implement parameter resolution (ARCH-002)
- Cannot handle dashboard filter context
- Cannot handle widget click forced tool calls
- Locale/currency formatting inconsistent

## Proposed Solutions

### Option A: Full AppContext Implementation (Recommended)
- **Pros:** Complete pattern compliance, enables parameter resolution
- **Cons:** Requires updates to agents and tools
- **Effort:** Medium (3-4 hours)
- **Risk:** Low

### Option B: Minimal Extension
- **Pros:** Faster implementation
- **Cons:** Incomplete, will need to revisit
- **Effort:** Small (1 hour)
- **Risk:** Medium - technical debt

## Recommended Action

Option A - Implement full AppContext with all required interfaces.

## Technical Details

**Files to create:**
- `src/lib/ai/context/types.ts` - AppContext, MetricsFilter, ForcedToolCall interfaces
- `src/lib/ai/context/builder.ts` - buildAppContext() function
- `src/lib/ai/context/index.ts` - Barrel export

**Files to modify:**
- `src/routes/api/ai/chat.ts` - Pass AppContext to agents
- `src/lib/ai/agents/*.ts` - Accept AppContext in executionOptions

**MetricsFilter interface:**
```typescript
interface MetricsFilter {
  period: 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'last_30_days' | 'last_90_days' | 'custom';
  startDate?: string;
  endDate?: string;
  customerId?: string;
  status?: string[];
}
```

**ForcedToolCall interface:**
```typescript
interface ForcedToolCall {
  toolName: string;
  toolParams: Record<string, unknown>;
  showCanvas?: boolean;
}
```

## Acceptance Criteria

- [ ] `AppContext` interface defined in `src/lib/ai/context/types.ts`
- [ ] `MetricsFilter` interface defined with all period options
- [ ] `ForcedToolCall` interface defined with toolName, toolParams, showCanvas
- [ ] `buildAppContext()` function creates context from request
- [ ] Chat API route passes AppContext to agents
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Context patterns require full AppContext for parameter resolution |
| 2026-01-26 | **FIXED** - Created src/lib/ai/context/types.ts with AppContext, UserInfo, OrganizationInfo, DashboardContext, MetricsFilter, ForcedToolCall, ToolExecutionContext interfaces. Created builder.ts with buildAppContext(), buildToolContext(). Created index.ts barrel export. | AppContext is foundation for parameter resolution and tool context propagation |

## Resources

- `patterns/02-app-context.md` - Full AppContext specification
- `patterns/03-parameter-resolution.md` - Uses AppContext for resolution
- Midday reference: `_reference/.midday-reference/ai/context/`
