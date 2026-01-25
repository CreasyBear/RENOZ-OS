# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Renoz v3 is a multi-tenant CRM application for renovation/construction businesses built with TanStack Start (React 19), Drizzle ORM, and Supabase.

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Type checking & linting
npm run typecheck        # TypeScript check (tsc --noEmit)
npm run lint             # ESLint on src/
npm run format           # Prettier format

# Database (Drizzle)
npm run db:generate      # Generate migrations from schema changes
npm run db:push          # Push schema to dev database (no migration file)
npm run db:migrate       # Run migrations (production)
npm run db:studio        # Open Drizzle Studio GUI

# Testing
bun test                 # Run all tests
bun test tests/unit      # Unit tests only
npm run test:vitest      # Vitest run mode
```

## Architecture

### Tech Stack
- **Framework**: TanStack Start (file-based routing, SSR)
- **UI**: React 19, shadcn/ui (Radix), Tailwind CSS 4
- **State**: TanStack Query (server), Zustand (UI)
- **Database**: PostgreSQL via Supabase, Drizzle ORM
- **Auth**: Supabase Auth with SSR
- **Background Jobs**: Trigger.dev
- **Validation**: Zod

### Directory Structure
```
src/
├── routes/              # File-based routes (TanStack Router)
│   ├── _authenticated/  # Protected route layouts
│   └── api/             # API endpoints
├── server/functions/    # Server functions by domain
│   ├── customers/
│   ├── orders/
│   ├── jobs/
│   └── ...
├── hooks/               # React hooks by domain
│   ├── customers/
│   ├── orders/
│   └── ...
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── domain/          # Feature-specific components
│   └── shared/          # Reusable components
├── lib/
│   ├── query-keys.ts    # Centralized TanStack Query keys
│   ├── schemas/         # Zod schemas by domain
│   └── db/              # Database utilities
└── trigger/jobs/        # Background job definitions

drizzle/
├── schema/              # Database schema definitions
└── migrations/          # Generated SQL migrations
```

### Data Fetching Rules (Critical)

**ALWAYS use TanStack Query for server data. NEVER use useState + useEffect for fetching.**

```typescript
// ✅ CORRECT
import { queryKeys } from '@/lib/query-keys';

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => getCustomers({ data: filters }),
  });
}

// ❌ WRONG - Never do this
const [data, setData] = useState([]);
useEffect(() => {
  fetchCustomers().then(setData);
}, []);
```

**Query Keys**: Always use centralized keys from `@/lib/query-keys.ts`. Never define local query keys.

**Mutations**: Always invalidate related caches:
```typescript
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createCustomer({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}
```

**Polling**: Use `refetchInterval`, never `setInterval`.

### Server Function Pattern

Server functions use `createServerFn` with Zod validation and auth middleware:

```typescript
import { createServerFn } from '@tanstack/react-start';
import { withAuth } from '@/lib/server/protected';

export const getCustomers = createServerFn({ method: 'GET' })
  .inputValidator(customerListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.customer.read });

    // Always filter by organizationId for multi-tenant isolation
    const conditions = [
      eq(customers.organizationId, ctx.organizationId),
      sql`${customers.deletedAt} IS NULL`,
    ];
    // ... query logic
  });
```

### Database Conventions

- **Casing**: snake_case for all tables and columns
- **Soft deletes**: Use `deletedAt` column, filter with `deletedAt IS NULL`
- **Multi-tenant**: Always filter by `organizationId`
- **Currency**: Use `numeric(12,2)`, never float
- **Pagination**: Prefer cursor-based (createdAt + id composite)

### Path Aliases

- `@/` → `src/`
- `~/` → `src/`
- `drizzle/` → `drizzle/`

## Key Patterns

### Forms
Use TanStack Form with Zod adapter:
```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';

const form = useForm({
  defaultValues: { name: '' },
  validatorAdapter: zodValidator(),
  validators: {
    onChange: createCustomerSchema,
  },
});
```

### Real-time Updates
Use Supabase Realtime subscriptions that invalidate TanStack Query caches:
```typescript
useEffect(() => {
  const channel = supabase.channel('orders');
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  });
  return () => { channel.unsubscribe(); };
}, []);
```

### UI State
Use Zustand for global UI state, useState for local component state. Never mix UI state with data fetching hooks.

### Route Patterns
All authenticated routes must use `PageLayout` with appropriate variant and include error/loading handling:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';

export const Route = createFileRoute('/_authenticated/domain/')({
  component: DomainPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/domain" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});
```

See [docs/ui-patterns.md](./docs/ui-patterns.md) for:
- Layout variant selection (full-width, container, narrow, with-panel)
- Detail view patterns (Sheet vs full page)
- Bulk actions with `BulkActionsBar` and `useSelection`
- Navigation patterns (never use window.location.href)

Use [docs/templates/route-template.tsx](./docs/templates/route-template.tsx) as a starting point for new routes.

## Standards Reference

See [STANDARDS.md](./STANDARDS.md) for authoritative patterns on:
- Barrel exports (index.ts structure)
- Component architecture (container/presenter pattern)
- Hook patterns (TanStack Query conventions)
- File/folder structure (domain organization)

The STANDARDS.md document includes a compliance checklist and audit commands for verifying domain adherence.
