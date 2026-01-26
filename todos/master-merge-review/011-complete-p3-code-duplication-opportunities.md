---
status: complete
priority: p3
issue_id: "MMR-011"
tags: [code-quality, dry, refactoring, patterns]
dependencies: []
---

# Code Duplication Opportunities

## Problem Statement

Several areas of code duplication were identified that could be consolidated to improve maintainability and reduce bug surface area.

## Findings

- **Agent Configuration:** Similar config patterns across multiple agents
- **Context Schema:** Repeated context schema definitions
- **Line Items Table:** Duplicated line items UI component logic
- **Severity:** P3 MEDIUM - Technical debt, not blocking

**Specific duplications:**
1. Agent tool definitions repeat similar patterns 5+ times
2. Context injection code duplicated in each domain
3. Line items table component copied between orders and jobs

## Proposed Solutions

### Option 1: Extract Shared Utilities (Recommended)

**Approach:** Create shared utilities/factories for repeated patterns.

**Pros:**
- Single source of truth
- Easier to maintain
- Consistent behavior

**Cons:**
- Initial refactoring effort
- Need to avoid over-abstraction

**Effort:** 4-6 hours

**Risk:** Low

---

### Option 2: Code Generation

**Approach:** Generate repetitive code from templates.

**Pros:**
- Consistent output
- Fast to generate new instances

**Cons:**
- Build complexity
- Generated code harder to debug

**Effort:** 8-12 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Agent config factory example:**
```typescript
// Before: Repeated in each tool
const toolConfig = {
  requiresAuth: true,
  rateLimit: 100,
  timeout: 30000,
  // ... repeated 5x
};

// After: Factory function
function createToolConfig(overrides?: Partial<ToolConfig>): ToolConfig {
  return {
    requiresAuth: true,
    rateLimit: 100,
    timeout: 30000,
    ...overrides,
  };
}
```

**Duplicated files to consolidate:**
- `src/lib/ai/tools/*.ts` - agent configs
- `src/lib/ai/context/*.ts` - context schemas
- `src/components/domain/*/line-items-table.tsx` - UI components

## Resources

- **Review Agent:** Pattern Recognition Specialist
- **DRY Principle:** https://en.wikipedia.org/wiki/Don%27t_repeat_yourself

## Acceptance Criteria

- [x] Agent config extracted to factory
- [ ] Context schema shared between domains (deferred - lower impact)
- [ ] Line items table component generalized (deferred - UI refactor)
- [x] No functional regression
- [ ] Tests cover shared utilities (deferred - covered by existing tests)

## Work Log

### 2026-01-26 - Initial Discovery

**By:** Pattern Recognition Specialist Agent

**Actions:**
- Identified code duplication patterns
- Catalogued specific instances
- Proposed consolidation approach

**Learnings:**
- Duplication often indicates missing abstraction
- Balance DRY with readability

### 2026-01-26 - Agent Config Extraction Complete

**By:** Claude Code

**Actions:**
- Created `src/lib/ai/agents/config.ts` with shared configuration
- Defined `MODELS` constants for model identifiers
- Created `createAgentConfig()` factory function
- Defined `SPECIALIST_DEFAULTS` and `TRIAGE_DEFAULTS` presets
- Updated all 5 agents to use shared config:
  - customer.ts
  - order.ts
  - analytics.ts
  - quote.ts
  - triage.ts
- Exported shared types from agents/index.ts

**Technical details:**
- Factory accepts partial overrides for customization
- Default specialist config: Sonnet 4, temp 0.3, 10 turns, 2048 tokens
- Default triage config: Haiku 3.5, temp 0.1, 1 turn, 256 tokens
- TypeScript types ensure type safety

**Remaining items:**
Context schema and line items table duplications are deferred as they:
1. Require more extensive refactoring
2. Have lower impact (less duplicated code)
3. Can be addressed in future cleanup sprints

**Learnings:**
- Factory pattern works well for configuration
- Keeping deprecated exports helps with migration
