# Reference Repositories

Repos worth studying for AI patterns, ordered by relevance to Renoz CRM.

---

## Tier 1: High Priority

### CopilotKit/CopilotKit
**Stars:** 27,862 | **Language:** TypeScript

Best React/Next.js AI UI patterns. Shows how to build in-app AI copilots.

**What to study:**
- `useCopilotReadable` - Context injection pattern
- `CopilotSidebar` - Chat UI component
- `CopilotTextarea` - AI-enhanced text input
- Human-in-the-loop approval flows

**Link:** https://github.com/CopilotKit/CopilotKit

---

### mastra-ai/mastra
**Stars:** 19,223 | **Language:** TypeScript

Full-stack AI framework from the Gatsby team. Production-ready patterns.

**What to study:**
- Agent orchestration
- Tool definitions
- Memory management
- Workflow composition

**Link:** https://github.com/mastra-ai/mastra

---

### midday-ai/midday
**Stars:** ~15k | **Language:** TypeScript

Financial/invoicing SaaS with AI assistant. Already referenced in our PRDs.

**What to study:**
- Triage agent pattern (forced handoff)
- Redis memory provider
- Streaming artifacts
- Rate limiting with hono-rate-limiter

**Link:** https://github.com/midday-ai/midday

---

## Tier 2: Medium Priority

### ComposioHQ/composio
**Stars:** 26,336 | **Language:** TypeScript

100+ business integrations. Could save building CRM connectors.

**What to study:**
- Pre-built HubSpot, Salesforce tools
- Tool composition patterns
- OAuth flow handling

**Link:** https://github.com/ComposioHQ/composio

---

### filip-michalsky/SalesGPT
**Stars:** 2,499 | **Language:** Python

Sales conversation agent with stage management.

**What to study:**
- Sales conversation stages
- Lead qualification logic
- Conversation state machine

**Link:** https://github.com/filip-michalsky/SalesGPT

---

### VoltAgent/voltagent
**Stars:** 4,771 | **Language:** TypeScript

Multi-agent with observability focus.

**What to study:**
- Agent tracing/debugging
- Multi-agent coordination
- Observability patterns

**Link:** https://github.com/VoltAgent/voltagent

---

## Tier 3: Reference

### awslabs/agent-squad
**Stars:** 7,182 | **Language:** Python/TypeScript

Enterprise classifier + specialist agents pattern.

**What to study:**
- Enterprise-grade agent architecture
- Classifier agent patterns

**Link:** https://github.com/awslabs/agent-squad

---

### lobehub/lobe-chat
**Stars:** 69,968 | **Language:** TypeScript

Agent workspace with RAG + MCP.

**What to study:**
- Plugin architecture
- MCP integration patterns
- RAG implementation

**Link:** https://github.com/lobehub/lobe-chat

---

### peakmojo/mcp-hubspot
**Stars:** 113 | **Language:** Python

MCP server for HubSpot CRM.

**What to study:**
- MCP server implementation
- CRM-specific tool design
- Vector caching for entities

**Link:** https://github.com/peakmojo/mcp-hubspot

---

## SDK Documentation

| Resource | Link |
|----------|------|
| Vercel AI SDK | https://ai-sdk.dev/docs |
| AI SDK Agents | https://ai-sdk.dev/docs/foundations/agents |
| ai-sdk-tools | https://github.com/midday-ai/ai-sdk-tools |
| @fondation-io/ai-sdk-tools | https://www.npmjs.com/package/@fondation-io/ai-sdk-tools |
| Anthropic Agent SDK | https://github.com/anthropics/claude-agent-sdk-typescript |

---

## Study Order Recommendation

1. **CopilotKit** - UI patterns first (how users interact)
2. **Midday** - Production patterns (how it's built)
3. **Mastra** - Framework patterns (alternative architecture)
4. **Composio** - Integration patterns (external services)
5. **SalesGPT** - Domain patterns (sales-specific logic)
