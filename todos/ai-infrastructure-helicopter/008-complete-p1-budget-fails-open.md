---
status: complete
priority: p1
issue_id: "SEC-002"
tags: [helicopter-review, security, ai-infrastructure, budget]
dependencies: []
---

# SEC-002: Budget Check Fails Open on Error

## Problem Statement

The budget enforcement function returns `allowed: true` when an error occurs (fail-open). This means if the budget check fails due to database issues, network problems, or bugs, users get unlimited AI access.

This is a CRITICAL security issue that could lead to unbounded AI costs.

## Findings

**Source:** Security Sentinel Agent + Helicopter Review

**Location:** `src/lib/ai/utils/budget.ts:225-233`

**Current state (fail-open):**
```typescript
export async function checkBudget(organizationId: string): Promise<BudgetCheckResult> {
  try {
    const usage = await getUsageForPeriod(organizationId);
    const limit = await getBudgetLimit(organizationId);
    return { allowed: usage < limit, remaining: limit - usage };
  } catch (error) {
    console.error('Budget check failed:', error);
    return { allowed: true, remaining: 0 }; // FAIL OPEN!
  }
}
```

**Pattern requirement (fail-closed in production):**
```typescript
export async function checkBudget(organizationId: string): Promise<BudgetCheckResult> {
  try {
    const usage = await getUsageForPeriod(organizationId);
    const limit = await getBudgetLimit(organizationId);
    return { allowed: usage < limit, remaining: limit - usage };
  } catch (error) {
    console.error('Budget check failed:', error);

    // Fail CLOSED in production
    if (process.env.NODE_ENV === 'production') {
      return { allowed: false, remaining: 0, error: 'Budget check unavailable' };
    }

    // Allow in development for easier testing
    return { allowed: true, remaining: 0 };
  }
}
```

**Risk:**
- Database outage → unlimited AI usage
- Redis failure → unlimited AI usage
- Bug in usage calculation → unlimited AI usage
- Could result in thousands of dollars in unexpected AI costs

## Proposed Solutions

### Option A: Fail Closed in Production (Recommended)
- **Pros:** Prevents unbounded costs, safe default
- **Cons:** Users blocked if budget system is down
- **Effort:** Small (30 minutes)
- **Risk:** Low

### Option B: Fail Closed with Grace Period
- **Pros:** Allows brief outages without blocking users
- **Cons:** More complex, still allows some leakage
- **Effort:** Medium (1-2 hours)
- **Risk:** Low

### Option C: Circuit Breaker Pattern
- **Pros:** Sophisticated failure handling
- **Cons:** More complex implementation
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

## Recommended Action

Option A - Change to fail-closed in production, keep fail-open in development.

## Technical Details

**Files to modify:**
- `src/lib/ai/utils/budget.ts`

**Fixed implementation:**
```typescript
export async function checkBudget(organizationId: string): Promise<BudgetCheckResult> {
  try {
    const [usage, limit] = await Promise.all([
      getUsageForPeriod(organizationId),
      getBudgetLimit(organizationId),
    ]);

    return {
      allowed: usage < limit,
      remaining: Math.max(0, limit - usage),
      usage,
      limit,
    };
  } catch (error) {
    console.error('Budget check failed:', error);

    // CRITICAL: Fail closed in production to prevent unbounded costs
    if (process.env.NODE_ENV === 'production') {
      // Log to monitoring
      await logBudgetCheckFailure(organizationId, error);

      return {
        allowed: false,
        remaining: 0,
        error: 'Budget system temporarily unavailable',
      };
    }

    // In development, allow for easier testing
    console.warn('Budget check failed but allowing in development mode');
    return { allowed: true, remaining: Infinity };
  }
}
```

**Response to user when budget check fails:**
```typescript
if (budget.error) {
  return new Response(JSON.stringify({
    error: 'service_unavailable',
    message: 'AI assistant is temporarily unavailable. Please try again in a few minutes.',
  }), { status: 503 });
}
```

## Acceptance Criteria

- [ ] Budget check returns `allowed: false` on error in production
- [ ] Budget check returns `allowed: true` on error in development
- [ ] Error message returned to caller
- [ ] Error logged to monitoring system
- [ ] User receives friendly error message (503)
- [ ] Unit test verifies fail-closed behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-26 | Created from helicopter review | Security-sensitive operations must fail closed |
| 2026-01-26 | **FIXED** - Updated src/lib/ai/utils/budget.ts: changed catch block to return allowed:false in production with user-friendly error message and suggestion. Still allows in development for testing. Added reason and suggestion fields for better UX. | Fail-closed with good error messages is better than silent unlimited access |

## Resources

- OWASP fail-secure patterns
- `src/lib/ai/utils/budget.ts` - Current implementation
- Cloud cost management best practices
