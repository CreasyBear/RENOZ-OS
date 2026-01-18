# Task: Implement Notifications Cross-Cutting Concern

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/cross-cutting/notifications.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/cc-notifications.progress.txt

## PRD ID
CC-NOTIFICATIONS

## Phase
cross-cutting

## Priority
2

## Dependencies
- FOUND-SCHEMA (notification schema)
- FOUND-APPSHELL (notification UI location)

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
| `lib/schema/notifications.ts` | Notification database schema |
| `src/components/shared/notifications/` | Notification UI components |

---

## Notification Types

- **Toast**: Immediate, auto-dismiss feedback
- **In-App**: Persistent, requires action
- **Email**: External notification

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
- Use toast for immediate feedback
- Store persistent notifications in DB
- Support notification preferences
- Mark as read on interaction

### DON'T
- Spam users with notifications
- Skip notification persistence
- Use inconsistent patterns

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>CC_NOTIFICATIONS_COMPLETE</promise>
```

---

*Cross-Cutting PRD - Notification patterns*
