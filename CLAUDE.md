---
description:
alwaysApply: true
---

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

# Pre-deploy (typecheck + lint + test + build)
npm run predeploy
```

**Deployment**: Run `npm run predeploy` before pushing to catch typecheck/lint/test/build failures locally and avoid wasted CI build time.

## React Grab (UI to Code)

React Grab is installed for local dev and is loaded only in `import.meta.env.DEV`.

Usage:
- Hover any UI element in the browser.
- Press `Cmd+C` (Mac) or `Ctrl+C` (Windows/Linux).
- Paste into your coding agent; it includes component + file path + HTML snippet.

If you just installed it, restart the dev server and refresh the browser.

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
│   └── api/             # API endpoints (use createFileRoute with server.handlers)
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

### Route Search Schemas

- Define route search schemas in `src/lib/schemas/` (not inline in route files).

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
- **Soft deletes**: Use `deletedAt` column, filter with `isNull(table.deletedAt)` on every read query
- **Multi-tenant**: Always filter by `organizationId` — including on joined tables (addresses, contacts, images, etc.)
- **Currency**: Use `numeric(12,2)`, never float
- **Pagination**: Prefer cursor-based (createdAt + id composite). Always enforce a LIMIT.

### Drizzle ORM Rules (Server Functions)

**Transactions**: Wrap multi-step mutations in `db.transaction()`. If you insert/update more than one table, use a transaction. Check affected row count on updates/deletes via `.returning()`.

```typescript
// ✅ CORRECT — atomic multi-step mutation
const result = await db.transaction(async (tx) => {
  const [item] = await tx.insert(lineItems).values({...}).returning();
  await recalculateTotals(tx, orderId);
  return item;
});

// ❌ WRONG — non-atomic, partial failure leaves inconsistent state
const [item] = await db.insert(lineItems).values({...}).returning();
await recalculateTotals(db, orderId); // if this fails, totals are stale
```

**RLS in transactions**: Tables with `standardRlsPolicies` require `app.organization_id` for INSERT/UPDATE. `withAuth` sets it on one connection, but `db.transaction` may use a different pooled connection. Always set RLS context inside the transaction before writes:

```typescript
const result = await db.transaction(async (tx) => {
  await tx.execute(sql`SELECT set_config('app.organization_id', ${ctx.organizationId}, false)`);
  return tx.insert(myTable).values({...}).returning();
});
```

**No N+1 queries**: Never query inside a loop. Batch-fetch with `inArray()`, then group in JS.

```typescript
// ✅ CORRECT — single query, group in JS
const allItems = await db.select().from(shipmentItems)
  .where(inArray(shipmentItems.shipmentId, shipmentIds));
const byShipment = Map.groupBy(allItems, (i) => i.shipmentId);

// ❌ WRONG — N+1
for (const shipment of shipments) {
  const items = await db.select().from(shipmentItems)
    .where(eq(shipmentItems.shipmentId, shipment.id));
}
```

**Aggregate in SQL, not JS**: Use `SUM`, `COUNT`, `GROUP BY`, `CASE WHEN` instead of fetching all rows and calculating in a loop. Use `sql` template tag for window functions when Drizzle's query builder can't express the operation.

**Race conditions**: For check-then-act patterns (e.g., "is this name unique? then insert"), wrap in a transaction. For counter increments or sequence generation, use `.for('update')` row locks or database sequences.

**Raw SQL**: Acceptable only when Drizzle can't express the operation (CTEs with window functions, pg_trgm operators, dynamic CASE WHEN). Always use the `sql` template tag — never string concatenation. Document the reason with a comment.

**organizationId on joins**: When joining related tables (addresses, contacts, images, product attributes), add `eq(joinedTable.organizationId, ctx.organizationId)` to the join condition. Don't rely on the parent row's org scoping alone.

**Soft-delete on joins**: When joining a table that has `softDeleteColumn`, add `isNull(joinedTable.deletedAt)` to the join condition.

**Unbounded queries**: Every list/search query must have a `LIMIT`. Dashboard aggregations over historical data should have a date floor (e.g., last 2 years).

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

**Form error display (submit-time validation):** TanStack Form forms must use FormDialog/FormSheet (which provide FormFieldDisplayProvider) OR wrap form content with FormFieldDisplayProvider. Never add onSubmitInvalid without the provider — it creates "fix the errors below" with no visible field errors. Pass onSubmitInvalid (e.g. toast) for user feedback when validation fails.

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

### Separation of Concerns (Presenter/Container)
- Presenter components must be pure UI: no data fetching hooks or server calls.
- Data fetching belongs in hooks + container/route components that pass data via props.

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

See [SCHEMA-TRACE.md](./SCHEMA-TRACE.md) for schema boundary patterns and [STANDARDS.md](./STANDARDS.md) for authoritative patterns on:
- Barrel exports (index.ts structure)
- Component architecture (container/presenter pattern)
- Hook patterns (TanStack Query conventions)
- File/folder structure (domain organization)

The STANDARDS.md document includes a compliance checklist and audit commands for verifying domain adherence.

## Workflow

See [.claude/WORKFLOW.md](./.claude/WORKFLOW.md) for the development workflow using everything-claude-code.

Key commands:
- `/plan` - Before starting non-trivial features
- `/tdd` - Test-driven implementation
- `/verify` - Before claiming work complete
- `/code-review` - After implementation

## Corrections Log

- **Predeploy before push**: To minimize build time, run `npm run predeploy` before committing/pushing. This catches typecheck, lint, test, and build failures locally so CI does not waste time on broken builds.
- When a user selection list is empty, provide an "Invite user" action that links to `/admin/users/invite`.
- Financial amounts are stored in AUD dollars (numeric 12,2); do not treat them as cents or scale payment/Xero values.
- **No temporary shortcuts**: Always implement the proper solution. Eliminate technical debt immediately rather than deferring it. Never create TODO comments or temporary workarounds that will need to be fixed later.
- **Typecheck fixes must follow SCHEMA-TRACE.md and STANDARDS.md**: When fixing TypeScript errors, do NOT use type assertions (`as X`, `as unknown as X`), `params: {} as never`, or ad-hoc `?? null`/`?? undefined` scattered in views. Fix at boundaries: (1) schema types in `lib/schemas/`, (2) server fn return types, (3) normalize at a single boundary per SCHEMA-TRACE §8. Use proper route types instead of `as never`. See [docs/remediation/typecheck-phase3-debt.md](./docs/remediation/typecheck-phase3-debt.md) for remediation patterns.
- **No unused props**: When adding props to a component, ensure they are used. Do not add props "for future use" or as placeholders. Remove dead props during implementation.
- **Do not name files after external products**: Use generic, descriptive names (e.g. `document-constants.ts`, `document-fixed-header.tsx`) rather than product names (e.g. `midday-constants.ts`). Same for exported identifiers: prefer `DOCUMENT_*`, `DocumentFixedHeader` over `MIDDAY_*`, `MiddayFixedHeader`.