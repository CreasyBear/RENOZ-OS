# Task: Implement Empty States Cross-Cutting Concern

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/cross-cutting/empty-states.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/cc-empty-states.progress.txt

## PRD ID
CC-EMPTY-STATES

## Phase
cross-cutting

## Priority
3

## Dependencies
- FOUND-SHARED (shared components)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `src/components/shared/empty-state.tsx` | Empty state component |

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

## Cross-Cutting Guidelines

### DO
- Provide helpful empty state messages
- Include call-to-action when applicable
- Use consistent styling
- Guide users to next steps

### DON'T
- Show blank screens
- Use generic messages
- Miss empty state scenarios

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>CC_EMPTY_STATES_COMPLETE</promise>
```

---

*Cross-Cutting PRD - Empty state patterns*
