# Task: Refactor Components

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/refactoring/components.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/ref-components.progress.txt

## PRD ID
REF-COMPONENTS

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
| Component structure | `src/components/domain/customers/` |
| UI patterns | `.square-ui-reference/templates/` |

---

## File Ownership

YOU MAY modify:
```
src/components/**/*.tsx
src/components/**/*.ts
```

YOU MUST NOT modify:
- Schema files (lib/schema/)
- Server functions (src/server/functions/)
- Route logic (keep route files minimal)

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Refactor component per acceptance criteria
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
- Extract reusable components
- Split large components (> 300 lines)
- Use composition over inheritance
- Add TypeScript props interfaces

### DON'T
- Change component APIs
- Remove existing functionality
- Add new features (refactoring only)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>REF_COMPONENTS_COMPLETE</promise>
```

---

*Refactoring PRD - Component organization*
