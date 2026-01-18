# Schema Patterns

> Drizzle ORM schema conventions for renoz-v3 PostgreSQL database.

## File Organization

```
drizzle/
├── schema/
│   ├── index.ts           # Re-exports all tables
│   ├── patterns.ts        # Reusable column helpers
│   ├── enums.ts           # All pgEnum definitions
│   ├── organizations.ts   # Multi-tenancy foundation
│   ├── users.ts           # Auth + profiles
│   ├── customers.ts       # CRM domain
│   ├── orders.ts          # Order domain
│   ├── products.ts        # Product catalog
│   ├── pipeline.ts        # Opportunities + quotes
│   ├── inventory.ts       # Stock management
│   └── README.md          # Schema documentation
├── migrations/            # Generated migrations
└── drizzle.config.ts
```

## Column Patterns Module

```typescript
// drizzle/schema/patterns.ts
import { uuid, timestamp, text } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * Standard timestamp columns for all tables
 */
export const timestampColumns = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}

/**
 * Audit columns for tracking who made changes
 */
export const auditColumns = {
  createdBy: uuid('created_by'),  // nullable for system-created
  updatedBy: uuid('updated_by'),
}

/**
 * Soft delete pattern
 */
export const softDeleteColumn = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}

/**
 * Multi-tenant organization column - REQUIRED on all business tables
 */
export const organizationColumn = {
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
}

/**
 * Standard UUID primary key
 */
export const idColumn = {
  id: uuid('id').primaryKey().defaultRandom(),
}
```

## Enum Patterns

```typescript
// drizzle/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core'

// Naming: <domain>_<concept>_enum
export const orderStatusEnum = pgEnum('order_status', [
  'draft',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
])

export const customerStatusEnum = pgEnum('customer_status', [
  'lead',
  'prospect',
  'active',
  'inactive',
  'churned',
])

export const opportunityStageEnum = pgEnum('opportunity_stage', [
  'qualification',
  'discovery',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
])

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'admin',
  'sales',
  'operations',
  'viewer',
])
```

## Table Definition Pattern

```typescript
// drizzle/schema/customers.ts
import { pgTable, text, varchar, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import {
  idColumn,
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  organizationColumn
} from './patterns'
import { customerStatusEnum } from './enums'
import { organizations } from './organizations'
import { contacts } from './contacts'
import { orders } from './orders'

export const customers = pgTable('customers', {
  // Standard columns first
  ...idColumn,
  ...organizationColumn,

  // Domain columns
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  status: customerStatusEnum('status').notNull().default('lead'),

  // Address as JSONB for flexibility
  address: jsonb('address').$type<{
    street?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }>(),

  // Metadata
  notes: text('notes'),
  tags: text('tags').array(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  // Standard columns last
  ...timestampColumns,
  ...auditColumns,
  ...softDeleteColumn,
}, (table) => ({
  // Index patterns - always include orgId for multi-tenant queries
  orgIdx: index('customers_org_idx').on(table.organizationId),
  orgStatusIdx: index('customers_org_status_idx').on(table.organizationId, table.status),
  emailIdx: index('customers_email_idx').on(table.email),
  nameSearchIdx: index('customers_name_search_idx')
    .using('gin', sql`to_tsvector('english', ${table.name})`),
}))

// Relations - define separately for clean imports
export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.organizationId],
    references: [organizations.id],
  }),
  contacts: many(contacts),
  orders: many(orders),
}))
```

## Type Inference Pattern

```typescript
// Types are inferred from schema - never define manually
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { customers } from './customers'

// Read type (includes all columns)
export type Customer = InferSelectModel<typeof customers>

// Insert type (excludes auto-generated columns)
export type NewCustomer = InferInsertModel<typeof customers>

// Update type (all fields optional except id)
export type CustomerUpdate = Partial<NewCustomer> & { id: string }
```

## JSONB Column Typing

```typescript
// For complex nested structures, define interface first
interface OrderLineItem {
  productId: string
  sku: string
  name: string
  quantity: number
  unitPrice: number
  discount?: number
  total: number
}

export const orders = pgTable('orders', {
  ...idColumn,
  ...organizationColumn,
  customerId: uuid('customer_id').notNull().references(() => customers.id),

  // Typed JSONB array
  lineItems: jsonb('line_items')
    .$type<OrderLineItem[]>()
    .notNull()
    .default([]),

  // Typed JSONB object
  shippingAddress: jsonb('shipping_address').$type<{
    street: string
    city: string
    state: string
    postcode: string
    country: string
  }>(),

  ...timestampColumns,
})
```

## Numeric Precision Pattern

```typescript
// Custom numeric type for currency - avoids floating point issues
import { customType } from 'drizzle-orm/pg-core'

export const numericCasted = customType<{
  data: number
  driverData: string
  config: { precision?: number; scale?: number }
}>({
  dataType: (config) => {
    if (config?.precision && config?.scale) {
      return `numeric(${config.precision}, ${config.scale})`
    }
    return 'numeric'
  },
  fromDriver: (value: string) => Number.parseFloat(value),
  toDriver: (value: number) => value.toString(),
})

// Usage
export const orders = pgTable('orders', {
  subtotal: numericCasted('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: numericCasted('tax', { precision: 12, scale: 2 }).notNull().default(0),
  total: numericCasted('total', { precision: 12, scale: 2 }).notNull(),
})
```

## RLS Policy Pattern

```typescript
import { pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const customers = pgTable('customers', {
  // ... columns
}, (table) => ({
  // RLS policies defined in Drizzle
  selectPolicy: pgPolicy('customers_select_policy', {
    as: 'permissive',
    for: 'select',
    to: 'authenticated',
    using: sql`organization_id = (auth.jwt() ->> 'org_id')::uuid`,
  }),
  insertPolicy: pgPolicy('customers_insert_policy', {
    as: 'permissive',
    for: 'insert',
    to: 'authenticated',
    withCheck: sql`organization_id = (auth.jwt() ->> 'org_id')::uuid`,
  }),
  updatePolicy: pgPolicy('customers_update_policy', {
    as: 'permissive',
    for: 'update',
    to: 'authenticated',
    using: sql`organization_id = (auth.jwt() ->> 'org_id')::uuid`,
  }),
}))
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Table | snake_case, plural | `customers`, `order_items` |
| Column | snake_case | `created_at`, `organization_id` |
| Enum | snake_case_enum | `order_status_enum` |
| Index | table_column_idx | `customers_org_idx` |
| FK | table_fk_column | implicit via references() |
| TypeScript | camelCase | `organizationId`, `createdAt` |

## Migration Workflow

```bash
# Generate migration from schema changes
bun run drizzle-kit generate

# Push directly to dev (no migration file)
bun run drizzle-kit push

# Apply migrations
bun run drizzle-kit migrate

# Open Drizzle Studio
bun run drizzle-kit studio
```

## Anti-Patterns to Avoid

1. **Don't use `serial` for IDs** - Use `uuid().defaultRandom()` for distributed systems
2. **Don't skip organizationId** - Every business table needs multi-tenant scoping
3. **Don't use `varchar` without length** - Always specify max length
4. **Don't define types manually** - Use `InferSelectModel` / `InferInsertModel`
5. **Don't forget indexes** - Always index foreign keys and filter columns
6. **Don't use `text[]`** - Prefer JSONB arrays for complex data
