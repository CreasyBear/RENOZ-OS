# System Patterns

## Domain Standardization
- Each domain owns its Drizzle schema, Zod schemas, server functions, hooks, and UI.
- Barrel exports (`index.ts`) are used throughout for predictable imports.

## Data Fetching
- TanStack Query for all server data, using centralized `queryKeys`.
- Server functions use `createServerFn` + Zod validation + `withAuth`.

## Multi-Tenancy
- All business tables include `organizationId`.
- RLS policies enforce tenant isolation.
- Server queries filter by `organizationId`.
