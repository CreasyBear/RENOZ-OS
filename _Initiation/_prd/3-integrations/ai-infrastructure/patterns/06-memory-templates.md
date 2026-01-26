# Memory Template Patterns

## Source
- `_reference/.midday-reference/apps/api/src/ai/agents/config/memory-template.md`
- `_reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts`

## 1. Working Memory Template

Template for structured working memory that AI updates during conversations:

```markdown
<!-- src/lib/ai/memory/templates/working-memory.md -->

<user_profile>
Name: [Learn from conversation]
Role: [Owner, Admin, Staff, etc.]
Department: [If mentioned]
</user_profile>

<business_context>
Active Customer: [Current customer being discussed]
Current Job: [Active job/project reference]
Recent Activity: [Last 2-3 significant actions]
</business_context>

<conversation_focus>
Key Topics: [Main subjects discussed]
Recent Concerns: [Issues or questions raised]
Follow-up Items: [Things to remember for next time]
</conversation_focus>

<communication_preferences>
Style: [Formal vs casual]
Detail Level: [Summary vs detailed]
Tone: [Professional, friendly, analytical]
</communication_preferences>
```

## 2. Template Rendering

Interpolate context into template:

```typescript
// src/lib/ai/memory/template-renderer.ts
import type { AppContext } from "../context/types";

const TEMPLATE = `
<user_profile>
Name: {{fullName}}
Role: {{role}}
Organization: {{companyName}}
</user_profile>

<business_context>
Current View: {{currentView}}
Active Customer: {{activeCustomer}}
Current Filter: {{currentFilterDescription}}
</business_context>

<session_context>
Timezone: {{timezone}}
Current Time: {{currentDateTime}}
Currency: {{baseCurrency}}
</session_context>
`;

export function renderMemoryTemplate(ctx: AppContext): string {
  const filterDescription = ctx.currentViewFilter
    ? `${ctx.currentViewFilter.from} to ${ctx.currentViewFilter.to}`
    : "None";

  return TEMPLATE
    .replace("{{fullName}}", ctx.fullName || "Unknown")
    .replace("{{role}}", ctx.role || "staff")
    .replace("{{companyName}}", ctx.companyName || "")
    .replace("{{currentView}}", ctx.currentView || "/")
    .replace("{{activeCustomer}}", ctx.activeCustomer || "None")
    .replace("{{currentFilterDescription}}", filterDescription)
    .replace("{{timezone}}", ctx.timezone)
    .replace("{{currentDateTime}}", ctx.currentDateTime)
    .replace("{{baseCurrency}}", ctx.baseCurrency);
}
```

## 3. Redis Memory Provider

```typescript
// src/lib/ai/memory/redis-provider.ts
import { Redis } from "@upstash/redis";
import type { MemoryProvider } from "./types";

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN,
});

const WORKING_MEMORY_TTL = 60 * 60 * 24; // 24 hours

export const redisMemoryProvider: MemoryProvider = {
  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await redis.set(key, value, { ex: ttl });
    } else {
      await redis.set(key, value, { ex: WORKING_MEMORY_TTL });
    }
  },

  async delete(key: string): Promise<void> {
    await redis.del(key);
  },
};

// Key patterns
export function getWorkingMemoryKey(orgId: string, userId: string): string {
  return `working:${orgId}:${userId}`;
}

export function getChatHistoryKey(orgId: string, chatId: string): string {
  return `chat:${orgId}:${chatId}`;
}
```

## 4. Memory Injection

Inject working memory into agent system prompt:

```typescript
// src/lib/ai/memory/inject-memory.ts
import { redisMemoryProvider, getWorkingMemoryKey } from "./redis-provider";
import { renderMemoryTemplate } from "./template-renderer";
import type { AppContext } from "../context/types";

export async function injectMemoryContext(
  basePrompt: string,
  ctx: AppContext,
): Promise<string> {
  // Get persisted working memory
  const workingMemoryKey = getWorkingMemoryKey(ctx.organizationId, ctx.userId);
  const persistedMemory = await redisMemoryProvider.get(workingMemoryKey);

  // Render fresh context
  const freshContext = renderMemoryTemplate(ctx);

  // Combine base prompt with memory context
  return `${basePrompt}

## Working Memory
${freshContext}

## Learned Context
${persistedMemory || "No learned context yet."}`;
}
```

## 5. Agent Memory Configuration

Configure memory in agent factory:

```typescript
// src/lib/ai/agents/config/shared.ts
import { Agent, type AgentConfig } from "@ai-sdk/agent";
import { redisMemoryProvider } from "../memory/redis-provider";

// Memory template content
const memoryTemplate = `
<user_profile>
Name: [Learn from conversation]
Role: [Owner, Admin, Staff, etc.]
</user_profile>

<business_context>
Active Customer: [Current customer being discussed]
Current Job: [Active job/project reference]
</business_context>

<conversation_focus>
Key Topics: [Main subjects discussed]
Recent Concerns: [Issues or questions raised]
</conversation_focus>

<communication_preferences>
Style: [Formal vs casual]
Detail Level: [Summary vs detailed]
</communication_preferences>
`;

export const createAgent = (config: AgentConfig<AppContext>) => {
  return new Agent({
    ...config,
    memory: {
      provider: redisMemoryProvider,
      history: {
        enabled: true,
        limit: 10,  // Keep last 10 messages for context efficiency
      },
      workingMemory: {
        enabled: true,
        template: memoryTemplate,
        scope: "user",  // Per-user working memory
      },
    },
  });
};
```

## 6. Session History Management

Limit message history to prevent context overflow:

```typescript
// src/lib/ai/memory/drizzle-provider.ts
const MESSAGE_HISTORY_LIMIT = 10;

export async function getConversationHistory(
  conversationId: string,
): Promise<Message[]> {
  const messages = await db.query.aiConversationMessages.findMany({
    where: eq(aiConversationMessages.conversationId, conversationId),
    orderBy: [desc(aiConversationMessages.createdAt)],
    limit: MESSAGE_HISTORY_LIMIT,
  });

  // Return in chronological order
  return messages.reverse();
}
```

## 7. Title and Suggestion Generation

Use cheap models for utility tasks:

```typescript
// src/lib/ai/memory/title-generator.ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const titleInstructions = `Generate a concise title that captures the user's intent.

<rules>
- Extract the core topic/intent, not the question itself
- Use noun phrases (e.g., "Tesla Affordability" not "Can I Afford Tesla")
- Maximum 30 characters
- Title case
- Use proper abbreviations (Q1, Q2, etc.)
</rules>`;

export async function generateChatTitle(messages: Message[]): Promise<string> {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .slice(0, 3)
    .map((m) => m.content)
    .join("\n");

  const result = await generateText({
    model: openai("gpt-4.1-nano"),  // Ultra-cheap for utility
    prompt: `${titleInstructions}\n\nUser messages:\n${userMessages}`,
    temperature: 0.3,
  });

  return result.text.slice(0, 30);
}

const suggestionsInstructions = `Generate 5 brief follow-up suggestions (2-3 words each).

<suggestion_guidelines>
After showing data:
- Compare periods or categories
- Show related metrics
- Visualize trends
- Drill into details

After analysis:
- Check underlying data
- Create visualizations
- Compare benchmarks
</suggestion_guidelines>`;

export async function generateSuggestions(
  messages: Message[],
): Promise<string[]> {
  const result = await generateText({
    model: openai("gpt-4.1-nano"),
    prompt: `${suggestionsInstructions}\n\nRecent conversation:\n${formatMessages(messages)}`,
    temperature: 0.5,
  });

  return result.text.split("\n").filter(Boolean).slice(0, 5);
}
```

## 8. Memory Fallback

Graceful fallback when Redis is unavailable:

```typescript
// src/lib/ai/memory/redis-provider.ts
const inMemoryFallback = new Map<string, string>();

export const redisMemoryProvider: MemoryProvider = {
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (error) {
      console.warn("Redis unavailable, using in-memory fallback", error);
      return inMemoryFallback.get(key) ?? null;
    }
  },

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await redis.set(key, value, { ex: ttl || WORKING_MEMORY_TTL });
    } catch (error) {
      console.warn("Redis unavailable, using in-memory fallback", error);
      inMemoryFallback.set(key, value);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn("Redis unavailable, using in-memory fallback", error);
      inMemoryFallback.delete(key);
    }
  },
};
```

## Usage in PRD Stories

- **AI-INFRA-012**: Memory Persistence Layer - Use all patterns
