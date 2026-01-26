---
status: complete
priority: p2
issue_id: "015"
tags: [prd-review, performance, cost, ai-infrastructure]
dependencies: []
---

# Enable Anthropic Prompt Caching

## Problem Statement

The PRD mentions `cacheReadTokens` and `cacheWriteTokens` fields in cost tracking but doesn't specify how to leverage Anthropic's prompt caching. Without caching, system prompts are re-processed on every request, costing 10x more than cached tokens.

## Findings

**Source:** Performance Oracle Agent

**Location:** PRD lines 134-135 (cost tracking fields)

**Current cost model (without caching):**
- System prompt: ~500 tokens @ $0.0003/1K = $0.00015 per request
- With caching: ~500 tokens @ $0.00003/1K = $0.000015 per request
- **90% savings on system prompt tokens**

**Potential savings at scale:**
| Usage | Without Caching | With Caching | Savings |
|-------|-----------------|--------------|---------|
| 10K/day | $1.50 | $0.15 | $1.35/day |
| 100K/day | $15 | $1.50 | $13.50/day |

## Proposed Solutions

### Option A: Enable Ephemeral Caching (Recommended)
- **Pros:** 90% cost reduction on cached tokens, minimal code changes
- **Cons:** 5-minute cache TTL
- **Effort:** Small
- **Risk:** Low

### Option B: Manual Prompt Hashing
- **Pros:** More control
- **Cons:** Complex, error-prone
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

Option A - Enable Anthropic's ephemeral prompt caching.

## Technical Details

**Implementation with Vercel AI SDK:**
```typescript
import { anthropic } from '@ai-sdk/anthropic';

const response = await streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: {
    type: 'text',
    text: systemPrompt,
    experimental_cacheControl: { type: 'ephemeral' },
  },
  messages,
});
```

**Add to PRD story AI-INFRA-013 acceptance criteria:**
```json
"System prompts use cache_control: { type: 'ephemeral' } for prompt caching",
"Cost tracking distinguishes cache_read_tokens from input_tokens"
```

**Update cost tracking:**
```typescript
// Track cache efficiency
const cacheHitRate = usage.cacheReadTokens / (usage.cacheReadTokens + usage.inputTokens);
await trackCost({
  ...usage,
  cacheHitRate,
  costSavings: usage.cacheReadTokens * (0.0003 - 0.00003) / 1000,
});
```

**Monitoring:**
- Log cache hit rate per agent
- Alert if cache hit rate drops below 70%

## Acceptance Criteria

- [ ] System prompts use ephemeral cache control
- [ ] Cost tracking includes cache read/write tokens
- [ ] Cache hit rate logged for monitoring
- [ ] PRD story AI-INFRA-013 updated

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from performance review | Prompt caching reduces costs by 90% |

## Resources

- Anthropic prompt caching documentation
- Vercel AI SDK cache control options
