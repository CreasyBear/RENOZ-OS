# Ralph Loop: AI Infrastructure Domain

## Objective

YOU MUST complete the stories in `ai-infrastructure.prd.json` sequentially. This PRD implements the hybrid AI architecture for Renoz CRM.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State

Read `progress.txt` in this directory to determine the current story. If `progress.txt` does not exist, start with `AI-INFRA-001`.

## Context Files

- **PRD**: `_Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json`
- **Architecture Reference**: `_Initiation/_ralph/AI-patterns/BLUEPRINT.md` (implementation details)
- **Vision Reference**: `_Initiation/_ralph/AI-patterns/VISION.md` (architectural decisions)
- **Conventions**: `_Initiation/_meta/conventions.md`
- **Glossary**: `_Initiation/_meta/glossary.md`

## Architecture Summary

This PRD implements 19 stories across 5 phases:

1. **Database Layer** (Stories 001-004)
   - `ai_conversations` - Chat history and agent handoffs
   - `ai_approvals` - Human-in-the-loop approval queue
   - `ai_agent_tasks` - Background task queue
   - `ai_cost_tracking` - Token usage and cost metrics

2. **Agent Layer** (Stories 005-006)
   - Haiku triage router (1 turn, forced handoff)
   - Sonnet specialists (customer, order, analytics, quote)

3. **UI Layer** (Stories 007-010)
   - Approval modal for draft-approve pattern
   - Cost indicator badge
   - Artifact renderer with progressive loading
   - Chat panel with streaming

4. **Infrastructure Layer** (Stories 011-012)
   - Trigger.dev background task processing
   - Redis + Postgres memory providers

5. **API & Integration Layer** (Stories 013-019)
   - Chat streaming API route with tool calling
   - Tool implementations for all 4 specialist agents
   - Approval execution engine
   - Artifacts streaming API
   - Approval expiry cron job
   - Rate limiting (Upstash)
   - Cost budget enforcement

## Dependencies

This PRD depends on:
- `FOUND-AUTH` - Authentication context for user/org scoping
- `FOUND-SCHEMA` - Base schema patterns and migrations
- `FOUND-SHARED` - UI primitives (Dialog, Badge, Tooltip, Spinner)
- `FOUND-APPSHELL` - Layout components for chat panel integration

## Process

1. Read `progress.txt` to find current story
2. Read the PRD for story acceptance criteria
3. Implement the acceptance criteria exactly
4. Run: `bun run typecheck`
5. Run relevant tests if any
6. If ALL criteria pass:
   - Mark story `[x]` in `progress.txt`
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
7. If criteria fail:
   - Debug and fix
   - Stay on current story

## Story Execution Order

```
PHASE 1: Schema (no deps)
AI-INFRA-001 → AI-INFRA-002 → AI-INFRA-003 → AI-INFRA-004
                   ↓
PHASE 2: Agents (depends on schema)
AI-INFRA-005 → AI-INFRA-006
                   ↓
PHASE 3: Tools & Infrastructure (depends on agents)
AI-INFRA-014 (tools) ──┬── AI-INFRA-018 (rate limit)
                       ├── AI-INFRA-019 (budget)
AI-INFRA-011 (trigger) ┘   AI-INFRA-012 (memory)
                       │        │
PHASE 4: API Routes    ↓        ↓
AI-INFRA-013 (chat) ←──┴────────┘
AI-INFRA-015 (approve)
AI-INFRA-016 (artifacts)
AI-INFRA-017 (cron)
                   ↓
PHASE 5: UI (depends on API routes)
AI-INFRA-007 → AI-INFRA-008 → AI-INFRA-009 → AI-INFRA-010
```

Note: Stories AI-INFRA-018 and AI-INFRA-019 have no deps and can run early.

## File Ownership

This domain owns:
```
drizzle/schema/_ai/**
src/lib/ai/**
src/components/ai/**
src/app/api/ai/**
src/trigger/jobs/ai-*.ts
src/trigger/jobs/expire-approvals.ts
src/hooks/use-artifact.ts
```

Do NOT modify files outside these directories.

## Key Patterns

### Triage Agent (Story 005)
```typescript
const triageAgent = new Agent({
  model: 'claude-3-5-haiku-20241022',
  temperature: 0.1,
  maxTurns: 1,
  modelSettings: {
    toolChoice: { type: 'tool', toolName: 'handoff_to_agent' }
  }
});
```

### Draft-Approve Tool Return
```typescript
return {
  type: 'approval_required',
  action: 'create_order',
  draft: orderData,
  approvalActions: ['approve', 'edit', 'discard']
};
```

### Memory Injection
```typescript
const enrichedPrompt = `
${agent.system}

## User Context
${workingMemory.currentPage}

## Learned Preferences
${learnings.map(l => `- ${l.content}`).join('\n')}
`;
```

## Completion

When ALL 19 stories pass:
```xml
<promise>AI_INFRASTRUCTURE_DOMAIN_COMPLETE</promise>
```

## Constraints

- Follow conventions.md patterns exactly
- Use glossary.md terminology
- Do NOT modify files outside your domain
- Do NOT skip acceptance criteria
- All acceptance criteria are testable and specific
- Run typecheck after every code change

## If Stuck

- After 5 iterations on same story: Add blocker to `progress.txt`
- After 10 iterations: Output `<promise>STUCK_NEEDS_HELP</promise>`

## Environment Requirements

Before execution, ensure:
- `ANTHROPIC_API_KEY` is set
- `REDIS_URL` is set (required for working memory)
- `DATABASE_URL` is set (for schema migrations)

## Verification Commands

```bash
# Typecheck
bun run typecheck

# Run migrations
bun run db:migrate

# Test Redis connection
bun run test:redis

# Build verification
bun run build
```
