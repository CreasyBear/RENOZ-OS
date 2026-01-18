# Task: Implement Schema Foundation Enhancement

## Context
Read the PRD file to find the first story where `passes: false`.
Read the progress file for learnings from previous iterations.
Read `AGENTS.md` and conventions for project patterns.

## Project Location
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack

## PRD File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/foundation/schema-foundation.prd.json

## Progress File
/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/memory-bank/prd/_progress/found-schema.progress.txt

## PRD ID
FOUND-SCHEMA

## Phase
foundation

## Priority
1

## Dependencies
None - Foundation PRD

---

## Pre-Flight Checks

Before starting, verify:

```bash
# 1. TypeScript compiles
npm run typecheck

# 2. Database generation works
npm run db:generate

# 3. Check for blocking dependencies
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
| `lib/schema/` | Database schema definitions |
| `lib/schemas/` | Zod validation schemas |
| `drizzle/migrations/` | Database migrations |

---

## Workflow

1. Find the first story where `passes: false`
2. Check dependencies - all must have `passes: true`
3. Implement according to acceptance_criteria
4. Run `npm run db:generate` for schema changes
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

## Schema Guidelines

### DO
- Follow existing table naming conventions (snake_case)
- Add proper indexes for foreign keys
- Create RLS policies for all new tables
- Export types from schema files
- Add to lib/schema/index.ts barrel export

### DON'T
- Break existing migrations
- Change column types on existing tables without migration
- Add nullable columns without defaults to existing tables

---

## Completion Signals

When the target story passes:
```xml
<promise>[STORY_ID]_COMPLETE</promise>
```

When ALL stories in this PRD have `passes: true`:
```xml
<promise>FOUND_SCHEMA_COMPLETE</promise>
```

---

*Foundation PRD - Database schema patterns for all domains*
