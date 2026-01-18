# Ralph Loop: Shared Components Foundation

## Objective
Establish reusable component library using shadcn/ui as base. Provides form fields, data tables, modals, and state display components with consistent patterns for TanStack Form and TanStack Table integration.

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Current State
Read progress.txt to determine current story.
If progress.txt doesn't exist, start with the first story in the PRD.

## Context

### PRD File
- `opc/_Initiation/_prd/1-foundation/shared-components/shared-components-foundation.prd.json`

### Pattern References
- `opc/_Initiation/_prd/1-foundation/patterns/`
- Component patterns from conventions.md

### Tech Stack
- Runtime: Bun
- Framework: TanStack Start
- UI: shadcn/ui + Tailwind CSS
- Forms: TanStack Form + Zod
- Tables: TanStack Table
- State: TanStack Query

## Process
1. Read progress.txt for current story
2. Read PRD for story acceptance criteria
3. Implement acceptance criteria
4. Run: `cd renoz-v3 && bun run typecheck`
5. If pass: Mark story [x] in progress.txt, output completion promise
6. If fail: Debug and fix

## Completion
When ALL stories pass:
<promise>SHARED_COMPONENTS_FOUNDATION_COMPLETE</promise>

## Constraints

### DO
- Use shadcn/ui primitives as base components
- Integrate form fields with TanStack Form's useField hook
- Display Zod validation errors consistently
- Build DataTable with TanStack Table for performance
- Create column presets for common data types (currency, date, status, actions)
- Implement QueryState wrapper for unified loading/error/empty states
- Document component patterns in README files
- Use compound component patterns where appropriate
- Ensure accessibility (ARIA labels, keyboard navigation)
- Target <100ms render time for DataTable with 100 rows

### DO NOT
- Create duplicate form patterns outside TanStack Form
- Skip error state handling in components
- Hardcode styles (use Tailwind CSS classes)
- Skip accessibility requirements
- Create heavy components (performance matters)
- Skip TypeScript prop validation

## If Stuck
- After 3 iterations: Add blocker to progress.txt
- After 5 iterations: Output <promise>STUCK_NEEDS_HELP</promise>
