---
status: complete
priority: p2
issue_id: "011"
tags: [prd-review, performance, latency, ai-infrastructure]
dependencies: []
resolution: documented-in-roadmap
---

# Add Route Prediction Cache to Skip Triage

## Problem Statement

Every chat request incurs two LLM API calls (Haiku triage + Sonnet specialist), adding 800-1300ms minimum latency. Many requests have obvious routing (e.g., "Show customer John Smith" always goes to customerAgent) but still call Haiku.

## Findings

**Source:** Performance Oracle Agent

**Location:** PRD lines 285-294 (triage agent)

**Current flow:**
```
User Input -> Haiku Triage (300-500ms) -> Sonnet Specialist (500-800ms)
Total first-token latency: 800-1300ms
```

**Optimization opportunity:** 60-70% of requests have predictable routing based on keyword patterns.

## Proposed Solutions

### Option A: Pattern-Based Route Prediction (Recommended)
- **Pros:** 200-400ms savings for majority of requests
- **Cons:** May misroute edge cases
- **Effort:** Small
- **Risk:** Low (can fall back to triage)

### Option B: User-Selected Agent Mode
- **Pros:** No misrouting
- **Cons:** Worse UX, users must know which agent to use
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Option A - Implement pattern-based route prediction with fallback.

## Technical Details

**Route prediction logic:**
```typescript
// src/lib/ai/routing/route-cache.ts
const ROUTE_PATTERNS: Record<string, RegExp[]> = {
  customer: [
    /customer|contact|client|relationship/i,
    /who is|find.*person|look up/i,
  ],
  order: [
    /order|invoice|purchase|shipment|delivery/i,
    /when will|track|status/i,
  ],
  analytics: [
    /report|metric|trend|forecast|revenue|sales/i,
    /how much|how many|compare/i,
  ],
  quote: [
    /quote|pricing|price|configuration|system|proposal/i,
    /how much would|cost of/i,
  ],
};

export function predictRoute(message: string): string | null {
  for (const [agent, patterns] of Object.entries(ROUTE_PATTERNS)) {
    if (patterns.some(p => p.test(message))) {
      return agent;
    }
  }
  return null; // Fall back to Haiku triage
}
```

**Integration:**
```typescript
const prediction = predictRoute(userMessage);
if (prediction && confidence > 0.8) {
  // Skip triage, go directly to specialist
  return executeAgent(prediction, userMessage, context);
} else {
  // Use Haiku triage for ambiguous requests
  return triageAndExecute(userMessage, context);
}
```

**Expected gains:**
- 60-70% of requests skip triage
- 200-400ms latency reduction per skipped triage

## Acceptance Criteria

- [ ] Route prediction function implemented
- [ ] Pattern coverage for all 4 specialist domains
- [ ] Fallback to Haiku triage when prediction uncertain
- [ ] Metrics logged for prediction accuracy

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from performance review | Pattern-based routing can skip expensive triage calls |

## Resources

- Performance Oracle analysis
- Anthropic pricing for Haiku vs Sonnet
