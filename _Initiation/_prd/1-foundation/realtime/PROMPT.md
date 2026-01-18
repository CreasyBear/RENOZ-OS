# Ralph Loop: Realtime & Webhooks Foundation

## Objective
Implement Supabase Realtime subscriptions for live updates and database webhooks for event-driven architecture. Provides broadcast triggers, React hooks for subscriptions, Edge Functions for webhooks, and Trigger.dev integration for background jobs.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine current story.
If progress.txt doesn't exist, start with the first story in the PRD.

## Context

### PRD File
- `opc/_Initiation/_prd/1-foundation/realtime/realtime-webhooks-foundation.prd.json`

### Pattern References
- `opc/_Initiation/_prd/1-foundation/patterns/`
- `opc/_Initiation/_ralph/backend-patterns/realtime-patterns.md`
- `opc/_Initiation/_ralph/backend-patterns/webhooks-patterns.md`

### Tech Stack
- Runtime: Bun (app), Deno (Edge Functions)
- Framework: TanStack Start
- Realtime: Supabase Realtime (Broadcast)
- Webhooks: Database Webhooks (pg_net)
- Functions: Supabase Edge Functions
- Background: Trigger.dev
- Database: PostgreSQL

## Process
1. Read progress.txt for current story
2. Read PRD for story acceptance criteria
3. Implement acceptance criteria
4. Run: `cd renoz-v3 && bun run typecheck` (for React hooks)
5. Test Edge Functions: `supabase functions serve`
6. If pass: Mark story [x] in progress.txt, output completion promise
7. If fail: Debug and fix

## Completion
When ALL stories pass:
<promise>REALTIME_FOUNDATION_COMPLETE</promise>

## Constraints

### DO
- Use realtime.broadcast_changes() for database triggers
- Scope channels by organizationId for multi-tenant isolation (orders:{org_id})
- Create React hooks that auto-invalidate TanStack Query on updates
- Implement proper cleanup (removeChannel) on unmount
- Verify webhook secrets in Edge Functions (Authorization header)
- Use Trigger.dev for long-running jobs (PDF, email, sync)
- Implement exponential backoff for reconnection
- Document realtime and webhook patterns in README
- Test locally with Supabase CLI before deploying

### DO NOT
- Skip webhook signature verification
- Broadcast sensitive data in realtime payloads
- Allow cross-organization subscriptions
- Skip error handling in Edge Functions
- Use realtime for long-running operations (use webhooks + Trigger.dev)
- Skip proper cleanup of subscriptions

## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_Initiation/_meta/patterns/testing-standards.md` | All stories - hooks and Edge Functions need reliability tests |
| Error Recovery | `_Initiation/_meta/patterns/error-recovery.md` | Webhook stories - Pattern 1 for retries, Pattern 4 for email delivery |
| Performance Benchmarks | `_Initiation/_meta/patterns/performance-benchmarks.md` | Realtime hooks - reconnection within targets; Edge Functions - fast response |

**IMPORTANT**: Foundation code is used by all domains. Pattern compliance is mandatory.

Error recovery is critical for webhooks:
- Pattern 1 (Sync Failure Recovery): Exponential backoff with dead letter queue for failed webhooks
- Pattern 4 (Email Send Failure): Status tracking and retry for notification delivery

## If Stuck
- After 3 iterations: Add blocker to progress.txt
- After 5 iterations: Output <promise>STUCK_NEEDS_HELP</promise>
