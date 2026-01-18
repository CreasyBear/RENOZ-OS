# Task: Implement App Shell Foundation Enhancement

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/foundation/appshell-foundation.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/found-appshell.progress.txt

## PRD ID
FOUND-APPSHELL

## Phase
foundation

## Priority
3

## Dependencies
None - Foundation PRD

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Dev server starts without errors
npm run dev

# 3. Check for blocking dependencies
# This PRD has no external dependencies
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`
4. **UI Patterns**: Check `.square-ui-reference/` for layout patterns

### Domain References

| Reference | Purpose |
|-----------|---------|
| `src/components/layout/` | Existing layout components |
| `src/routes/_authed.tsx` | Authenticated route wrapper |
| `.square-ui-reference/templates/` | UI reference templates |

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. Run `npm run typecheck` to verify
5. Test in browser for visual correctness
6. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
7. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## UI Guidelines

### DO
- Follow existing component patterns
- Use Tailwind CSS classes
- Ensure responsive behavior
- Add keyboard navigation
- Follow accessibility standards

### DON'T
- Break existing navigation
- Change layout without testing all screen sizes
- Remove existing functionality

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>FOUND_APPSHELL_COMPLETE</promise>
```

---

*Foundation PRD - App shell and navigation patterns*
