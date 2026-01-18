# Backend Patterns - Renoz CRM v3

> Comprehensive backend architecture patterns derived from midday-reference analysis and Supabase/Drizzle best practices.

## Pattern Documents

| Document | Purpose |
|----------|---------|
| [schema-patterns.md](./schema-patterns.md) | Drizzle schema conventions, column helpers, enums |
| [query-patterns.md](./query-patterns.md) | Query organization, prepared statements, joins |
| [realtime-patterns.md](./realtime-patterns.md) | Supabase realtime subscriptions, broadcast triggers |
| [server-functions.md](./server-functions.md) | TanStack Start server functions, RPC patterns |
| [sql-performance.md](./sql-performance.md) | Indexing strategies, query optimization |
| [ai-sdk-patterns.md](./ai-sdk-patterns.md) | AI agent architecture, tools, streaming |
| [webhooks-patterns.md](./webhooks-patterns.md) | Database webhooks, Edge Functions, Trigger.dev |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  TanStack Router + Query + Form                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TanStack Start Server                         │
│  createServerFn() → Drizzle queries → Response                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Drizzle ORM    │ │ Supabase Auth   │ │   AI SDK        │
│  (PostgreSQL)   │ │ (RLS + JWT)     │ │ (Claude Tools)  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                           │
│  Tables + RLS + Triggers + pg_net (webhooks)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Edge Functions  │ │  Realtime       │ │  Trigger.dev    │
│ (Sync tasks)    │ │ (Subscriptions) │ │ (Background)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Key Principles

1. **Multi-tenant by default**: Every business table has `organization_id`
2. **RLS everywhere**: Row Level Security on all tables
3. **Type-safe end-to-end**: Drizzle → Zod → TypeScript
4. **Optimistic UI**: TanStack Query mutations with rollback
5. **AI-first**: Tools and agents for every domain

## Quick Reference

### Database Connection
```typescript
// CRITICAL: disable prepare for Supabase pooler
import postgres from 'postgres'
const client = postgres(DATABASE_URL, { prepare: false })
```

### Server Function Pattern
```typescript
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'

export const getCustomers = createServerFn({ method: 'GET' })
  .validator(z.object({ orgId: z.string().uuid() }))
  .handler(async ({ data }) => {
    return db.query.customers.findMany({
      where: eq(customers.organizationId, data.orgId)
    })
  })
```

### Realtime Subscription
```typescript
const channel = supabase
  .channel(`orders:${orgId}`)
  .on('broadcast', { event: 'INSERT' }, handler)
  .subscribe()
```

## Sources

- [Drizzle + Supabase](https://orm.drizzle.team/docs/connect-supabase)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [AI SDK 6](https://vercel.com/blog/ai-sdk-6)
- [midday-reference](../_reference/.midday-reference) - Production patterns
