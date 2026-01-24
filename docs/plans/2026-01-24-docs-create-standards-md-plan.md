---
title: "Create STANDARDS.md for codebase patterns"
type: docs
date: 2026-01-24
---

# Create STANDARDS.md for Codebase Patterns

## Overview

Create a single authoritative STANDARDS.md document that establishes consistent patterns for barrel exports, component architecture, hook patterns, and file/folder structure across all 17+ domains in the codebase.

## Problem Statement / Motivation

The codebase has grown organically with inconsistent patterns across domains:

- **181 inline query key violations** across 57 files (routes calling `useQuery()` directly)
- **Missing barrel exports** in schema, hook, and component directories
- **Inconsistent component architecture** - some use container/presenter, others don't
- **No documented standards** for new contributors or AI agents to follow
- **Cherry-picked patterns** exist in Communications, Customers, and Inventory but aren't codified

The user is separately addressing 2,227 TypeScript errors from schema changes. This plan focuses on **documenting standards** for incremental adoption.

## Proposed Solution

Create `STANDARDS.md` at the project root with four sections:

1. **Barrel Export Patterns** - How to structure `index.ts` files
2. **Component Architecture** - Container/presenter split with `@source` JSDoc
3. **Hook Patterns** - TanStack Query conventions, mutation invalidation
4. **File/Folder Structure** - Domain organization, naming conventions

Reference CLAUDE.md for cross-linking. Migration happens incrementally as domains are touched.

## Technical Considerations

### Source of Truth Patterns

Extracted from well-structured domains:

**Query Key Factory** (`src/lib/query-keys.ts`):
```typescript
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: CustomerFilters) => [...queryKeys.customers.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
}
```

**Mutation Invalidation** (must invalidate BOTH list AND detail):
```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
},
```

**Container/Presenter with @source**:
```typescript
/**
 * Customer form container - handles data fetching and mutations
 * @source customer data from useCustomers hook
 * @source segments from useCustomerSegments hook
 */
export function CustomerFormContainer({ customerId }: Props) {
  const { data: customer } = useCustomer(customerId);
  return <CustomerFormPresenter customer={customer} />;
}
```

### Critical Anti-Pattern to Document

Routes MUST NEVER directly call `useQuery()` or `useMutation()`:
- Bypasses centralized cache management
- Breaks automatic invalidation patterns
- Currently 181 violations across 57 files

### Detection Commands

Include in STANDARDS.md for self-auditing:
```bash
# Find inline query keys (violations)
grep -r "queryKey: \[" src/routes --include="*.tsx" | wc -l

# Find routes with direct useQuery
grep -r "useQuery(" src/routes --include="*.tsx" | wc -l

# Find missing barrel exports
find src/hooks -type d -exec sh -c 'test ! -f "$1/index.ts" && echo "$1"' _ {} \;
```

## Acceptance Criteria

### Document Structure
- [x] Create `STANDARDS.md` at project root
- [x] Section 1: Barrel Export Patterns with "Do this / Not this" examples
- [x] Section 2: Component Architecture with container/presenter examples
- [x] Section 3: Hook Patterns with TanStack Query conventions
- [x] Section 4: File/Folder Structure with domain conventions
- [x] Domain compliance checklist at end of document

### Content Requirements
- [x] Each section has concrete code examples from the codebase
- [x] "Do this / Not this" comparisons for common mistakes
- [x] Detection commands for auditing violations
- [x] Reference to existing rules in `.claude/rules/hook-architecture.md`

### Integration
- [x] Update CLAUDE.md to reference STANDARDS.md
- [x] Add cross-link from hook-architecture.md rules file

### Validation
- [x] At least one domain migrated as proof of pattern (Products - component barrel export)
- [x] Detection commands produce actionable output

## Success Metrics

- STANDARDS.md exists with all four sections
- New contributors (human or AI) can find authoritative patterns in one place
- Detection commands can audit any domain for compliance
- Incremental migration path is clear (fix as you touch)

## Dependencies & Risks

**Dependencies:**
- None - this is documentation work

**Risks:**
- **Low**: Standards may need iteration after real-world use
- **Mitigation**: Start with one domain migration to validate patterns

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-01-24-codebase-standardization-brainstorm.md`
- Existing rules: `.claude/rules/hook-architecture.md`
- Query keys: `src/lib/query-keys.ts`
- Reference patterns: Communications, Customers, Inventory domains

### Documented Learnings
- `docs/solutions/architecture/container-presenter-standardization.md`
- 181 inline query key violations documented
- Routes must never call useQuery directly

### User Flows Considered
1. New developer onboarding - needs single reference
2. Existing developer adding features - needs "do this" examples
3. Code review - needs compliance checklist
4. AI agent (Claude) - needs authoritative patterns
5. Migration work - needs detection commands
6. Tech lead audit - needs compliance metrics

## MVP Implementation

### STANDARDS.md

```markdown
# Codebase Standards

This document establishes authoritative patterns for the Renoz v3 codebase.

## 1. Barrel Export Patterns

### Schema Exports (`src/lib/schemas/{domain}/index.ts`)

✅ **Do this:**
```typescript
// --- Core Types ---
export * from './customer'
export * from './customer-filters'

// --- Form Schemas ---
export * from './customer-form'

// --- Re-export key types for convenience ---
export type { CustomerInput, CustomerOutput } from './customer'
```

❌ **Not this:**
```typescript
export * from './customer'
export * from './filters'  // Missing domain prefix
// No section comments
// No type re-exports
```

### Hook Exports (`src/hooks/{domain}/index.ts`)

✅ **Do this:**
```typescript
// --- CRUD Operations ---
export { useCustomers } from './use-customers'
export { useCustomer } from './use-customer'
export { useCreateCustomer } from './use-create-customer'

// --- Analytics ---
export { useCustomerMetrics } from './use-customer-metrics'

// --- Types ---
export type { CustomerFilters } from './types'
```

## 2. Component Architecture

### Container/Presenter Pattern

Containers handle data; presenters handle UI.

✅ **Do this:**
```typescript
/**
 * Customer list container
 * @source customers from useCustomers hook
 */
export function CustomerListContainer({ filters }: Props) {
  const { data, isLoading, error } = useCustomers(filters);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return <CustomerListPresenter customers={data} />;
}

// Pure UI component - no hooks
export function CustomerListPresenter({ customers }: { customers: Customer[] }) {
  return (
    <ul>
      {customers.map(c => <li key={c.id}>{c.name}</li>)}
    </ul>
  );
}
```

## 3. Hook Patterns

### TanStack Query Conventions

**CRITICAL**: Always use centralized query keys from `@/lib/query-keys.ts`

✅ **Do this:**
```typescript
import { queryKeys } from '@/lib/query-keys';

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => getCustomers({ data: filters }),
    staleTime: 30 * 1000,
    enabled: true,
  });
}
```

❌ **Never this:**
```typescript
// NEVER define local query keys
const keys = { customers: ['customers'] };

// NEVER call useQuery in routes
export const Route = createFileRoute('/_authenticated/customers')({
  component: () => {
    const { data } = useQuery({ queryKey: ['customers'] }); // WRONG
  }
});
```

### Mutation Invalidation

Always invalidate BOTH list AND detail views:

```typescript
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateCustomer({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
    },
  });
}
```

## 4. File/Folder Structure

### Domain Organization

```
src/
├── components/domain/{domain}/   # UI components
├── hooks/{domain}/               # React hooks
├── lib/schemas/{domain}/         # Zod schemas
├── server/functions/{domain}/    # Server functions
└── routes/_authenticated/{domain}/ # Route files
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Schema | `{entity}.ts` | `customer.ts` |
| Hook | `use-{entity}.ts` | `use-customer.ts` |
| Component | `{entity}-{variant}.tsx` | `customer-form.tsx` |
| Server fn | `{operation}.ts` | `get-customers.ts` |

## Compliance Checklist

For each domain, verify:

- [ ] `index.ts` barrel export exists with section comments
- [ ] Hooks use `queryKeys` from centralized file
- [ ] Mutations invalidate list AND detail caches
- [ ] Components follow container/presenter split
- [ ] Routes don't call `useQuery()` directly

### Audit Commands

```bash
# Count inline query key violations
grep -r "queryKey: \[" src/routes --include="*.tsx" | wc -l

# Find routes with direct useQuery
grep -r "useQuery(" src/routes --include="*.tsx" | wc -l

# List domains missing barrel exports
find src/hooks -type d -exec sh -c 'test ! -f "$1/index.ts" && echo "$1"' _ {} \;
```
```

### CLAUDE.md Update

Add reference to new standards:
```markdown
## Standards Reference

See [STANDARDS.md](./STANDARDS.md) for authoritative patterns on:
- Barrel exports
- Component architecture
- Hook patterns
- File/folder structure
```
