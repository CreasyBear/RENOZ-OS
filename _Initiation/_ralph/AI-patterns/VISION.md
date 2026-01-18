# Renoz CRM AI Architecture Vision

> **Status:** AUTHORITATIVE REFERENCE  
> **Version:** 1.0  
> **Created:** 2026-01-11  
> **Last Updated:** 2026-01-11  
> **Author:** Architecture Team

---

## Executive Summary

Renoz CRM adopts a **hybrid AI architecture** combining Vercel AI SDK for interactive chat experiences with Anthropic Agent SDK for autonomous background workflows. This dual-SDK strategy optimizes for both user responsiveness (streaming, React integration) and operational depth (multi-step tasks, tool orchestration). The architecture is built around a hub-spoke agent topology, tiered memory system, and progressive artifact streaming, enabling AI to serve as both a conversational assistant and an autonomous business operator.

---

## 1. Architecture Philosophy

### Guiding Principles

| Principle | Rationale |
|-----------|-----------|
| **Separation of Concerns** | Chat UI vs. autonomous work require different execution models |
| **Least Privilege** | Agents receive only the tools they need for their domain |
| **Human-in-the-Loop by Default** | AI drafts, humans approve for all destructive operations |
| **Progressive Disclosure** | Stream data as it becomes available, don't block on full computation |
| **Memory is Context** | Past interactions inform current behavior without explicit recall |
| **Cost-Aware Routing** | Use cheap models (Haiku) for routing, expensive models (Sonnet/Opus) for reasoning |

### Design Constraints

1. **Serverless-Compatible**: Primary architecture must work in serverless (Vercel, Cloudflare)
2. **Multi-Tenant**: All data paths must respect org-scoping
3. **Auditable**: Every AI action must be logged for compliance
4. **Degradable**: AI features must fail gracefully without blocking core CRM

### Anti-Patterns to Avoid

- Single monolithic agent with all tools (context bloat, poor specialization)
- Direct database writes from AI without approval workflow
- Storing conversation history without TTL (unbounded growth)
- Synchronous AI calls blocking page loads

---

## 2. Dual-SDK Strategy

### Why Two SDKs?

Neither SDK alone covers all use cases. Each excels at a specific pattern:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RENOZ AI ARCHITECTURE                        │
├─────────────────────────────┬───────────────────────────────────────┤
│      VERCEL AI SDK          │       ANTHROPIC AGENT SDK             │
│  (Interactive, Real-time)   │    (Autonomous, Long-running)         │
├─────────────────────────────┼───────────────────────────────────────┤
│ ▪ Chat interface            │ ▪ Multi-step workflows                │
│ ▪ Streaming responses       │ ▪ Background job processing           │
│ ▪ useChat/useCompletion     │ ▪ Supervisor/worker patterns          │
│ ▪ Multi-provider flexibility│ ▪ MCP tool integration                │
│ ▪ React server components   │ ▪ Human-in-the-loop hooks             │
│ ▪ Edge-compatible           │ ▪ File system operations              │
└─────────────────────────────┴───────────────────────────────────────┘
```

### Vercel AI SDK: When to Use

**Use for:**
- Chat interfaces (customer support, general Q&A)
- Quick lookups ("show me customer X")
- Dashboard insights generation
- Streaming artifact rendering
- Any interaction requiring <3 second response

**Key Integrations:**
```typescript
// React hook pattern
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { context: pageContext },
  onToolCall: handleToolResult,
})
```

**Midday ai-sdk-tools Enhancements:**
| Package | Use Case | Benefit |
|---------|----------|---------|
| `@ai-sdk-tools/agents` | Multi-agent handoffs | Triage → Specialist routing |
| `@ai-sdk-tools/memory` | DrizzleProvider | Postgres-native memory |
| `@ai-sdk-tools/artifacts` | Streaming UI updates | Progressive loading |
| `@ai-sdk-tools/cache` | Tool result caching | 80% cost reduction |

### Anthropic Agent SDK: When to Use

**Use for:**
- Complex report generation (financial analysis, forecasting)
- Bulk operations (send 100 follow-up emails)
- Data migration or cleanup tasks
- Integration syncs (Xero, HubSpot)
- Anything requiring 10+ tool calls or >30 seconds

**Key Features:**
```yaml
# .claude/agents/financial-analyst.md
---
name: financial-analyst
model: claude-sonnet-4-20250514
tools:
  - get_invoices
  - get_payments
  - run_report
  - create_export
hooks:
  PreToolUse: validate_permissions
  PostToolUse: log_action
---
You are a financial analyst agent for Renoz CRM...
```

**Execution Model:**
```
Request → Lead Agent → Subagent Pool → MCP Tools → Result
             ↓
        Gather Context → Take Action → Verify Work → Repeat
```

### Decision Matrix

| Scenario | SDK | Reason |
|----------|-----|--------|
| "Show me John's orders" | Vercel AI | Quick lookup, streaming |
| "Analyze Q4 performance" | Vercel AI → Artifact | Progressive chart rendering |
| "Draft follow-ups for overdue invoices" | Agent SDK | Multi-step, 10+ emails |
| "Sync customer data from HubSpot" | Agent SDK | Long-running, external API |
| Chat with customer context | Vercel AI | Real-time, streaming |
| "Prepare month-end report" | Agent SDK | Complex aggregation, exports |

---

## 3. Agent Topology

### Hub-Spoke Architecture

```
                         ┌───────────────────────┐
                         │    USER REQUEST       │
                         └───────────┬───────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │        TRIAGE AGENT            │
                    │   (Haiku, routes only, 1 turn) │
                    │   toolChoice: forced handoff   │
                    └────────────────┬───────────────┘
                                     │
         ┌───────────────┬───────────┼───────────────┬───────────────┐
         │               │           │               │               │
         ▼               ▼           ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  CUSTOMER   │  │   ORDER     │  │  ANALYTICS  │  │   SUPPORT   │  │  SETTINGS   │
│   AGENT     │  │   AGENT     │  │   AGENT     │  │   AGENT     │  │   AGENT     │
│  (Sonnet)   │  │  (Sonnet)   │  │ (Sonnet/    │  │  (Sonnet)   │  │  (Haiku)    │
│             │  │             │  │  Opus*)     │  │             │  │             │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │                │
       ▼                ▼                ▼                ▼                ▼
[Customer Tools] [Order Tools]  [Report Tools]   [Issue Tools]   [Pref Tools]

* Opus for complex forecasting
```

### Triage Agent Design

The triage agent is the critical first hop. It must:
1. Never answer questions directly
2. Route in exactly 1 turn
3. Use Haiku for cost efficiency
4. Pass rich context to specialists

```typescript
const triageAgent = new Agent({
  name: 'triage',
  model: 'claude-3-5-haiku-20241022',
  temperature: 0.1,  // Deterministic routing
  maxTurns: 1,       // Route only

  system: `You are a routing agent for Renoz CRM.
Your ONLY job is to determine which specialist should handle the request.
NEVER answer questions directly - always hand off.

Domain mapping:
- Customer/contact/relationship → customerAgent
- Order/invoice/quote/payment → orderAgent
- Reports/analytics/metrics/trends → analyticsAgent
- Issues/warranties/support tickets → supportAgent
- Settings/preferences/configuration → settingsAgent`,

  modelSettings: {
    toolChoice: { type: 'tool', toolName: 'handoff_to_agent' }
  },

  handoffs: [customerAgent, orderAgent, analyticsAgent, supportAgent, settingsAgent]
});
```

### Tool Access Matrix

| Tool | Triage | Customer | Order | Analytics | Support | Settings |
|------|--------|----------|-------|-----------|---------|----------|
| `handoff_to_agent` | Yes | - | - | - | - | - |
| `get_customer` | - | Yes | Yes | Yes | Yes | - |
| `search_customers` | - | Yes | - | - | - | - |
| `get_orders` | - | Yes | Yes | Yes | - | - |
| `create_order_draft` | - | - | Yes | - | - | - |
| `run_report` | - | - | - | Yes | - | - |
| `get_issues` | - | - | - | - | Yes | - |
| `update_preferences` | - | - | - | - | - | Yes |
| `send_email_draft` | - | Yes | Yes | - | Yes | - |

**Principle:** Agents only receive tools they need. This prevents prompt injection attacks and reduces context size.

### Handoff Context Protocol

When triage hands off to a specialist, it passes:

```typescript
interface HandoffContext {
  // What the user wants
  userIntent: string;

  // Entities extracted from the query
  extractedEntities: {
    customerIds?: string[];
    orderIds?: string[];
    dateRange?: { from: string; to: string };
  };

  // Why this agent was chosen
  handoffReason: string;

  // Recent conversation (for follow-ups)
  conversationHistory: Message[];  // Last 10 turns

  // Current page context (for "this customer" references)
  pageContext?: {
    route: string;
    entityType: 'customer' | 'order' | 'product';
    entityId: string;
  };
}
```

---

## 4. Memory Architecture

### Three-Tier Memory Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                       MEMORY ARCHITECTURE                           │
├──────────────────────┬──────────────────────┬───────────────────────┤
│    WORKING MEMORY    │   SESSION MEMORY     │   LONG-TERM MEMORY    │
│       (Redis)        │    (Postgres)        │     (Postgres +       │
│                      │                      │      pgvector)        │
├──────────────────────┼──────────────────────┼───────────────────────┤
│ TTL: Session         │ TTL: 30 days         │ TTL: Permanent        │
│                      │                      │                       │
│ ▪ Current page       │ ▪ Conversation       │ ▪ Learned preferences │
│ ▪ Active customer    │   history            │ ▪ User corrections    │
│ ▪ Draft in progress  │ ▪ Recent tool calls  │ ▪ Pattern insights    │
│ ▪ Pending approvals  │ ▪ Session learnings  │ ▪ Decision rationale  │
└──────────────────────┴──────────────────────┴───────────────────────┘
```

### Working Memory (Redis)

Real-time context that changes during a session:

```typescript
interface WorkingMemory {
  user: {
    id: string;
    name: string;
    role: 'admin' | 'sales' | 'operations' | 'finance';
  };

  currentPage: {
    route: string;
    entityType?: 'customer' | 'order' | 'product';
    entityId?: string;
  };

  recentActions: Array<{
    action: string;
    entityId: string;
    timestamp: Date;
  }>;

  pendingApprovals: Array<{
    draftId: string;
    type: 'order' | 'email' | 'invoice';
    expiresAt: Date;
  }>;
}
```

**TTL Strategy:**
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Current page | Session | Changes on navigation |
| Recent actions | 1 hour | For undo context |
| Pending approvals | 24 hours | Drafts expire |

### Session Memory (Postgres)

Conversation history with bounded retention:

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  messages JSONB NOT NULL,  -- Array of {role, content, timestamp}
  metadata JSONB,           -- Tool calls, artifacts, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-cleanup old conversations
CREATE INDEX idx_ai_conversations_cleanup 
ON ai_conversations(org_id, created_at)
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Long-Term Memory (Postgres + pgvector)

Learned knowledge with semantic search:

```sql
CREATE TABLE ai_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  type TEXT NOT NULL,  -- 'preference' | 'pattern' | 'correction'
  content TEXT NOT NULL,
  embedding VECTOR(1024),  -- BGE-large-en-v1.5
  confidence REAL DEFAULT 0.5,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learnings_vector ON ai_learnings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**What Gets Stored:**
- User corrections: "When I say 'pending', include drafts"
- Preferences: "Sort orders by due date by default"
- Patterns: "User usually checks inventory on Mondays"
- Decisions: "Chose flat-rate shipping for orders under $100"

### Memory Injection Protocol

Before each agent turn, inject relevant memory:

```typescript
async function runWithMemory(agent: Agent, input: string, context: Context) {
  // 1. Load working memory (fast, Redis)
  const working = await redis.get(`working:${context.userId}`);

  // 2. Load relevant learnings (semantic search)
  const learnings = await db.query.aiLearnings.findMany({
    where: and(
      eq(aiLearnings.userId, context.userId),
      gt(aiLearnings.confidence, 0.7)
    ),
    orderBy: desc(aiLearnings.usageCount),
    limit: 5
  });

  // 3. Inject into system prompt
  const enrichedPrompt = `
${agent.system}

## User Context
- Name: ${working.user.name}
- Role: ${working.user.role}
- Current page: ${working.currentPage.route}

## Learned Preferences
${learnings.map(l => `- ${l.content}`).join('\n')}
`;

  return agent.run({ input, system: enrichedPrompt });
}
```

---

## 5. Tool Design Principles

### Principle 1: Structured Output with Computed Insights

Tools should return **analyzed data**, not just raw records:

```typescript
interface GetCustomerResult {
  customer: Customer;

  // Computed insights the AI can act on
  _meta: {
    hasOverdueInvoices: boolean;
    daysSinceLastContact: number;
    lifetimeValue: 'high' | 'medium' | 'low';
    churnRisk: 'high' | 'medium' | 'low';
    suggestedNextActions: string[];
  };

  // Pre-formatted for display
  _display: {
    title: string;
    subtitle: string;
    badge: string | null;
  };
}
```

**Why `_meta`?** The AI can reason about `churnRisk: 'high'` without computing it. This offloads computation to the tool and keeps the prompt focused on reasoning.

### Principle 2: Actionable Errors

Errors should help the AI recover:

```typescript
// BAD
return { error: "Customer not found" };

// GOOD
return {
  error: "CUSTOMER_NOT_FOUND",
  context: {
    searchedId: customerId,
    suggestions: [
      { id: "cust_456", name: "John Smith", matchReason: "Similar name" },
      { id: "cust_789", name: "J. Smith Inc", matchReason: "Partial match" }
    ],
    hint: "Try searching by email or phone instead"
  }
};
```

### Principle 3: Draft-Approve Pattern

All writes go through a draft stage:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   AI    │────▶│  Draft  │────▶│  Human  │
│ creates │     │ stored  │     │ approves│
└─────────┘     └─────────┘     └─────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Expires   │ (24h default)
              │   silently  │
              └─────────────┘
```

```typescript
const createOrderDraftTool = {
  name: 'create_order_draft',
  requiresApproval: true,

  execute: async (params) => {
    const draft = await createDraft({
      ...params,
      createdBy: 'ai',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    return {
      type: 'approval_required',
      action: 'create_order',
      draft,
      approvalActions: [
        { label: 'Approve', url: `/orders/drafts/${draft.id}/approve` },
        { label: 'Edit', url: `/orders/drafts/${draft.id}/edit` },
        { label: 'Discard', url: `/orders/drafts/${draft.id}/discard` }
      ]
    };
  }
};
```

### Principle 4: Right-Sized Granularity

```typescript
// TOO COARSE - Returns everything, bloats context
getCustomerEverything(id)  

// TOO FINE - Requires multiple tool calls
getCustomerName(id)
getCustomerEmail(id)
getCustomerOrders(id)

// JUST RIGHT - Configurable includes
getCustomer(id, {
  include: ['summary', 'recentOrders', 'openIssues']
})
```

---

## 6. Human-in-the-Loop Patterns

### When Human Approval is Required

| Action | Auto-approve? | Reason |
|--------|--------------|--------|
| Read data | Yes | No side effects |
| Update notes | Yes | Low risk, reversible |
| Send email | No | External, irreversible |
| Create order | No | Financial impact |
| Delete anything | No | Destructive |
| Modify settings | No | System-wide impact |
| Bulk operations | No | Scale of impact |

### Hook Events (Agent SDK)

```typescript
// PreToolUse: Validate before execution
const preToolUseHook = async (event: PreToolUseEvent) => {
  // Check permissions
  if (event.toolName === 'send_email' && !user.canSendEmail) {
    return { 
      permissionDecision: 'deny',
      reason: 'User lacks email permissions'
    };
  }

  // Require approval for destructive actions
  if (DESTRUCTIVE_TOOLS.includes(event.toolName)) {
    return {
      permissionDecision: 'ask',
      message: `Approve ${event.toolName}?`
    };
  }

  return { permissionDecision: 'allow' };
};

// PostToolUse: Log and learn
const postToolUseHook = async (event: PostToolUseEvent) => {
  await auditLog.insert({
    userId: context.userId,
    toolName: event.toolName,
    input: event.input,
    output: event.output,
    duration: event.duration
  });

  // Increment usage counter for learnings
  if (event.toolName === 'apply_preference') {
    await db.update(aiLearnings)
      .set({ usageCount: sql`usage_count + 1`, lastUsed: new Date() })
      .where(eq(aiLearnings.id, event.input.learningId));
  }
};
```

### Approval UI Pattern

```tsx
function ApprovalDialog({ draft, onApprove, onReject }: ApprovalDialogProps) {
  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>AI Action Requires Approval</DialogTitle>
        <DialogDescription>
          The AI has drafted an action that requires your confirmation.
        </DialogDescription>
      </DialogHeader>

      <DialogContent>
        <DraftPreview draft={draft} />
        
        {draft.type === 'order' && (
          <OrderDraftDetails order={draft.data} />
        )}
        
        {draft.type === 'email' && (
          <EmailPreview email={draft.data} />
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onReject}>Discard</Button>
        <Button variant="secondary" onClick={() => navigate(`/drafts/${draft.id}/edit`)}>
          Edit
        </Button>
        <Button onClick={onApprove}>Approve & Execute</Button>
      </DialogFooter>
    </Dialog>
  );
}
```

---

## 7. Artifact Streaming

### Progressive Loading Model

Artifacts stream in stages to give users immediate feedback:

```
loading → data_ready → analysis_ready
```

```typescript
const customer360Artifact = defineArtifact({
  id: 'customer-360',
  stages: ['loading', 'data_ready', 'analysis_ready'],

  async *generate(params: { customerId: string }) {
    // Stage 1: Show skeleton immediately
    yield { stage: 'loading', message: 'Loading customer...' };

    // Stage 2: Show data as soon as fetched
    const [customer, orders, issues] = await Promise.all([
      getCustomer(params.customerId),
      getRecentOrders(params.customerId, 10),
      getOpenIssues(params.customerId)
    ]);

    yield {
      stage: 'data_ready',
      customer,
      orders,
      issues
    };

    // Stage 3: Add AI analysis (may take longer)
    const insights = await analyzeCustomer(customer, orders, issues);

    yield {
      stage: 'analysis_ready',
      customer,
      orders,
      issues,
      insights  // ["Revenue up 15%", "Payment patterns healthy"]
    };
  }
});
```

### React Integration

```tsx
function CustomerArtifact({ artifactId }: { artifactId: string }) {
  const { artifact, stage, isStreaming } = useArtifact(artifactId);

  if (stage === 'loading') {
    return <CustomerCardSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{artifact.customer.name}</CardTitle>
        {isStreaming && <Spinner size="sm" />}
      </CardHeader>

      <CardContent>
        {/* Available immediately */}
        <CustomerMetrics customer={artifact.customer} />
        <OrdersTable orders={artifact.orders} />

        {/* Appears when analysis complete */}
        {stage === 'analysis_ready' && (
          <InsightsPanel insights={artifact.insights} />
        )}
      </CardContent>
    </Card>
  );
}
```

### Artifact Registry

```typescript
const artifactRegistry = createArtifactRegistry({
  artifacts: [
    customer360Artifact,
    orderSummaryArtifact,
    pipelineChartArtifact,
    revenueMetricsArtifact,
    inventoryLevelsArtifact
  ]
});

const agent = new Agent({
  artifacts: artifactRegistry,
  // Agents can create artifacts via show_* tools
  tools: [showCustomerViewTool, showPipelineChartTool]
});
```

---

## 8. Deployment Model

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐   │
│  │   Vercel    │     │   Vercel    │     │    Inngest/QStash   │   │
│  │   Edge      │────▶│   Serverless│────▶│    (Background)     │   │
│  │   (Chat)    │     │   (API)     │     │                     │   │
│  └─────────────┘     └─────────────┘     └──────────┬──────────┘   │
│         │                   │                       │               │
│         │                   │                       │               │
│         ▼                   ▼                       ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    UPSTASH REDIS                            │   │
│  │              (Working Memory, Rate Limits, Cache)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    NEON POSTGRES                            │   │
│  │        (Session Memory, Long-term Memory, Audit Logs)       │   │
│  │                    + pgvector                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Execution Contexts

| Context | Runtime | Max Duration | Use Case |
|---------|---------|--------------|----------|
| Edge | Vercel Edge | 30s | Chat streaming |
| Serverless | Vercel Serverless | 60s (Pro: 300s) | API routes |
| Background | Inngest | 15 min | Agent SDK tasks |
| Scheduled | QStash | 15 min | Recurring jobs |

### Long-Running Task Pattern

For Agent SDK tasks that exceed serverless limits:

```typescript
// API route triggers background job
export async function POST(request: Request) {
  const { taskType, params } = await request.json();

  // Enqueue to Inngest
  await inngest.send({
    name: 'ai/agent-task',
    data: { taskType, params, userId: session.userId }
  });

  return Response.json({ 
    status: 'queued',
    message: 'Task started. You will be notified when complete.'
  });
}

// Background worker
export const agentTask = inngest.createFunction(
  { id: 'ai-agent-task' },
  { event: 'ai/agent-task' },
  async ({ event, step }) => {
    const { taskType, params, userId } = event.data;

    // Run the Agent SDK task
    const result = await step.run('execute-agent', async () => {
      const agent = new Agent({ /* config */ });
      return agent.run(params.prompt);
    });

    // Notify user
    await step.run('notify-user', async () => {
      await sendNotification(userId, {
        title: 'AI Task Complete',
        body: result.summary,
        link: result.detailsUrl
      });
    });

    return result;
  }
);
```

---

## 9. Cost Optimization

### Model Selection Strategy

| Model | Cost/1M tokens | Use Case |
|-------|----------------|----------|
| Haiku | $0.25 / $1.25 | Triage routing, simple lookups |
| Sonnet | $3 / $15 | Domain specialists, standard tasks |
| Opus | $15 / $75 | Complex analysis, forecasting |

**Savings from Routing:**
- Haiku triage: ~90% of requests are 1-turn routes
- Cost: ~$0.001 per route vs $0.03 for Sonnet direct
- **30x savings** on the routing step

### Caching Strategy

```typescript
// Tool result caching (ai-sdk-tools)
const getCustomerCached = cached(
  getCustomerTool,
  {
    ttl: 5 * 60 * 1000,  // 5 minutes
    keyGenerator: (params) => `customer:${params.orgId}:${params.customerId}`
  }
);

// Context caching (Redis)
const contextCache = new RedisCache('context', 30 * 60);  // 30 min

async function getAgentContext(userId: string, orgId: string) {
  const cached = await contextCache.get(`${orgId}:${userId}`);
  if (cached) return cached;  // Cache hit

  const context = await buildContext(userId, orgId);
  await contextCache.set(`${orgId}:${userId}`, context);
  return context;
}
```

**Expected Cache Hit Rates:**
| Cache Type | Expected Hit Rate | Cost Reduction |
|------------|-------------------|----------------|
| Tool results | 60-80% | 50-70% fewer DB queries |
| User context | 90%+ | Avoid redundant lookups |
| Conversation history | 95%+ | Paginate on miss only |

### Token Budgeting

```typescript
const tokenBudgets = {
  // Per request limits
  systemPrompt: 2000,     // Base context
  userContext: 500,       // Working memory
  learnings: 300,         // Top 5 learnings
  conversationHistory: 1000,  // Last 10 turns
  toolResults: 2000,      // Aggregate tool output

  // Total target
  requestTotal: 6000,     // ~$0.02 per request (Sonnet)
};
```

---

## 10. Evolution Path

### Near-Term (Q1 2026)

**Agent Skills Spec Integration:**
When the Agent Skills spec stabilizes (expected Q1 2026), domain-specific skills can be defined declaratively:

```yaml
# skills/order-management.yaml
name: order-management
version: 1.0
description: Order creation and management for renovation CRM

capabilities:
  - create_order_draft
  - get_order_status
  - update_order_items
  - calculate_pricing

constraints:
  - max_order_value: 50000
  - requires_approval_above: 5000

training_examples:
  - input: "Create an order for John Smith with 3 cabinets"
    expected_tools: [get_customer, get_products, create_order_draft]
```

### Mid-Term (Q2-Q3 2026)

**MCP Ecosystem Expansion:**
- Database MCP for direct read queries
- Calendar MCP for scheduling
- Document MCP for proposal generation
- Integration MCPs (Xero, HubSpot, Google Workspace)

**Supervisor Patterns:**
```
Lead Agent (Opus)
    ├── Research Subagent (Sonnet)
    ├── Analysis Subagent (Sonnet)
    └── Writing Subagent (Sonnet)
```

### Long-Term (2027+)

**Autonomous Operations:**
- Predictive churn intervention
- Automated inventory reordering
- Self-healing data quality
- Proactive customer outreach

**Multi-Modal:**
- Document understanding (quotes, invoices)
- Image analysis (product photos)
- Voice interface for field workers

---

## Appendix A: Reference Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           RENOZ CRM AI ARCHITECTURE                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌────────────────┐          ┌────────────────────────────────────────┐   │
│    │     USER       │          │           VERCEL AI SDK                │   │
│    │   INTERFACE    │◀────────▶│  ┌──────────────┐  ┌───────────────┐   │   │
│    │  (TanStack)    │          │  │   useChat    │  │   Streaming   │   │   │
│    └────────────────┘          │  └──────────────┘  └───────────────┘   │   │
│            │                   └────────────────────────────────────────┘   │
│            │                                    │                            │
│            │                                    ▼                            │
│            │               ┌────────────────────────────────────────┐       │
│            │               │              TRIAGE (Haiku)            │       │
│            │               │         toolChoice: forced_handoff     │       │
│            │               └───────────────────┬────────────────────┘       │
│            │                                   │                            │
│            │         ┌─────────────────────────┼─────────────────────────┐  │
│            │         │                         │                         │  │
│            │         ▼                         ▼                         ▼  │
│            │   ┌──────────┐            ┌──────────┐            ┌──────────┐ │
│            │   │ CUSTOMER │            │  ORDER   │            │ANALYTICS │ │
│            │   │  AGENT   │            │  AGENT   │            │  AGENT   │ │
│            │   │ (Sonnet) │            │ (Sonnet) │            │(Sonnet/  │ │
│            │   └────┬─────┘            └────┬─────┘            │  Opus)   │ │
│            │        │                       │                  └────┬─────┘ │
│            │        ▼                       ▼                       ▼       │
│            │   ┌────────────────────────────────────────────────────────┐   │
│            │   │                       TOOLS                           │   │
│            │   │  get_customer │ search │ create_draft │ run_report   │   │
│            │   └────────────────────────────────────────────────────────┘   │
│            │                              │                                 │
│            │                              ▼                                 │
│            │   ┌────────────────────────────────────────────────────────┐   │
│            │   │                    MEMORY TIERS                        │   │
│            │   │  ┌───────────┐  ┌────────────┐  ┌─────────────────┐   │   │
│            │   │  │  Working  │  │  Session   │  │   Long-term     │   │   │
│            │   │  │  (Redis)  │  │ (Postgres) │  │ (pgvector)      │   │   │
│            │   │  └───────────┘  └────────────┘  └─────────────────┘   │   │
│            │   └────────────────────────────────────────────────────────┘   │
│            │                                                                │
│            │   ┌────────────────────────────────────────────────────────┐   │
│            │   │              ANTHROPIC AGENT SDK                      │   │
│            │   │           (Background Workers)                         │   │
│            └──▶│  ┌─────────┐  ┌──────────────┐  ┌─────────────────┐   │   │
│                │  │  Lead   │──│  Subagents   │──│    MCP Tools    │   │   │
│                │  │  Agent  │  │              │  │                 │   │   │
│                │  └─────────┘  └──────────────┘  └─────────────────┘   │   │
│                └────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Decision Log

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Dual SDK | Single Vercel AI / Single Agent SDK / Hybrid | Hybrid | Different execution models needed |
| Triage Model | Sonnet / Haiku | Haiku | 30x cost savings, sufficient for routing |
| Memory Backend | Redis-only / Postgres-only / Tiered | Tiered | Balance speed and persistence |
| Vector Dimension | 384 / 768 / 1024 | 1024 | BGE-large best quality for semantic search |
| Draft Pattern | Direct writes / Draft-approve | Draft-approve | Safety for financial operations |
| Background Jobs | Vercel Cron / Inngest / QStash | Inngest | Better observability, retries |

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Triage Agent** | Haiku-powered router that classifies intent and hands off to specialists |
| **Specialist Agent** | Domain-focused Sonnet agent with restricted tool access |
| **Working Memory** | Redis-stored ephemeral context (current page, recent actions) |
| **Archival Memory** | Postgres-stored long-term learnings with vector embeddings |
| **Artifact** | Typed, streaming UI component generated by AI |
| **Draft-Approve** | Pattern where AI creates drafts that require human approval |
| **MCP** | Model Context Protocol - standardized tool interface |
| **Hub-Spoke** | Topology where triage routes to specialized agents |

---

*This document supersedes all previous AI architecture documentation. For questions or updates, contact the Architecture Team.*
