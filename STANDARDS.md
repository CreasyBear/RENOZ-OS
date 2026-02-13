# Codebase Standards

This document establishes authoritative patterns for the Renoz v3 codebase. It is the single source of truth for barrel exports, component architecture, hook patterns, and file/folder structure.

**Last updated:** 2026-02-13

**Related:**
- [CLAUDE.md](./CLAUDE.md) - Project overview and commands
- [SCHEMA-TRACE.md](./SCHEMA-TRACE.md) - Schema & query trace-through framework
- [.claude/rules/hook-architecture.md](./.claude/rules/hook-architecture.md) - Detailed hook rules

---

## Table of Contents

1. [Barrel Export Patterns](#1-barrel-export-patterns)
2. [Component Architecture](#2-component-architecture)
3. [Hook Patterns](#3-hook-patterns)
4. [Money & Currency Units](#4-money--currency-units)
5. [File/Folder Structure](#5-filefolder-structure)
6. [Compliance Checklist](#6-compliance-checklist)
7. [Audit Commands](#7-audit-commands)
8. [Route Code Splitting Patterns](#8-route-code-splitting-patterns)
9. [Supabase Auth + TanStack Start Standards](#9-supabase-auth--tanstack-start-standards)
10. [React Performance Standards (Vercel)](#10-react-performance-standards-vercel)
11. [Auth + Performance Checklist](#11-auth--performance-checklist)
12. [React Refresh (Fast Refresh)](#12-react-refresh-fast-refresh)

---

## 1. Barrel Export Patterns

Barrel exports (`index.ts` files) provide clean public APIs for each domain. They should be organized with section comments and include type re-exports.

### Schema Exports (`src/lib/schemas/{domain}/index.ts`)

**Do this:**
```typescript
/**
 * Customer Schemas
 *
 * Provides validation schemas for customer operations.
 */

// --- Core Types ---
export * from './customer'
export * from './customer-filters'

// --- Form Schemas ---
export * from './customer-form'
export * from './customer-import'

// --- Re-export key types for convenience ---
export type {
  CustomerInput,
  CustomerOutput,
  CustomerListQuery,
} from './customer'
```

**Not this:**
```typescript
export * from './customer'
export * from './filters'  // Missing domain prefix
// No module docstring
// No section comments
// No type re-exports
```

### Hook Exports (`src/hooks/{domain}/index.ts`)

**Reference pattern from `src/hooks/customers/index.ts`:**

**Do this:**
```typescript
/**
 * Customer Hooks
 *
 * Provides hooks for customer management, analytics, and duplicate detection.
 */

// Main CRUD hooks
export {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from './use-customers';

// Analytics hooks
export {
  useCustomerKpis,
  useCustomerTrends,
  useSegmentPerformance,
} from './use-customer-analytics';

// Duplicate detection hooks
export {
  useDuplicateDetection,
  useDuplicateScan,
} from './use-duplicate-scan';

// Re-export types
export type { CustomerFilters } from '@/lib/query-keys';
export type {
  Customer,
  CustomerListQuery,
  CreateCustomer,
} from '@/lib/schemas/customers';
```

**Not this:**
```typescript
export * from './use-customers'
export * from './use-analytics'
// No section comments
// No type re-exports
// Glob exports make it hard to know what's public API
```

### Component Exports (`src/components/domain/{domain}/index.ts`)

**Reference pattern from `src/components/domain/communications/index.ts`:**

**Do this:**
```typescript
/**
 * Communications Domain Components
 *
 * Components for email tracking, scheduling, and template management.
 */

// Email Tracking
export { EmailTrackingBadge, type EmailTrackingBadgeProps } from './email-tracking-badge'
export { EmailTrackingTimeline, type TrackingEvent } from './email-tracking-timeline'

// Email Scheduling
export { DateTimePicker, type DateTimePickerProps } from './date-time-picker'
export { ScheduleEmailDialog, type ScheduleEmailDialogProps } from './schedule-email-dialog'

// Email Templates
export { TemplateEditor } from './template-editor'
export { TemplatesList } from './templates-list'
```

**Not this:**
```typescript
export * from './email-tracking-badge'
export * from './date-time-picker'
// No section grouping
// Types not co-located with components
```

---

## 2. Component Architecture

### Container/Presenter Pattern

Containers handle data fetching and business logic. Presenters are pure UI components that receive data via props.

**Do this:**
```typescript
/**
 * Customer list container - handles data fetching
 * @source customers from useCustomers hook
 * @source segments from useCustomerSegments hook
 */
export function CustomerListContainer({ filters }: CustomerListContainerProps) {
  const { data: customers, isLoading, error } = useCustomers(filters);
  const { data: segments } = useCustomerSegments();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <CustomerListPresenter
      customers={customers ?? []}
      segments={segments ?? []}
    />
  );
}

// Pure UI component - NO HOOKS that fetch data
interface CustomerListPresenterProps {
  customers: Customer[];
  segments: Segment[];
}

export function CustomerListPresenter({ customers, segments }: CustomerListPresenterProps) {
  return (
    <ul>
      {customers.map(customer => (
        <li key={customer.id}>{customer.name}</li>
      ))}
    </ul>
  );
}
```

**Not this:**
```typescript
// Mixing data fetching with UI
export function CustomerList() {
  const { data } = useCustomers();  // Data in UI component
  const [filter, setFilter] = useState('');  // UI state mixed in

  return <ul>{data?.map(c => <li>{c.name}</li>)}</ul>;
}
```

### @source JSDoc Annotation

Always document data sources in container components:

```typescript
/**
 * Order detail container
 * @source order from useOrder hook
 * @source customer from useCustomer hook (via order.customerId)
 * @source shipments from useOrderShipments hook
 */
export function OrderDetailContainer({ orderId }: Props) {
  // ...
}
```

### Error Boundaries

Each domain route should have an error boundary:

```typescript
// In route file
export const Route = createFileRoute('/_authenticated/customers/')({
  component: CustomersPage,
  errorComponent: ({ error }) => (
    <ErrorState
      title="Failed to load customers"
      error={error}
      retry={() => window.location.reload()}
    />
  ),
});
```

---

## 3. Hook Patterns

### TanStack Query Conventions

**CRITICAL:** Always use centralized query keys from `@/lib/query-keys.ts`. Never define local query keys.

**Do this:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getCustomers, createCustomer } from '@/server/functions/customers';

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => getCustomers({ data: filters }),
    staleTime: 30 * 1000,  // 30 seconds
    enabled: true,
  });
}
```

**Never this:**
```typescript
// NEVER define local query keys
const customerKeys = {
  all: ['customers'] as const,
  list: () => [...customerKeys.all, 'list'] as const,
};

// NEVER use inline query keys
useQuery({
  queryKey: ['customers', filters],  // WRONG
  queryFn: () => getCustomers({ data: filters }),
});
```

### Routes Must Not Call useQuery Directly

**CRITICAL ANTI-PATTERN:** Routes must never call `useQuery()` or `useMutation()` directly. This breaks centralized cache management.

**Never this:**
```typescript
// In a route file - THIS IS WRONG
export const Route = createFileRoute('/_authenticated/customers/')({
  component: () => {
    const { data } = useQuery({
      queryKey: ['customers'],  // WRONG - inline key
      queryFn: () => getCustomers(),
    });
    return <CustomerList customers={data} />;
  }
});
```

**Do this instead:**
```typescript
// In a route file
export const Route = createFileRoute('/_authenticated/customers/')({
  component: CustomersPage,
});

function CustomersPage() {
  return <CustomerListContainer />;  // Container handles data
}

// In components/domain/customers/customer-list-container.tsx
export function CustomerListContainer() {
  const { data } = useCustomers();  // Hook uses centralized keys
  return <CustomerListPresenter customers={data} />;
}
```

### Mutation Invalidation

**CRITICAL:** Always invalidate BOTH list AND detail caches on mutation success.

**Do this:**
```typescript
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCustomerInput) => updateCustomer({ data }),
    onSuccess: (_, variables) => {
      // Invalidate BOTH list and detail
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
    },
  });
}
```

**Not this:**
```typescript
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateCustomer({ data }),
    onSuccess: () => {
      // WRONG - only invalidates list, not detail
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}
```

### Query Key Factory Pattern

The centralized query keys follow a hierarchical factory pattern for type-safe cache invalidation:

```typescript
// From src/lib/query-keys.ts
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: CustomerFilters) =>
      [...queryKeys.customers.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
}
```

**Invalidation hierarchy:**
- `queryKeys.customers.all` - invalidates ALL customer queries
- `queryKeys.customers.lists()` - invalidates all list queries
- `queryKeys.customers.list(filters)` - invalidates specific filtered list
- `queryKeys.customers.details()` - invalidates all detail queries
- `queryKeys.customers.detail(id)` - invalidates specific customer detail

### Polling with refetchInterval

**Do this:**
```typescript
export function useJobProgress(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () => getJobStatus({ data: { jobId } }),
    refetchInterval: (query) => {
      return query.state.data?.status === 'completed' ? false : 2000;
    },
  });
}
```

**Never this:**
```typescript
// NEVER use setInterval for polling
const [data, setData] = useState(null);
useEffect(() => {
  const interval = setInterval(() => {
    fetchJobStatus().then(setData);
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

---

## 4. Money & Currency Units

**Authoritative Rule:** All monetary values in the application are stored and passed **in dollars** (e.g. `15004.00`), not cents. This matches `currencyColumn` (`numeric(12,2)`) in Drizzle schemas.

### Allowed Exceptions (Explicit Cents Fields Only)
Some fields are intentionally stored as **integer cents** for integration or precision reasons. These must:
- Be explicitly named with `...Cents` (or have clear schema comments)
- Convert at boundaries using `toCents()` / `fromCents()` helpers

Current explicit cents fields:
- `order_shipments.shipping_cost` (integer cents; carrier cost)

### Rules
- **Never** do `/ 100` or `* 100` in UI or core domain logic.
- **Only** convert at boundaries (API integrations, legacy migrations, or explicit cents fields).
- Use `toCents()` / `fromCents()` from `@/lib/currency` for conversions.
- `FormatAmount`, `useOrgFormat`, and other formatters expect **dollars** by default. Only pass `cents: true` when working with an explicit cents field.

### Examples
✅ Correct (explicit cents field):
```typescript
import { toCents } from '@/lib/currency';

const shippingCostCents = shippingCost === '' ? undefined : toCents(shippingCost);
```

❌ Incorrect (core domain dollars):
```typescript
// Wrong: orders are stored in dollars
const amount = Math.round(order.total * 100);
```

---

## 5. File/Folder Structure

### Domain Organization

Each domain follows this structure:

```
src/
├── components/domain/{domain}/     # UI components
│   ├── index.ts                    # Barrel export
│   ├── {entity}-form.tsx
│   ├── {entity}-list.tsx
│   └── {entity}-detail.tsx
├── hooks/{domain}/                 # React hooks
│   ├── index.ts                    # Barrel export
│   ├── use-{entities}.ts           # List hook
│   ├── use-{entity}.ts             # Detail hook
│   └── use-create-{entity}.ts      # Mutation hooks
├── lib/schemas/{domain}/           # Zod schemas
│   ├── index.ts                    # Barrel export
│   └── {entity}.ts
├── server/functions/{domain}/      # Server functions
│   ├── index.ts                    # Barrel export (optional)
│   ├── get-{entities}.ts
│   ├── get-{entity}.ts
│   ├── create-{entity}.ts
│   └── update-{entity}.ts
└── routes/_authenticated/{domain}/ # Route files
    ├── index.tsx
    ├── $id.tsx
    └── new.tsx
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Schema file | `{entity}.ts` | `customer.ts` |
| Hook file | `use-{entity}.ts` or `use-{entities}.ts` | `use-customer.ts`, `use-customers.ts` |
| Hook function | `use{Entity}` or `use{Entities}` | `useCustomer`, `useCustomers` |
| Component file | `{entity}-{variant}.tsx` | `customer-form.tsx`, `customer-list.tsx` |
| Server function file | `{operation}-{entity}.ts` or `{operation}.ts` | `get-customers.ts`, `create.ts` |
| Route file | Domain at folder level | `routes/_authenticated/customers/index.tsx` |

### Adding a New Domain

1. Create folder structure:
   ```bash
   mkdir -p src/components/domain/{domain}
   mkdir -p src/hooks/{domain}
   mkdir -p src/lib/schemas/{domain}
   mkdir -p src/server/functions/{domain}
   mkdir -p src/routes/_authenticated/{domain}
   ```

2. Add query keys to `src/lib/query-keys.ts`:
   ```typescript
   {domain}: {
     all: ['{domain}'] as const,
     lists: () => [...queryKeys.{domain}.all, 'list'] as const,
     list: (filters?: {Domain}Filters) =>
       [...queryKeys.{domain}.lists(), filters ?? {}] as const,
     details: () => [...queryKeys.{domain}.all, 'detail'] as const,
     detail: (id: string) => [...queryKeys.{domain}.details(), id] as const,
   },
   ```

3. Create barrel exports in each `index.ts`

4. Follow container/presenter pattern for components

---

## 6. Compliance Checklist

For each domain, verify:

- [ ] **Barrel exports exist** with section comments in:
  - [ ] `src/hooks/{domain}/index.ts`
  - [ ] `src/lib/schemas/{domain}/index.ts`
  - [ ] `src/components/domain/{domain}/index.ts`
- [ ] **Hooks use centralized query keys** from `@/lib/query-keys.ts`
- [ ] **Mutations invalidate both list AND detail** caches
- [ ] **Components follow container/presenter split** with `@source` JSDoc
- [ ] **Routes don't call `useQuery()` directly** - use container components
- [ ] **Query keys added** to `src/lib/query-keys.ts` for new entities
- [ ] **Heavy routes code-split** - `index.tsx` files >100 lines split into `{domain}-page.tsx`

---

## 7. Audit Commands

Run these commands to find violations:

```bash
# Count inline query key violations in routes
grep -r "queryKey: \[" src/routes --include="*.tsx" | wc -l

# Find routes with direct useQuery (should use hooks)
grep -r "useQuery(" src/routes --include="*.tsx" | wc -l

# Find routes with direct useMutation (should use hooks)
grep -r "useMutation(" src/routes --include="*.tsx" | wc -l

# List hook directories missing barrel exports
find src/hooks -type d -mindepth 1 -maxdepth 1 -exec sh -c 'test ! -f "$1/index.ts" && echo "$1"' _ {} \;

# List schema directories missing barrel exports
find src/lib/schemas -type d -mindepth 1 -maxdepth 1 -exec sh -c 'test ! -f "$1/index.ts" && echo "$1"' _ {} \;

# List component domain directories missing barrel exports
find src/components/domain -type d -mindepth 1 -maxdepth 1 -exec sh -c 'test ! -f "$1/index.ts" && echo "$1"' _ {} \;

# Find heavy route files that need code splitting (>100 lines)
find src/routes/_authenticated -name "index.tsx" -exec wc -l {} + | sort -rn | head -20

# Check for routes missing lazy loading (should use lazy() if >100 lines)
grep -L "lazy(" src/routes/_authenticated/*/index.tsx src/routes/_authenticated/*/*/index.tsx 2>/dev/null | \
  xargs wc -l 2>/dev/null | sort -rn | head -10
```

### Interpreting Results

- **0 inline query keys in routes** = compliant
- **0 direct useQuery in routes** = compliant
- **No directories listed** for missing barrel exports = compliant
- **No routes >200 lines without code splitting** = compliant
- **All heavy routes use `lazy()`** = compliant

### Migration Priority

When cleaning up violations:

1. **HIGH:** Routes with inline query keys (breaks cache coherence)
2. **HIGH:** Routes with direct useQuery/useMutation (bypasses centralized management)
3. **HIGH:** Routes >200 lines without code splitting (increases bundle size)
4. **MEDIUM:** Routes 100-200 lines without code splitting
5. **MEDIUM:** Missing barrel exports (reduces discoverability)
6. **LOW:** Missing section comments (cosmetic)

---

## 8. Route Code Splitting Patterns

Index routes (`index.tsx`) that grow beyond **100 lines** must be code-split to reduce initial bundle size and improve application startup performance.

### When to Code Split

| Route Size | Action | Priority |
|------------|--------|----------|
| >200 lines | **Must split** | P0 - Critical |
| 150-200 lines | **Should split** | P1 - High |
| 100-150 lines | **Consider splitting** | P2 - Medium |
| <100 lines | Keep inline | Optional |

### The Pattern

**Route file (`index.tsx`):** Contains ONLY route definition (<100 lines)
- Route configuration (`createFileRoute`)
- Search param validation schema
- Lazy import statement
- Suspense wrapper with skeleton
- Error boundary
- **Route files must not export named page components; use default export or lazy import only.**
- **Tab modules must not mix lazy() and named exports; use separate lazy-only entry.**

**Page file (`{domain}-page.tsx`):** Contains all component logic
- Data fetching hooks
- State management
- Event handlers
- JSX markup
- Helper functions

### Example: List View Route

```typescript
// routes/_authenticated/customers/index.tsx (61 lines)
/**
 * Customers Index Route
 *
 * Route definition for customer directory page with lazy-loaded component.
 *
 * @performance Code-split for reduced initial bundle size
 * @see src/routes/_authenticated/customers/customers-page.tsx
 */
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { CustomerTableSkeleton } from '@/components/skeletons/customers';

export const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

const CustomersPage = lazy(() => import('./customers-page'));

export const Route = createFileRoute('/_authenticated/customers/')({
  validateSearch: searchParamsSchema,
  component: () => (
    <Suspense fallback={
      <PageLayout variant="full-width">
        <PageLayout.Header title="Customers" />
        <PageLayout.Content>
          <CustomerTableSkeleton />
        </PageLayout.Content>
      </PageLayout>
    }>
      <CustomersPage />
    </Suspense>
  ),
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});
```

```typescript
// routes/_authenticated/customers/customers-page.tsx
/**
 * Customers Page Component
 *
 * Main customer directory page with search, filtering, and management.
 *
 * @source customers from useCustomers hook
 * @source tags from useCustomerTags hook
 * @source mutations from useDeleteCustomer hook
 *
 * @see src/routes/_authenticated/customers/index.tsx
 */
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { CustomerDirectory } from '@/components/domain/customers';
import { useCustomers, useDeleteCustomer } from '@/hooks/customers';
import type { SearchParams } from './index';

interface CustomersPageProps {
  search: SearchParams;
}

export default function CustomersPage({ search }: CustomersPageProps) {
  const navigate = useNavigate();
  
  const { data, isLoading } = useCustomers({
    page: search.page,
    search: search.search,
    status: search.status,
  });
  
  const deleteMutation = useDeleteCustomer();
  
  const handleCreate = useCallback(() => {
    navigate({ to: '/customers/new' });
  }, [navigate]);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Customers"
        actions={<Button onClick={handleCreate}>Add Customer</Button>}
      />
      <PageLayout.Content>
        <CustomerDirectory
          customers={data?.items || []}
          isLoading={isLoading}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
```

### Example: Tabbed Interface Route

For routes with tabs, lazy load heavy tab content while keeping the tab shell in the route:

```typescript
// routes/_authenticated/dashboard/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Always render default tab inline
import { OverviewContainer } from '@/components/domain/dashboard/overview';

// Lazy load heavy tabs
const BusinessOverviewContainer = lazy(() => 
  import('@/components/domain/dashboard/business-overview').then(m => ({ 
    default: m.BusinessOverviewContainer 
  }))
);

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
});

function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="business">Business</TabsTrigger>
      </TabsList>
      
      {/* Default tab - always render */}
      <TabsContent value="overview">
        <OverviewContainer />
      </TabsContent>
      
      {/* Heavy tab - lazy loaded with Suspense */}
      <TabsContent value="business">
        <Suspense fallback={<BusinessOverviewSkeleton />}>
          <BusinessOverviewContainer />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
```

### Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Route file | `index.tsx` | `routes/_authenticated/customers/index.tsx` |
| Page file | `{domain}-page.tsx` | `routes/_authenticated/customers/customers-page.tsx` |
| Schema export | `{domain}SearchSchema` | `export const customerSearchSchema = z.object({...})` |
| Type export | `{Domain}Search` | `export type CustomerSearch = z.infer<typeof customerSearchSchema>` |

### Skeleton Naming

Skeleton components should match the layout they're replacing:

| View Type | Skeleton Component |
|-----------|-------------------|
| Table view | `{Domain}TableSkeleton` | `CustomerTableSkeleton` |
| Dashboard | `{Domain}DashboardSkeleton` | `InventoryDashboardSkeleton` |
| Detail view | `{Domain}DetailSkeleton` | `OrderDetailSkeleton` |
| Form view | `{Domain}FormSkeleton` | `ProductFormSkeleton` |

### Rules

#### Rule 1: Route Files Maximum 100 Lines
Route files should ONLY contain:
- Route configuration
- Search param schema
- Lazy import
- Suspense wrapper
- Error boundary

**❌ DON'T include in route files:**
- Component logic (`useState`, `useEffect`, handlers)
- Data fetching hooks (`useQuery`, `useMutation`)
- Full JSX markup
- Helper functions

#### Rule 2: Page Files Export Default Component
```typescript
// ✅ CORRECT: Single default export
export default function CustomersPage() { }

// ❌ WRONG: Named exports
export function CustomersPage() { }
```

#### Rule 3: Export Schema for Type Safety
```typescript
// In route file
export const customerSearchSchema = z.object({...});
export type CustomerSearch = z.infer<typeof customerSearchSchema>;

// In page file
import type { CustomerSearch } from './index';

interface CustomersPageProps {
  search: CustomerSearch;
}
```

#### Rule 4: Always Use Suspense with Skeleton
```typescript
// ✅ CORRECT: Proper skeleton fallback
<Suspense fallback={<CustomerTableSkeleton />}>
  <CustomersPage />
</Suspense>

// ❌ WRONG: No fallback or generic spinner
<Suspense fallback={<div>Loading...</div>}>
```

#### Rule 5: Error Boundaries Required
```typescript
export const Route = createFileRoute('/_authenticated/customers/')({
  component: () => <CustomersPage />,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
});
```

### Migration Checklist

When splitting a heavy route:

- [ ] Create `{domain}-page.tsx` file
- [ ] Move all component logic to page file
- [ ] Change to `export default function`
- [ ] Add `@source` JSDoc annotations for data sources
- [ ] Simplify `index.tsx` to <100 lines
- [ ] Add `lazy()` import
- [ ] Wrap with `Suspense` and skeleton
- [ ] Export search schema from `index.tsx`
- [ ] Import schema type in page file
- [ ] Add `errorComponent` to route
- [ ] Verify TypeScript compiles
- [ ] Test route loads correctly
- [ ] Verify skeleton appears during load

---

## 9. Supabase Auth + TanStack Start Standards

These rules align Supabase Auth with TanStack Start server functions in this codebase.

### Supabase Client Usage
- **Browser:** Use `createClient()` from `src/lib/supabase/client.ts` for React components.
- **Server:** Use `createServerSupabase()` or `createClient()` from `src/lib/supabase/server.ts` for server functions.
- **Admin:** Use `createAdminSupabase()` only for privileged operations and never in client code.

### Server Function Requirements
- **Use `createServerFn` for all server logic.** Choose `GET` for reads and `POST` for mutations.
- **Validate inputs** with `.inputValidator()` or `.validator()` using Zod schemas from `src/lib/schemas`.
- **Auth lives inside the handler.** Route guards (`beforeLoad`) are not sufficient; always call:
  - `withAuth()` for user-context server functions
  - `withApiAuth()` for API token access
  - `withAnyAuth()` for dual human/agent endpoints
  - `withInternalAuth()` for internal service calls

### Multi-Tenant Guardrails
- **Always scope queries by `organizationId`.** Use `ctx.organizationId` from auth helpers.
- **RLS context is mandatory.** `withAuth()` sets the DB session config; do not bypass it.
- **Never use admin Supabase** for user-initiated flows unless explicitly authorized.

### Route Protection & SSR
- Use `beforeLoad` in `src/routes/_authenticated.tsx` for fast auth checks and redirects.
- Fetch full app user data via hooks (React Query) in components for caching and waterfall prevention.
- Provide `errorComponent` for auth failures and `pendingComponent` for loading states where applicable.

### Environment Variables
- **Client:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Server:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 10. React Performance Standards (Vercel)

These rules are optimized for React + TanStack Start performance and bundle health.

See [BUILD-OPTIMIZATION.md](./docs/standards/BUILD-OPTIMIZATION.md) for full build optimization standards.

### Eliminate Async Waterfalls
- Start independent async work early and await late.
- Use `Promise.all()` for parallel operations.
- Prefer Suspense boundaries for heavy sections instead of blocking the whole page.

**Do this:**
```typescript
const userPromise = getUser()
const configPromise = getConfig()
const user = await userPromise
const [config, data] = await Promise.all([configPromise, getData(user.id)])
```

### Bundle Size & Imports
- **External libraries:** Use barrel imports for consistency (e.g., `lucide-react`).
- **Internal code:** Continue using domain barrel exports per Section 1.
- **Exception (circular-risk hooks):** For hooks that create circular dependencies (e.g. `useEntityActivityLogging`, `useBulkReceiveGoods`), import directly from source: `@/hooks/activities/use-entity-activity-logging`, `@/hooks/suppliers/use-bulk-receive-goods`.
- **Route files must not export named page components.** Use default export or lazy import only.
- Dynamically import heavy or rarely used components.

**Do this:**
```typescript
import { Check } from 'lucide-react'
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging'  // direct import for circular-risk
```

### Re-render Hygiene
- Derive state during render when possible; avoid state + effect loops.
- Prefer functional `setState` updates when new state depends on previous state.
- Avoid `useMemo` for simple primitive expressions.

### Client Storage Safety
- Version localStorage keys and store only minimal data.
- Wrap localStorage access in `try/catch` to avoid private-mode failures.

**Do this:**
```typescript
const VERSION = 'v1'
localStorage.setItem(`prefs:${VERSION}`, JSON.stringify({ theme }))
```

---

## 11. Auth + Performance Checklist

Use this checklist in PR reviews for auth- and perf-sensitive changes:

- [ ] Server functions use `createServerFn` with input validation and correct method.
- [ ] Auth is enforced inside handlers via `withAuth` / `withApiAuth` / `withAnyAuth`.
- [ ] Multi-tenant queries are scoped by `organizationId`.
- [ ] No client code imports server-only modules (postgres, drizzle-orm) or admin Supabase.
- [ ] Async operations are parallelized where independent.
- [ ] Large external libraries use direct imports or dynamic loading.
- [ ] localStorage keys are versioned and error-safe.

---

## 12. React Refresh (Fast Refresh)

Fast Refresh (React Refresh) only works when a file exports **only** React components. Files that export constants, functions, types, or column configs alongside components break Fast Refresh and force full reloads on edit. The `react-refresh/only-export-components` ESLint rule enforces this.

### Rule

A `.tsx` file must export **only** React components for Fast Refresh to work. Exports of constants, functions, types, or column configs in the same file as components will trigger the rule.

### Do This

- **Component files:** Export only components (and their prop types if co-located).
- **Column/config files:** Export column definitions, constants, or config in **separate** files.
- **Context files:** Provider + hook in one file is an allowed exception; use `/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */`.

### File Patterns

| Export Type | File Pattern | Example |
|-------------|--------------|---------|
| Components only | `{feature}.tsx`, `{entity}-list.tsx` | `customer-list.tsx` |
| Column definitions | `*-columns.ts` or `*-column-defs.ts` | `customer-columns.ts` |
| Constants/config | `*-config.ts`, `*-constants.ts` | `customer-status-config.ts` |
| Context (provider + hook) | `*-context.tsx` | `confirmation-context.tsx` (with eslint-disable) |

### Not This

```typescript
// ❌ WRONG: Component + constant in same file
export const STATUS_OPTIONS = ['active', 'inactive'] as const;
export function CustomerList() {
  return <div>...</div>;
}
```

```typescript
// ❌ WRONG: Component + column factory in same file
export function createCustomerColumns(opts) { return [...]; }
export function CustomerTable() {
  return <DataTable columns={createCustomerColumns(opts)} />;
}
```

### Migration Pattern for Column Files

- **If column defs use no JSX:** Move to `*-columns.ts`.
- **If column defs use JSX (cell renderers):** Extract cell components to `*-column-cells.tsx`; keep column factory in `*-columns.ts` importing those components. Alternatively, use `*-columns.tsx` with `eslint-disable` and a brief justification.

### Audit Command

```bash
pnpm exec eslint src --no-error-on-unmatched-pattern 2>&1 | grep "react-refresh/only-export-components"
```

---

## Changelog

- **2026-02-13:**
  - Added Section 12: React Refresh (Fast Refresh) — component-only export rule, file patterns, migration guidance
- **2026-02-12:**
  - Added [BUILD-OPTIMIZATION.md](./docs/standards/BUILD-OPTIMIZATION.md) for build optimization standards
  - Section 8: Route files must not export named page components; tab modules must not mix lazy() and named exports
  - Section 10: Exception for circular-risk hooks (direct import); added reference to BUILD-OPTIMIZATION.md
- **2026-02-05:**
  - Added Supabase Auth + TanStack Start standards section
  - Added React performance standards section (Vercel)
  - Added auth + performance compliance checklist
- **2026-02-04:**
  - Added Money & Currency Units standard (dollars by default, explicit cents only)
  - Added Route Code Splitting Patterns section (Section 9)
  - Documented code splitting thresholds (>100 lines must split)
  - Added naming conventions for route/page files
  - Included tabbed interface lazy loading pattern
- **2026-01-27:** 
  - Documented proper file location pattern (lib vs server/functions)
  - Moved db-using files from `src/lib/` to `src/server/functions/`
    - `src/lib/jobs/oauth-bridge.ts` → `src/server/functions/jobs/oauth-bridge.ts`
    - `src/lib/ai/tools/*.ts` → `src/server/functions/ai/tools/*.ts`
    - `src/lib/ai/approvals/*.ts` → `src/server/functions/ai/approvals/*.ts`
    - `src/lib/ai/context/builder.ts` → `src/server/functions/ai/context/builder.ts`
    - `src/lib/ai/memory/drizzle-provider.ts` → `src/server/functions/ai/memory/drizzle-provider.ts`
    - `src/lib/ai/utils/*.ts` → `src/server/functions/ai/utils/*.ts`
- **2026-01-24:** Initial version created
