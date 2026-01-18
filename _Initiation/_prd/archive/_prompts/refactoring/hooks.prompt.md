# Task: Refactor Hooks

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/refactoring/hooks.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/ref-hooks.progress.txt

## PRD ID
REF-HOOKS

## Phase
refactoring

## Priority
2

## Dependencies
- REF-SERVER (server function patterns)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Verify REF-SERVER is complete
grep "REF_SERVER_COMPLETE" memory-bank/prd/_progress/ref-server.progress.txt
```

---

## Context Files

### Required Reading (in order)

1. **Progress File**: Check for learnings from previous iterations
2. **PRD File**: Get current story and acceptance criteria
3. **Conventions**: `memory-bank/_meta/conventions.md`

### Reference Patterns

| Pattern | Reference File |
|---------|---------------|
| Hook structure | `src/hooks/` |
| Query patterns | TanStack Query docs |

---

## File Ownership

YOU MAY modify:
```
src/hooks/**/*.ts
src/hooks/**/*.tsx
```

YOU MUST NOT modify:
- Schema files (lib/schema/)
- Server functions (src/server/functions/)
- Component logic (only hook extraction)

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Refactor hooks per acceptance criteria
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

## Refactoring Guidelines

### DO
- Extract common logic to hooks
- Group related hooks
- Use proper TypeScript generics
- Follow React hooks rules

### DON'T
- Change hook APIs
- Break existing usages
- Add new features (refactoring only)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>REF_HOOKS_COMPLETE</promise>
```

---

*Refactoring PRD - Hook organization*
