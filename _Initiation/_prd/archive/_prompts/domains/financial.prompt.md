# Task: Implement Financial Domain

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/domains/financial.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/dom-financial.progress.txt

## PRD ID
DOM-FINANCIAL

## Phase
domain-core

## Priority
2

## Dependencies
- DOM-ORDERS (order reference)
- DOM-CUSTOMERS (customer reference)
- INT-XERO (accounting integration)

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
| `lib/schema/invoices.ts` | Invoice database schema |
| `lib/schema/payments.ts` | Payment database schema |
| `src/server/functions/invoices.ts` | Invoice server functions |
| `src/components/domain/financial/` | Financial UI components |

---

## Invoice Lifecycle

```
Draft → Sent → Partially Paid → Paid → Voided
                    ↓
                 Overdue
```

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. For schema stories: Run `npm run db:generate`
5. Run `npm run typecheck` to verify
6. If tests pass:
   - Set `story.passes = true` in prd.json
   - Append success to progress.txt
   - Commit with message: "Complete [STORY-ID]: Story Title"
7. If tests fail:
   - Append learnings to progress.txt
   - Do NOT modify prd.json
   - Retry with fixes

---

## Domain Guidelines

### DO
- Sync with Xero for accounting
- Track payment allocations
- Calculate tax correctly
- Support credit notes

### DON'T
- Break Xero integration
- Modify paid invoices
- Skip audit logging

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>DOM_FINANCIAL_COMPLETE</promise>
```

---

*Domain PRD - Invoicing and payments*
