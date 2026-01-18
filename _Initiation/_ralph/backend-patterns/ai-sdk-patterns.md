# AI SDK Patterns for Ralph CRM

> Comprehensive guide for implementing AI agents using Vercel AI SDK 6 with `@ai-sdk/anthropic` for Claude models. Based on patterns extracted from midday-reference.

## Table of Contents

1. [Agent Architecture](#1-agent-architecture)
2. [Tool Definition](#2-tool-definition)
3. [Context Management](#3-context-management)
4. [Memory](#4-memory)
5. [Model Selection](#5-model-selection)
6. [Streaming Responses](#6-streaming-responses)
7. [Error Handling](#7-error-handling)
8. [Multi-Tenant Considerations](#8-multi-tenant-considerations)

---

## 1. Agent Architecture

### 1.1 Triage Agent Pattern (Router)

The triage agent routes user requests to domain specialists. It uses a fast model with forced tool choice for immediate handoff.

```typescript
// apps/api/src/ai/agents/main.ts
import { anthropic } from "@ai-sdk/anthropic";
import { createAgent, formatContextForLLM } from "@api/ai/agents/config/shared";
import { customersAgent } from "./customers";
import { projectsAgent } from "./projects";
import { analyticsAgent } from "./analytics";
import { invoicesAgent } from "./invoices";
import { timeTrackingAgent } from "./time-tracking";

export const mainAgent = createAgent({
  name: "triage",
  model: anthropic("claude-3-5-haiku-20241022"), // Fast model for routing
  temperature: 0.1, // Low temperature for deterministic routing
  modelSettings: {
    toolChoice: {
      type: "tool",
      toolName: "handoff_to_agent", // Force handoff - no direct responses
    },
  },
  instructions: (ctx) => `Route user requests to the appropriate specialist.

<background-data>
${formatContextForLLM(ctx)}

<agent-capabilities>
customers: Customer management, contacts, lead tracking, customer analytics
projects: Project management, estimates, timelines, job tracking
analytics: Reports, dashboards, predictions, business health metrics
invoices: Invoice creation, payment tracking, billing management
timeTracking: Time entries, labor tracking, crew management
general: General questions, greetings, clarifications
</agent-capabilities>
</background-data>`,
  handoffs: [
    customersAgent,
    projectsAgent,
    analyticsAgent,
    invoicesAgent,
    timeTrackingAgent,
    generalAgent,
  ],
  maxTurns: 1, // Single turn - just route
});
```

### 1.2 Domain Agent Pattern

Domain agents handle specific business domains with their own tools and instructions.

```typescript
// apps/api/src/ai/agents/customers.ts
import { anthropic } from "@ai-sdk/anthropic";
import {
  COMMON_AGENT_RULES,
  createAgent,
  formatContextForLLM,
} from "@api/ai/agents/config/shared";
import { getCustomersTool } from "@api/ai/tools/get-customers";
import { createCustomerTool } from "@api/ai/tools/create-customer";
import { updateCustomerTool } from "@api/ai/tools/update-customer";

export const customersAgent = createAgent({
  name: "customers",
  model: anthropic("claude-sonnet-4-20250514"), // Default capability model
  temperature: 0.3,
  instructions: (ctx) => `You are a customer management specialist for ${ctx.companyName}.
Your goal is to help with customer data, lead tracking, and customer relationship management.

<background-data>
${formatContextForLLM(ctx)}
</background-data>

${COMMON_AGENT_RULES}

<agent-specific-rules>
- Lead with key customer information
- Include contact details when relevant
- Track customer lifecycle stages
- Note project history with customers
</agent-specific-rules>`,
  tools: {
    getCustomers: getCustomersTool,
    createCustomer: createCustomerTool,
    updateCustomer: updateCustomerTool,
  },
  maxTurns: 5,
});
```

### 1.3 Hierarchical Handoff Pattern

Agents can hand off to other specialists for sub-tasks.

```typescript
// apps/api/src/ai/agents/analytics.ts
import { anthropic } from "@ai-sdk/anthropic";
import { createAgent, formatContextForLLM, COMMON_AGENT_RULES } from "@api/ai/agents/config/shared";
import { getBusinessHealthScoreTool } from "@api/ai/tools/get-business-health-score";
import { getProfitabilityTool } from "@api/ai/tools/get-profitability";
import { reportsAgent } from "./reports"; // Can handoff to reports for detailed reports

export const analyticsAgent = createAgent({
  name: "analytics",
  model: anthropic("claude-sonnet-4-20250514"),
  temperature: 0.5,
  instructions: (ctx) => `You are an analytics specialist for ${ctx.companyName}.
Your goal is to provide business health scores, profitability analysis, and performance insights.

<background-data>
${formatContextForLLM(ctx)}
</background-data>

${COMMON_AGENT_RULES}

<agent-specific-rules>
- Lead with key insight or score
- Provide 2-3 actionable recommendations
- Use percentages and trends where possible
- For detailed reports, hand off to reports agent
</agent-specific-rules>`,
  tools: {
    getBusinessHealthScore: getBusinessHealthScoreTool,
    getProfitability: getProfitabilityTool,
  },
  handoffs: [reportsAgent], // Can delegate to reports for detailed analysis
  maxTurns: 5,
});
```

### 1.4 Agent Configuration Factory

Create agents with consistent defaults using a factory function.

```typescript
// apps/api/src/ai/agents/config/shared.ts
import { Agent, type AgentConfig } from "@ai-sdk-tools/agents";
import { RedisProvider } from "@ai-sdk-tools/memory/redis";
import { anthropic } from "@ai-sdk/anthropic";
import { getSharedRedisClient } from "@ralph/cache/shared-redis";

export interface AppContext {
  userId: string;
  fullName: string;
  companyName: string;
  baseCurrency: string;
  locale: string;
  currentDateTime: string;
  country?: string;
  city?: string;
  region?: string;
  timezone: string;
  chatId: string;
  teamId: string;
  // Extensible for additional properties
  [key: string]: unknown;
}

export function formatContextForLLM(context: AppContext): string {
  return `<company_info>
<current_date>${context.currentDateTime}</current_date>
<timezone>${context.timezone}</timezone>
<company_name>${context.companyName}</company_name>
<base_currency>${context.baseCurrency}</base_currency>
<locale>${context.locale}</locale>
</company_info>

Important: Use the current date/time above for time-sensitive operations.
User-specific information is maintained in your working memory.`;
}

export const COMMON_AGENT_RULES = `<behavior_rules>
- Call tools immediately without explanatory text
- Use parallel tool calls when possible
- Provide specific numbers and actionable insights
- Explain your reasoning
- Lead with the most important information first
- When presenting repeated structured data (lists, entries, time series), use markdown tables
- Tables make data scannable and easier to compare
</behavior_rules>`;

export const memoryProvider = new RedisProvider(getSharedRedisClient());

export const createAgent = (config: AgentConfig<AppContext>) => {
  return new Agent({
    ...config,
    memory: {
      provider: memoryProvider,
      history: {
        enabled: true,
        limit: 10, // Last 10 conversation turns
      },
      workingMemory: {
        enabled: true,
        template: memoryTemplate, // See Memory section
        scope: "user", // Per-user working memory
      },
      chats: {
        enabled: true,
        generateTitle: {
          model: anthropic("claude-3-5-haiku-20241022"),
          instructions: titleInstructions,
        },
        generateSuggestions: {
          enabled: true,
          model: anthropic("claude-3-5-haiku-20241022"),
          limit: 5,
          instructions: suggestionsInstructions,
        },
      },
    },
  });
};
```

---

## 2. Tool Definition

### 2.1 Basic Tool with Zod Schema

Tools use Zod schemas for input validation and generator functions for streaming.

```typescript
// apps/api/src/ai/tools/get-customers.ts
import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@ralph/db/client";
import { getCustomers } from "@ralph/db/queries";
import { tool } from "ai";
import { z } from "zod";

const getCustomersSchema = z.object({
  cursor: z.string().nullable().optional().describe("Pagination cursor"),
  pageSize: z.number().min(1).max(100).default(10).describe("Results per page"),
  q: z.string().nullable().optional().describe("Search query (name, email, phone)"),
  status: z
    .enum(["lead", "prospect", "active", "inactive", "archived"])
    .nullable()
    .optional()
    .describe("Customer status filter"),
  sortBy: z
    .enum(["name", "createdAt", "totalRevenue", "lastContact"])
    .default("name")
    .describe("Sort field"),
  sortOrder: z.enum(["asc", "desc"]).default("asc").describe("Sort direction"),
});

export const getCustomersTool = tool({
  description: "Retrieve customers with filtering, search, and pagination.",
  inputSchema: getCustomersSchema,
  execute: async function* (
    { cursor, pageSize = 10, q, status, sortBy, sortOrder },
    executionOptions
  ) {
    // Extract context from execution options
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;

    if (!teamId) {
      yield {
        text: "Unable to retrieve customers: Team ID not found in context.",
      };
      return;
    }

    try {
      const result = await getCustomers(db, {
        teamId,
        cursor: cursor ?? null,
        pageSize,
        q: q ?? null,
        status: status ?? null,
        sortBy,
        sortOrder,
      });

      if (result.data.length === 0) {
        yield { text: "No customers found matching your criteria." };
        return;
      }

      // Format response as markdown table
      const response = `| Name | Email | Phone | Status | Total Revenue |
|------|-------|-------|--------|---------------|
${result.data.map((c) =>
  `| ${c.name} | ${c.email || '-'} | ${c.phone || '-'} | ${c.status} | ${formatAmount({ amount: c.totalRevenue, currency: appContext.baseCurrency, locale: appContext.locale })} |`
).join("\n")}

**${result.data.length} customers** | ${result.hasMore ? `More available (cursor: ${result.nextCursor})` : 'All shown'}`;

      yield {
        text: response,
        link: {
          text: "View all customers",
          url: `${getAppUrl()}/customers`,
        },
      };

      // Return structured data for further processing
      return {
        customers: result.data,
        pagination: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to retrieve customers: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
```

### 2.2 Tool with Streaming Artifact

For rich visual responses, use artifacts with progressive loading stages.

```typescript
// apps/api/src/ai/artifacts/project-timeline.ts
import { artifact } from "@ai-sdk-tools/artifacts";
import { z } from "zod";

export const projectTimelineArtifact = artifact(
  "project-timeline-canvas",
  z.object({
    // Processing stage for progressive rendering
    stage: z.enum([
      "loading",
      "milestones_ready",
      "tasks_ready",
      "analysis_ready",
    ]),

    // Project info
    projectId: z.string(),
    projectName: z.string(),
    currency: z.string(),

    // Milestone data (available at milestones_ready)
    milestones: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          dueDate: z.string(),
          status: z.enum(["pending", "in_progress", "completed", "overdue"]),
          progress: z.number(), // 0-100
        })
      )
      .optional(),

    // Task breakdown (available at tasks_ready)
    tasks: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          assignee: z.string().optional(),
          status: z.string(),
          dueDate: z.string().optional(),
        })
      )
      .optional(),

    // Analysis (available at analysis_ready)
    analysis: z
      .object({
        onTrack: z.boolean(),
        riskLevel: z.enum(["low", "medium", "high"]),
        summary: z.string(),
        recommendations: z.array(z.string()),
      })
      .optional(),
  })
);
```

```typescript
// apps/api/src/ai/tools/get-project-timeline.ts
import { getWriter } from "@ai-sdk-tools/artifacts";
import type { AppContext } from "@api/ai/agents/config/shared";
import { projectTimelineArtifact } from "@api/ai/artifacts/project-timeline";
import { db } from "@ralph/db/client";
import { getProjectWithTasks } from "@ralph/db/queries";
import { tool } from "ai";
import { z } from "zod";

const getProjectTimelineSchema = z.object({
  projectId: z.string().describe("Project ID to analyze"),
  showCanvas: z.boolean().default(false).describe("Show visual timeline"),
});

export const getProjectTimelineTool = tool({
  description: "Get project timeline with milestones, tasks, and progress analysis.",
  inputSchema: getProjectTimelineSchema,
  execute: async function* ({ projectId, showCanvas }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;

    // Initialize artifact writer if canvas requested
    let timeline: ReturnType<typeof projectTimelineArtifact.stream> | undefined;
    if (showCanvas) {
      const writer = getWriter(executionOptions);
      timeline = projectTimelineArtifact.stream(
        {
          stage: "loading",
          projectId,
          projectName: "",
          currency: appContext.baseCurrency || "USD",
        },
        writer
      );
    }

    try {
      const project = await getProjectWithTasks(db, { projectId, teamId });

      if (!project) {
        yield { text: "Project not found." };
        return;
      }

      // Update artifact with milestones
      if (showCanvas && timeline) {
        await timeline.update({
          stage: "milestones_ready",
          projectId,
          projectName: project.name,
          currency: appContext.baseCurrency || "USD",
          milestones: project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            dueDate: m.dueDate.toISOString(),
            status: m.status,
            progress: m.progress,
          })),
        });
      }

      // Update artifact with tasks
      if (showCanvas && timeline) {
        await timeline.update({
          stage: "tasks_ready",
          projectId,
          projectName: project.name,
          currency: appContext.baseCurrency || "USD",
          milestones: project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            dueDate: m.dueDate.toISOString(),
            status: m.status,
            progress: m.progress,
          })),
          tasks: project.tasks.map((t) => ({
            id: t.id,
            name: t.name,
            assignee: t.assignee?.name,
            status: t.status,
            dueDate: t.dueDate?.toISOString(),
          })),
        });
      }

      // Calculate analysis
      const overdueCount = project.milestones.filter((m) => m.status === "overdue").length;
      const analysis = {
        onTrack: overdueCount === 0,
        riskLevel: overdueCount > 2 ? "high" : overdueCount > 0 ? "medium" : "low",
        summary: `Project has ${project.milestones.length} milestones and ${project.tasks.length} tasks.`,
        recommendations: overdueCount > 0
          ? ["Address overdue milestones", "Review resource allocation"]
          : ["Project is on track", "Continue monitoring progress"],
      };

      // Final artifact update with analysis
      if (showCanvas && timeline) {
        await timeline.update({
          stage: "analysis_ready",
          projectId,
          projectName: project.name,
          currency: appContext.baseCurrency || "USD",
          milestones: project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            dueDate: m.dueDate.toISOString(),
            status: m.status,
            progress: m.progress,
          })),
          tasks: project.tasks.map((t) => ({
            id: t.id,
            name: t.name,
            assignee: t.assignee?.name,
            status: t.status,
            dueDate: t.dueDate?.toISOString(),
          })),
          analysis,
        });
      }

      // Yield text response
      let responseText = `**Project: ${project.name}**\n\n`;
      responseText += `**Status:** ${analysis.onTrack ? "On Track" : "Needs Attention"} (${analysis.riskLevel} risk)\n\n`;
      responseText += `**Milestones:**\n`;
      for (const m of project.milestones) {
        responseText += `- ${m.name}: ${m.status} (${m.progress}%)\n`;
      }

      if (showCanvas) {
        responseText += "\n\nA detailed visual timeline is available in the canvas.";
      }

      yield { text: responseText };

      return {
        project,
        analysis,
      };
    } catch (error) {
      yield {
        text: `Failed to retrieve project timeline: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
```

### 2.3 Write/Mutation Tool Pattern

For tools that modify data, include confirmation and validation.

```typescript
// apps/api/src/ai/tools/create-customer.ts
import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@ralph/db/client";
import { createCustomer } from "@ralph/db/queries";
import { tool } from "ai";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(1).describe("Customer name"),
  email: z.string().email().optional().describe("Customer email"),
  phone: z.string().optional().describe("Customer phone number"),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional().describe("Customer address"),
  status: z.enum(["lead", "prospect", "active"]).default("lead").describe("Initial status"),
  notes: z.string().optional().describe("Initial notes about the customer"),
});

export const createCustomerTool = tool({
  description: "Create a new customer record. Use this to add new leads or customers to the system.",
  inputSchema: createCustomerSchema,
  execute: async function* (
    { name, email, phone, address, status, notes },
    executionOptions
  ) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;
    const userId = appContext.userId as string;

    if (!teamId) {
      yield { text: "Unable to create customer: Team ID not found." };
      return;
    }

    try {
      // Validate email uniqueness if provided
      if (email) {
        const existing = await db.query.customers.findFirst({
          where: (c, { and, eq }) => and(
            eq(c.teamId, teamId),
            eq(c.email, email)
          ),
        });

        if (existing) {
          yield {
            text: `A customer with email ${email} already exists: ${existing.name}`,
            link: {
              text: "View existing customer",
              url: `${getAppUrl()}/customers/${existing.id}`,
            },
          };
          return { success: false, reason: "duplicate_email" };
        }
      }

      // Create the customer
      const customer = await createCustomer(db, {
        teamId,
        createdBy: userId,
        name,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        status,
        notes: notes ?? null,
      });

      yield {
        text: `Customer "${name}" created successfully with status "${status}".`,
        link: {
          text: "View customer",
          url: `${getAppUrl()}/customers/${customer.id}`,
        },
      };

      return {
        success: true,
        customer,
      };
    } catch (error) {
      yield {
        text: `Failed to create customer: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
```

### 2.4 Tool Helpers

Create reusable helpers for common tool patterns.

```typescript
// apps/api/src/ai/utils/tool-helpers.ts
import type { AppContext } from "@api/ai/agents/config/shared";

/**
 * Check if team has required setup (e.g., bank accounts for financial tools)
 */
export function checkRequiredSetup(
  appContext: AppContext,
  requirement: keyof AppContext
): { hasSetup: boolean; shouldYield: boolean } {
  const hasSetup = Boolean(appContext[requirement]);
  return {
    hasSetup,
    shouldYield: !hasSetup,
  };
}

/**
 * Format pagination info for responses
 */
export function formatPaginationInfo(
  count: number,
  hasMore: boolean,
  cursor?: string
): string {
  if (!hasMore) {
    return `**${count} results** (all shown)`;
  }
  return `**${count} results** | More available`;
}

/**
 * Validate date range inputs
 */
export function validateDateRange(
  from?: string,
  to?: string
): { valid: boolean; error?: string } {
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate > toDate) {
      return { valid: false, error: "Start date must be before end date" };
    }
  }
  return { valid: true };
}
```

---

## 3. Context Management

### 3.1 AppContext Interface

Define a comprehensive context interface for multi-tenant CRM operations.

```typescript
// apps/api/src/ai/agents/config/shared.ts
export interface AppContext {
  // User identity
  userId: string;
  fullName: string;

  // Team/Organization
  teamId: string;
  companyName: string;

  // Localization
  baseCurrency: string;
  locale: string;
  timezone: string;
  country?: string;
  city?: string;
  region?: string;

  // Session
  chatId: string;
  currentDateTime: string;

  // Business config
  fiscalYearStartMonth?: number;

  // Feature flags / setup status
  hasProjects?: boolean;
  hasInvoicing?: boolean;
  hasTimeTracking?: boolean;

  // Extensible
  [key: string]: unknown;
}
```

### 3.2 Context Builder

Build context from authenticated request data.

```typescript
// apps/api/src/ai/utils/get-user-context.ts
import type { Database } from "@db/client";
import { chatCache } from "@ralph/cache/chat-cache";
import { getTeamById, getUserById, getTeamFeatures } from "@ralph/db/queries";
import { HTTPException } from "hono/http-exception";

interface GetUserContextParams {
  db: Database;
  userId: string;
  teamId: string;
  country?: string;
  city?: string;
  timezone?: string;
}

export async function getUserContext({
  db,
  userId,
  teamId,
  country,
  city,
  timezone,
}: GetUserContextParams): Promise<ChatUserContext> {
  // Try cache first
  const cached = await chatCache.getUserContext(userId, teamId);
  if (cached) {
    return cached;
  }

  // Fetch team and user data in parallel
  const [team, user, features] = await Promise.all([
    getTeamById(db, teamId),
    getUserById(db, userId),
    getTeamFeatures(db, teamId),
  ]);

  if (!team || !user) {
    throw new HTTPException(404, {
      message: "User or team not found",
    });
  }

  const context: ChatUserContext = {
    userId,
    teamId,
    teamName: team.name,
    fullName: user.fullName,
    fiscalYearStartMonth: team.fiscalYearStartMonth,
    baseCurrency: team.baseCurrency,
    locale: user.locale ?? "en-US",
    dateFormat: user.dateFormat,
    country,
    city,
    timezone,
    // Feature flags
    hasProjects: features.includes("projects"),
    hasInvoicing: features.includes("invoicing"),
    hasTimeTracking: features.includes("time_tracking"),
  };

  // Cache for future requests (non-blocking)
  chatCache.setUserContext(userId, teamId, context).catch(() => {});

  return context;
}

/**
 * Build AppContext from user context for agent use
 */
export function buildAppContext(
  context: ChatUserContext,
  chatId: string
): AppContext {
  // Scope userId by team for multi-tenant isolation
  const scopedUserId = `${context.userId}:${context.teamId}`;

  return {
    userId: scopedUserId,
    fullName: context.fullName ?? "",
    companyName: context.teamName ?? "",
    country: context.country ?? undefined,
    city: context.city ?? undefined,
    region: context.region ?? undefined,
    chatId,
    baseCurrency: context.baseCurrency ?? "USD",
    locale: context.locale ?? "en-US",
    currentDateTime: new Date().toISOString(),
    timezone: context.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    teamId: context.teamId,
    fiscalYearStartMonth: context.fiscalYearStartMonth ?? undefined,
    hasProjects: context.hasProjects ?? false,
    hasInvoicing: context.hasInvoicing ?? false,
    hasTimeTracking: context.hasTimeTracking ?? false,
  };
}
```

### 3.3 formatContextForLLM Helper

Format context as structured XML for LLM consumption.

```typescript
// apps/api/src/ai/agents/config/shared.ts
export function formatContextForLLM(context: AppContext): string {
  return `<company_info>
<current_date>${context.currentDateTime}</current_date>
<timezone>${context.timezone}</timezone>
<company_name>${context.companyName}</company_name>
<base_currency>${context.baseCurrency}</base_currency>
<locale>${context.locale}</locale>
${context.fiscalYearStartMonth ? `<fiscal_year_start>${context.fiscalYearStartMonth}</fiscal_year_start>` : ''}
</company_info>

<user_info>
<name>${context.fullName}</name>
${context.country ? `<location>${context.city ? context.city + ', ' : ''}${context.region ? context.region + ', ' : ''}${context.country}</location>` : ''}
</user_info>

<enabled_features>
${context.hasProjects ? '- projects: Project management and tracking' : ''}
${context.hasInvoicing ? '- invoicing: Invoice creation and payment tracking' : ''}
${context.hasTimeTracking ? '- time_tracking: Time entries and labor management' : ''}
</enabled_features>

Important: Use the current date/time above for time-sensitive operations.
User-specific information is maintained in your working memory.`;
}
```

---

## 4. Memory

### 4.1 Redis Provider for Chat History

Use Redis for persistent, scalable chat storage.

```typescript
// apps/api/src/ai/agents/config/shared.ts
import { RedisProvider } from "@ai-sdk-tools/memory/redis";
import { getSharedRedisClient } from "@ralph/cache/shared-redis";

export const memoryProvider = new RedisProvider(getSharedRedisClient());
```

### 4.2 Working Memory Template

Define structured working memory for user-scoped context.

```markdown
<!-- apps/api/src/ai/agents/config/memory-template.md -->
<user_profile>
Name: [Learn from conversation]
Role: [Business owner, Project manager, Accountant, etc.]
</user_profile>

<business_focus>
Key Metrics: [Revenue, project margins, customer growth, etc.]
Recent Concerns: [Issues or questions mentioned]
Frequent Requests: [Common queries to optimize for]
</business_focus>

<project_context>
Active Projects: [If mentioned - names, statuses]
Key Customers: [Important customer relationships]
</project_context>

<communication_preferences>
Style: [Formal vs casual, technical vs simplified]
Tone: [Professional, friendly, analytical, etc.]
Detail Level: [Summary vs comprehensive]
</communication_preferences>
```

### 4.3 Memory Configuration in Agent Factory

```typescript
// apps/api/src/ai/agents/config/shared.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const memoryTemplate = readFileSync(
  join(process.cwd(), "src/ai/agents/config/memory-template.md"),
  "utf-8"
);

const titleInstructions = readFileSync(
  join(process.cwd(), "src/ai/agents/config/title-instructions.md"),
  "utf-8"
);

const suggestionsInstructions = readFileSync(
  join(process.cwd(), "src/ai/agents/config/suggestions-instructions.md"),
  "utf-8"
);

export const createAgent = (config: AgentConfig<AppContext>) => {
  return new Agent({
    ...config,
    memory: {
      provider: memoryProvider,
      // Conversation history
      history: {
        enabled: true,
        limit: 10, // Keep last 10 turns
      },
      // Per-user working memory (persists across sessions)
      workingMemory: {
        enabled: true,
        template: memoryTemplate,
        scope: "user", // Scoped to userId from context
      },
      // Chat session management
      chats: {
        enabled: true,
        generateTitle: {
          model: anthropic("claude-3-5-haiku-20241022"),
          instructions: titleInstructions,
        },
        generateSuggestions: {
          enabled: true,
          model: anthropic("claude-3-5-haiku-20241022"),
          limit: 5,
          instructions: suggestionsInstructions,
        },
      },
    },
  });
};
```

### 4.4 Title Generation Instructions

```markdown
<!-- apps/api/src/ai/agents/config/title-instructions.md -->
Generate a concise, descriptive title for this conversation.

Rules:
- Maximum 50 characters
- Use action verbs when possible
- Include key topic or entity mentioned
- Avoid generic titles like "Chat" or "Help"

Examples:
- "Customer revenue analysis Q4"
- "New project setup for Anderson"
- "Invoice payment tracking"
- "Team time tracking review"
```

### 4.5 Suggestions Instructions

```markdown
<!-- apps/api/src/ai/agents/config/suggestions-instructions.md -->
Generate follow-up question suggestions based on the conversation.

Rules:
- Provide 3-5 natural follow-up questions
- Questions should help the user accomplish their goal
- Include both clarifying and expanding questions
- Keep questions under 60 characters
- Make questions specific to the context

Examples after a customer query:
- "Show their project history"
- "What's their outstanding balance?"
- "When was our last contact?"
- "Any upcoming estimates for them?"
```

---

## 5. Model Selection

### 5.1 Model Tiers with @ai-sdk/anthropic

```typescript
// apps/api/src/ai/config/models.ts
import { anthropic } from "@ai-sdk/anthropic";

/**
 * Model selection strategy based on task complexity
 */
export const models = {
  /**
   * Fast tier - for routing, suggestions, titles
   * Low latency, good enough for simple decisions
   */
  fast: anthropic("claude-3-5-haiku-20241022"),

  /**
   * Default tier - for most agent tasks
   * Balanced speed and capability
   */
  default: anthropic("claude-sonnet-4-20250514"),

  /**
   * Advanced tier - for complex analysis
   * Higher capability, use sparingly
   */
  advanced: anthropic("claude-sonnet-4-20250514"), // or claude-opus-4-20250514 when available
};

/**
 * Select model based on task type
 */
export function selectModel(taskType: string) {
  switch (taskType) {
    case "routing":
    case "title":
    case "suggestions":
      return models.fast;

    case "analysis":
    case "forecasting":
    case "complex_reasoning":
      return models.advanced;

    default:
      return models.default;
  }
}
```

### 5.2 Usage in Agents

```typescript
// Triage agent uses fast model
export const mainAgent = createAgent({
  name: "triage",
  model: models.fast,
  temperature: 0.1,
  // ...
});

// Domain agents use default model
export const customersAgent = createAgent({
  name: "customers",
  model: models.default,
  temperature: 0.3,
  // ...
});

// Analytics uses advanced model for complex analysis
export const analyticsAgent = createAgent({
  name: "analytics",
  model: models.advanced,
  temperature: 0.5,
  // ...
});
```

---

## 6. Streaming Responses

### 6.1 Chat Router with Streaming

```typescript
// apps/api/src/rest/routers/chat.ts
import { buildAppContext } from "@api/ai/agents/config/shared";
import { mainAgent } from "@api/ai/agents/main";
import { getUserContext } from "@api/ai/utils/get-user-context";
import type { Context } from "@api/rest/types";
import { chatRequestSchema } from "@api/schemas/chat";
import { OpenAPIHono } from "@hono/zod-openapi";
import { smoothStream } from "ai";
import { withRequiredScope } from "../middleware";

const app = new OpenAPIHono<Context>();

app.post("/", withRequiredScope("chat.write"), async (c) => {
  const body = await c.req.json();
  const validationResult = chatRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return c.json({ success: false, error: validationResult.error }, 400);
  }

  const { message, id, timezone, agentChoice, toolChoice, country, city } =
    validationResult.data;

  const teamId = c.get("teamId");
  const session = c.get("session");
  const userId = session.user.id;
  const db = c.get("db");

  // Build context from authenticated request
  const userContext = await getUserContext({
    db,
    userId,
    teamId,
    country,
    city,
    timezone,
  });

  const appContext = buildAppContext(userContext, id);

  // Stream response from agent
  return mainAgent.toUIMessageStream({
    message,
    strategy: "auto",         // Auto-select streaming strategy
    maxRounds: 5,             // Max handoff rounds
    maxSteps: 20,             // Max tool calls per round
    context: appContext,
    agentChoice,              // Optional: force specific agent
    toolChoice,               // Optional: force specific tool
    experimental_transform: smoothStream({
      chunking: "word",       // Stream word by word for smooth UI
    }),
    sendSources: true,        // Include source references
  });
});

export { app as chatRouter };
```

### 6.2 useChat Hook Integration (Frontend)

```typescript
// apps/web/src/hooks/use-chat.ts
import { useChat as useAIChat } from "@ai-sdk/react";
import { useMemo } from "react";

interface UseChatOptions {
  chatId: string;
  onError?: (error: Error) => void;
}

export function useChat({ chatId, onError }: UseChatOptions) {
  const chat = useAIChat({
    id: chatId,
    api: "/api/chat",
    body: {
      id: chatId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    onError,
    // Enable streaming
    experimental_throttle: 50, // Throttle updates for performance
  });

  // Extract artifacts from messages
  const artifacts = useMemo(() => {
    return chat.messages.flatMap((msg) => {
      if (msg.role !== "assistant") return [];
      return msg.parts?.filter((p) => p.type === "artifact") ?? [];
    });
  }, [chat.messages]);

  // Get suggestions from latest message
  const suggestions = useMemo(() => {
    const lastAssistant = [...chat.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    return lastAssistant?.suggestions ?? [];
  }, [chat.messages]);

  return {
    ...chat,
    artifacts,
    suggestions,
  };
}
```

### 6.3 Artifact Rendering Component

```typescript
// apps/web/src/components/chat/artifact-renderer.tsx
import { projectTimelineArtifact } from "@api/ai/artifacts/project-timeline";
import { revenueArtifact } from "@api/ai/artifacts/revenue";

// Map artifact types to components
const artifactComponents = {
  "project-timeline-canvas": ProjectTimelineCanvas,
  "revenue-canvas": RevenueCanvas,
  // Add more artifact types as needed
};

interface ArtifactRendererProps {
  artifact: {
    type: string;
    data: unknown;
  };
}

export function ArtifactRenderer({ artifact }: ArtifactRendererProps) {
  const Component = artifactComponents[artifact.type];

  if (!Component) {
    return <div>Unknown artifact type: {artifact.type}</div>;
  }

  return <Component data={artifact.data} />;
}

// Example artifact component
function ProjectTimelineCanvas({ data }: { data: z.infer<typeof projectTimelineArtifact.schema> }) {
  if (data.stage === "loading") {
    return <TimelineSkeleton />;
  }

  return (
    <div className="border rounded-lg p-4">
      <h3>{data.projectName}</h3>

      {data.milestones && (
        <MilestoneList milestones={data.milestones} />
      )}

      {data.tasks && (
        <TaskTable tasks={data.tasks} />
      )}

      {data.analysis && (
        <AnalysisSummary analysis={data.analysis} />
      )}
    </div>
  );
}
```

### 6.4 Partial Results with yield

Tools can yield partial results as they stream.

```typescript
export const getProjectsTool = tool({
  description: "Get projects with optional filtering",
  inputSchema: getProjectsSchema,
  execute: async function* ({ status, limit }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;

    // Yield loading state
    yield { text: "Loading projects..." };

    const projects = await getProjects(db, {
      teamId: appContext.teamId,
      status,
      limit,
    });

    if (projects.length === 0) {
      yield { text: "No projects found." };
      return { projects: [] };
    }

    // Yield first results quickly
    yield {
      text: `Found ${projects.length} projects. Loading details...`
    };

    // Process and yield detailed results
    const projectsWithStats = await Promise.all(
      projects.map(async (p) => ({
        ...p,
        stats: await getProjectStats(db, p.id),
      }))
    );

    // Final yield with full data
    const table = formatProjectsTable(projectsWithStats, appContext);
    yield { text: table };

    return { projects: projectsWithStats };
  },
});
```

---

## 7. Error Handling

### 7.1 Tool Error Patterns

```typescript
// Standard error patterns in tools
export const getCustomersTool = tool({
  description: "Get customers",
  inputSchema: schema,
  execute: async function* (params, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;

    // 1. Context validation
    if (!teamId) {
      yield {
        text: "Unable to retrieve customers: Team ID not found in context.",
      };
      return;
    }

    // 2. Feature/setup validation
    const { shouldYield } = checkRequiredSetup(appContext, "hasProjects");
    if (shouldYield) {
      throw new Error("FEATURE_NOT_ENABLED");
    }

    try {
      // 3. Business logic
      const result = await getCustomers(db, { teamId, ...params });

      // 4. Empty result handling
      if (result.length === 0) {
        yield { text: "No customers found matching your criteria." };
        return { customers: [] };
      }

      yield { text: formatResult(result) };
      return { customers: result };

    } catch (error) {
      // 5. Error handling with context
      if (error instanceof DatabaseError) {
        yield { text: "Database connection error. Please try again." };
      } else if (error instanceof ValidationError) {
        yield { text: `Invalid request: ${error.message}` };
      } else {
        yield {
          text: `Failed to retrieve customers: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }
  },
});
```

### 7.2 Error Recovery Middleware

```typescript
// apps/api/src/rest/middleware/error-handler.ts
import { logger } from "@ralph/logger";

export async function errorHandler(
  err: Error,
  c: Context,
  next: Next
): Promise<Response> {
  // Known error types
  if (err.message === "BANK_ACCOUNT_REQUIRED") {
    return c.json({
      error: "Bank account required",
      message: "Please connect a bank account to use this feature.",
      code: "SETUP_REQUIRED",
    }, 400);
  }

  if (err.message === "FEATURE_NOT_ENABLED") {
    return c.json({
      error: "Feature not enabled",
      message: "This feature is not available for your plan.",
      code: "FEATURE_DISABLED",
    }, 403);
  }

  // Log unexpected errors
  logger.error("Unhandled error in chat", {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
  });

  return c.json({
    error: "Internal error",
    message: "An unexpected error occurred. Please try again.",
    code: "INTERNAL_ERROR",
  }, 500);
}
```

---

## 8. Multi-Tenant Considerations

### 8.1 Team Scoping in Tools

All database queries must include teamId for tenant isolation.

```typescript
// ALWAYS scope queries by teamId
const customers = await db.query.customers.findMany({
  where: (c, { eq }) => eq(c.teamId, teamId), // Required!
  orderBy: (c, { desc }) => desc(c.createdAt),
});

// Never query without team scope
// BAD: const customers = await db.query.customers.findMany();
```

### 8.2 Scoped User IDs for Memory

```typescript
// Combine userId and teamId for memory scoping
const scopedUserId = `${context.userId}:${context.teamId}`;

// This ensures:
// 1. User A on Team 1 has separate memory from User A on Team 2
// 2. All team members share relevant context while maintaining individual preferences
```

### 8.3 Feature Flags per Team

```typescript
// Check team features before tool execution
export const createInvoiceTool = tool({
  description: "Create an invoice",
  inputSchema: schema,
  execute: async function* (params, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;

    // Check if team has invoicing enabled
    if (!appContext.hasInvoicing) {
      yield {
        text: "Invoicing is not enabled for your account. Please upgrade to access this feature.",
        link: {
          text: "View pricing",
          url: `${getAppUrl()}/settings/billing`,
        },
      };
      return { success: false, reason: "feature_disabled" };
    }

    // Proceed with invoice creation...
  },
});
```

---

## Quick Reference

### Package Imports

```typescript
// AI SDK core
import { tool } from "ai";
import { smoothStream } from "ai";

// Anthropic provider
import { anthropic } from "@ai-sdk/anthropic";

// Agent framework (ai-sdk-tools)
import { Agent, type AgentConfig } from "@ai-sdk-tools/agents";
import { artifact, getWriter } from "@ai-sdk-tools/artifacts";
import { RedisProvider } from "@ai-sdk-tools/memory/redis";

// Validation
import { z } from "zod";

// React hooks
import { useChat } from "@ai-sdk/react";
```

### Common Model IDs

```typescript
// Claude 3.5 Haiku - Fast, routing, simple tasks
anthropic("claude-3-5-haiku-20241022")

// Claude Sonnet 4 - Default, balanced
anthropic("claude-sonnet-4-20250514")

// Claude Opus 4 - Complex analysis (when available)
anthropic("claude-opus-4-20250514")
```

### Temperature Guidelines

| Use Case | Temperature |
|----------|-------------|
| Routing/Triage | 0.1 |
| Data Retrieval | 0.2-0.3 |
| General Tasks | 0.3-0.5 |
| Creative/Analysis | 0.5-0.7 |

---

## References

- [Vercel AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [@ai-sdk/anthropic](https://www.npmjs.com/package/@ai-sdk/anthropic)
- [Midday Reference Implementation](../_reference/.midday-reference/apps/api/src/ai/)
