---
status: complete
priority: p3
issue_id: "016"
tags: [prd-review, architecture, sdk, ai-infrastructure]
dependencies: []
resolution: documented-in-roadmap-v1.2
---

# Evaluate Unified SDK Strategy

## Problem Statement

The PRD proposes using two different SDKs (Vercel AI SDK for chat, Anthropic Agent SDK for background tasks), which introduces:
- Dual mental models for agent development
- Inconsistent tool definitions (Vercel AI SDK tools vs MCP tools)
- Potential state synchronization issues

## Findings

**Source:** Architecture Strategist Agent

**Location:** PRD lines 29-40 (infrastructure.vercel_ai_sdk, infrastructure.anthropic_agent_sdk)

**Current design:**
```
Interactive Chat → Vercel AI SDK (useChat, streamText)
Background Tasks → Anthropic Agent SDK (query(), agent loop, MCP tools)
```

**Vercel AI SDK v6 capabilities:**
- `ToolLoopAgent` class for agent definitions
- `createAgentUIStreamResponse` for streaming
- Supports both interactive and background workflows

**Question:** Is the dual-SDK approach still necessary, or can Vercel AI SDK v6 handle both use cases?

## Proposed Solutions

### Option A: Keep Dual SDK (Current PRD)
- **Pros:** Purpose-built tools for each use case
- **Cons:** Developer complexity, inconsistent patterns
- **Effort:** None (current plan)
- **Risk:** Medium (long-term maintenance)

### Option B: Unify on Vercel AI SDK v6 (Consider)
- **Pros:** Single mental model, consistent tool definitions, simpler codebase
- **Cons:** May need to adapt some patterns, less MCP integration
- **Effort:** Medium (PRD rewrite)
- **Risk:** Low if SDK covers requirements

### Option C: Unify on Anthropic Agent SDK (Consider)
- **Pros:** Full MCP support, native Anthropic patterns
- **Cons:** Different streaming patterns, less community support
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

Document the trade-offs and make an explicit decision. If Vercel AI SDK v6's `ToolLoopAgent` can handle background tasks with Trigger.dev, Option B may simplify the architecture.

## Technical Details

**Evaluation criteria:**
1. Can Vercel AI SDK agents run in Trigger.dev background jobs?
2. Can tool definitions be shared between interactive and background agents?
3. Does MCP integration work with Vercel AI SDK?
4. What is the streaming support for each approach?

**Reference:** Midday uses `@ai-sdk-tools/agents` with a unified approach. Investigate if this package works with Anthropic models.

**Decision points to document:**
- Why two SDKs vs one
- Tool definition strategy (Zod schemas vs MCP)
- State sharing between interactive and background agents

## Acceptance Criteria

- [ ] Evaluation completed for unified vs dual SDK
- [ ] Decision documented in PRD or architecture doc
- [ ] Trade-offs explicitly stated
- [ ] If unified, update PRD stories accordingly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-25 | Created from architecture review | Dual SDK adds complexity; evaluate if needed |

## Resources

- Vercel AI SDK v6 documentation
- Anthropic Agent SDK documentation
- Midday reference implementation
