# Backend Patterns

> Comprehensive backend architecture patterns for Renoz CRM v3.
> Derived from midday-reference analysis, Supabase/Drizzle best practices, and AI SDK 6 patterns.

## Overview

This directory contains battle-tested patterns for building a production-grade CRM backend with:
- **Drizzle ORM** for type-safe database access
- **Supabase** for auth, realtime, and PostgreSQL hosting
- **TanStack Start** for server functions
- **AI SDK** for Claude-powered features

## Pattern Documents

| Document | Description | Key Topics |
|----------|-------------|------------|
| [schema-patterns.md](./schema-patterns.md) | Drizzle schema conventions | Column helpers, enums, JSONB typing, RLS policies |
| [query-patterns.md](./query-patterns.md) | Database query best practices | Prepared statements, relations, pagination, transactions |
| [realtime-patterns.md](./realtime-patterns.md) | Supabase Realtime | Broadcast vs Postgres Changes, React hooks, TanStack Query integration |
| [server-functions.md](./server-functions.md) | TanStack Start server functions | Auth, authorization, error handling, streaming |
| [sql-performance.md](./sql-performance.md) | Query optimization | Indexing, N+1 prevention, pagination, materialized views |
| [webhooks-patterns.md](./webhooks-patterns.md) | Background jobs | Database webhooks, Edge Functions, Trigger.dev |
| [ai-sdk-patterns.md](./ai-sdk-patterns.md) | AI integration | Agent architecture, tools, streaming, memory |

## Quick Start

### 1. Database Connection

```typescript
// CRITICAL: disable prepare for Supabase pooler
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema, casing: 'snake_case' })
```

### 2. Multi-Tenant Schema

```typescript
// Every business table MUST include organizationId
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  // ... domain columns
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('customers_org_idx').on(table.organizationId),
}))
```

### 3. Server Function

```typescript
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'

export const getCustomers = createServerFn({ method: 'GET' })
  .validator(z.object({
    orgId: z.string().uuid(),
    search: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    return db.query.customers.findMany({
      where: and(
        eq(customers.organizationId, data.orgId),
        data.search ? ilike(customers.name, `%${data.search}%`) : undefined,
      ),
      limit: 50,
    })
  })
```

### 4. Realtime Subscription

```typescript
function useCustomerUpdates(orgId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`customers:${orgId}`)
      .on('broadcast', { event: '*' }, () => {
        queryClient.invalidateQueries({ queryKey: ['customers', orgId] })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [orgId])
}
```

## Architecture Principles

### 1. Multi-Tenant by Default
Every query is scoped by `organization_id`. RLS policies enforce this at the database level.

### 2. Type-Safe End-to-End
```
Drizzle Schema → Zod Validators → TypeScript Types → React Components
```

### 3. AI-First Design
Every domain has AI tools. Agents can query data, perform mutations, and generate insights.

### 4. Optimistic UI
TanStack Query handles optimistic updates with automatic rollback on error.

### 5. Background-Ready
Long-running tasks go to Trigger.dev. Quick tasks use Edge Functions.

## File Organization

```
src/
├── lib/
│   ├── db/
│   │   ├── index.ts          # DB client export
│   │   └── schema/           # Drizzle schemas
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   └── server.ts         # Server client
│   └── ai/
│       ├── agents/           # Agent definitions
│       └── tools/            # Tool implementations
├── server/
│   ├── customers.ts          # Customer server functions
│   ├── orders.ts             # Order server functions
│   └── ...
└── hooks/
    └── realtime/             # Realtime subscription hooks
```

## Related Resources

- [index.md](./index.md) - Architecture overview diagram
- [Foundation PRDs](../../_prd/foundation/) - Schema and component specifications
- [midday-reference](../../../_reference/.midday-reference/) - Source patterns

## Contributing

When adding new patterns:
1. Follow existing document structure
2. Include TypeScript code examples
3. Reference official documentation
4. Add anti-patterns section where applicable
