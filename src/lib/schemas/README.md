# Zod Validation Schemas

This directory contains all Zod validation schemas for renoz-v3.

## Table of Contents

- [Naming Conventions](#naming-conventions)
- [Schema Patterns](#schema-patterns)
- [Common Patterns](#common-patterns)
- [TanStack Form Integration](#tanstack-form-integration)
- [Schema Files](#schema-files)

## Naming Conventions

### Schema Naming

| Pattern | Use Case | Example |
|---------|----------|---------|
| `Create*Schema` | Create/Insert operations | `CreateCustomerSchema` |
| `Update*Schema` | Partial update operations | `UpdateCustomerSchema` |
| `*ParamsSchema` | Route/function parameters | `CustomerParamsSchema` |
| `*FilterSchema` | List filtering options | `CustomerFilterSchema` |
| `*Schema` | General validation | `CustomerSchema` |

### File Naming

- One file per domain: `customers.ts`, `orders.ts`, `auth.ts`
- Barrel export from `index.ts`
- Shared patterns in `patterns.ts`

## Schema Patterns

### Input vs Output Schemas

```typescript
import { z } from "zod";

// Input schema - what the client sends (create/update)
export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
});

// Output schema - what the server returns (includes server-generated fields)
export const CustomerSchema = CreateCustomerSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Update schema - all fields optional
export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// Type exports
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
```

### Partial Updates

```typescript
// For PATCH operations - all fields optional
export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// For specific field updates
export const UpdateCustomerEmailSchema = z.object({
  email: z.string().email(),
});
```

### Coercion for Form Inputs

HTML form inputs are always strings. Use coercion for proper types:

```typescript
// Good - handles string input from forms
const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Dates from form inputs
const DateRangeSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
```

## Common Patterns

### ID Parameters

```typescript
// Single ID
export const IdParamsSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

// Multiple IDs
export const IdsParamsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
```

### Pagination

```typescript
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type Pagination = z.infer<typeof PaginationSchema>;
```

### Cursor Pagination

```typescript
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPagination = z.infer<typeof CursorPaginationSchema>;
```

### Filters

```typescript
export const BaseFilterSchema = z.object({
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// Domain-specific filters extend the base
export const CustomerFilterSchema = BaseFilterSchema.extend({
  status: z.enum(["active", "inactive", "lead"]).optional(),
  tags: z.array(z.string()).optional(),
});
```

### List Query (Pagination + Filters)

```typescript
export const CustomerListQuerySchema = PaginationSchema.merge(CustomerFilterSchema);

export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;
```

### Enum Validation

```typescript
// Define enum values
export const OrderStatusValues = ["draft", "pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

// Create Zod enum
export const OrderStatusSchema = z.enum(OrderStatusValues);

// Type export
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
```

### Refinements for Complex Validation

```typescript
const DateRangeSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
}).refine(
  (data) => data.dateFrom <= data.dateTo,
  { message: "End date must be after start date", path: ["dateTo"] }
);
```

## TanStack Form Integration

### Basic Form Validation

```typescript
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { CreateCustomerSchema } from "@/lib/schemas/customers";

function CustomerForm() {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: CreateCustomerSchema,
    },
    onSubmit: async ({ value }) => {
      // value is typed as CreateCustomer
      await createCustomer(value);
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="name">
        {(field) => (
          <div>
            <input
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <span className="text-destructive">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      </form.Field>
      {/* More fields... */}
    </form>
  );
}
```

### Field-Level Validation

```typescript
<form.Field
  name="email"
  validators={{
    onChange: z.string().email("Invalid email"),
    onBlur: z.string().email("Invalid email"),
  }}
>
  {(field) => (/* ... */)}
</form.Field>
```

### Async Validation

```typescript
<form.Field
  name="email"
  validators={{
    onChangeAsync: async ({ value }) => {
      const exists = await checkEmailExists(value);
      return exists ? "Email already in use" : undefined;
    },
    onChangeAsyncDebounceMs: 500,
  }}
>
  {(field) => (/* ... */)}
</form.Field>
```

## Schema Files

| File | Description | Status |
|------|-------------|--------|
| `index.ts` | Barrel export for all schemas | Active |
| `patterns.ts` | Reusable patterns (pagination, filters) | Active |
| `auth.ts` | Login, registration, token schemas | Pending |
| `customers.ts` | Customer CRUD schemas | Pending |
| `orders.ts` | Order and line item schemas | Pending |
| `products.ts` | Product catalog schemas | Pending |
| `pipeline.ts` | Quote and stage schemas | Pending |
| `inventory.ts` | Stock and movement schemas | Pending |
| `notifications.ts` | Notification schemas | Pending |
| `email-history.ts` | Email tracking schemas | Pending |
| `activities.ts` | Audit trail schemas | Pending |

## Related Documentation

- [Drizzle Schema README](../../../drizzle/schema/README.md) - Database schema patterns
- [Server Functions README](../../server/README.md) - Query organization patterns
- [Zod Documentation](https://zod.dev/) - Official Zod docs
- [TanStack Form](https://tanstack.com/form/latest) - Form library integration
