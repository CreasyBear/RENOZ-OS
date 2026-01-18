# Server Functions

This directory contains TanStack Start server functions for database operations.

## Table of Contents

- [Overview](#overview)
- [Function Patterns](#function-patterns)
- [Usage Examples](#usage-examples)
- [Adding New Functions](#adding-new-functions)
- [Files](#files)

## Overview

Server functions run on the server and are automatically exposed as RPC endpoints. They:
- Validate input with Zod schemas
- Query the database with Drizzle ORM
- Handle errors gracefully
- Support pagination and filtering

## Function Patterns

### Basic Structure

```typescript
import { createServerFn } from "@tanstack/start";
import { db } from "@/lib/db";
import { mySchema } from "@/lib/schemas/myschema";

export const myFunction = createServerFn({ method: "GET" })
  .validator(mySchema)
  .handler(async ({ data }) => {
    // data is typed and validated
    const result = await db.select().from(table);
    return result;
  });
```

### List with Offset Pagination (Legacy)

```typescript
export const getItems = createServerFn({ method: "GET" })
  .inputValidator(listQuerySchema)
  .handler(async ({ data }) => {
    const { page, pageSize, sortBy, sortOrder, ...filters } = data;

    // Build conditions
    const conditions = [];
    if (filters.search) {
      conditions.push(ilike(table.name, `%${filters.search}%`));
    }
    conditions.push(sql`${table.deletedAt} IS NULL`);

    const whereClause = and(...conditions);

    // Count total
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(whereClause);
    const totalItems = Number(countResult[0]?.count ?? 0);

    // Get page
    const offset = (page - 1) * pageSize;
    const items = await db
      .select()
      .from(table)
      .where(whereClause)
      .orderBy(sortOrder === "asc" ? asc(table[sortBy]) : desc(table[sortBy]))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  });
```

### List with Cursor Pagination (Recommended)

Cursor pagination is more efficient for large datasets. Uses composite cursor
(createdAt + id) for deterministic ordering.

**Why cursor over offset?**
- Offset requires scanning rows to skip (O(n) for OFFSET 1000)
- Cursor uses indexed WHERE clause (O(log n))
- Stable across concurrent inserts/deletes

```typescript
import {
  decodeCursor,
  buildCursorCondition,
  buildStandardCursorResponse,
  cursorPaginationSchema,
} from "@/lib/db/pagination";

export const getItemsCursor = createServerFn({ method: "GET" })
  .inputValidator(cursorPaginationSchema.merge(filterSchema))
  .handler(async ({ data }) => {
    const { cursor, pageSize, sortOrder, ...filters } = data;

    // Build conditions
    const conditions = [];
    if (filters.search) {
      conditions.push(ilike(table.name, `%${filters.search}%`));
    }
    conditions.push(sql`${table.deletedAt} IS NULL`);

    // Add cursor condition if provided
    if (cursor) {
      const cursorPosition = decodeCursor(cursor);
      if (cursorPosition) {
        conditions.push(
          buildCursorCondition(
            table.createdAt,
            table.id,
            cursorPosition,
            sortOrder
          )
        );
      }
    }

    const whereClause = and(...conditions);
    const orderDirection = sortOrder === "asc" ? asc : desc;

    // Fetch pageSize + 1 to detect hasNextPage
    const results = await db
      .select()
      .from(table)
      .where(whereClause)
      .orderBy(orderDirection(table.createdAt), orderDirection(table.id))
      .limit(pageSize + 1);

    // Returns { items, nextCursor, hasNextPage }
    return buildStandardCursorResponse(results, pageSize);
  });
```

**Response Shape:**
```typescript
{
  items: T[];           // The page items (max pageSize)
  nextCursor: string;   // Base64 encoded cursor for next page, or null
  hasNextPage: boolean; // True if more items exist
}
```

**Usage in Components:**
```typescript
function ItemList() {
  const [cursor, setCursor] = useState<string | undefined>();

  const { data } = useQuery({
    queryKey: ["items", cursor],
    queryFn: () => getItemsCursor({ data: { cursor, pageSize: 20 } }),
  });

  return (
    <div>
      {data?.items.map(item => <ItemCard key={item.id} item={item} />)}
      {data?.hasNextPage && (
        <button onClick={() => setCursor(data.nextCursor!)}>
          Load More
        </button>
      )}
    </div>
  );
}
```

### Get by ID

```typescript
export const getItemById = createServerFn({ method: "GET" })
  .validator(idParamSchema)
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(table)
      .where(and(eq(table.id, data.id), sql`${table.deletedAt} IS NULL`))
      .limit(1);

    if (result.length === 0) {
      throw new Error("Item not found");
    }

    return result[0];
  });
```

### Create

```typescript
export const createItem = createServerFn({ method: "POST" })
  .validator(createSchema)
  .handler(async ({ data }) => {
    // TODO: Get organizationId from session
    const organizationId = ctx.organizationId;

    const [result] = await db
      .insert(table)
      .values({ ...data, organizationId })
      .returning();

    return result;
  });
```

### Update

```typescript
export const updateItem = createServerFn({ method: "POST" })
  .validator(idParamSchema.merge(updateSchema))
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    const [result] = await db
      .update(table)
      .set(updateData)
      .where(eq(table.id, id))
      .returning();

    if (!result) {
      throw new Error("Item not found");
    }

    return result;
  });
```

### Soft Delete

```typescript
export const deleteItem = createServerFn({ method: "POST" })
  .validator(idParamSchema)
  .handler(async ({ data }) => {
    const [result] = await db
      .update(table)
      .set({ deletedAt: new Date() })
      .where(and(eq(table.id, data.id), sql`${table.deletedAt} IS NULL`))
      .returning();

    if (!result) {
      throw new Error("Item not found");
    }

    return { success: true };
  });
```

## Usage Examples

### In a Route Component

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { getCustomers } from "@/server/customers";

export const Route = createFileRoute("/customers")({
  loader: async () => {
    return getCustomers({ data: { page: 1, pageSize: 20 } });
  },
  component: CustomersPage,
});

function CustomersPage() {
  const { items, pagination } = Route.useLoaderData();

  return (
    <div>
      {items.map((customer) => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  );
}
```

### With TanStack Query

```typescript
import { useQuery } from "@tanstack/react-query";
import { getCustomerById } from "@/server/customers";

function CustomerDetail({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomerById({ data: { id } }),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{data?.name}</div>;
}
```

### Mutations

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "@/server/customers";

function CreateCustomerForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateCustomer) => createCustomer({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleSubmit = (data: CreateCustomer) => {
    mutation.mutate(data);
  };

  // ...
}
```

## Adding New Functions

1. Create a new file in `src/server/` (e.g., `quotes.ts`)
2. Import necessary dependencies:
   ```typescript
   import { createServerFn } from "@tanstack/start";
   import { db } from "@/lib/db";
   import { myTable } from "@/../drizzle/schema";
   import { mySchema } from "@/lib/schemas/myschema";
   ```
3. Follow the patterns above for CRUD operations
4. Export all functions for use in components

## Files

| File | Description |
|------|-------------|
| `customers.ts` | Customer CRUD operations |
| `products.ts` | Product catalog operations |
| `orders.ts` | Order management with line items |
| `README.md` | This documentation |

## TODO

- [ ] Add authentication middleware (organizationId from session)
- [ ] Add rate limiting
- [ ] Add audit logging
- [x] Implement cursor pagination for large datasets
- [ ] Add caching layer

## Related Documentation

- [Drizzle Schema README](../../drizzle/schema/README.md)
- [Zod Schemas README](../lib/schemas/README.md)
- [TanStack Start Docs](https://tanstack.com/start/latest)
