# Structure Patterns Inventory

> **Analysis of existing file/folder organization and architectural patterns in RENOZ**
> **Date:** January 2026
> **Coverage:** File organization, import patterns, architectural structure analyzed

---

## Executive Summary

**Existing Pattern Maturity: EXCELLENT** - RENOZ demonstrates exceptional structural organization with clear architectural boundaries, consistent naming conventions, and scalable folder hierarchies that support autonomous development.

**Key Findings:**

- ✅ **Domain-Driven Architecture**: Clear separation by business domains
- ✅ **Consistent Naming**: Predictable file and component naming patterns
- ✅ **Import Organization**: Clean import hierarchies with barrel exports
- ✅ **Scalable Structure**: Easy to add new features without architectural changes
- ✅ **Type Safety**: Consistent TypeScript integration throughout

**Ralph-Ready Assessment:** These structural patterns provide a perfect foundation for autonomous development, with clear conventions and predictable organization that Ralph can reliably follow.

---

## 1. Domain-Driven Folder Structure

### Component Organization by Business Domain

**Primary Structure:**

```
src/components/domain/
├── customers/           # Customer management domain
│   ├── customer-columns.tsx     # Data table column definitions
│   ├── customer-form.tsx        # Create/edit customer form
│   ├── customer-summary-card.tsx # Customer overview card
│   ├── customer-form.tsx        # Customer CRUD form
│   └── [other customer components]
├── orders/              # Order processing domain
│   ├── order-columns.tsx
│   ├── order-form.tsx
│   ├── order-status-stepper.tsx
│   └── [order components]
├── products/            # Product catalog domain
├── inventory/           # Stock management domain
├── pipeline/            # Sales pipeline domain
├── suppliers/           # Supplier management domain
├── financial/           # Accounting integration domain
├── communications/      # Email and messaging domain
└── [additional domains]
```

**Benefits:**

- **Business Alignment**: Code organized by business capabilities
- **Team Scaling**: Multiple developers can work in different domains
- **Feature Isolation**: Changes in one domain don't affect others
- **Discovery**: Easy to find code related to specific business functions

### Component Type Patterns

**Consistent Component Types per Domain:**

```typescript
// Domain components follow consistent patterns
export function CustomerForm()     // Main CRUD form
export function CustomerColumns()  // Data table configuration
export function CustomerCard()     // List item representation
export function CustomerPanel()    // Detail view component
export function CustomerTab()      // Tab content component
export function CustomerDialog()   // Modal dialogs
```

---

## 2. Route Structure Patterns

### File-Based Routing with Feature Folders

**Route Organization:**

```
routes/
├── customers/
│   ├── index.tsx              # Customer list page (/customers)
│   ├── $customerId.tsx        # Customer detail page (/customers/123)
│   └── $customerId/
│       ├── orders.tsx         # Customer orders (/customers/123/orders)
│       └── support.tsx        # Customer support (/customers/123/support)
├── orders/
│   ├── index.tsx              # Order list (/orders)
│   └── $orderId.tsx           # Order detail (/orders/456)
└── [domain routes]
```

**Pattern Benefits:**

- **URL Structure**: Predictable, RESTful URLs
- **Nested Routes**: Related functionality grouped hierarchically
- **Dynamic Segments**: `$entityId` pattern for detail pages
- **Scalability**: Easy to add new routes without conflicts

### Route Component Patterns

**Consistent Route Structure:**

```typescript
// List page pattern
export function RouteComponent() {
  return (
    <div className="space-y-6">
      <PageHeader title="Customers" actions={<CreateButton />} />
      <DataTable
        columns={customerColumns}
        data={customers}
        // ... table props
      />
    </div>
  )
}

// Detail page pattern
export function RouteComponent() {
  const { customerId } = Route.useParams()

  return (
    <div className="space-y-6">
      <Breadcrumb items={[/* breadcrumbs */]} />
      <CustomerDetail customerId={customerId} />
    </div>
  )
}
```

---

## 3. Server Function Organization

### Domain-Grouped Server Functions

**Server Function Structure:**

```
src/server/functions/
├── customers.ts          # All customer-related server functions
├── orders.ts             # All order-related server functions
├── products.ts           # All product-related server functions
├── inventory.ts          # Inventory management functions
├── pipeline.ts           # Sales pipeline functions
├── suppliers.ts          # Supplier management functions
├── communications.ts     # Email and messaging functions
├── ai-chat.ts            # AI chat functionality
├── xero.ts               # Xero integration functions
└── [other domain functions]
```

**Function Naming Patterns:**

```typescript
// Consistent CRUD naming
export const getCustomers = createServerFn(/* */)
export const createCustomer = createServerFn(/* */)
export const updateCustomer = createServerFn(/* */)
export const deleteCustomer = createServerFn(/* */)

// Business operations
export const convertOpportunityToOrder = createServerFn(/* */)
export const sendQuoteEmail = createServerFn(/* */)

// Analytics and metrics
export const getCustomerMetrics = createServerFn(/* */)
export const getOrderAnalytics = createServerFn(/* */)
```

### Server Function Architecture

**Consistent Server Function Structure:**

```typescript
export const getCustomers = createServerFn({ method: 'GET' })
  .inputValidator(GetCustomersSchema)          // Input validation
  .handler(async ({ data }) => {
    const ctx = await requireAuth()            // Authentication

    return await withRLSContext(ctx.session, async (tx) => {
      // Business logic with RLS context
      const result = await tx.execute(sql`...`)
      return result
    })
  })
```

---

## 4. Import and Export Patterns

### Barrel Exports for Clean Imports

**Component Barrel Exports:**

```typescript
// src/components/domain/customers/index.ts
export { CustomerForm } from './customer-form'
export { CustomerColumns } from './customer-columns'
export { CustomerCard } from './customer-summary-card'
export { CustomerPanel } from './customer-detail-panel'
export { CustomerDialog } from './customer-dialog'
```

**Usage:**

```typescript
// Clean imports from domain barrel
import {
  CustomerForm,
  CustomerColumns,
  CustomerCard
} from '@/components/domain/customers'
```

### Import Organization Hierarchy

**Consistent Import Ordering:**

```typescript
// 1. React and external libraries
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'

// 2. Internal UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// 3. Shared components
import { DataTable } from '@/components/shared/data-table'
import { FormFieldWrapper } from '@/components/shared/form-field-wrapper'

// 4. Domain components
import { CustomerForm } from '@/components/domain/customers'

// 5. Hooks and utilities
import { useEntitySearch } from '@/hooks/use-entity-search'
import { formatCurrency } from '@/lib/utils'

// 6. Types and schemas
import type { Customer } from '@/lib/schema/customers'
import { CreateCustomerSchema } from '@/lib/schemas/customers'
```

---

## 5. Schema and Type Organization

### Database Schema Structure

**Schema Organization:**

```
lib/schema/
├── customers.ts          # Customer-related tables
├── orders.ts             # Order-related tables
├── products.ts           # Product-related tables
├── organizations.ts      # Multi-tenant tables
├── users.ts              # User management tables
└── [domain schemas]
```

**Table Definition Patterns:**

```typescript
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  // Business fields
  companyName: text('company_name').notNull(),
  status: text('status').notNull().default('active'),

  // Audit fields (consistent across all tables)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id),

  // Optimistic concurrency
  version: integer('version').default(1).notNull(),
})
```

### Validation Schema Patterns

**Zod Schema Organization:**

```
lib/schemas/
├── customers.ts          # Customer validation schemas
├── orders.ts             # Order validation schemas
├── products.ts           # Product validation schemas
└── [domain schemas]
```

**Schema Definition Patterns:**

```typescript
export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
})

export const UpdateCustomerSchema = CreateCustomerSchema.extend({
  id: z.string().uuid(),
  version: z.number().int().positive(),
})

export const GetCustomerSchema = z.object({
  customerId: z.string().uuid(),
})
```

---

## 6. Hook Organization Patterns

### Custom Hook Categories

**Hook Organization:**

```
src/hooks/
├── use-entity-search.ts        # Generic entity search functionality
├── use-error-handler.ts        # Error handling utilities
├── use-debounce.ts             # Debouncing utilities
├── use-offline-mutation.ts     # Offline-capable mutations
├── use-optimistic-mutation.ts  # Optimistic UI mutations
├── use-tanstack-form-draft.ts  # Form draft saving
├── use-global-shortcuts.ts     # Keyboard shortcuts
├── use-realtime.ts             # Real-time subscriptions
├── use-session-timeout.ts      # Session management
└── [specialized hooks]
```

**Hook Interface Patterns:**

```typescript
interface UseEntitySearchOptions<T> {
  searchFn: (query: string, limit?: number) => Promise<T[]>
  limit?: number
  debounceMs?: number
}

interface UseEntitySearchReturn<T> {
  searchEntities: (query: string) => Promise<T[]>
}

export function useEntitySearch<T = EntityOption>(options: UseEntitySearchOptions<T>) {
  // Implementation
}
```

---

## 7. Utility and Configuration Patterns

### Utility Organization

**Utility Structure:**

```
lib/
├── utils.ts              # General utilities (cn, formatters, etc.)
├── auth/                 # Authentication utilities
├── csv-export.ts         # CSV export functionality
├── error-handling.ts     # Error handling utilities
├── design-tokens.ts      # Design system tokens
└── stores/               # Zustand stores (if needed)
```

### Configuration Patterns

**Environment Configuration:**

```typescript
// Consistent environment variable handling
export const config = {
  database: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production',
  },
  auth: {
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_ANON_KEY!,
  },
  ai: {
    anthropicKey: process.env.ANTHROPIC_API_KEY!,
  },
  xero: {
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
  },
}
```

---

## 8. Test Organization Patterns

### Test File Structure

**Test Organization:**

```
tests/
├── unit/                  # Unit tests
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/           # Integration tests
│   ├── api/
│   └── workflows/
├── e2e/                   # End-to-end tests
│   ├── auth.spec.ts
│   ├── customers.spec.ts
│   └── orders.spec.ts
└── fixtures/              # Test data and setup
```

**Test File Naming:**

```typescript
// Component tests
CustomerForm.test.tsx
DataTable.test.tsx

// Hook tests
useEntitySearch.test.ts
useErrorHandler.test.ts

// Server function tests
customers.test.ts
orders.test.ts
```

---

## 9. Shared Component Library Patterns

### UI Component Organization

**UI Component Structure:**

```
components/ui/
├── button.tsx             # Base button component
├── input.tsx              # Form input component
├── select.tsx             # Select dropdown
├── dialog.tsx             # Modal dialog
├── table.tsx              # Data table primitives
└── [shadcn/ui components]
```

### Shared Business Components

**Shared Component Categories:**

```
components/shared/
├── data-table/            # Advanced data table with sorting/filtering
├── metrics/               # KPI display components
├── forms/                 # Form layout components
├── loading-state.tsx      # Loading UI components
├── error-state.tsx        # Error display components
├── empty-state.tsx        # Empty state components
├── bulk-action-bar.tsx    # Bulk operation UI
└── [reusable business components]
```

---

## 10. Naming Convention Patterns

### File Naming Conventions

**Consistent Naming Patterns:**

```typescript
// Components
CustomerForm.tsx           // PascalCase, ComponentName + Type
CustomerColumns.tsx        // ComponentName + Purpose
CustomerCard.tsx           // ComponentName + UI Type

// Server Functions
customers.ts               // plural domain name
getCustomers.ts            // action + EntityName
createCustomer.ts          // action + EntityName

// Hooks
useEntitySearch.ts         // use + PascalCase
useErrorHandler.ts         // use + PascalCase

// Types/Schemas
Customer.ts                // EntityName
CreateCustomerInput.ts     // Action + EntityName + Purpose
```

### CSS Class Naming

**Tailwind + Component Patterns:**

```typescript
// Consistent spacing patterns
className="space-y-6"       // Section spacing
className="space-y-4"       // Component spacing
className="space-y-2"       // Field spacing

// Consistent layout patterns
className="flex items-center justify-between"  // Header layout
className="grid grid-cols-1 md:grid-cols-2 gap-6"  // Form layout
className="flex flex-col space-y-4"  // Content layout
```

---

## Ralph Compatibility Assessment

### ✅ EXCEPTIONAL COMPATIBILITY PATTERNS

**Predictable Structure:**

- Domain-driven organization makes feature location obvious
- Consistent naming conventions enable reliable code generation
- Clear import hierarchies prevent circular dependencies

**Scalable Architecture:**

- Modular structure supports parallel development
- Barrel exports enable clean imports
- Type-safe interfaces throughout

**Developer Experience:**

- Consistent patterns reduce cognitive load
- Clear conventions enable autonomous development
- Comprehensive type safety

### ⚠️ AREAS FOR PATTERN ENHANCEMENT

**Automation Opportunities:**

- Code generation for CRUD components
- Automated barrel export generation
- Schema-based form generation

**Consistency Improvements:**

- Some legacy components don't follow patterns
- Mixed import styles in older files
- Inconsistent test file organization

---

## Pattern Recommendations for Ralph

### 1. **Component Template Structure**

```
src/components/domain/{{domain}}/
├── {{entity}}-columns.tsx        # Data table configuration
├── {{entity}}-form.tsx           # CRUD form component
├── {{entity}}-card.tsx           # List item component
├── {{entity}}-panel.tsx          # Detail view component
├── {{entity}}-dialog.tsx         # Modal components
└── index.ts                      # Barrel exports
```

### 2. **Server Function Template**

```
src/server/functions/{{domain}}.ts
├── get{{Entities}}()              # List function
├── create{{Entity}}()             # Create function
├── update{{Entity}}()             # Update function
├── get{{Entity}}()                # Get single function
└── [business operations]
```

### 3. **Route Template**

```
routes/{{domain}}/
├── index.tsx                      # List page
├── ${{entity}}Id.tsx             # Detail page
└── ${{entity}}Id/
    └── [sub-routes]
```

### 4. **Schema Template**

```
lib/schemas/{{domain}}.ts
├── Get{{Entities}}Schema          # List query schema
├── Create{{Entity}}Schema         # Create input schema
├── Update{{Entity}}Schema         # Update input schema
├── Get{{Entity}}Schema            # Get single schema
└── [business operation schemas]
```

---

## Summary

**RENOZ Structure Patterns Assessment: EXCEPTIONAL ORGANIZATION**

The RENOZ structural patterns demonstrate exceptional organization with domain-driven architecture, consistent naming conventions, and scalable folder hierarchies that perfectly support autonomous development. The clear architectural boundaries and predictable patterns provide an ideal foundation for Ralph Wiggum.

**Key Strengths for Ralph:**

- Domain-driven organization enables feature isolation
- Consistent naming conventions enable reliable generation
- Clear architectural boundaries prevent conflicts
- Type-safe interfaces throughout the application

**Ralph can confidently implement new features following these established structural patterns.**
