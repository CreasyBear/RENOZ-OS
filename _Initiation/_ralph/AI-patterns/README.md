# AI Patterns for Renoz CRM

Reference documentation for AI architecture decisions, patterns, and implementation guidance.

## Authoritative Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[VISION.md](./VISION.md)** | Architecture philosophy, decisions, evolution | Understanding WHY |
| **[BLUEPRINT.md](./BLUEPRINT.md)** | Implementation details, schemas, code | Understanding HOW |

These documents supersede all other files in this directory for architectural decisions.

---

## Stack Decision (Updated 2026-01-11)

**Hybrid SDK Architecture** - Different tools for different jobs:

| Use Case | SDK | Rationale |
|----------|-----|-----------|
| Chat UI, streaming | Vercel AI SDK | Best React hooks (useChat), multi-provider |
| Autonomous workflows | Anthropic Agent SDK | Built-in agent loop, safety controls |
| Background jobs | Anthropic Agent SDK | Context management, long-running tasks |

| Component | Choice | Notes |
|-----------|--------|-------|
| **Chat Interface** | Vercel AI SDK 6 | @ai-sdk/anthropic provider |
| **Autonomous Tasks** | Anthropic Agent SDK | query() with agent loop |
| **Memory** | @ai-sdk-tools/memory | DrizzleProvider (Postgres) |
| **Artifacts** | @ai-sdk-tools/artifacts | Progressive streaming |
| **Multi-Agent** | @ai-sdk-tools/agents | Original repo has handoffs |
| **Tool Protocol** | MCP | Shared between both SDKs |

## Pattern Reference Files

| File | Contents |
|------|----------|
| [architecture.md](./architecture.md) | Hub-spoke topology patterns |
| [agents.md](./agents.md) | Triage + specialist agent definitions |
| [memory.md](./memory.md) | 3-tier memory (working/session/long-term) |
| [tools.md](./tools.md) | Tool design with _meta patterns |
| [artifacts.md](./artifacts.md) | Progressive loading stages |
| [integrations.md](./integrations.md) | MCP, Xero, Resend connectors |
| [repos-to-study.md](./repos-to-study.md) | CopilotKit, Mastra, Midday references |
| **[midday-analysis.md](./midday-analysis.md)** | **Deep dive: What Midday did well/poorly** |

## Key Principles

1. **Triage-First** - Haiku routes, Sonnet executes (30x cost savings)
2. **Least Privilege** - Agents only get tools they need
3. **Draft-Approve** - AI drafts, humans approve destructive actions
4. **Proactive Metadata** - Tools return `_meta` with computed insights
5. **Progressive Loading** - Stream artifacts: loading → data → analysis
6. **Cost-Aware Routing** - Use cheap models for routing, expensive for reasoning

## Quick Start

```typescript
// Vercel AI SDK - Chat interface
import { useChat } from 'ai/react';
const { messages, handleSubmit } = useChat({ api: '/api/ai/chat' });

// Anthropic Agent SDK - Background task
import { query } from '@anthropic-ai/claude-agent-sdk';
const result = await query({ prompt: 'Analyze Q4 invoices', options: { model: 'claude-sonnet-4' } });
```

## Related PRDs

- REF-AI-000: Triage Agent with Forced Handoff
- REF-AI-001: Memory Provider (Drizzle + optional Redis)
- REF-AI-002: Streaming Artifacts with Progressive Stages

---

*Updated: 2026-01-11 - Hybrid SDK architecture research complete*
