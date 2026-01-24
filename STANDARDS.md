# Codebase Standards

This document establishes authoritative patterns for the Renoz v3 codebase. It is the single source of truth for barrel exports, component architecture, hook patterns, and file/folder structure.

**Last updated:** 2026-01-24

**Related:**
- [CLAUDE.md](./CLAUDE.md) - Project overview and commands
- [.claude/rules/hook-architecture.md](./.claude/rules/hook-architecture.md) - Detailed hook rules

---

## Table of Contents

1. [Barrel Export Patterns](#1-barrel-export-patterns)
2. [Component Architecture](#2-component-architecture)
3. [Hook Patterns](#3-hook-patterns)
4. [File/Folder Structure](#4-filefolder-structure)
5. [Compliance Checklist](#compliance-checklist)
6. [Audit Commands](#audit-commands)

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

## 4. File/Folder Structure

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

## Compliance Checklist

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

---

## Audit Commands

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
```

### Interpreting Results

- **0 inline query keys in routes** = compliant
- **0 direct useQuery in routes** = compliant
- **No directories listed** for missing barrel exports = compliant

### Migration Priority

When cleaning up violations:

1. **HIGH:** Routes with inline query keys (breaks cache coherence)
2. **HIGH:** Routes with direct useQuery/useMutation (bypasses centralized management)
3. **MEDIUM:** Missing barrel exports (reduces discoverability)
4. **LOW:** Missing section comments (cosmetic)

---

## Changelog

- **2026-01-24:** Initial version created
