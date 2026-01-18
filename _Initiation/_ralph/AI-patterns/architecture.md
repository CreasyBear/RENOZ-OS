# AI Architecture Patterns

## Topology Options

### Option A: Centralized (Single Agent)

```
User → Main Agent → All Tools
```

**Pros:**
- Simpler implementation
- Single context window
- Easier debugging

**Cons:**
- Context bloat with many tools
- Jack-of-all-trades, master of none
- Hard to specialize prompts

**When to use:** Simple assistants, < 10 tools

---

### Option B: Hub-and-Spoke (Recommended)

```
User → Triage Agent → [Customer Agent | Order Agent | Analytics Agent]
                    → Each has specialized tools + context
```

**Pros:**
- Specialists have focused context
- Triage is fast (Haiku) and cheap
- Easy to add new domains
- Better prompt engineering per domain

**Cons:**
- Handoff latency
- Context loss between agents
- More complex orchestration

**When to use:** Domain-specific CRM queries, production systems

**Implementation (Midday pattern):**
```typescript
// Triage agent - forced handoff, never responds directly
const triageAgent = new Agent({
  model: 'claude-3-5-haiku',
  temperature: 0.1,
  maxTurns: 1,
  modelSettings: {
    toolChoice: { type: 'tool', toolName: 'handoff_to_agent' }
  },
  handoffs: [customerAgent, orderAgent, analyticsAgent]
});
```

---

### Option C: Swarm (Parallel)

```
User → Coordinator → [Agent 1] ──┐
                  → [Agent 2] ──┼→ Synthesis → Response
                  → [Agent 3] ──┘
```

**Pros:**
- Fast for multi-domain queries
- Can gather info in parallel
- Comprehensive responses

**Cons:**
- Expensive (multiple agent calls)
- Complex synthesis
- Harder to debug

**When to use:** Complex queries spanning multiple domains

---

## Renoz Decision: Hub-and-Spoke

Rationale:
1. CRM queries are usually domain-specific
2. Triage is cheap with Haiku
3. Specialists can have tailored prompts
4. Easy to add new domain agents later

## Agent Hierarchy

```
                    ┌──────────────┐
                    │   Triage     │ (Haiku, routes only)
                    │   Agent      │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Customer   │   │   Order     │   │  Analytics  │
│   Agent     │   │   Agent     │   │   Agent     │
│  (Sonnet)   │   │  (Sonnet)   │   │  (Sonnet)   │
└─────────────┘   └─────────────┘   └─────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
[Customer Tools]  [Order Tools]    [Report Tools]
```

## Context Flow

1. User sends message
2. Triage classifies intent (1 turn max)
3. Handoff includes:
   - Original user message
   - Conversation history (last 10 turns)
   - Current page context
   - User preferences from memory
4. Specialist executes with focused tools
5. Response streams back to user
