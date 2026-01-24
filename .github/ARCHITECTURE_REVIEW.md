# Architecture Review Checklist

This checklist should be completed for every pull request that modifies components or data fetching code.

## Quick Check (Run First)

```bash
# Run automated architecture checks
npm run check:architecture

# Run ESLint
npm run lint
```

---

## Data Fetching Layer ✓

- [ ] **No useQuery/useMutation in `src/components/domain/`**
  - Data hooks are only in routes (`src/routes/`) or custom hooks (`src/hooks/`)
  - If a component uses `useQuery`, move it to the route or create a hook

- [ ] **All query keys use centralized `queryKeys.*`**
  - Command to check: `grep -n "queryKey: \[" src/`
  - Should find 0 matches (all should use `queryKeys.x.y()`)
  - Exception: `queryKeys.auth.*` can be defined in auth hooks

- [ ] **Mutations invalidate related caches**
  - Check `onSuccess` callbacks include `queryClient.invalidateQueries()`
  - Correct pattern:
    ```typescript
    useMutation({
      mutationFn: (data) => createCustomer({ data }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
      },
    })
    ```

- [ ] **No manual polling (setInterval/setTimeout)**
  - Command to check: `grep -n "setInterval\|setTimeout" src/components/domain`
  - Should find 0 matches
  - Use `refetchInterval` in `useQuery` instead

- [ ] **No useState + useEffect for data fetching**
  - If there's a `useEffect` with a fetch call, it should use `useQuery` instead
  - `useState` + `useEffect` is only for UI state (modals, tabs, etc.)

---

## Component Organization ✓

- [ ] **Components in correct directory structure**
  - Presenters: `src/components/domain/{feature}/{component}.tsx`
  - Shared: `src/components/shared/{feature}/{component}.tsx`
  - UI primitives: `src/components/ui/{component}.tsx`

- [ ] **No `src/components/domain/*/components/` nesting**
  - Sub-components should be in the same directory or use compound component pattern
  - ❌ `src/components/domain/customers/components/customer-card.tsx`
  - ✅ `src/components/domain/customers/customer-card.tsx`

- [ ] **Data fetching isolated from presenters**
  - If data fetching added, it's in `src/routes/` or `src/hooks/`, not `src/components/`

---

## Type Safety ✓

- [ ] **Callback props have specific types**
  - ❌ `onSave: (data: any) => void`
  - ✅ `onSave: (data: CreateCustomerInput) => Promise<void>`

- [ ] **Entity types imported from schemas**
  - All entity types from `@/lib/schemas/`
  - Avoid generic types, use specific domain types

- [ ] **No missing type imports**
  - Run `npm run typecheck` - should have 0 errors
  - Check for `Cannot find name 'X'` errors

- [ ] **Callback input/output types exported**
  - Export interfaces like `ActivityLogInput`, `QuoteBuilderSaveInput`
  - Makes props self-documenting

---

## Props Pattern ✓

- [ ] **Props are read-only (component perspective)**
  ```typescript
  // ❌ WRONG - components could modify data
  export function CustomerList(props: {
    customers: Customer[];
  }) {}

  // ✅ CORRECT - clear intent
  export function CustomerList({
    customers,
    onRowClick,
    isLoading,
  }: {
    customers: readonly Customer[];
    onRowClick: (id: string) => void;
    isLoading?: boolean;
  }) {}
  ```

- [ ] **Loading/error states passed as props**
  - ❌ Component manages its own `useQuery` state
  - ✅ Route passes `isLoading`, `error` as props

- [ ] **Callbacks are provided by parent**
  - ❌ Component calls `createCustomer()` directly
  - ✅ Route passes `onSave: (data) => Promise<void>`

---

## Testing ✓

- [ ] **Presenters tested with mock data**
  - Test file uses mock props, not API calls
  - Example: `render(<CustomerList customers={mockCustomers} />`

- [ ] **Routes/hooks tested with MSW (Mock Service Worker)**
  - Server responses mocked, not component behavior
  - Tests verify data flows correctly

- [ ] **No TanStack Query internals tested in components**
  - Components don't import `QueryClient` or query state
  - Only test prop handling

---

## Code Quality ✓

- [ ] **No console.log or debugger statements**
  - Remove all debug code before committing

- [ ] **No commented-out code**
  - Use git history instead of comments
  - Exception: TODOs with linked issues

- [ ] **No unused imports or variables**
  - Run `npm run lint` to catch these

- [ ] **No explicit `any` types**
  - Use `unknown` if type is truly unknown
  - Better: Add proper types

- [ ] **No magic numbers or strings**
  - Use named constants or enum
  - Example: `const GST_RATE = 0.1`

---

## Documentation ✓

- [ ] **Components have JSDoc comments**
  - Describe purpose, props, and any constraints
  ```typescript
  /**
   * CustomerList Component
   *
   * Displays paginated customer data with sorting and filtering.
   * All data passed via props from route container.
   *
   * @see src/routes/_authenticated/customers/index.tsx (container)
   */
  export function CustomerList() {}
  ```

- [ ] **Complex logic has inline comments**
  - Explain the "why", not the "what"

- [ ] **No @see links to removed files**
  - Update references if moving files

---

## Specific File Checks ✓

### If modifying `src/lib/query-keys.ts`:
- [ ] New query key follows existing pattern
- [ ] Documentation updated with usage example
- [ ] Tests verify cache invalidation works

### If adding a new route/container:
- [ ] Uses hooks from `src/hooks/` for data
- [ ] Passes data as props to presenters
- [ ] Handles loading and error states
- [ ] No presenter components imported multiple times

### If adding a new presenter component:
- [ ] No imports from `@tanstack/react-query`
- [ ] No imports from `@/server/functions`
- [ ] All data comes via props
- [ ] Includes JSDoc comment

### If adding mutations:
- [ ] Cache invalidation is correct
- [ ] Related queries are invalidated
- [ ] Error handling is present
- [ ] Success/error messages shown to user

---

## Common Issues & Fixes

### Issue: "useQuery is not allowed in presenter components"

**Fix:**
```typescript
// Move to hook
export function useCustomers(filters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => getCustomers({ data: filters }),
  });
}

// Route imports hook
const { data: customers } = useCustomers(filters);

// Component receives data
<CustomerList customers={customers} />
```

### Issue: "Inline query key detected"

**Fix:**
```typescript
// ❌ Before
queryKey: ['customers', 'detail', id]

// ✅ After
queryKey: queryKeys.customers.detail(id)
```

### Issue: "Server functions can't be imported in components"

**Fix:**
```typescript
// Move to route and pass callback
// Route
const { mutate } = useMutation({
  mutationFn: (data) => updateCustomer({ data }),
});

// Component
<CustomerForm onSubmit={mutate} />
```

---

## Questions to Ask

Before approving, ask:

1. **Is data fetching in the right layer?**
   - Routes/hooks for fetching, components for display

2. **Are query keys centralized?**
   - All use `queryKeys.*` from `@/lib/query-keys.ts`

3. **Are callbacks prop-based?**
   - Components don't import server functions

4. **Does it handle loading/error states?**
   - Routes pass these as props

5. **Can this component be tested with mock data?**
   - Yes = good, No = refactor needed

6. **Will cache invalidation work correctly?**
   - Check `onSuccess` callbacks

---

## Approval Requirements

Approve PR only if:
- ✅ All checks passed
- ✅ No architecture violations
- ✅ Types are correct
- ✅ Tests are present
- ✅ Documentation is clear
- ✅ No TanStack Query internals in components

---

## Related Documentation

- **PREVENTION_STRATEGIES.md** - Comprehensive prevention guide
- **CLAUDE.md** - Project architecture overview
- **src/lib/query-keys.ts** - Available query keys
- **src/hooks/** - Example hooks
- **src/routes/** - Example routes

---

## Need Help?

- Unsure about architecture? → Read `PREVENTION_STRATEGIES.md`
- Need example code? → Check similar feature (e.g., customers → orders)
- ESLint errors? → Run `npm run lint` and read the rules in `eslint-architecture-rules.js`
- Type errors? → Run `npm run typecheck` for full TypeScript errors
