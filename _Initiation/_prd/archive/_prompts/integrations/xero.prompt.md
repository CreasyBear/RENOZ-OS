# Task: Implement Xero Integration

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/integrations/xero.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/int-xero.progress.txt

## PRD ID
INT-XERO

## Phase
integrations

## Priority
1

## Dependencies
- DOM-CUSTOMERS (customer sync)
- DOM-FINANCIAL (invoice sync)

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Xero API credentials configured
# Check .env for XERO_CLIENT_ID, XERO_CLIENT_SECRET
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
| `src/lib/integrations/xero/` | Xero integration code |
| `src/server/functions/xero.ts` | Xero server functions |
| Xero API docs | External API reference |

---

## Integration Points

- **Contacts**: Customer <-> Xero Contact sync
- **Invoices**: Invoice <-> Xero Invoice sync
- **Payments**: Payment allocation sync

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
- Handle OAuth token refresh
- Support bidirectional sync
- Log all API calls
- Handle rate limits gracefully
- Queue sync operations

### DON'T
- Store tokens in plain text
- Make synchronous API calls in UI
- Skip error handling
- Overwrite newer data

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>INT_XERO_COMPLETE</promise>
```

---

*Integration PRD - Xero accounting sync*
