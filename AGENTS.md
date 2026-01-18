# Renoz v3 - CRM Application

> Multi-tenant CRM built with TanStack Start, Drizzle ORM, and Supabase

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | TanStack Start (file-based routing, SSR) |
| **Runtime** | Bun |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | Drizzle ORM |
| **Auth** | Supabase Auth |
| **Validation** | Zod |
| **UI** | React + Tailwind CSS + shadcn/ui |
| **State** | TanStack Query (server state) |

## Directory Structure

```
renoz-v3/
├── src/
│   ├── routes/          # TanStack Start file-based routes
│   │   ├── __root.tsx   # Root layout (providers, shell)
│   │   ├── index.tsx    # Home page
│   │   └── _authed/     # Protected routes (require auth)
│   ├── components/      # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── ...          # Feature components
│   ├── lib/
│   │   ├── db/          # Database client configuration
│   │   └── schemas/     # Zod validation schemas
│   └── server/          # TanStack Start server functions
├── drizzle/
│   ├── schema/          # Drizzle table definitions
│   │   ├── index.ts     # Schema barrel export
│   │   ├── patterns.ts  # Reusable column helpers
│   │   └── *.ts         # Individual table schemas
│   └── migrations/      # Generated SQL migrations
├── public/              # Static assets
└── tests/               # Test files
    └── unit/
        └── schemas/     # Schema unit tests
```

## Key Patterns

### Multi-Tenancy
- All business tables include `organizationId` column
- RLS policies enforce tenant isolation
- Queries always filter by organization context

### Database
- Drizzle uses `casing: 'snake_case'` for PostgreSQL
- Supabase connection pooler: `{ prepare: false }`
- Currency columns: `numericCasted(12,2)` (not float)
- Cursor pagination for list queries

### Server Functions
- Located in `src/server/*.ts`
- Use `createServerFn` from TanStack Start
- Validate with Zod schemas
- Return typed responses

### Validation
- Zod schemas in `src/lib/schemas/`
- Naming: `Create*Schema`, `Update*Schema`, `*ParamsSchema`
- Integration with TanStack Form

## Commands

```bash
# Development
bun run dev          # Start dev server

# Type checking
bun run typecheck    # Run TypeScript check

# Database
bun run db:generate  # Generate migrations from schema changes
bun run db:push      # Push schema to dev database
bun run db:migrate   # Run migrations (production)
bun run db:studio    # Open Drizzle Studio

# Testing
bun run test         # Run all tests
bun run test:unit    # Run unit tests

# Build
bun run build        # Production build
```

## Environment Variables

Required variables (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://...?sslmode=require  # Supabase pooler (port 6543)

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional (added by PRDs)
STRIPE_SECRET_KEY=sk_...        # Payment Processing
ANTHROPIC_API_KEY=sk-ant-...    # AI Infrastructure
SENTRY_DSN=https://...          # Error Tracking
```

## PRD Execution

This codebase is built via Ralph Loop execution of PRDs.

### Current Phase: Foundation
Progress tracked in: `opc/_Initiation/_prd/1-foundation/progress.txt`

### Execution Order
1. FOUND-SCHEMA - Database schemas and patterns
2. FOUND-AUTH - Authentication setup
3. FOUND-SHARED - UI component library
4. FOUND-APPSHELL - Application shell/layout

### Running a PRD

```bash
cd renoz-v3
claude --prompt-file ../opc/_Initiation/_prd/1-foundation/schema/PROMPT.md
```

## Conventions

### File Naming
- Components: `PascalCase.tsx`
- Routes: `kebab-case.tsx` or `index.tsx`
- Server functions: `camelCase.ts`
- Schemas: `kebab-case.ts`

### Code Style
- Prefer named exports
- Use `type` imports for type-only imports
- Async functions with error handling
- JSDoc for public APIs

### Testing
- Unit tests: `tests/unit/**/*.spec.ts`
- Integration tests: `tests/integration/**/*.spec.ts`
- Use Bun test runner

---

*This file is automatically read by Claude Code for context. Keep it updated as the codebase evolves.*
