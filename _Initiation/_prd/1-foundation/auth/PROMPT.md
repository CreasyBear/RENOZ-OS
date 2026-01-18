# Ralph Loop: Auth Foundation

## Objective
Implement authentication and authorization using Supabase Auth with role-based access control. Provides secure user authentication, permission matrix, session management, and API token support for third-party integrations.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine current story.
If progress.txt doesn't exist, start with the first story in the PRD.

## Context

### PRD File
- `opc/_Initiation/_prd/1-foundation/auth/auth-foundation.prd.json`

### Pattern References
- `opc/_Initiation/_prd/1-foundation/patterns/`
- `opc/_Initiation/_ralph/backend-patterns/server-functions.md`
- `opc/_Initiation/_ralph/backend-patterns/webhooks-patterns.md`

### Tech Stack
- Runtime: Bun
- Framework: TanStack Start
- Auth: Supabase Auth (JWT sessions)
- Database: PostgreSQL + Drizzle ORM
- Session: Supabase JWT tokens
- Rate Limiting: Redis + hono-rate-limiter

## Process
1. Read progress.txt for current story
2. Read PRD for story acceptance criteria
3. Implement acceptance criteria
4. Run: `cd renoz-v3 && bun run typecheck`
5. If pass: Mark story [x] in progress.txt, output completion promise
6. If fail: Debug and fix

## Completion
When ALL stories pass:
<promise>AUTH_FOUNDATION_COMPLETE</promise>

## Constraints

### DO
- Use Supabase Auth for all authentication (email/password MVP)
- Define 7 roles from canonical-enums.json: owner, admin, manager, sales, operations, support, viewer
- Use centralized permission matrix (src/lib/auth/permissions.ts)
- Protect server functions with createProtectedFn wrapper
- Use PermissionGuard component for UI access control
- Implement RLS policies for multi-tenant isolation
- Hash API tokens before storage (never store plain tokens)
- Use rate limiting on auth endpoints (10/min for login)
- Document auth patterns in README

### DO NOT
- Skip permission checks in server functions
- Store plaintext passwords or tokens
- Allow cross-organization data access
- Skip rate limiting on sensitive endpoints
- Hardcode role checks (use permission matrix)
- Skip API token expiry validation

## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories - foundation code needs thorough tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Server stories (FOUND-AUTH-005, 007b, 010) - implement retry/fallback patterns |
| Performance Benchmarks | `_Initiation/_meta/patterns/performance-benchmarks.md` | Auth operations must meet response time targets |

**IMPORTANT**: Foundation code is used by all domains. Pattern compliance is mandatory.

## If Stuck
- After 3 iterations: Add blocker to progress.txt
- After 5 iterations: Output <promise>STUCK_NEEDS_HELP</promise>
