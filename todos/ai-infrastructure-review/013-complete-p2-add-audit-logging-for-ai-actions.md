---
status: pending
priority: p2
issue_id: "013"
tags: [prd-review, security, compliance, audit, ai-infrastructure]
dependencies: []
---

# Add Audit Logging for AI Actions

## Problem Statement

The existing audit infrastructure (`audit-logs.ts`) provides robust action logging, but the AI PRD does not specify audit log integration. This creates compliance gaps for:
- GDPR "right to explanation" of AI decisions
- SOC 2 logging for AI-initiated data access
- Incident response and forensics

## Findings

**Source:** Security Sentinel Agent

**Location:** PRD does not mention audit logging integration

**Missing logging for:**
- Prompt content (sanitized for privacy)
- Tool invocations with parameters
- Agent handoff decisions
- Approval decisions with approver identity
- Budget/rate limit enforcement events

**Existing infrastructure:**
- `drizzle/schema/_shared/audit-logs.ts` - has robust schema
- `src/lib/audit.ts` - likely has logging utilities

## Proposed Solutions

### Option A: Extend Existing Audit System (Recommended)
- **Pros:** Consistent with existing infrastructure
- **Cons:** May need schema extension
- **Effort:** Medium
- **Risk:** Low

### Option B: Create Separate AI Audit Table
- **Pros:** AI-specific fields
- **Cons:** Duplicates infrastructure
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Option A - Extend existing audit system with AI-specific action types.

## Technical Details

**Add to PRD acceptance criteria (multiple stories):**

**AI-INFRA-013 (Chat API):**
```json
"Log tool invocations to audit_logs with action='ai.tool_call'"
```

**AI-INFRA-015 (Approval Execution):**
```json
"Log approval decisions to audit_logs with action='ai.approval_approved' or 'ai.approval_rejected'"
```

**AI-INFRA-018 (Rate Limiting):**
```json
"Log rate limit violations to audit_logs with action='ai.rate_limited'"
```

**AI-INFRA-019 (Budget Enforcement):**
```json
"Log budget exceeded events to audit_logs with action='ai.budget_exceeded'"
```

**Audit action types to add:**
```typescript
// AI action types for audit logging
const AI_AUDIT_ACTIONS = {
  CHAT_MESSAGE: 'ai.chat_message',
  TOOL_CALL: 'ai.tool_call',
  AGENT_HANDOFF: 'ai.agent_handoff',
  APPROVAL_CREATED: 'ai.approval_created',
  APPROVAL_APPROVED: 'ai.approval_approved',
  APPROVAL_REJECTED: 'ai.approval_rejected',
  APPROVAL_EXPIRED: 'ai.approval_expired',
  TASK_QUEUED: 'ai.task_queued',
  TASK_COMPLETED: 'ai.task_completed',
  TASK_FAILED: 'ai.task_failed',
  RATE_LIMITED: 'ai.rate_limited',
  BUDGET_EXCEEDED: 'ai.budget_exceeded',
} as const;
```

**Metadata structure:**
```typescript
interface AiAuditMetadata {
  conversationId?: string;
  taskId?: string;
  agentName?: string;
  toolName?: string;
  toolParams?: Record<string, unknown>; // Sanitized
  approvalId?: string;
  budgetUsed?: number;
  budgetLimit?: number;
}
```

## Acceptance Criteria

- [ ] AI action types defined in audit system
- [ ] Tool invocations logged with sanitized params
- [ ] Approval decisions logged with user identity
- [ ] Rate limit/budget violations logged
- [ ] PRD stories updated with audit requirements

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from security review | AI actions need audit trail for compliance |

## Resources

- `drizzle/schema/_shared/audit-logs.ts`
- GDPR Article 22 (automated decision-making)
- SOC 2 logging requirements
