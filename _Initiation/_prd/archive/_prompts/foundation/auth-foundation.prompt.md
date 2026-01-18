# Task: Implement Auth Foundation Enhancement

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/foundation/auth-foundation.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/found-auth.progress.txt

## PRD ID
FOUND-AUTH

## Phase
foundation

## Priority
2

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
4. **Glossary**: `memory-bank/_meta/glossary.md`
5. **Assumptions**: `memory-bank/_meta/assumptions.md`

### Domain References

| Reference | Purpose |
|-----------|---------|
| `src/lib/auth/README.md` | Existing auth documentation |
| `src/server/functions/auth.ts` | Current auth server functions |
| `src/lib/auth/` | Auth orchestrator and state |

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

## Story Completion Checklist

Before marking a story complete:

- [ ] ALL acceptance criteria met
- [ ] `npm run typecheck` passes
- [ ] No breaking changes to existing functionality
- [ ] Progress file updated

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>FOUND_AUTH_COMPLETE</promise>
```

---

## Failure Signals

If stuck or need intervention:
```xml
<promise>STUCK_NEEDS_HELP</promise>
<promise>FAILED_NEEDS_INTERVENTION</promise>
```

---

*Foundation PRD - Auth patterns for the entire application*
