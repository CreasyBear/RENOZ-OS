# Ralph Loop: AppShell Foundation

## Objective
Implement layout system, routing, and navigation for renoz-v3. Provides AppShell component with sidebar navigation, header, breadcrumbs, command palette, and PageLayout patterns for consistent page structure.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine current story.
If progress.txt doesn't exist, start with the first story in the PRD.

## Context

### PRD File
- `opc/_Initiation/_prd/1-foundation/appshell/appshell-foundation.prd.json`

### Pattern References
- `opc/_Initiation/_prd/1-foundation/patterns/`
- `opc/_Initiation/_ralph/backend-patterns/realtime-patterns.md`
- `opc/_Initiation/_ralph/backend-patterns/ai-sdk-patterns.md`

### Tech Stack
- Runtime: Bun
- Framework: TanStack Start
- Router: TanStack Router (file-based)
- UI: shadcn/ui + Tailwind CSS
- State: TanStack Query
- Realtime: Supabase Realtime

## Process
1. Read progress.txt for current story
2. Read PRD for story acceptance criteria
3. Implement acceptance criteria
4. Run: `cd renoz-v3 && bun run typecheck`
5. If pass: Mark story [x] in progress.txt, output completion promise
6. If fail: Debug and fix

## Completion
When ALL stories pass:
<promise>APPSHELL_FOUNDATION_COMPLETE</promise>

## Constraints

### DO
- Use TanStack Router file-based routing conventions
- Use _authenticated layout route for protected pages
- Implement sidebar with 3 collapse modes (offcanvas, icon, none)
- Persist sidebar state in cookies (7 days)
- Use ROUTE_METADATA for navigation items (single source of truth)
- Implement keyboard shortcuts (Cmd+K palette, Cmd+B sidebar toggle)
- Use shadcn/ui Sidebar component patterns
- Implement responsive design (Sheet drawer on mobile < 768px)
- Filter nav items by user permissions
- Integrate realtime subscriptions with TanStack Query

### DO NOT
- Hardcode navigation items in multiple places
- Skip keyboard accessibility (ARIA labels, focus management)
- Skip mobile responsive layouts
- Allow unauthorized users to see restricted nav items
- Skip error boundaries and loading states

## If Stuck
- After 3 iterations: Add blocker to progress.txt
- After 5 iterations: Output <promise>STUCK_NEEDS_HELP</promise>
