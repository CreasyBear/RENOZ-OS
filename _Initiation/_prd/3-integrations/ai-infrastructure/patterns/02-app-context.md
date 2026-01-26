# AppContext Patterns

## Source
- `_reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts`
- `_reference/.midday-reference/apps/api/src/ai/utils/get-user-context.ts`

## 1. AppContext Interface

The central context object passed to all AI operations:

```typescript
// src/lib/ai/context/types.ts

export interface MetricsFilter {
  period: string;           // "1-year", "6-months", etc.
  from: string;             // yyyy-MM-dd
  to: string;               // yyyy-MM-dd
  currency?: string;
  customerId?: string;      // Current customer filter
}

export interface ForcedToolCall {
  toolName: string;
  toolParams: Record<string, unknown>;
}

export interface AppContext {
  // User identity
  userId: string;
  organizationId: string;
  fullName: string;
  role: "owner" | "admin" | "staff";

  // Localization
  timezone: string;
  locale: string;
  baseCurrency: string;

  // Session
  chatId: string;
  currentDateTime: string;  // ISO 8601, updated per request
  currentView: string;      // Current route/page

  // Dashboard synchronization
  currentViewFilter?: MetricsFilter;
  forcedToolCall?: ForcedToolCall;

  // Feature flags
  hasIntegrations?: boolean;

  // Extensible
  [key: string]: unknown;
}
```

## 2. Building AppContext

Construct context from auth session and request:

```typescript
// src/lib/ai/context/app-context.ts
import type { AuthContext } from "@/lib/server/protected";
import type { AppContext, MetricsFilter, ForcedToolCall } from "./types";

interface BuildContextOptions {
  auth: AuthContext;
  chatId: string;
  currentView: string;
  metricsFilter?: MetricsFilter;
  forcedToolCall?: ForcedToolCall;
}

export function buildAppContext(options: BuildContextOptions): AppContext {
  const { auth, chatId, currentView, metricsFilter, forcedToolCall } = options;

  return {
    // Multi-tenant scoped ID
    userId: auth.userId,
    organizationId: auth.organizationId,
    fullName: auth.fullName ?? "",
    role: auth.role ?? "staff",

    // Localization
    timezone: auth.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: auth.locale ?? "en-US",
    baseCurrency: auth.baseCurrency ?? "USD",

    // Session
    chatId,
    currentDateTime: new Date().toISOString(),
    currentView,

    // Dashboard state
    currentViewFilter: metricsFilter,
    forcedToolCall,

    // Features
    hasIntegrations: auth.hasIntegrations ?? false,
  };
}
```

## 3. Multi-Tenant Scoping

For Redis keys and other scoped resources, combine userId and orgId:

```typescript
// Pattern: Scope user data by organization
function getScopedUserId(ctx: AppContext): string {
  return `${ctx.userId}:${ctx.organizationId}`;
}

// Redis key patterns
const REDIS_KEYS = {
  workingMemory: (ctx: AppContext) =>
    `working:${ctx.organizationId}:${ctx.userId}`,
  chatHistory: (ctx: AppContext) =>
    `chat:${ctx.organizationId}:${ctx.chatId}`,
  userPreferences: (ctx: AppContext) =>
    `prefs:${ctx.organizationId}:${ctx.userId}`,
};
```

## 4. Context Caching

Two-level cache for performance:

```typescript
// src/lib/ai/context/cache.ts
import { redis } from "@/lib/redis";

const USER_CONTEXT_TTL = 60 * 5;  // 5 minutes
const ORG_CONTEXT_TTL = 60 * 15;  // 15 minutes

export const contextCache = {
  async getUserContext(userId: string, orgId: string): Promise<UserContext | null> {
    const key = `ctx:user:${orgId}:${userId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  },

  async setUserContext(userId: string, orgId: string, ctx: UserContext): Promise<void> {
    const key = `ctx:user:${orgId}:${userId}`;
    // Non-blocking write - don't await in hot path
    redis.set(key, JSON.stringify(ctx), "EX", USER_CONTEXT_TTL).catch((err) => {
      console.warn("Failed to cache user context", { userId, orgId, error: err.message });
    });
  },

  async getOrgContext(orgId: string): Promise<OrgContext | null> {
    const key = `ctx:org:${orgId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  },

  async setOrgContext(orgId: string, ctx: OrgContext): Promise<void> {
    const key = `ctx:org:${orgId}`;
    redis.set(key, JSON.stringify(ctx), "EX", ORG_CONTEXT_TTL).catch((err) => {
      console.warn("Failed to cache org context", { orgId, error: err.message });
    });
  },
};
```

## 5. Getting User Context

Fetch context with caching:

```typescript
// src/lib/ai/context/get-user-context.ts
import { db } from "@/lib/db";
import { contextCache } from "./cache";

interface GetUserContextParams {
  userId: string;
  organizationId: string;
  timezone?: string;
}

export async function getUserContext(params: GetUserContextParams): Promise<ChatUserContext> {
  const { userId, organizationId, timezone } = params;

  // 1. Try cache first
  const cached = await contextCache.getUserContext(userId, organizationId);
  let orgContext = await contextCache.getOrgContext(organizationId);

  // 2. Fetch org context if not cached
  if (!orgContext) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    orgContext = {
      organizationId,
      name: org?.name ?? "",
      baseCurrency: org?.baseCurrency ?? "USD",
      hasIntegrations: org?.hasIntegrations ?? false,
    };

    // Non-blocking cache write
    contextCache.setOrgContext(organizationId, orgContext);
  }

  // 3. Return cached user context merged with org
  if (cached) {
    return { ...cached, ...orgContext };
  }

  // 4. Fetch user if not cached
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const context: ChatUserContext = {
    userId,
    organizationId,
    fullName: user?.fullName ?? "",
    role: user?.role ?? "staff",
    locale: user?.locale ?? "en-US",
    timezone: timezone ?? user?.timezone ?? "UTC",
    ...orgContext,
  };

  // Non-blocking cache write
  contextCache.setUserContext(userId, organizationId, context);

  return context;
}
```

## 6. Dashboard Sync Example

Widget click triggers chat with forced parameters:

```typescript
// Frontend: Dashboard widget component
function RevenueWidget({ dateRange }: Props) {
  const { openChat } = useAIChat();

  const handleClick = () => {
    openChat({
      forcedToolCall: {
        toolName: "getRevenue",
        toolParams: {
          from: dateRange.from,
          to: dateRange.to,
        },
      },
    });
  };

  return (
    <Card onClick={handleClick}>
      <CardContent>
        {/* Revenue display */}
      </CardContent>
    </Card>
  );
}
```

```typescript
// Backend: Chat API uses forcedToolCall from context
const appContext = buildAppContext({
  auth,
  chatId,
  currentView: "/dashboard",
  metricsFilter: body.metricsFilter,
  forcedToolCall: body.forcedToolCall,  // From widget click
});
```

## Usage in PRD Stories

- **AI-INFRA-013**: Chat Streaming API - Pass AppContext to agents
- **AI-INFRA-014**: AI Tool Implementations - Access context in tools
