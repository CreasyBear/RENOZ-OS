# Drizzle Schema Documentation

This directory contains all Drizzle ORM table definitions for renoz-v3.

## Table of Contents

- [Naming Conventions](#naming-conventions)
- [Column Patterns](#column-patterns)
- [Index Patterns](#index-patterns)
- [Multi-Tenancy](#multi-tenancy)
- [Type Inference](#type-inference)
- [Schema Files](#schema-files)
- [Migration Workflow](#migration-workflow)

## Naming Conventions

### Tables

| Context | Convention | Example |
|---------|------------|---------|
| Database (PostgreSQL) | snake_case | `order_items` |
| Code (TypeScript) | camelCase | `orderItems` |

Drizzle handles the conversion automatically via `casing: 'snake_case'` in the config.

### Columns

| Context | Convention | Example |
|---------|------------|---------|
| Database | snake_case | `organization_id`, `created_at` |
| TypeScript | camelCase | `organizationId`, `createdAt` |

## Column Patterns

### Required Columns

Every table MUST include:

```typescript
import { uuid, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Primary key
id: uuid("id").primaryKey().defaultRandom(),

// Multi-tenant isolation (see Multi-Tenancy section)
organizationId: uuid("organization_id")
  .notNull()
  .references(() => organizations.id, { onDelete: "cascade" }),

// Timestamps
createdAt: timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow(),
updatedAt: timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date()),
```

### Audit Columns

For tables requiring audit trail:

```typescript
// Who created/modified
createdBy: uuid("created_by").references(() => users.id),
updatedBy: uuid("updated_by").references(() => users.id),
```

### Soft Delete

For tables using soft delete pattern:

```typescript
deletedAt: timestamp("deleted_at", { withTimezone: true }),
```

### JSONB Columns

Use typed JSONB for complex nested data:

```typescript
import { jsonb } from "drizzle-orm/pg-core";

// Define the interface
interface CustomerPreferences {
  theme: "light" | "dark";
  notifications: boolean;
  language: string;
}

// Use $type<T>() for type safety
preferences: jsonb("preferences").$type<CustomerPreferences>(),
```

## Index Patterns

### Naming Convention

```
idx_<table>_<column1>_<column2>_...
```

### Common Index Patterns

```typescript
import { index, uniqueIndex } from "drizzle-orm/pg-core";

// Single column index
(table) => ({
  // For frequent lookups
  emailIdx: index("idx_users_email").on(table.email),

  // Unique constraint
  emailUnique: uniqueIndex("idx_users_email_unique").on(table.email),

  // Multi-tenant queries (ALWAYS include organizationId first)
  orgStatusIdx: index("idx_orders_org_status")
    .on(table.organizationId, table.status),

  // Composite for common queries
  orgCreatedIdx: index("idx_orders_org_created")
    .on(table.organizationId, table.createdAt.desc()),
})
```

### GIN Indexes for Search

```typescript
import { sql } from "drizzle-orm";

// Full-text search index
nameSearchIdx: index("idx_customers_name_search")
  .using("gin", sql`to_tsvector('english', ${table.name})`),
```

## Multi-Tenancy

### Organization ID Pattern

Every business table MUST include `organizationId` with cascade delete:

```typescript
organizationId: uuid("organization_id")
  .notNull()
  .references(() => organizations.id, { onDelete: "cascade" }),
```

### RLS Policies

Row-Level Security enforces tenant isolation at the database level:

```typescript
import { pgPolicy } from "drizzle-orm/pg-core";

// Standard RLS policy
export const ordersRlsSelect = pgPolicy("orders_select_policy", {
  for: "select",
  to: "authenticated",
  using: sql`organization_id = current_setting('app.organization_id')::uuid`,
});
```

### Query Patterns

Always filter by organization in application code as defense-in-depth:

```typescript
// Good - explicit org filter
const orders = await db
  .select()
  .from(ordersTable)
  .where(eq(ordersTable.organizationId, ctx.organizationId));

// Bad - relying solely on RLS
const orders = await db.select().from(ordersTable);
```

## Type Inference

### Extracting Types from Schema

```typescript
import { customers } from "@/drizzle/schema";

// Select type (what you get from queries)
type Customer = typeof customers.$inferSelect;

// Insert type (what you need for inserts)
type NewCustomer = typeof customers.$inferInsert;

// Usage
const customer: Customer = await db.query.customers.findFirst();
const newCustomer: NewCustomer = {
  name: "Acme Corp",
  organizationId: ctx.organizationId,
};
```

### Partial Types for Updates

```typescript
// For updates, use Partial<> on insert type
type UpdateCustomer = Partial<typeof customers.$inferInsert>;

async function updateCustomer(id: string, data: UpdateCustomer) {
  return db.update(customers).set(data).where(eq(customers.id, id));
}
```

## Schema Files

| File | Description | Status |
|------|-------------|--------|
| `index.ts` | Barrel export for all schemas | Active |
| `patterns.ts` | Reusable column patterns | Active |
| `enums.ts` | Consolidated enum definitions | Active |
| `organizations.ts` | Multi-tenant organizations | Pending |
| `users.ts` | User profiles and preferences | Pending |
| `customers.ts` | Customer entities | Pending |
| `orders.ts` | Orders and line items | Pending |
| `products.ts` | Product catalog | Pending |
| `pipeline.ts` | Sales pipeline (quotes, stages) | Pending |
| `inventory.ts` | Stock and movements | Pending |
| `activities.ts` | Audit trail | Pending |

## Migration Workflow

### Configuration

See `drizzle.config.ts` in project root:

```typescript
export default defineConfig({
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
});
```

### Commands

```bash
# Generate migration from schema changes
bun run db:generate

# Push schema directly (development only)
bun run db:push

# Run migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio
```

### Migration Best Practices

1. **Always generate migrations** - Don't modify migration files manually
2. **Review generated SQL** - Check the migration file before applying
3. **Test locally first** - Use `db:push` for rapid iteration in development
4. **One schema change per PR** - Easier to review and rollback
5. **Never delete migrations** - Add new migrations to fix issues

## Related Documentation

- [Zod Schemas README](../../src/lib/schemas/README.md) - Validation schema patterns
- [Server Functions README](../../src/server/README.md) - Query organization patterns
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview) - Official documentation
- [Supabase Connection Guide](https://orm.drizzle.team/docs/connect-supabase) - Supabase integration
