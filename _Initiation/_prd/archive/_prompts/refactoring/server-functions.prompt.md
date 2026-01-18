# Task: Refactor Server Functions

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/refactoring/server-functions.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/ref-server.progress.txt

## PRD ID
REF-SERVER

## Phase
refactoring

## Priority
1 (BLOCKING)

## Dependencies
None - This is the FIRST PRD in the sequence

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. No blocking PRDs (this is first)
# This is the first PRD in the sequence - no dependencies
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
| Server function structure | `src/server/functions/customers.ts` |
| Validation pattern | `memory-bank/_meta/conventions.md` |
| Error handling | `src/lib/errors/app-error.ts` |

---

## File Ownership

YOU MAY modify:
```
src/server/functions/*.ts
src/server/functions/**/*.ts (new subdirectories)
src/lib/validation/*.ts
```

YOU MUST NOT modify:
- Schema files (lib/schema/)
- Component files (src/components/)
- Route files (src/routes/)

---

## Refactoring Targets

| File | Current Lines | Target | Action |
|------|---------------|--------|--------|
| orders.ts | ~2700 | < 500 per file | Split by subdomain |
| dashboard.ts | ~1000 | < 500 per file | Split by widget type |
| products.ts | ~800 | < 500 per file | Extract variants |

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Refactor code per acceptance criteria
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
- Extract to new files when files exceed 500 lines
- Group related functions together
- Add barrel exports (index.ts) for new directories
- Preserve existing function signatures
- Add JSDoc comments for complex functions

### DON'T
- Change function return types (breaking change)
- Rename exported functions (breaking change)
- Delete functions without deprecation
- Move files without updating imports
- Add new features (refactoring only)

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>REF_SERVER_COMPLETE</promise>
```

---

## Phase Gate

After this PRD completes, Phase 1 can parallelize:
- REF-COMPONENTS
- REF-HOOKS
- REF-AI

---

*Refactoring PRD - Server function organization (BLOCKING)*
