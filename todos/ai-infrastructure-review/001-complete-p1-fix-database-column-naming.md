---
status: pending
priority: p1
issue_id: "001"
tags: [prd-review, schema, naming-conventions, ai-infrastructure]
dependencies: []
---

# Fix Database Column Naming Convention (snake_case)

## Problem Statement

The AI Infrastructure PRD specifies camelCase column names in all 4 database schema definitions, but the project mandates **snake_case** for all database columns per CLAUDE.md Database Conventions.

This is a CRITICAL violation that must be fixed before any implementation begins, as it would create inconsistent naming across the entire codebase.

## Findings

**Source:** Pattern Recognition Specialist Agent

**Location:** `_Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json` lines 43-149

**PRD specifies (WRONG):**
```
"userId", "organizationId", "lastMessageAt", "activeAgent", "agentHistory"
"actionData", "approvedBy", "approvedAt", "rejectionReason", "executedAt"
"taskType", "currentStep", "tokensUsed", "costCents", "queuedAt", "startedAt"
"inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"
```

**Should be (per CLAUDE.md):**
```
"user_id", "organization_id", "last_message_at", "active_agent", "agent_history"
"action_data", "approved_by", "approved_at", "rejection_reason", "executed_at"
"task_type", "current_step", "tokens_used", "cost_cents", "queued_at", "started_at"
"input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens"
```

**Affected tables:**
1. `ai_conversations` - 8+ columns
2. `ai_approvals` - 12+ columns
3. `ai_agent_tasks` - 12+ columns
4. `ai_cost_tracking` - 8+ columns

## Proposed Solutions

### Option A: Update PRD JSON (Recommended)
- **Pros:** Single source fix, all implementers get correct schema
- **Cons:** Manual find/replace needed
- **Effort:** Small (30 minutes)
- **Risk:** Low

### Option B: Fix During Implementation
- **Pros:** None
- **Cons:** PRD and implementation diverge, confusion
- **Effort:** Medium (ongoing corrections)
- **Risk:** High - inconsistency between docs and code

## Recommended Action

Option A - Update the PRD JSON file to use snake_case for all database column names before any implementation begins.

## Technical Details

**Affected files:**
- `_Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json`

**Verification:**
```bash
# After fix, should return 0 results
grep -E '"[a-z]+[A-Z]' ai-infrastructure.prd.json | grep -v "model\|type\|name\|description"
```

## Acceptance Criteria

- [ ] All column names in PRD use snake_case
- [ ] All index names use snake_case
- [ ] All foreign key references use snake_case
- [ ] TypeScript type names can remain PascalCase (AiConversation, AiApproval, etc.)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from PRD review | Pattern recognition agent identified naming convention violation |

## Resources

- CLAUDE.md Database Conventions section
- Existing schema examples: `drizzle/schema/customers/customers.ts`
