# AppContext Builder Example

## Source
- `_reference/.midday-reference/apps/api/src/ai/utils/get-user-context.ts`
- `_reference/.midday-reference/apps/api/src/ai/agents/config/shared.ts`

## 1. Type Definitions

```typescript
// src/lib/ai/context/types.ts

/**
 * Dashboard/view filter state passed to AI
 */
export interface ViewFilter {
  from: string;          // Start date (yyyy-MM-dd)
  to: string;            // End date (yyyy-MM-dd)
  currency?: string;     // Currency filter
  customerId?: string;   // Customer context
  jobId?: string;        // Job context
  status?: string;       // Status filter
}

/**
 * Widget click that triggers AI chat
 */
export interface ForcedToolCall {
  toolName: string;      // Tool to invoke
  toolParams: Record<string, unknown>;  // Parameters to pass
}

/**
 * Full application context for AI operations
 */
export interface AppContext {
  // Identity
  userId: string;
  organizationId: string;
  fullName: string;
  email: string;
  role: "owner" | "admin" | "staff";

  // Organization
  companyName: string;
  baseCurrency: string;
  timezone: string;
  locale: string;

  // Temporal
  currentDateTime: string;  // ISO 8601

  // Navigation/UI state
  currentView: string;      // Current route path
  currentViewFilter: ViewFilter | null;

  // Widget interaction
  forcedToolCall: ForcedToolCall | null;

  // Chat session
  chatId: string;
}
```

## 2. Context Builder

```typescript
// src/lib/ai/context/builder.ts
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { AppContext, ViewFilter, ForcedToolCall } from "./types";
import { withAuth } from "@/lib/server/protected";
import { db } from "@/lib/db";
import { organizations, profiles } from "drizzle/schema";

/**
 * Input from frontend chat request
 */
interface BuildContextInput {
  // From chat request
  chatId: string;
  currentView?: string;
  viewFilter?: ViewFilter;
  forcedToolCall?: ForcedToolCall;
}

/**
 * Build complete AppContext for AI operations
 */
export async function buildAppContext(
  input: BuildContextInput,
): Promise<AppContext> {
  // 1. Get authenticated user context
  const auth = await withAuth({ permission: "ai.chat" });

  // 2. Get user profile
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, auth.userId),
    columns: {
      fullName: true,
      email: true,
      timezone: true,
      locale: true,
    },
  });

  // 3. Get organization details
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, auth.organizationId),
    columns: {
      name: true,
      currency: true,
      timezone: true,
    },
  });

  if (!profile || !organization) {
    throw new Error("User or organization not found");
  }

  // 4. Determine timezone (user preference > org default)
  const timezone = profile.timezone ?? organization.timezone ?? "UTC";

  // 5. Build context
  return {
    // Identity
    userId: auth.userId,
    organizationId: auth.organizationId,
    fullName: profile.fullName ?? "User",
    email: profile.email,
    role: auth.role,

    // Organization
    companyName: organization.name,
    baseCurrency: organization.currency ?? "USD",
    timezone,
    locale: profile.locale ?? "en-US",

    // Temporal
    currentDateTime: formatInTimeZone(
      new Date(),
      timezone,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    ),

    // Navigation/UI state
    currentView: input.currentView ?? "/",
    currentViewFilter: input.viewFilter ?? null,

    // Widget interaction
    forcedToolCall: input.forcedToolCall ?? null,

    // Chat session
    chatId: input.chatId,
  };
}
```

## 3. Caching Strategy

```typescript
// src/lib/ai/context/cache.ts
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN,
});

const CONTEXT_TTL = 60 * 5; // 5 minutes

/**
 * Two-level cache: user-specific + organization-level
 */
export async function getCachedContext(
  userId: string,
  organizationId: string,
): Promise<Partial<AppContext> | null> {
  const userKey = `ctx:user:${userId}`;
  const orgKey = `ctx:org:${organizationId}`;

  // Try user-specific cache first
  const userContext = await redis.get<Partial<AppContext>>(userKey);
  if (userContext) {
    return userContext;
  }

  // Fall back to org-level cache for shared data
  const orgContext = await redis.get<Partial<AppContext>>(orgKey);
  return orgContext;
}

/**
 * Non-blocking cache write
 */
export function cacheContext(
  userId: string,
  organizationId: string,
  context: Partial<AppContext>,
): void {
  const userKey = `ctx:user:${userId}`;
  const orgKey = `ctx:org:${organizationId}`;

  // User-specific data
  const userContext = {
    fullName: context.fullName,
    email: context.email,
    role: context.role,
    timezone: context.timezone,
    locale: context.locale,
  };

  // Organization-level data (shared)
  const orgContext = {
    companyName: context.companyName,
    baseCurrency: context.baseCurrency,
  };

  // Non-blocking writes
  redis.set(userKey, userContext, { ex: CONTEXT_TTL }).catch(console.error);
  redis.set(orgKey, orgContext, { ex: CONTEXT_TTL }).catch(console.error);
}

/**
 * Optimized context builder with caching
 */
export async function buildAppContextWithCache(
  input: BuildContextInput,
): Promise<AppContext> {
  const auth = await withAuth({ permission: "ai.chat" });

  // Try cache first
  const cached = await getCachedContext(auth.userId, auth.organizationId);

  if (cached) {
    // Merge cached data with fresh request data
    return {
      ...cached,
      userId: auth.userId,
      organizationId: auth.organizationId,
      currentDateTime: new Date().toISOString(),
      currentView: input.currentView ?? "/",
      currentViewFilter: input.viewFilter ?? null,
      forcedToolCall: input.forcedToolCall ?? null,
      chatId: input.chatId,
    } as AppContext;
  }

  // Build fresh context
  const context = await buildAppContext(input);

  // Cache for next time (non-blocking)
  cacheContext(auth.userId, auth.organizationId, context);

  return context;
}
```

## 4. Usage in Chat API

```typescript
// src/routes/api/ai/chat.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildAppContextWithCache } from "@/lib/ai/context/builder";
import { createTriageAgent } from "@/lib/ai/agents/triage";

const chatInputSchema = z.object({
  chatId: z.string(),
  message: z.string(),
  currentView: z.string().optional(),
  viewFilter: z.object({
    from: z.string(),
    to: z.string(),
    currency: z.string().optional(),
    customerId: z.string().optional(),
  }).optional(),
  forcedToolCall: z.object({
    toolName: z.string(),
    toolParams: z.record(z.unknown()),
  }).optional(),
});

export const chat = createServerFn({ method: "POST" })
  .inputValidator(chatInputSchema)
  .handler(async ({ data }) => {
    // Build context from request + auth + cached data
    const ctx = await buildAppContextWithCache({
      chatId: data.chatId,
      currentView: data.currentView,
      viewFilter: data.viewFilter,
      forcedToolCall: data.forcedToolCall,
    });

    // Pass context to agents
    const agent = createTriageAgent(ctx);
    const result = await agent.run(data.message, {
      experimental_context: ctx,
    });

    return {
      response: result.text,
      agent: result.agent,
    };
  });
```

## 5. Frontend Integration

```typescript
// src/hooks/ai/use-chat.ts
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useDashboardStore } from "@/stores/dashboard";
import { chat } from "@/routes/api/ai/chat";

export function useChat(chatId: string) {
  const location = useLocation();
  const { dateFilter, customerId } = useDashboardStore();

  return useMutation({
    mutationFn: async (message: string) => {
      return chat({
        data: {
          chatId,
          message,
          currentView: location.pathname,
          viewFilter: dateFilter ? {
            from: dateFilter.from,
            to: dateFilter.to,
            customerId,
          } : undefined,
        },
      });
    },
  });
}

// Widget click handler
export function useWidgetChat(chatId: string) {
  return useMutation({
    mutationFn: async (params: {
      message: string;
      toolName: string;
      toolParams: Record<string, unknown>;
    }) => {
      return chat({
        data: {
          chatId,
          message: params.message,
          currentView: location.pathname,
          forcedToolCall: {
            toolName: params.toolName,
            toolParams: params.toolParams,
          },
        },
      });
    },
  });
}
```

## 6. Dashboard Widget Example

```typescript
// src/components/domain/dashboard/revenue-widget.tsx
import { useWidgetChat } from "@/hooks/ai/use-chat";

export function RevenueWidget({ data, chatId }: RevenueWidgetProps) {
  const { mutate: sendMessage } = useWidgetChat(chatId);

  const handleClick = () => {
    // Widget click triggers AI with forced parameters
    sendMessage({
      message: "Show revenue details",
      toolName: "getRevenue",
      toolParams: {
        from: data.period.from,
        to: data.period.to,
        showCanvas: true,
      },
    });
  };

  return (
    <Card onClick={handleClick} className="cursor-pointer hover:bg-muted/50">
      <CardHeader>
        <CardTitle>Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(data.total)}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Key Patterns Summary

| Pattern | Purpose |
|---------|---------|
| Type-safe context | Ensure all required data is present |
| Two-level cache | User-specific + org-level for efficiency |
| Non-blocking writes | Don't slow down requests for caching |
| Fresh request data | Always use latest view/filter state |
| Widget forcedToolCall | Bypass AI interpretation for precise control |
