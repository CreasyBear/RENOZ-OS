# Reference: Foundation Patterns

## Objective

**This is a REFERENCE folder - NOT an executable PRD.**

This directory contains shared pattern definitions and specifications that other PRDs reference. There are no stories to execute here.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Contents

| File | Purpose | Used By |
|------|---------|---------|
| `canonical-enums.json` | Single source of truth for all enum values | All schema stories |
| `component-patterns.md` | UI component pattern specifications | All UI stories |
| `column-patterns.json` | DataTable column configuration patterns | List view stories |
| `rls-policies.json` | Row-level security policy templates | All API stories |
| `appshell-pattern.md` | Application shell pattern specification | FOUND-APPSHELL |

## How to Reference

### In PRD Acceptance Criteria

```json
{
  "acceptance_criteria": [
    "Enum values match $ref:canonical-enums.json#/enums/customerStatus",
    "Component follows pattern from component-patterns.md#pattern-1-datatable"
  ]
}
```

### In Schema Files

```typescript
// Import enums from central definition
import { customerStatusEnum } from '@/drizzle/schema/enums';
// Values must match canonical-enums.json#/enums/customerStatus
```

## Validation

These files are validated by:
- PRD validation script checks enum references resolve
- TypeScript compiler ensures enum type safety
- RLS policy tests verify policy definitions

## No Execution Required

Since this folder contains reference documentation only, there are no stories or completion promises. Ralph loops should skip this directory.

---

*Reference documentation folder - no executable stories*
