---
status: complete
priority: p1
issue_id: "007"
tags: [prd-review, dependencies, packages, ai-infrastructure]
dependencies: []
---

# Add Missing @ai-sdk/anthropic Package

## Problem Statement

The PRD specifies Anthropic models (`claude-3-5-haiku-20241022`, `claude-sonnet-4-20250514`) but the `@ai-sdk/anthropic` package is NOT in the project's dependencies. The Vercel AI SDK requires provider-specific packages to use different model providers.

## Findings

**Source:** Architecture Strategist Agent

**Location:** `package.json` and PRD lines 286-324 (agent model specifications)

**Current packages installed:**
```json
"ai": "^6.0.39",
"@ai-sdk/react": "^3.0.41"
```

**Missing:**
```json
"@ai-sdk/anthropic": "^x.x.x"
```

Without this package, the specified models cannot be instantiated.

## Proposed Solutions

### Option A: Add @ai-sdk/anthropic (Recommended)
- **Pros:** Enables Anthropic models as specified
- **Cons:** Additional dependency
- **Effort:** Small (5 minutes)
- **Risk:** Low

```bash
npm install @ai-sdk/anthropic
```

### Option B: Switch to OpenAI Models
- **Pros:** Uses existing SDK packages
- **Cons:** Different model capabilities, changes PRD significantly
- **Effort:** Medium (rewrite model specs)
- **Risk:** Medium

## Recommended Action

Option A - Install `@ai-sdk/anthropic` and update PRD to document this requirement.

## Technical Details

**Add to PRD `system_requirements.infrastructure`:**
```json
"vercel_ai_sdk": {
  "packages": ["ai", "@ai-sdk/anthropic", "@ai-sdk/react"],
  ...
}
```

**Usage in code:**
```typescript
import { anthropic } from '@ai-sdk/anthropic';

const triageAgent = anthropic('claude-3-5-haiku-20241022');
const customerAgent = anthropic('claude-sonnet-4-20250514');
```

**Environment variable:**
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Acceptance Criteria

- [ ] `@ai-sdk/anthropic` added to package.json
- [ ] PRD updated to list package in requirements
- [ ] ANTHROPIC_API_KEY documented in environment_variables section

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from architecture review | Provider packages needed for Vercel AI SDK |

## Resources

- Vercel AI SDK Anthropic Provider docs
- package.json
