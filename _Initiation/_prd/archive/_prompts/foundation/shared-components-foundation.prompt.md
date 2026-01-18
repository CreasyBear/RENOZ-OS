# Task: Implement Shared Components Foundation Enhancement

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/foundation/shared-components-foundation.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/found-shared.progress.txt

## PRD ID
FOUND-SHARED

## Phase
foundation

## Priority
4

## Dependencies
None - Foundation PRD

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Check for blocking dependencies
# This PRD has no external dependencies
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **Component Patterns**: Check existing shared components

### Domain References

| Reference | Purpose |
|-----------|---------|
| `src/components/shared/` | Existing shared components |
| `src/components/ui/` | Base UI components |
| `.reui-reference/components/` | UI reference components |

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. Run `npm run typecheck` to verify
5. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
6. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Component Guidelines

### DO
- Create reusable, composable components
- Export proper TypeScript types
- Include JSDoc documentation
- Follow existing naming conventions
- Add to barrel exports

### DON'T
- Duplicate existing functionality
- Create domain-specific components here (use domain folders)
- Add business logic to shared components

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>FOUND_SHARED_COMPLETE</promise>
```

---

*Foundation PRD - Shared component library*
