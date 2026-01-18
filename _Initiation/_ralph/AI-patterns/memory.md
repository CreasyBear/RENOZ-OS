# Memory Patterns

## Memory Layers

| Layer | Storage | TTL | Use Case |
|-------|---------|-----|----------|
| **Working Memory** | Redis | Session | Current conversation, user preferences |
| **Entity Cache** | Redis | 1hr | Recently accessed customers, orders |
| **Conversation History** | Postgres | 30 days | Past conversations for context |
| **Long-term Memory** | Postgres | Permanent | Learned preferences, decisions |

---

## Working Memory (Redis)

Using @ai-sdk-tools/memory with RedisProvider:

```typescript
// lib/ai/memory/provider.ts
import { RedisProvider } from '@ai-sdk-tools/memory';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export const memoryProvider = new RedisProvider({
  redis,
  prefix: 'renoz:memory',
  ttl: 60 * 60 * 24  // 24 hours
});

// Memory scoped by user + org for multi-tenancy
const getMemoryKey = (userId: string, orgId: string) =>
  `${orgId}:${userId}:working`;
```

---

## Working Memory Template

What to store in working memory:

```typescript
// lib/ai/memory/working-memory-template.ts
export interface WorkingMemory {
  // User context
  user: {
    id: string;
    name: string;
    role: 'admin' | 'sales' | 'operations' | 'finance';
    preferences: {
      defaultListSize: number;
      preferredOrderSort: string;
    };
  };

  // Current page context
  currentPage: {
    route: string;
    entityType?: 'customer' | 'order' | 'product';
    entityId?: string;
  };

  // Recent actions (for undo, context)
  recentActions: Array<{
    action: string;
    entityId: string;
    timestamp: Date;
  }>;

  // Conversation history (last N turns)
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}
```

---

## Conversation History (Drizzle)

For longer-term persistence:

```typescript
// lib/ai/memory/drizzle-provider.ts
import { DrizzleProvider } from '@ai-sdk-tools/memory';
import { db } from '@/lib/db';

export const conversationProvider = new DrizzleProvider({
  db,
  table: 'ai_conversations',
  historyLimit: 10  // Last 10 turns injected
});

// Schema
// drizzle/schema/ai-conversations.ts
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  orgId: uuid('org_id').notNull(),
  messages: jsonb('messages').$type<Message[]>(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

---

## Entity Cache Pattern

Cache frequently accessed entities:

```typescript
// lib/ai/cache/entity-cache.ts
export class EntityCache {
  private redis: Redis;
  private ttl = 60 * 60; // 1 hour

  async getCustomer(id: string): Promise<Customer | null> {
    const cached = await this.redis.get(`entity:customer:${id}`);
    if (cached) return JSON.parse(cached);

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, id)
    });

    if (customer) {
      await this.redis.setex(
        `entity:customer:${id}`,
        this.ttl,
        JSON.stringify(customer)
      );
    }

    return customer;
  }

  async invalidate(entityType: string, id: string) {
    await this.redis.del(`entity:${entityType}:${id}`);
  }
}
```

---

## Long-term Memory (Learnings)

Store user preferences and patterns:

```typescript
// lib/ai/memory/learnings.ts
export const aiLearnings = pgTable('ai_learnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  orgId: uuid('org_id').notNull(),
  type: text('type').$type<'preference' | 'pattern' | 'correction'>(),
  content: text('content').notNull(),
  confidence: real('confidence').default(0.5),
  usageCount: integer('usage_count').default(0),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow()
});

// Examples of learnings:
// - "User prefers orders sorted by due date"
// - "User usually filters customers by active status"
// - "User corrected: 'pending' should include 'draft' orders"
```

---

## Memory Injection Pattern

How to inject memory into agent context:

```typescript
// lib/ai/agents/with-memory.ts
export async function runWithMemory(
  agent: Agent,
  input: string,
  context: { userId: string; orgId: string }
) {
  // Load working memory
  const memory = await memoryProvider.get(
    getMemoryKey(context.userId, context.orgId)
  );

  // Load recent learnings
  const learnings = await db.query.aiLearnings.findMany({
    where: and(
      eq(aiLearnings.userId, context.userId),
      gt(aiLearnings.confidence, 0.7)
    ),
    limit: 5,
    orderBy: desc(aiLearnings.usageCount)
  });

  // Inject into system prompt
  const enrichedPrompt = `
${agent.system}

## User Context
- Name: ${memory.user.name}
- Role: ${memory.user.role}
- Current page: ${memory.currentPage.route}

## Learned Preferences
${learnings.map(l => `- ${l.content}`).join('\n')}

## Recent History
${memory.history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n')}
`;

  return agent.run({
    input,
    system: enrichedPrompt
  });
}
```

---

## Development Fallback

When Redis unavailable:

```typescript
// lib/ai/memory/provider.ts
import { InMemoryProvider } from '@ai-sdk-tools/memory';

export const memoryProvider = process.env.REDIS_URL
  ? new RedisProvider({ ... })
  : new InMemoryProvider();

// Log warning in dev
if (!process.env.REDIS_URL) {
  console.warn('AI memory using in-memory provider (dev mode)');
}
```
