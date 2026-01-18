# Renoz CRM AI Implementation Blueprint

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Status:** Implementation Ready

---

## Executive Summary

This blueprint defines the hybrid AI architecture for Renoz CRM, combining **Vercel AI SDK** (for UI-driven chat and quick queries) with **Anthropic Agent SDK** (for autonomous workflows and batch processing). Both SDKs consume a **shared MCP server** providing unified CRM operations.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary SDK | Vercel AI SDK | Best Next.js/React integration, existing in stack |
| Autonomy SDK | Anthropic Agent SDK | Built-in agent loop, multi-step workflows |
| Tool Protocol | MCP (Model Context Protocol) | Standardized, SDK-agnostic tool definitions |
| Memory Backend | PostgreSQL (Drizzle) | Matches existing stack, production-ready |
| Agent Topology | Hub-and-Spoke | Specialist agents with triage routing |
| Artifacts | @ai-sdk-tools/artifacts | Progressive loading, streaming UI |

---

## 1. File Structure

```
renoz-v3/
├── src/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── index.ts                    # Re-exports, main entry
│   │   │   ├── chat.ts                     # Enhance for agents
│   │   │   ├── config.ts                   # Model configurations
│   │   │   │
│   │   │   ├── agents/
│   │   │   │   ├── index.ts                # Agent registry
│   │   │   │   ├── triage.ts               # Triage router (Haiku)
│   │   │   │   ├── customer.ts             # Customer specialist (Sonnet)
│   │   │   │   ├── order.ts                # Order specialist (Sonnet)
│   │   │   │   ├── analytics.ts            # Analytics specialist (Sonnet)
│   │   │   │   └── quote.ts                # Quote configurator (Sonnet)
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── index.ts                # Tool registry + MCP setup
│   │   │   │   ├── customer-tools.ts       # get_customer, search_customers
│   │   │   │   ├── order-tools.ts          # get_orders, create_order_draft
│   │   │   │   ├── analytics-tools.ts      # run_report, get_metrics
│   │   │   │   ├── quote-tools.ts          # configure_system, calculate_price
│   │   │   │   └── integration-tools.ts    # xero, resend, calendar
│   │   │   │
│   │   │   ├── memory/
│   │   │   │   ├── index.ts                # Memory provider setup
│   │   │   │   ├── drizzle-provider.ts     # Postgres conversation history
│   │   │   │   ├── redis-provider.ts       # Working memory (optional)
│   │   │   │   └── templates.ts            # Memory data structures
│   │   │   │
│   │   │   ├── artifacts/
│   │   │   │   ├── index.ts                # Artifact registry
│   │   │   │   ├── customer-360.ts         # Customer 360 view artifact
│   │   │   │   ├── order-summary.ts        # Order details artifact
│   │   │   │   ├── pipeline-chart.ts       # Sales pipeline artifact
│   │   │   │   └── revenue-metrics.ts      # Revenue charts artifact
│   │   │   │
│   │   │   └── queue/
│   │   │       ├── index.ts                # Job queue setup
│   │   │       ├── worker.ts               # Background worker for agents
│   │   │       └── tasks.ts                # Task definitions
│   │   │
│   │   └── mcp/
│   │       ├── server.ts                   # MCP server setup
│   │       └── tools.ts                    # MCP tool definitions
│   │
│   ├── app/
│   │   └── api/
│   │       └── ai/
│   │           ├── chat/
│   │           │   └── route.ts            # POST /api/ai/chat (Vercel AI SDK)
│   │           ├── agent/
│   │           │   └── route.ts            # POST /api/ai/agent (dispatch to worker)
│   │           ├── approve/
│   │           │   └── route.ts            # POST /api/ai/approve (approval queue)
│   │           ├── artifacts/
│   │           │   └── [id]/
│   │           │       └── route.ts        # GET /api/ai/artifacts/:id (stream)
│   │           └── cost/
│   │               └── route.ts            # GET /api/ai/cost (usage metrics)
│   │
│   └── components/
│       └── ai/
│           ├── chat-panel.tsx              # Global AI chat sidebar
│           ├── approval-modal.tsx          # Human-in-loop approvals
│           ├── artifact-renderer.tsx       # Artifact streaming UI
│           └── cost-indicator.tsx          # Real-time cost display
│
├── drizzle/
│   └── schema/
│       ├── ai-conversations.ts             # Enhance with metadata
│       ├── ai-approvals.ts                 # NEW - approval queue
│       ├── ai-agent-tasks.ts               # NEW - background tasks
│       └── ai-cost-tracking.ts             # NEW - usage metrics
│
└── workers/
    └── ai-agent-worker.ts                  # Standalone worker process
```

---

## 2. Database Schema Additions

### 2.1 Enhanced AI Conversations Table

```typescript
// drizzle/schema/ai-conversations.ts
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  orgId: uuid('org_id').notNull().references(() => organizations.id),

  // Conversation data
  messages: jsonb('messages').$type<Message[]>().notNull().default([]),

  // Context and metadata
  metadata: jsonb('metadata').$type<{
    currentView?: string;
    selectedEntity?: { type: string; id: string };
    handoffChain?: string[];
    costCents?: number;
  }>(),

  // Agent tracking
  activeAgent: text('active_agent'),
  agentHistory: jsonb('agent_history').$type<Array<{
    agent: string;
    timestamp: Date;
    reason: string;
  }>>(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
});
```

### 2.2 AI Approvals Table (NEW)

```typescript
// drizzle/schema/ai-approvals.ts
export const aiApprovals = pgTable('ai_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => aiConversations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  orgId: uuid('org_id').notNull().references(() => organizations.id),

  // Approval request details
  action: text('action').notNull(), // 'create_order', 'send_email', 'sync_to_xero'
  agent: text('agent').notNull(),

  actionData: jsonb('action_data').$type<{
    draft: any;
    preview: any;
    reason: string;
  }>().notNull(),

  // Approval state
  status: text('status').$type<'pending' | 'approved' | 'rejected' | 'expired'>()
    .notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),

  executedAt: timestamp('executed_at'),
  executionResult: jsonb('execution_result'),

  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 2.3 AI Agent Tasks Table (NEW)

```typescript
// drizzle/schema/ai-agent-tasks.ts
export const aiAgentTasks = pgTable('ai_agent_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),

  taskType: text('task_type').notNull(),
  agent: text('agent').notNull(),

  input: jsonb('input').notNull(),
  context: jsonb('context'),

  status: text('status').$type<'queued' | 'running' | 'completed' | 'failed'>()
    .notNull().default('queued'),

  progress: integer('progress').default(0),
  currentStep: text('current_step'),

  result: jsonb('result'),
  error: jsonb('error').$type<{ message: string; code: string; details?: any }>(),

  tokensUsed: integer('tokens_used').default(0),
  costCents: integer('cost_cents').default(0),

  queuedAt: timestamp('queued_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});
```

### 2.4 AI Cost Tracking Table (NEW)

```typescript
// drizzle/schema/ai-cost-tracking.ts
export const aiCostTracking = pgTable('ai_cost_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').references(() => users.id),

  conversationId: uuid('conversation_id').references(() => aiConversations.id),
  taskId: uuid('task_id').references(() => aiAgentTasks.id),

  model: text('model').notNull(),
  feature: text('feature'),

  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cacheReadTokens: integer('cache_read_tokens').default(0),
  cacheWriteTokens: integer('cache_write_tokens').default(0),

  costCents: integer('cost_cents').notNull(),

  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 3. MCP Server Architecture

### 3.1 MCP Server Setup

```typescript
// src/lib/mcp/server.ts
import { MCPServer } from '@modelcontextprotocol/sdk/server/index.js';
import { customerTools, orderTools, analyticsTools, quoteTools } from './tools.js';

export class RenozMCPServer {
  private server: MCPServer;

  constructor() {
    this.server = new MCPServer({
      name: 'renoz-crm',
      version: '1.0.0',
    });
    this.registerTools();
  }

  private registerTools() {
    const allTools = [
      ...customerTools,
      ...orderTools,
      ...analyticsTools,
      ...quoteTools
    ];

    // Register tool handlers
    allTools.forEach(tool => {
      this.server.setRequestHandler('tools/call', async (request) => {
        if (request.params.name === tool.name) {
          return tool.execute(request.params.arguments);
        }
      });
    });

    // List available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: allTools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    }));
  }
}
```

### 3.2 Tool Design Pattern

```typescript
// src/lib/mcp/tools.ts
export const customerTools = [
  {
    name: 'get_customer',
    description: 'Get customer details with optional related data',
    inputSchema: z.object({
      customerId: z.string(),
      include: z.array(z.enum(['summary', 'recentOrders', 'openIssues']))
        .optional().default(['summary'])
    }),

    execute: async ({ customerId, include }) => {
      const customer = await db.query.customers.findFirst({
        where: (customers, { eq }) => eq(customers.id, customerId)
      });

      if (!customer) {
        return {
          error: 'CUSTOMER_NOT_FOUND',
          customerId,
          suggestion: 'Use search_customers to find similar matches'
        };
      }

      const result: any = { customer };

      // Proactive metadata (key for AI reasoning)
      result._meta = {
        hasOverdueInvoices: customer.overdueInvoiceCount > 0,
        daysSinceLastOrder: daysSince(customer.lastOrderDate),
        lifetimeValue: categorizeValue(customer.totalRevenue),
        healthScore: computeHealthScore(customer),
        suggestedActions: getSuggestedActions(customer)
      };

      result._display = {
        title: customer.name,
        subtitle: `${customer.type} • ${customer.status}`,
        badge: customer.overdueInvoiceCount > 0 ? 'Overdue' : null
      };

      return result;
    }
  }
];
```

---

## 4. API Routes

### 4.1 Chat Endpoint (Vercel AI SDK)

```typescript
// src/app/api/ai/chat/route.ts
import { streamText } from 'ai';
import { mainAgent } from '@/lib/ai/agents';

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const result = await streamText({
    model: mainAgent.model,
    messages,
    system: mainAgent.buildSystemPrompt(context),
    tools: mainAgent.tools,

    onFinish: async ({ usage }) => {
      await trackCost({
        orgId: context.orgId,
        userId: context.userId,
        model: 'claude-3-5-haiku',
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
      });
    }
  });

  return result.toDataStreamResponse();
}
```

### 4.2 Agent Dispatch Endpoint

```typescript
// src/app/api/ai/agent/route.ts
export async function POST(req: Request) {
  const { taskType, agent, input, context } = await req.json();

  const task = await createAgentTask({
    orgId: context.orgId,
    userId: context.userId,
    taskType,
    agent,
    input,
    context
  });

  await queueTask(task.id);

  return Response.json({
    taskId: task.id,
    status: 'queued',
    statusUrl: `/api/ai/agent/${task.id}/status`
  });
}
```

### 4.3 Approval Queue Endpoint

```typescript
// src/app/api/ai/approve/route.ts
export async function POST(req: Request) {
  const { approvalId, action, userId } = await req.json();

  const approval = await db.query.aiApprovals.findFirst({
    where: eq(aiApprovals.id, approvalId)
  });

  if (action === 'approve') {
    const result = await executeAction(approval.action, approval.actionData);

    await db.update(aiApprovals)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        executedAt: new Date(),
        executionResult: result
      })
      .where(eq(aiApprovals.id, approvalId));

    return Response.json({ success: true, result });
  }

  if (action === 'reject') {
    await db.update(aiApprovals)
      .set({ status: 'rejected', approvedBy: userId, approvedAt: new Date() })
      .where(eq(aiApprovals.id, approvalId));

    return Response.json({ success: true });
  }
}
```

---

## 5. Agent Definitions

### 5.1 Triage Agent (Router)

```typescript
// src/lib/ai/agents/triage.ts
export const triageAgent = new Agent({
  name: 'triage',
  model: 'claude-3-5-haiku-20241022',
  temperature: 0.1,
  maxTurns: 1,

  system: `You are a routing agent for Renoz CRM.
Your ONLY job is to determine which specialist should handle the request.
NEVER answer questions directly - always hand off.

Domain mapping:
- Customer questions → customerAgent
- Order/invoice questions → orderAgent
- Reports/analytics → analyticsAgent
- Battery system quotes → quoteAgent`,

  modelSettings: {
    toolChoice: { type: 'tool', toolName: 'handoff_to_agent' }
  },

  handoffs: [customerAgent, orderAgent, analyticsAgent, quoteAgent]
});
```

### 5.2 Customer Agent

```typescript
// src/lib/ai/agents/customer.ts
export const customerAgent = new Agent({
  name: 'customer',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.3,
  maxTurns: 10,

  system: `You are the Customer specialist for Renoz CRM.
You help with customer lookups, contact management, and relationship insights.

Guidelines:
- Always verify customer identity before sharing sensitive info
- Proactively mention overdue invoices or open issues
- Suggest follow-up actions when relevant
- Use _meta fields from tools for reasoning`,

  tools: ['get_customer', 'search_customers', 'update_customer_notes', 'send_email_draft']
});
```

---

## 6. Component Integration

### 6.1 AI Chat Panel

```typescript
// src/components/ai/chat-panel.tsx
'use client';

import { useChat } from 'ai/react';

export function AIChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: {
      context: {
        currentView: window.location.pathname,
        orgId: useCurrentOrg(),
        userId: useCurrentUser()
      }
    }
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className="inline-block p-3 rounded-lg bg-gray-100">
              {m.content}
            </div>
            {m.artifactId && <ArtifactRenderer artifactId={m.artifactId} />}
            {m.approvalRequired && <ApprovalModal approval={m.approval} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about customers, orders, or analytics..."
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
```

### 6.2 Approval Modal

```typescript
// src/components/ai/approval-modal.tsx
export function ApprovalModal({ approval }: ApprovalModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    await fetch('/api/ai/approve', {
      method: 'POST',
      body: JSON.stringify({ approvalId: approval.id, action: 'approve' })
    });
    setIsProcessing(false);
  };

  return (
    <Card className="mt-4 border-yellow-500">
      <CardHeader>
        <h3 className="font-semibold">AI Requires Approval</h3>
      </CardHeader>
      <CardContent>
        <p>{approval.message}</p>
        <pre className="mt-2 p-2 bg-gray-50 rounded text-sm">
          {JSON.stringify(approval.draft, null, 2)}
        </pre>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleApprove} disabled={isProcessing}>Approve</Button>
        <Button onClick={handleReject} variant="outline" disabled={isProcessing}>Reject</Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 7. Background Worker Setup

```typescript
// workers/ai-agent-worker.ts
class AIAgentWorker {
  private isRunning = false;

  async start() {
    this.isRunning = true;
    console.log('AI Agent Worker started');

    while (this.isRunning) {
      await this.processNextTask();
      await sleep(1000);
    }
  }

  async processNextTask() {
    const task = await db.query.aiAgentTasks.findFirst({
      where: eq(aiAgentTasks.status, 'queued'),
      orderBy: (tasks, { asc }) => [asc(tasks.queuedAt)]
    });

    if (!task) return;

    await db.update(aiAgentTasks)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(aiAgentTasks.id, task.id));

    try {
      const agent = getAgentByType(task.agent);
      const result = await agent.run({
        input: task.input,
        onProgress: async (step, progress) => {
          await db.update(aiAgentTasks)
            .set({ currentStep: step, progress: Math.round(progress * 100) })
            .where(eq(aiAgentTasks.id, task.id));
        }
      });

      await db.update(aiAgentTasks)
        .set({
          status: 'completed',
          result,
          completedAt: new Date(),
          tokensUsed: result.usage.totalTokens,
          costCents: calculateCost(result.usage)
        })
        .where(eq(aiAgentTasks.id, task.id));

    } catch (error) {
      await db.update(aiAgentTasks)
        .set({
          status: 'failed',
          error: { message: error.message, code: error.code || 'UNKNOWN' },
          completedAt: new Date()
        })
        .where(eq(aiAgentTasks.id, task.id));
    }
  }

  stop() { this.isRunning = false; }
}

const worker = new AIAgentWorker();
worker.start();
process.on('SIGTERM', () => worker.stop());
```

---

## 8. Environment Variables

```env
# AI Configuration
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                     # Optional, for embeddings

# Agent Worker
AI_AGENT_WORKER_URL=http://localhost:4000
AI_AGENT_QUEUE_REDIS_URL=redis://localhost:6379

# Cost Limits
AI_COST_LIMIT_DAILY_CENTS=10000           # $100/day org limit
AI_COST_LIMIT_USER_CENTS=2000             # $20/day user limit

# Memory
AI_MEMORY_REDIS_URL=redis://localhost:6379
AI_MEMORY_TTL_SECONDS=86400               # 24 hours
```

---

## 9. Security Considerations

### 9.1 Tool Permission Hooks

```typescript
export async function checkToolPermission(
  userId: string,
  orgId: string,
  toolName: string,
  toolArgs: any
): Promise<{ allowed: boolean; reason?: string }> {

  const orgSettings = await getOrgSettings(orgId);
  if (!orgSettings.aiFeatures[toolName]) {
    return { allowed: false, reason: 'Feature not enabled for organization' };
  }

  const user = await getUser(userId);
  if (toolName.startsWith('delete_') && user.role !== 'admin') {
    return { allowed: false, reason: 'Admin role required' };
  }

  return { allowed: true };
}
```

### 9.2 Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit';

export const rateLimiters = {
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
  }),
  agent: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
  })
};
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create database schema migrations
- [ ] Set up MCP server with basic tools
- [ ] Implement triage agent
- [ ] Build basic chat API route
- [ ] Create AIChatPanel component

### Phase 2: Core Agents (Week 3-4)
- [ ] Implement customer agent with full toolset
- [ ] Implement order agent
- [ ] Add approval queue system
- [ ] Build ApprovalModal component

### Phase 3: Advanced Features (Week 5-6)
- [ ] Analytics agent
- [ ] Quote configurator agent
- [ ] Artifact streaming system
- [ ] Background worker
- [ ] Cost tracking

### Phase 4: Integrations (Week 7-8)
- [ ] Xero integration tools
- [ ] Resend email tools
- [ ] Rate limiting and security
- [ ] Production monitoring

---

## 11. Cost Estimation

| Feature | Model | Est. Tokens/Request | Cost/Request | Monthly (1000 users) |
|---------|-------|---------------------|--------------|----------------------|
| Chat triage | Haiku | 500 in + 100 out | $0.0004 | $400 |
| Customer agent | Sonnet | 2000 in + 500 out | $0.009 | $9,000 |
| Batch processing | Sonnet | 50k in + 10k out | $0.21 | As-needed |

**Projected Monthly Cost:** $10,000 - $15,000 for 1000 active users

---

## Appendix A: Migration Scripts

```sql
-- 1. Enhance ai_conversations
ALTER TABLE ai_conversations
ADD COLUMN active_agent TEXT,
ADD COLUMN agent_history JSONB DEFAULT '[]'::jsonb;

-- 2. Create ai_approvals
CREATE TABLE ai_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  action TEXT NOT NULL,
  agent TEXT NOT NULL,
  action_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_approvals_org_status_idx ON ai_approvals(org_id, status);

-- 3. Create ai_agent_tasks
CREATE TABLE ai_agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  task_type TEXT NOT NULL,
  agent TEXT NOT NULL,
  input JSONB NOT NULL,
  context JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  result JSONB,
  error JSONB,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 4. Create ai_cost_tracking
CREATE TABLE ai_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  task_id UUID REFERENCES ai_agent_tasks(id),
  model TEXT NOT NULL,
  feature TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  cost_cents INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_cost_org_date_idx ON ai_cost_tracking(org_id, date);
CREATE INDEX ai_cost_user_date_idx ON ai_cost_tracking(user_id, date);
```

---

**End of Blueprint**

*This document supersedes previous implementation notes. Use VISION.md for architectural decisions and this BLUEPRINT.md for implementation specifics.*
