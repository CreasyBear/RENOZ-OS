# Codebase Standardization Brainstorm

**Date:** 2026-01-24
**Status:** Ready for Planning

## What We're Building

A comprehensive **STANDARDS.md** document that establishes authoritative patterns for:

1. **Barrel Exports** - How schemas, hooks, and components are exported from index.ts files
2. **Component Architecture** - Container/presenter split, prop documentation, error boundaries
3. **Hook Patterns** - TanStack Query usage, mutation invalidation, loading/error states
4. **File/Folder Structure** - Domain organization, naming conventions, where things live

The document will be the single source of truth, referenced from CLAUDE.md, with migration happening incrementally as domains are touched.

## Why This Approach

### Context
- Codebase has 17+ domains with inconsistent patterns
- Financial and Jobs domains are **actively used in production**
- 2,227 TypeScript errors exist (being addressed separately via schema fixes)
- Best practices exist but are scattered across Communications, Customers, and Inventory domains

### Decision Rationale
- **Single doc over modular:** Easier to maintain one authoritative reference than coordinate multiple files
- **Document over codify:** ESLint rules add maintenance overhead; documentation with examples is sufficient for incremental adoption
- **Incremental migration:** Avoids big-bang refactoring risk; domains get fixed as they're touched

### Reference Domains
The standard will cherry-pick best practices from:
- **Communications:** Container/presenter separation, `@source` JSDoc annotations
- **Customers:** Comprehensive hooks with proper TanStack Query patterns
- **Inventory:** Realtime subscriptions, alert patterns

## Key Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Scope | All four areas (exports, components, hooks, structure) | Comprehensive standard prevents piecemeal inconsistency |
| Format | Single STANDARDS.md | One source of truth, easy to reference |
| Enforcement | Documentation + CLAUDE.md reference | Automated rules add overhead; trust developers |
| Migration | Incremental (as domains are touched) | Avoids big-bang risk, allows learning |
| Examples | "Do this / Not this" comparisons | Concrete guidance beats abstract principles |

## Patterns to Document

### 1. Barrel Export Pattern

**Schema exports (`src/lib/schemas/index.ts`):**
```typescript
// Domain barrel export pattern
export * from './customers'
export * from './orders'
export type { CustomerInput, CustomerOutput } from './customers'
```

**Hook exports (`src/hooks/index.ts`):**
```typescript
// Re-export from domain folders
export * from './customers'
export * from './orders'
// Include query key factories
export { customerKeys } from './customers/keys'
```

### 2. Component Architecture

**Container/Presenter split:**
- Container: Data fetching, mutations, business logic
- Presenter: Pure UI, receives data via props
- Document data source with `@source` JSDoc

**Error boundaries:**
- Each domain route has error boundary
- Fallback UI pattern

### 3. Hook Patterns

**TanStack Query conventions:**
- Use `queryKeys` from centralized file
- Always invalidate related queries on mutation success
- Use `enabled` to prevent unnecessary requests
- Set appropriate `staleTime`

**Loading/error states:**
- Return `{ data, isLoading, error }` pattern
- Handle optimistic updates consistently

### 4. Folder Structure

```
src/
├── components/domain/{domain}/     # Domain components
├── hooks/{domain}/                 # Domain hooks
├── lib/schemas/{domain}/           # Domain schemas
├── server/functions/{domain}/      # Domain server functions
└── routes/_authenticated/{domain}/ # Domain routes
```

**Naming conventions:**
- Schemas: `{entity}.ts` (e.g., `customer.ts`)
- Hooks: `use-{entity}.ts` or `use-{action}.ts`
- Components: `{entity}-{variant}.tsx` (e.g., `customer-form.tsx`)

## Open Questions

1. **Drizzle schema organization** - Should this follow the same pattern as lib/schemas, or stay separate?
2. **Shared components** - When does a component move from domain to shared?
3. **Feature flags** - How should incomplete features be gated?

## Success Criteria

- [ ] STANDARDS.md exists with all four sections
- [ ] Each section has concrete code examples
- [ ] "Do this / Not this" comparisons for common mistakes
- [ ] Domain compliance checklist
- [ ] CLAUDE.md references STANDARDS.md
- [ ] At least one domain migrated as proof of pattern

## Next Steps

1. Run `/workflows:plan` to create implementation plan
2. Write STANDARDS.md with patterns from reference domains
3. Update CLAUDE.md to reference standards
4. Migrate one domain (suggest: Orders) as validation
