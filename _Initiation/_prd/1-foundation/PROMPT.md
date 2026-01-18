# Ralph Loop: Foundation Phase

## Objective

Build the foundational infrastructure for renoz-v3: authentication system, app shell layout, shared components library, and database schema patterns. This creates the stable base for all domain implementations.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State

Read progress.txt to determine the current story.
If progress.txt doesn't exist, start with FOUND-AUTH-001.

## Context

### PRD Files (in execution order)

1. `opc/_Initiation/_prd/1-foundation/auth/auth-foundation.prd.json` - Authentication, roles, permissions
2. `opc/_Initiation/_prd/1-foundation/schema/schema-foundation.prd.json` - Database patterns and docs
3. `opc/_Initiation/_prd/1-foundation/shared-components/shared-components-foundation.prd.json` - UI component library
4. `opc/_Initiation/_prd/1-foundation/appshell/appshell-foundation.prd.json` - Layout and navigation

### Reference Files

- Project root: `/Users/joelchan/Documents/Coding/App-Dev/live/renoz-crm-tanstack/renoz-v3/`
- Stack: TanStack Start + Bun + React 19 + Supabase + Drizzle ORM + shadcn/ui

### Tech Stack

- **Runtime**: Bun
- **Framework**: TanStack Start (file-router)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **AI**: Vercel AI SDK + Anthropic

## Process

1. **Read progress.txt** to find current story
2. **Read the PRD** for story acceptance criteria
3. **Implement the acceptance criteria** completely
4. **Run verification**:

   ```bash
   cd renoz-v3 && bun run typecheck && bun run test
   ```

5. **If all criteria pass**:
   - Mark story `[x]` in progress.txt
   - Output `<promise>STORY_ID_COMPLETE</promise>`
   - Move to next story
6. **If criteria fail**:
   - Debug and fix
   - Stay on current story (max 3 iterations per fix attempt)

## Story Execution Order

### Phase 1: Authentication (FOUND-AUTH)

Execute stories in priority order from auth-foundation.prd.json:

- FOUND-AUTH-001: Supabase Auth configuration
- FOUND-AUTH-002: Users table with roles
- FOUND-AUTH-003: Permission matrix
- FOUND-AUTH-004: Protected routes
- FOUND-AUTH-005: Protected server functions
- FOUND-AUTH-006: Role-based UI guard
- FOUND-AUTH-007a/b/c: API tokens
- FOUND-AUTH-008: Integration tests
- FOUND-AUTH-009: Documentation

### Phase 2: Schema Foundation (FOUND-SCHEMA)

Execute stories from schema-foundation.prd.json:

- FOUND-SCHEMA-001: Schema README
- FOUND-SCHEMA-002: Zod schemas README
- FOUND-SCHEMA-003: Notifications enhancement
- FOUND-SCHEMA-004: Email history enhancement
- FOUND-SCHEMA-005: Reusable patterns module
- FOUND-SCHEMA-006: Core entity schemas (customers, orders, products)
- FOUND-SCHEMA-007: Pipeline and inventory schemas
- FOUND-SCHEMA-008: Users and organizations schemas

### Phase 3: Shared Components (FOUND-SHARED)

Execute stories from shared-components-foundation.prd.json:

- FOUND-SHARED-001: Initialize shadcn/ui
- FOUND-SHARED-002: Form components
- FOUND-SHARED-003: DataTable
- FOUND-SHARED-004: Column presets
- FOUND-SHARED-005: Modals
- FOUND-SHARED-006: State displays
- FOUND-SHARED-007: Entity components
- FOUND-SHARED-008: Status badge
- FOUND-SHARED-009: Barrel exports
- FOUND-SHARED-010: Components README

### Phase 4: App Shell (FOUND-APPSHELL)

Execute stories from appshell-foundation.prd.json:

- FOUND-APPSHELL-001: Root layout with auth guard
- FOUND-APPSHELL-002: Authenticated layout route
- FOUND-APPSHELL-003: AppShell component
- FOUND-APPSHELL-004: Sidebar navigation
- FOUND-APPSHELL-005: Header component
- FOUND-APPSHELL-006: PageLayout component
- FOUND-APPSHELL-007: Route configuration
- FOUND-APPSHELL-008: Command palette
- FOUND-APPSHELL-009: Dashboard route
- FOUND-APPSHELL-010: Layout README

## Completion

When ALL foundation stories pass:

```xml
<promise>FOUNDATION_PHASE_COMPLETE</promise>
```

## Constraints

### DO

- Follow TanStack Start file-router conventions
- Use `src/` directory structure (NOT `app/`)
- Create Drizzle migrations for schema changes
- Use Zod for all validation schemas
- Follow shadcn/ui patterns for components
- Write TypeScript with strict types
- Run `bun run typecheck` after each story

### DO NOT

- Modify files outside foundation scope
- Skip acceptance criteria
- Use client-side auth checks alone (always server-side first)
- Create components that duplicate shadcn/ui primitives
- Hardcode configuration values

## File Structure

```
renoz-v3/
├── src/
│   ├── routes/
│   │   ├── __root.tsx                 # Root layout
│   │   ├── _authed.tsx                # Authenticated layout wrapper
│   │   └── _authed/                   # Protected routes
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives
│   │   ├── shared/                    # Custom shared components
│   │   └── layout/                    # Shell components
│   └── lib/
│       ├── supabase/                  # Supabase clients
│       ├── auth/                      # Auth utilities
│       ├── server/                    # Server functions
│       └── schemas/                   # Zod schemas
├── drizzle/
│   └── schema/                        # Drizzle table definitions
└── tests/
    └── integration/                   # Integration tests
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
- Common blockers:
  - TypeScript type inference issues → Check Drizzle $inferSelect patterns
  - Supabase RLS conflicts → Verify policy SQL syntax
  - Import errors → Check TanStack Start path aliases

## Progress Template

```markdown
# Foundation Phase Progress
# Started: [DATE]
# Updated: [DATE]

## Stories
- [ ] FOUND-AUTH-001: Supabase Auth Configuration
- [ ] FOUND-AUTH-002: Users Table with Roles
...

## Current Story
[STORY-ID]: [Story Name]

## Iteration Count
Total: 0
Current Story: 0

## Blockers
None

## Notes
- [Story notes and learnings]
```

---

**Document Version:** 1.0
**Created:** 2026-01-10
**Target:** renoz-v3 Foundation Phase
