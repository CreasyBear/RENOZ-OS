# Audit Logging Patterns

> **Purpose**: Audit logging patterns for tracking data changes in Ralph implementation
> **Last Updated**: 2026-01-11
> **Status**: Active

---

## Audit Log Schema

### Database Table

```typescript
// server/db/schema/audit-logs.ts
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { organizations } from './organizations'

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),

  // What was affected
  entityType: text('entity_type').notNull(), // 'customer', 'order', 'job', etc.
  entityId: uuid('entity_id').notNull(),

  // What happened
  action: text('action', {
    enum: ['create', 'update', 'delete', 'restore', 'archive']
  }).notNull(),

  // Change details (before/after snapshots)
  changes: jsonb('changes').$type<{
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
    fields?: string[] // which fields changed
  }>().notNull(),

  // Who did it
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),

  // Additional context
  metadata: jsonb('metadata').$type<{
    ipAddress?: string
    userAgent?: string
    sessionId?: string
    reason?: string
  }>(),

  // When
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  orgIdx: index('audit_logs_org_idx').on(table.organizationId),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
}))

// Type exports
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
```

### SQL Migration

```sql
-- migrations/0010_create_audit_logs.sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore', 'archive')),
  changes JSONB NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_org_idx ON audit_logs(organization_id);
CREATE INDEX audit_logs_timestamp_idx ON audit_logs(timestamp);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_org_select" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT org_id FROM auth.jwt()));

-- Only system can insert (via service role)
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = (SELECT org_id FROM auth.jwt()));
```

---

## Middleware Pattern

### withAuditLog Wrapper

```typescript
// server/audit/with-audit-log.ts
import { db } from '@/server/db'
import { auditLogs } from '@/server/db/schema/audit-logs'
import type { Session } from '@/types/auth-types'

type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'archive'

interface AuditContext {
  entityType: string
  action: AuditAction
  getEntityId: (result: unknown) => string
  getBefore?: (data: unknown) => Promise<Record<string, unknown> | null>
}

export function withAuditLog<TData, TResult>(
  ctx: AuditContext,
  handler: (data: TData, session: Session) => Promise<TResult>
) {
  return async (data: TData, session: Session): Promise<TResult> => {
    // Get before state for updates/deletes
    const before = ctx.getBefore
      ? await ctx.getBefore(data)
      : null

    // Execute the actual operation
    const result = await handler(data, session)

    // Get after state
    const after = ctx.action === 'delete'
      ? null
      : (result as Record<string, unknown>)

    // Compute changed fields for updates
    const fields = before && after
      ? Object.keys(after).filter(key =>
          JSON.stringify(before[key]) !== JSON.stringify(after[key])
        )
      : undefined

    // Log the audit entry
    await db.insert(auditLogs).values({
      entityType: ctx.entityType,
      entityId: ctx.getEntityId(result),
      action: ctx.action,
      changes: { before, after, fields },
      userId: session.userId,
      organizationId: session.orgId,
      metadata: {
        sessionId: session.sessionId,
      },
    })

    return result
  }
}
```

### Usage in Server Functions

```typescript
// server/functions/customers.ts
import { createServerFn } from '@tanstack/start'
import { requireAuth, withRLSContext } from '@/server/protected-procedure'
import { withAuditLog } from '@/server/audit/with-audit-log'
import { CreateCustomerSchema, UpdateCustomerWithIdSchema } from '~/schemas/customers'

export const createCustomer = createServerFn({ method: 'POST' })
  .inputValidator(CreateCustomerSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    return withRLSContext(ctx.session, async (tx) => {
      const auditedCreate = withAuditLog(
        {
          entityType: 'customer',
          action: 'create',
          getEntityId: (result: Customer) => result.id,
        },
        async (customerData, session) => {
          const [customer] = await tx
            .insert(customers)
            .values({ ...customerData, organizationId: session.orgId })
            .returning()
          return customer
        }
      )

      return auditedCreate(data, ctx.session)
    })
  })

export const updateCustomer = createServerFn({ method: 'POST' })
  .inputValidator(UpdateCustomerWithIdSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    return withRLSContext(ctx.session, async (tx) => {
      const auditedUpdate = withAuditLog(
        {
          entityType: 'customer',
          action: 'update',
          getEntityId: () => data.id,
          getBefore: async () => {
            const [existing] = await tx
              .select()
              .from(customers)
              .where(eq(customers.id, data.id))
            return existing || null
          },
        },
        async (updateData) => {
          const [updated] = await tx
            .update(customers)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(customers.id, updateData.id))
            .returning()
          return updated
        }
      )

      return auditedUpdate(data, ctx.session)
    })
  })

export const deleteCustomer = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    return withRLSContext(ctx.session, async (tx) => {
      const auditedDelete = withAuditLog(
        {
          entityType: 'customer',
          action: 'delete',
          getEntityId: () => data.id,
          getBefore: async () => {
            const [existing] = await tx
              .select()
              .from(customers)
              .where(eq(customers.id, data.id))
            return existing || null
          },
        },
        async (deleteData) => {
          await tx.delete(customers).where(eq(customers.id, deleteData.id))
          return { id: deleteData.id, deleted: true }
        }
      )

      return auditedDelete(data, ctx.session)
    })
  })
```

---

## Query Patterns

### Get Audit History for Entity

```typescript
// server/functions/audit-logs.ts
import { createServerFn } from '@tanstack/start'
import { requireAuth, withRLSContext } from '@/server/protected-procedure'
import { auditLogs } from '@/server/db/schema/audit-logs'
import { users } from '@/server/db/schema/users'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

const GetEntityAuditLogsSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
})

export const getEntityAuditLogs = createServerFn({ method: 'GET' })
  .inputValidator(GetEntityAuditLogsSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    return withRLSContext(ctx.session, async (tx) => {
      const logs = await tx
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          changes: auditLogs.changes,
          timestamp: auditLogs.timestamp,
          user: {
            id: users.id,
            email: users.email,
            name: users.name,
          },
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(
          and(
            eq(auditLogs.entityType, data.entityType),
            eq(auditLogs.entityId, data.entityId)
          )
        )
        .orderBy(desc(auditLogs.timestamp))
        .limit(data.limit)
        .offset(data.offset)

      return logs
    })
  })
```

### Get User Activity Feed

```typescript
const GetUserActivitySchema = z.object({
  userId: z.string().uuid().optional(), // defaults to current user
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  entityTypes: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).default(20),
})

export const getUserActivity = createServerFn({ method: 'GET' })
  .inputValidator(GetUserActivitySchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()
    const targetUserId = data.userId || ctx.session.userId

    return withRLSContext(ctx.session, async (tx) => {
      let query = tx
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, targetUserId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(data.limit)

      // Add date filters if provided
      if (data.startDate) {
        query = query.where(gte(auditLogs.timestamp, new Date(data.startDate)))
      }
      if (data.endDate) {
        query = query.where(lte(auditLogs.timestamp, new Date(data.endDate)))
      }
      if (data.entityTypes?.length) {
        query = query.where(inArray(auditLogs.entityType, data.entityTypes))
      }

      return query
    })
  })
```

### Search Audit Logs

```typescript
const SearchAuditLogsSchema = z.object({
  search: z.string().optional(),
  entityType: z.string().optional(),
  action: z.enum(['create', 'update', 'delete', 'restore', 'archive']).optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export const searchAuditLogs = createServerFn({ method: 'GET' })
  .inputValidator(SearchAuditLogsSchema)
  .handler(async ({ data }) => {
    const ctx = await requireAuth()

    // Only admins can search all audit logs
    await requireRole(ctx.session.userId, ctx.session.orgId, ['admin'])

    return withRLSContext(ctx.session, async (tx) => {
      const conditions = []

      if (data.entityType) {
        conditions.push(eq(auditLogs.entityType, data.entityType))
      }
      if (data.action) {
        conditions.push(eq(auditLogs.action, data.action))
      }
      if (data.userId) {
        conditions.push(eq(auditLogs.userId, data.userId))
      }
      if (data.startDate) {
        conditions.push(gte(auditLogs.timestamp, new Date(data.startDate)))
      }
      if (data.endDate) {
        conditions.push(lte(auditLogs.timestamp, new Date(data.endDate)))
      }

      const [logs, countResult] = await Promise.all([
        tx
          .select({
            id: auditLogs.id,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            action: auditLogs.action,
            changes: auditLogs.changes,
            timestamp: auditLogs.timestamp,
            user: {
              id: users.id,
              email: users.email,
              name: users.name,
            },
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(auditLogs.timestamp))
          .limit(data.limit)
          .offset((data.page - 1) * data.limit),
        tx
          .select({ count: sql`count(*)` })
          .from(auditLogs)
          .where(and(...conditions)),
      ])

      return {
        data: logs,
        pagination: {
          page: data.page,
          limit: data.limit,
          total: Number(countResult[0].count),
          totalPages: Math.ceil(Number(countResult[0].count) / data.limit),
        },
      }
    })
  })
```

---

## UI Components

### Audit Log Timeline

```tsx
// components/shared/audit-log-timeline.tsx
import { useQuery } from '@tanstack/react-query'
import { getEntityAuditLogs } from '@/server/functions/audit-logs'
import { formatDistanceToNow } from 'date-fns'

interface AuditLogTimelineProps {
  entityType: string
  entityId: string
}

export function AuditLogTimeline({ entityType, entityId }: AuditLogTimelineProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, entityId],
    queryFn: () => getEntityAuditLogs({ data: { entityType, entityId } }),
  })

  if (isLoading) return <Skeleton className="h-40" />

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Activity History</h3>
      <div className="relative border-l border-border pl-4 space-y-4">
        {logs?.map((log) => (
          <div key={log.id} className="relative">
            <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-primary" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{log.user?.name || 'System'}</span>
                <span className="text-muted-foreground">
                  {formatAction(log.action)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </span>
              </div>
              {log.changes.fields && (
                <p className="text-sm text-muted-foreground">
                  Changed: {log.changes.fields.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatAction(action: string): string {
  const actionLabels: Record<string, string> = {
    create: 'created this record',
    update: 'updated this record',
    delete: 'deleted this record',
    restore: 'restored this record',
    archive: 'archived this record',
  }
  return actionLabels[action] || action
}
```

### Changes Diff Viewer

```tsx
// components/shared/audit-changes-diff.tsx
interface AuditChangesDiffProps {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  fields?: string[]
}

export function AuditChangesDiff({ before, after, fields }: AuditChangesDiffProps) {
  const changedFields = fields || (before && after
    ? Object.keys(after).filter(k =>
        JSON.stringify(before[k]) !== JSON.stringify(after[k])
      )
    : [])

  if (changedFields.length === 0) {
    return <p className="text-muted-foreground text-sm">No field changes recorded</p>
  }

  return (
    <div className="space-y-2 text-sm">
      {changedFields.map((field) => (
        <div key={field} className="grid grid-cols-3 gap-2">
          <span className="font-medium">{formatFieldName(field)}</span>
          <span className="text-red-600 line-through">
            {formatValue(before?.[field])}
          </span>
          <span className="text-green-600">
            {formatValue(after?.[field])}
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

## Retention Policy Guidelines

### Recommended Retention Periods

| Data Type | Retention | Rationale |
|-----------|-----------|-----------|
| **Financial transactions** | 7 years | Tax/legal compliance |
| **Customer data changes** | 3 years | Business continuity |
| **Order/Job changes** | 3 years | Dispute resolution |
| **User activity** | 1 year | Security audits |
| **System events** | 90 days | Troubleshooting |

### Implementation

```typescript
// server/jobs/audit-log-cleanup.ts
import { trigger } from '@trigger.dev/sdk'
import { db } from '@/server/db'
import { auditLogs } from '@/server/db/schema/audit-logs'
import { lt, and, eq } from 'drizzle-orm'

// Run monthly
export const cleanupAuditLogs = trigger.scheduledTask({
  id: 'cleanup-audit-logs',
  cron: '0 0 1 * *', // First of each month
  run: async () => {
    const now = new Date()

    // Define retention by entity type
    const retentionRules = [
      { entityTypes: ['invoice', 'payment'], months: 84 }, // 7 years
      { entityTypes: ['customer', 'order', 'job'], months: 36 }, // 3 years
      { entityTypes: ['user'], months: 12 }, // 1 year
    ]

    for (const rule of retentionRules) {
      const cutoffDate = new Date(now)
      cutoffDate.setMonth(cutoffDate.getMonth() - rule.months)

      for (const entityType of rule.entityTypes) {
        const result = await db
          .delete(auditLogs)
          .where(
            and(
              eq(auditLogs.entityType, entityType),
              lt(auditLogs.timestamp, cutoffDate)
            )
          )

        console.log(`Deleted ${entityType} audit logs older than ${cutoffDate}`)
      }
    }
  },
})
```

### Archive Before Delete (Optional)

```typescript
// For compliance, archive to cold storage before deletion
export const archiveAuditLogs = trigger.scheduledTask({
  id: 'archive-audit-logs',
  cron: '0 0 1 * *',
  run: async () => {
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    // Export to S3/cold storage
    const logsToArchive = await db
      .select()
      .from(auditLogs)
      .where(lt(auditLogs.timestamp, threeYearsAgo))
      .limit(10000)

    if (logsToArchive.length > 0) {
      // Upload to S3
      await uploadToS3({
        bucket: 'audit-archive',
        key: `audit-logs/${format(new Date(), 'yyyy-MM')}.json`,
        body: JSON.stringify(logsToArchive),
      })

      // Delete archived logs
      const ids = logsToArchive.map(l => l.id)
      await db.delete(auditLogs).where(inArray(auditLogs.id, ids))
    }
  },
})
```

---

## Best Practices

### What to Log

| Always Log | Optional | Never Log |
|------------|----------|-----------|
| Entity CRUD operations | Read operations | Passwords |
| Permission changes | Search queries | API keys |
| Status transitions | Export operations | Session tokens |
| Financial changes | Login attempts | PII in changes JSONB |

### Performance Considerations

1. **Async logging**: Use background jobs for high-throughput scenarios
2. **Batch inserts**: Group multiple audit entries when processing bulk operations
3. **Partitioning**: Consider table partitioning by timestamp for large datasets
4. **Indexing**: Only index columns used in frequent queries

### Security

1. **Immutability**: Never allow updates/deletes to audit logs (except retention cleanup)
2. **Access control**: Restrict audit log viewing to admins
3. **Integrity**: Consider adding checksums for tamper detection

---

*Audit logging is mandatory for all data-modifying operations. These patterns ensure compliance and enable effective troubleshooting.*
