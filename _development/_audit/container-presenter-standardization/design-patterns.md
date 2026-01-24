# Codebase Wiring Design Patterns

This document standardizes **schema, Zod, queries, server functions, and hooks**
so implementation stays consistent across domains.

## 1) Drizzle Schema Patterns (Replicable)

**File location**: `drizzle/schema/<domain>/<table>.ts`

### Template (Drizzle)

```ts
// drizzle/schema/<domain>/<table>.ts
import { pgTable, uuid, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { <enumType>Enum } from "../_shared/enums";
import {
  organizationColumnBase,
  timestampColumns,
  auditColumns,
  softDeleteColumn,
  fullTextSearchSql,
} from "../_shared/patterns";

export const <table> = pgTable("<table>", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...organizationColumnBase,
  // fields...
  status: <enumType>Enum("status").notNull().default("active"),
  ...timestampColumns,
  ...auditColumns,
  ...softDeleteColumn,
}, (table) => ({
  orgIdx: index("idx_<table>_org").on(table.organizationId),
  uniqueX: uniqueIndex("idx_<table>_org_x_unique").on(table.organizationId, table.<field>),
  searchIdx: index("idx_<table>_search").using("gin", fullTextSearchSql(table.<textField>)),
}));

export const <table>Relations = relations(<table>, ({ one, many }) => ({
  // relations...
}));
```

### Rules (Drizzle)

- Every tenant table includes `organizationId`.
- Use shared patterns from `drizzle/schema/_shared/patterns.ts`.
- Define indexes/unique constraints at table definition.
- Add relations with `relations(...)` in the same file.
- Use enums from `drizzle/schema/_shared/enums.ts` when applicable.

### Patterns vs Antipatterns (Drizzle)

- Pattern: one schema file per table with indexes + relations nearby.
- Pattern: use shared column helpers (`organizationColumnBase`, `timestampColumns`).
- Pattern: additive migrations + backfill + constrain (rollout safe).
- Antipattern: ad‑hoc columns without shared patterns or org scoping.
- Antipattern: adding constraints before backfills or validation queries.

### Pitfalls (Drizzle)

- Missing composite indexes for RLS join paths → slow queries and leakage risk.
- JSONB index signatures → TanStack serialization failures.
- Inconsistent enum values between `_shared/enums.ts` and Zod.

## 2) Zod Schemas (Replicable)

**Location**: `src/lib/schemas/<domain>/<entity>.ts`

### Template (Zod)

```ts
// src/lib/schemas/<domain>/<entity>.ts
import { z } from "zod";
import { idParamSchema, paginationSchema, filterSchema } from "../_shared/patterns";

export const create<Entity>Schema = z.object({
  // fields...
});

export const update<Entity>Schema = create<Entity>Schema.partial();
export const <entity>ParamsSchema = idParamSchema;

export const <entity>FilterSchema = filterSchema.extend({
  // filters...
});

export const <entity>ListQuerySchema = paginationSchema.merge(<entity>FilterSchema);
```

### Rules (Zod)

- Every server function validates with Zod before DB access.
- Create schemas do not include `organizationId` (derived from auth context).
- Use shared patterns (e.g., `idParamSchema`, `paginationSchema`, `filterSchema`).

### Patterns vs Antipatterns (Zod)

- Pattern: `create<Entity>Schema` + `update<Entity>Schema = create.partial()`.
- Pattern: reuse `idParamSchema` and pagination/filter helpers.
- Antipattern: duplicating validation logic in server functions.
- Antipattern: mixing API output typing into input schemas.

### Pitfalls (Zod)

- Including `organizationId` in create schemas (should be derived).
- Inconsistent coercion rules (dates/numbers) across domains.

## 3) Query Layer (Actual Codebase Pattern)

**Location**: query logic lives inside server functions or in `src/lib/server/*`.

### Template (Query Layer)

```ts
// src/server/functions/<domain>/<entity>.ts
import { db } from "@/lib/db";
import { <table> } from "@/../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// keep queries close to the server function for clarity
const rows = await db
  .select()
  .from(<table>)
  .where(and(eq(<table>.organizationId, ctx.organizationId), sql`${<table>.deletedAt} IS NULL`));
```

### Rules (Query Layer)

- Always filter by `organizationId`.
- Wrap bulk ops in `db.transaction`.
- Reuse `src/lib/server/*` helpers for shared domain logic when present.

### Patterns vs Antipatterns (Query Layer)

- Pattern: keep domain queries close to server function or shared helper.
- Pattern: wrap bulk writes in `db.transaction(...)`.
- Antipattern: query helpers in random locations or cross‑domain imports.

### Pitfalls (Query Layer)

- Missing `organizationId` filter in read/write paths.
- Non‑transactional multi‑step writes (race conditions).

## 4) Server Functions (Replicable)

**Location**: `src/server/functions/<domain>/<entity>.ts`

### Template (Server Functions)

```ts
import { createServerFn } from "@tanstack/react-start";
import { create<Entity>Schema } from "@/lib/schemas/<domain>/<entity>";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const create<Entity> = createServerFn({ method: "POST" })
  .inputValidator(create<Entity>Schema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.<domain>.create });
    // db logic here (or call a helper in src/lib/server/*)
  });
```

### Rules (Server Functions)

- Always use `.inputValidator(...)` (Zod schema or function validator).
- Server functions accept a single `data` parameter; handler signature is `({ data }) => ...`.
- Use `withAuth(...)` for org/user context and permissions.
- Direct SQL inside server functions is common in this codebase.
- Prefer `typedGetFn` / `typedPostFn` from `src/lib/server/typed-server-fn.ts` when
  returning Drizzle types or JSONB columns to avoid TanStack serialization issues.
- Use custom error classes from `src/lib/server/errors.ts` for consistent client errors.
- Static imports of server functions are safe; avoid dynamic imports.
- Use server function middleware (`createMiddleware({ type: "function" })`) for
  shared auth/logging/context when cross-cutting logic is needed.

### Patterns vs Antipatterns (Server Functions)

- Pattern: `createServerFn({ method })` + `.inputValidator(...)` + `withAuth(...)`.
- Pattern: use `typedGetFn`/`typedPostFn` for Drizzle return types.
- Antipattern: dynamic imports for server functions.
- Antipattern: returning raw DB errors to client.

### Pitfalls (Server Functions)

- JSONB index signatures causing Start serialization issues.
- Missing permission checks on write paths.

## 5) Hooks (TanStack Query) (Replicable)

**Location**: `src/hooks/<domain>/<entity>.ts`

### Template (Hooks)

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import { get<Entity>, create<Entity> } from "@/server/<domain>";

export function use<Entity>(id: string) {
  return useQuery({
    queryKey: queryKeys.<domain>.detail(id),
    queryFn: () => get<Entity>({ data: { id } }),
  });
}

export function useCreate<Entity>() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(create<Entity>);
  return useMutation({
    mutationFn: (input) => createFn({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.<domain>.lists() }),
  });
}
```

### Rules (Hooks)

- Prefer `queryKeys` from `src/lib/query-keys.ts`, but some hooks define local keys.
- For server functions, `useServerFn(...)` is used in several hooks (especially mutations).
- Invalidate lists and detail caches explicitly after mutations.

### Patterns vs Antipatterns (Hooks)

- Pattern: `queryKeys` for list/detail cache grouping.
- Pattern: `useServerFn` for mutations with server functions.
- Antipattern: ad‑hoc query keys per file without centralized keys.
- Antipattern: mutations without cache invalidation.

### Pitfalls (Hooks)

- Cache fragmentation causing stale UI.
- Missing optimistic rollback for UX‑critical mutations.

## 6) Jobs / Cron (Replicable)

**Location**: `src/trigger/jobs/<job>.ts`

### Template (Jobs)

```ts
import { cronTrigger } from "@trigger.dev/sdk";
import { client } from "../client";

export const <job> = client.defineJob({
  id: "<job-id>",
  name: "<Job Name>",
  version: "1.0.0",
  trigger: cronTrigger({ cron: "* * * * *" }),
  run: async (_payload, io) => {
    await io.logger.info("Job started");
    // read pending rows, process in batches, mark success/failure
  },
});
```

### Rules (Jobs)

- Idempotent: retry safe.
- Use batch size controls.
- Use `io.logger` for traceability.

### Patterns vs Antipatterns (Jobs)

- Pattern: idempotent job execution with retries and status tracking.
- Pattern: small batch sizes with observability logs.
- Antipattern: jobs that mutate data without tracking or retry controls.

### Pitfalls (Jobs)

- Non‑idempotent jobs leading to duplicate side effects.
- Unbounded batch size leading to timeouts.

## 6) Container/Presenter Architecture (Routes + Components)

**Purpose**: Separate data fetching (hooks) from UI presentation for maintainability, testability, and reusability.

### Architecture Flow

```
Route (Container)
  ↓ calls hooks (useQuery, useMutation, useServerFn)
  ↓ defines handlers (useCallback)
  ↓ transforms data
  ↓ passes props (data + handlers + loading states)
Component (Presenter)
  ↓ renders UI (NO hooks except useState/useCallback for local UI state)
```

### Container Pattern (Routes)

**Location**: `src/routes/**/*.tsx`

**Structure**: Organized into clear sections with comment headers

```tsx
/**
 * Orders Index Route
 *
 * Main order list page with filtering, bulk actions, and export.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-LIST-UI)
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderList } from '@/components/domain/orders';
import { duplicateOrder, deleteOrder, listOrders } from '@/server/functions/orders/orders';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
});

// ============================================================================
// DEFAULT FILTERS
// ============================================================================

const DEFAULT_FILTERS: OrderFiltersState = {
  search: '',
  status: null,
  // ... other defaults
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local UI state
  const [filters, setFilters] = useState<OrderFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  // Data fetching
  const {
    data: ordersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.orders.list(listFilters),
    queryFn: async () => listOrders({ data: listFilters }),
  });

  // Transform data for presenter
  const orders = ordersData?.orders ?? [];
  const total = ordersData?.total ?? 0;

  // Mutations
  const duplicateMutation = useMutation({
    mutationFn: async (orderId: string) => duplicateOrder({ data: { id: orderId } }),
    onSuccess: (result) => {
      toast.success(`Order duplicated as ${result.orderNumber}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      navigate({ to: '/orders/$orderId', params: { orderId: result.id } });
    },
    onError: () => toast.error('Failed to duplicate order'),
  });

  // Handler functions (useCallback for stability)
  const handleDuplicateOrder = useCallback(
    (orderId: string) => {
      duplicateMutation.mutate(orderId);
    },
    [duplicateMutation]
  );

  const handleViewOrder = useCallback(
    (orderId: string) => {
      navigate({ to: '/orders/$orderId', params: { orderId } });
    },
    [navigate]
  );

  // ============================================================================
  // RENDER PRESENTER
  // ============================================================================

  return (
    <PageLayout>
      <OrderList
        orders={orders}
        total={total}
        page={page}
        pageSize={20}
        isLoading={isLoading}
        error={error}
        onPageChange={setPage}
        onViewOrder={handleViewOrder}
        onDuplicateOrder={handleDuplicateOrder}
      />
    </PageLayout>
  );
}
```

**Key Container Patterns:**

1. **Section Headers**: Use `// ===...===` comments to organize code
2. **Route Definition**: Always export `Route` with `createFileRoute`
3. **Local State**: `useState` for UI state (filters, pagination, modals)
4. **Data Hooks**: `useQuery` for reads, `useMutation` for writes
5. **Data Transform**: Extract/default data from hook results
6. **Handlers**: Wrap in `useCallback` for prop stability
7. **Mutations**: Include `onSuccess`/`onError` with toast + cache invalidation
8. **Pass Everything**: Data + handlers + loading/error states to presenter

### Presenter Pattern (Components)

**Location**: `src/components/domain/**/*.tsx`

**Structure**: Pure UI with prop types documenting data sources

```tsx
/**
 * OrderList Component
 *
 * Responsive order list with filtering, sorting, and bulk actions.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-LIST-UI)
 */
import { memo, useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderListProps {
  /** @source useQuery(listOrders) in /orders/index.tsx */
  orders: OrderListItem[];
  /** @source useQuery total in /orders/index.tsx */
  total: number;
  /** @source useState(page) in /orders/index.tsx */
  page: number;
  /** @source useState(pageSize) in /orders/index.tsx */
  pageSize: number;
  /** @source useQuery loading state in /orders/index.tsx */
  isLoading: boolean;
  /** @source useQuery error state in /orders/index.tsx */
  error?: unknown;
  /** @source setState from useState(page) in /orders/index.tsx */
  onPageChange: (page: number) => void;
  /** @source navigate handler in /orders/index.tsx */
  onViewOrder?: (orderId: string) => void;
  /** @source useMutation(duplicateOrder) handler in /orders/index.tsx */
  onDuplicateOrder?: (orderId: string) => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const OrderList = memo(function OrderList({
  orders,
  total,
  page,
  pageSize,
  isLoading,
  error,
  onPageChange,
  onViewOrder,
  onDuplicateOrder,
  className,
}: OrderListProps) {
  // ============================================================================
  // LOCAL UI STATE (OK in presenters)
  // ============================================================================
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // ============================================================================
  // RENDER UI
  // ============================================================================
  return (
    <div className={className}>
      <Table>
        {/* Table implementation */}
      </Table>
    </div>
  );
});
```

**Key Presenter Patterns:**

1. **File Header**: Document component purpose + PRD reference
2. **Types Section**: Export `Props` interface with JSDoc `@source` annotations
3. **Component Section**: Use `memo` for performance (optional but common)
4. **Local UI State**: `useState`/`useCallback` for UI-only state (selection, expanded items)
5. **Loading/Error**: Handle these states first before main render
6. **NO Data Hooks**: Never `useQuery`, `useMutation`, `useServerFn` in presenters
7. **Prop Stability**: Props are stable (handlers use `useCallback` in container)

### JSDoc @source Pattern

**Every prop must document its data source:**

```typescript
export interface ComponentProps {
  /** @source useQuery(getOrders) in /orders/index.tsx */
  orders: Order[];

  /** @source useMutation(createOrder) in /orders/index.tsx */
  onCreateOrder: (order: CreateOrderInput) => Promise<void>;

  /** @source useState(filters) in /orders/index.tsx */
  filters: OrderFilters;

  /** @source useQuery loading state */
  isLoading: boolean;
}
```

**Format**: `/** @source <hook/state> in <file> */`

This makes it easy to trace data flow when debugging or refactoring.

### Complete Refactoring Checklist

When moving hooks from presenter to container:

**Phase 1: Audit**
- [ ] Identify all `useQuery`, `useMutation`, `useServerFn`, `useQueryClient` in presenter
- [ ] Note all data transformations happening in presenter
- [ ] List all handlers/callbacks in presenter

**Phase 2: Container**
- [ ] Move all data hooks to route/container
- [ ] Move mutations to container with proper `onSuccess`/`onError`
- [ ] Extract data from hook results with defaults (`data?.items ?? []`)
- [ ] Wrap handlers in `useCallback` with proper dependencies
- [ ] Add cache invalidation to mutations

**Phase 3: Presenter**
- [ ] Remove all hook imports (`@tanstack/react-query`, `@tanstack/react-start`)
- [ ] Create/update `Props` interface
- [ ] Add `@source` JSDoc to every prop
- [ ] Add `isLoading` + `error` props
- [ ] Add loading skeleton for `isLoading` state
- [ ] Add error display for `error` state
- [ ] Export `Props` interface for reuse
- [ ] Ensure component is `memo` wrapped (optional)

**Phase 4: Verification**
- [ ] No TypeScript errors
- [ ] No `useQuery`/`useMutation`/`useServerFn` in presenter
- [ ] All props have `@source` annotations
- [ ] Loading/error states render correctly
- [ ] Handlers work (click/submit/etc.)
- [ ] Tests pass (if they exist)

### Rules (Container/Presenter)

**Container (Route) Responsibilities:**
- Call all data hooks (`useQuery`, `useMutation`, custom hooks)
- Define filter/pagination state
- Define handler functions (wrap in `useCallback`)
- Transform data for presenters
- Handle cache invalidation
- Handle navigation
- Pass everything via props

**Presenter (Component) Responsibilities:**
- Render UI based on props
- Handle loading/error states
- Local UI state only (`useState` for selection, expansion, etc.)
- Call handler props (no mutations directly)
- NO data fetching

**Allowed in Presenters:**
- `useState` - for local UI state (expanded items, selection)
- `useCallback` - for local event handlers
- `useMemo` - for derived UI state
- `useRef` - for DOM refs
- Custom UI hooks - for local concerns (useMediaQuery, useClickOutside, etc.)

**NEVER in Presenters:**
- `useQuery` - belongs in container
- `useMutation` - belongs in container
- `useServerFn` - belongs in container
- `useQueryClient` - belongs in container
- Any hook that fetches/mutates server data

### Patterns vs Antipatterns (Container/Presenter)

**✅ Pattern: Organized sections in container**
```tsx
// ============================================================================
// ROUTE DEFINITION
// ============================================================================
export const Route = createFileRoute(...)

// ============================================================================
// DATA FETCHING
// ============================================================================
const { data, isLoading } = useQuery(...)

// ============================================================================
// HANDLERS
// ============================================================================
const handleAction = useCallback(...)

// ============================================================================
// RENDER
// ============================================================================
return <Presenter {...props} />
```

**✅ Pattern: Props with @source annotations**
```tsx
export interface OrderListProps {
  /** @source useQuery(listOrders) in /orders/index.tsx */
  orders: Order[];
  /** @source useMutation(deleteOrder) handler in /orders/index.tsx */
  onDelete: (id: string) => void;
}
```

**✅ Pattern: Data extraction with defaults**
```tsx
const orders = ordersData?.orders ?? [];
const total = ordersData?.total ?? 0;
```

**✅ Pattern: Handlers in useCallback**
```tsx
const handleViewOrder = useCallback(
  (orderId: string) => {
    navigate({ to: '/orders/$orderId', params: { orderId } });
  },
  [navigate]
);
```

**✅ Pattern: Mutations with invalidation**
```tsx
const deleteMutation = useMutation({
  mutationFn: async (id: string) => deleteOrder({ data: { id } }),
  onSuccess: () => {
    toast.success('Deleted');
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  },
});
```

**❌ Antipattern: Hooks in presenters**
```tsx
// BAD - presenter calling hooks
export function OrderList() {
  const { data } = useQuery(...); // WRONG!
  return <Table data={data} />;
}
```

**❌ Antipattern: Missing @source annotations**
```tsx
// BAD - no documentation
export interface Props {
  orders: Order[]; // Where does this come from?
}
```

**❌ Antipattern: No loading state**
```tsx
// BAD - no skeleton/spinner
return <OrderList orders={orders} />;
// Should pass: isLoading={isLoading}
```

**❌ Antipattern: Inline handlers without useCallback**
```tsx
// BAD - creates new function every render
<OrderList onDelete={(id) => deleteOrder(id)} />

// GOOD - stable reference
const handleDelete = useCallback((id) => deleteOrder(id), [deleteOrder]);
<OrderList onDelete={handleDelete} />
```

### Pitfalls (Container/Presenter)

**Missing isLoading props**
- Symptom: No loading skeleton, blank screen during fetch
- Fix: Pass `isLoading` from `useQuery` to presenter

**Stale data after mutations**
- Symptom: Create/update/delete doesn't refresh list
- Fix: Add `queryClient.invalidateQueries()` to mutation `onSuccess`

**Handler instability**
- Symptom: Unnecessary re-renders, child components re-mount
- Fix: Wrap handlers in `useCallback` with proper deps

**Forgot to extract data**
- Symptom: Passing entire `data` object with extra fields
- Fix: Extract specific fields: `data?.items ?? []`

**Props not documented**
- Symptom: Hard to trace where data comes from
- Fix: Add `@source` JSDoc to all props

**Mutations without error handling**
- Symptom: Silent failures, no user feedback
- Fix: Add `onError` with `toast.error()`

### Reference Files (Real Codebase Examples)

**Containers (Routes):**
- `src/routes/_authenticated/orders/index.tsx` - List with filters, mutations, handlers
- `src/routes/_authenticated/inventory/index.tsx` - Complex filters, parallel queries
- `src/routes/_authenticated/customers/index.tsx` - Standard CRUD pattern
- `src/routes/_authenticated/dashboard.tsx` - Multiple queries, data aggregation

**Presenters (Components):**
- `src/components/domain/orders/order-list.tsx` - Table with actions
- `src/components/domain/inventory/inventory-browser.tsx` - Multi-view (list/grid/map)
- `src/components/domain/customers/customer-table.tsx` - Sortable table
- `src/components/domain/dashboard/main-dashboard.tsx` - Dashboard widgets

**Custom Hooks (for containers):**
- `src/hooks/inventory/use-inventory.ts` - Encapsulates inventory query logic
- `src/hooks/orders/use-fulfillment-kanban.ts` - Complex state + mutations

## 7) Testing & Validation (Replicable)

- **Schemas**: `tests/unit/schemas/*.spec.ts`
- **Auth/RLS**: `tests/integration/auth/*.spec.ts` (org isolation, permissions)
- **Hooks**: `tests/unit/hooks/*.spec.tsx`
- **Jobs**: `tests/e2e/*.e2e.tsx` + `tests/integration/jobs/*.test.tsx`

### Patterns vs Antipatterns (Testing)

- Pattern: RLS/org‑isolation checks in integration tests.
- Pattern: schema and hook tests for critical flows.
- Antipattern: relying solely on manual verification.

### Pitfalls (Testing)

- Missing join‑table RLS coverage.
- No regression tests for cache invalidation.

## 8) Highest ROI Improvement (Recommended)

- Standardize server functions on `typedGetFn` / `typedPostFn` to eliminate
  TanStack Start serialization/type inference edge cases with Drizzle JSONB,
  and to keep `.inputValidator(...)` usage consistent.

## 9) Middleware Pattern (TanStack Start)

```ts
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const authMiddleware = createMiddleware({ type: "function" })
  .inputValidator((data: { organizationId: string }) => data)
  .server(async ({ next, data }) => {
    // auth / permission checks here
    return next();
  });

export const myFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return { ok: true };
  });
```

## 10) Validated Examples (Codebase)

- Drizzle schema: `drizzle/schema/customers/customers.ts`
- Zod schemas: `src/lib/schemas/customers/customers.ts`
- Server functions: `src/server/functions/customers/customers.ts`
- Hooks: `src/hooks/customers/use-customers.ts`
- Hooks w/ `useServerFn`: `src/hooks/orders/use-fulfillment-kanban.ts`
- Container (Route): `src/routes/_authenticated/dashboard.tsx`
- Presenter (Component): `src/components/domain/dashboard/main-dashboard.tsx`
- Jobs (Trigger.dev): `src/trigger/jobs/process-scheduled-emails.ts`

## 11) Platform Capabilities to Leverage (General)

### TanStack Start

- Server functions with `.inputValidator(...)` + `useServerFn(...)`.
- Server function middleware (`createMiddleware({ type: "function" })`) for auth/logging/context.
- Request/response utilities (`getRequestHeader`, `setResponseHeaders`, `setResponseStatus`).
- Static server functions where build-time caching is valid.
- Server routes for non-RPC endpoints when needed.
- Error/redirect/notFound helpers for consistent control flow.
- Custom client fetch middleware for telemetry/retry when needed.

### Drizzle ORM (Postgres)

- `relations(...)` for consistent join traversal.
- `db.transaction(...)` for atomicity in multi-step writes.
- Shared column patterns (`organizationColumnBase`, `timestampColumns`, `auditColumns`).
- Index + unique constraints defined in schema files.
- Migrations via `drizzle/migrations` and `bun run db:generate`.
- Use typed JSONB without index signatures when possible.

### Supabase / Postgres

- RLS policies for org isolation; test via integration tests.
- Use Postgres enums/constraints over app-only checks where possible.
- Materialized views for analytics (refresh via cron).
