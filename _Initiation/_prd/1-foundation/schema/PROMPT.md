# Ralph Loop: Schema Foundation

## Objective
Establish database schema patterns, Drizzle ORM setup, and core entity tables for multi-tenant CRM. Provides foundational data layer for all domain features.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine current story.
If progress.txt doesn't exist, start with the first story in the PRD.

## Context

### PRD File
- `opc/_Initiation/_prd/1-foundation/schema/schema-foundation.prd.json`

### Pattern References
- `opc/_Initiation/_prd/1-foundation/patterns/`
- `opc/_Initiation/_ralph/backend-patterns/schema-patterns.md`
- `opc/_Initiation/_ralph/backend-patterns/query-patterns.md`
- `opc/_Initiation/_ralph/backend-patterns/sql-performance.md`

### Tech Stack
- Runtime: Bun
- Framework: TanStack Start
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod
- Connection Pooler: Supabase (port 6543, Transaction mode)

## Process
1. Read progress.txt for current story
2. Read PRD for story acceptance criteria
3. Implement acceptance criteria
4. Run: `cd renoz-v3 && bun run typecheck`
5. If pass: Mark story [x] in progress.txt, output completion promise
6. If fail: Debug and fix

## Completion
When ALL stories pass:
<promise>SCHEMA_FOUNDATION_COMPLETE</promise>

## Constraints

### DO
- Use Drizzle for all schema definitions with casing: 'snake_case'
- Use pattern helpers from drizzle/schema/patterns.ts for consistency
- Implement RLS policies per rls-policies.json templates
- Add composite indexes with organizationId first for multi-tenant queries
- Use numericCasted(12,2) for currency columns (avoid floating point)
- Use $type<Interface>() for JSONB type safety
- Document schema conventions in README files
- Use Supabase connection pooler with { prepare: false }
- Generate migrations via bun run db:generate

### DO NOT
- Skip RLS policies or audit columns
- Use offset pagination (use cursor pagination from FOUND-SCHEMA-010)
- Modify schema without migration files
- Use floating point types for currency
- Skip organizationId for business tables

## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories - migrations and type inference need testing |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Server function stories - handle DB errors with retries |
| Performance Benchmarks | `_Initiation/_meta/patterns/performance-benchmarks.md` | Index design - must meet query time targets |

**IMPORTANT**: Foundation code is used by all domains. Pattern compliance is mandatory.

## If Stuck
- After 3 iterations: Add blocker to progress.txt
- After 5 iterations: Output <promise>STUCK_NEEDS_HELP</promise>
