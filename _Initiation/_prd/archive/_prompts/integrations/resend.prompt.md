# Task: Implement Resend Email Integration

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/integrations/resend.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/int-resend.progress.txt

## PRD ID
INT-RESEND

## Phase
integrations

## Priority
2

## Dependencies
- DOM-COMMUNICATIONS (email domain)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Resend API key configured
# Check .env for RESEND_API_KEY
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
| `src/lib/integrations/resend/` | Resend integration code |
| `src/server/functions/emails.ts` | Email server functions |
| Resend API docs | External API reference |

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

## Integration Guidelines

### DO
- Use React Email for templates
- Track email delivery status
- Handle bounces and complaints
- Queue email sends

### DON'T
- Send emails synchronously
- Skip delivery tracking
- Hardcode email templates

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>INT_RESEND_COMPLETE</promise>
```

---

*Integration PRD - Resend email delivery*
