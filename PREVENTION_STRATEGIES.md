# Container/Presenter Architecture Prevention Strategies

This document provides comprehensive strategies to prevent violations of the container/presenter pattern, including code review checklists, grep commands for automated detection, ESLint rule suggestions, and testing guidance.

## Problem Statement

The container/presenter pattern enforces:
- **Containers** (routes, hooks): Manage data fetching with TanStack Query
- **Presenters** (components): Display data via props only

Common violations to prevent:
1. Data hooks (useQuery/useMutation) in presenter components
2. Inline query keys instead of centralized `queryKeys.*`
3. Components placed in wrong directory structure
4. Missing type imports causing build failures
5. Manual state management instead of TanStack Query
6. Inline server function calls in components

---

## 1. Code Review Checklist

### For All Pull Requests

Use this checklist when reviewing code changes:

#### A. Data Fetching Layer
- [ ] **No useQuery/useMutation in src/components/domain/** - Data hooks only in routes/hooks
- [ ] **Query keys are centralized** - Uses `queryKeys.*` from `@/lib/query-keys.ts`
- [ ] **No inline query keys** - Pattern `['entity', 'detail', id]` should fail
- [ ] **Mutations invalidate caches** - onSuccess calls `queryClient.invalidateQueries`
- [ ] **No setInterval/setTimeout polling** - Uses `refetchInterval` option
- [ ] **No useState + useEffect for fetching** - TanStack Query used exclusively
- [ ] **Server functions are imported correctly** - From `@/server/functions/*`

#### B. Component Organization
- [ ] **Domain components in correct directory** - `src/components/domain/{domain}/{feature}`
- [ ] **Presenter components don't import hooks** - No `import { useQuery }` in components
- [ ] **Props are data-only** - No `queryClient`, `navigate`, or mutation functions
- [ ] **Callbacks are typed correctly** - `(data: T) => Promise<void>` pattern
- [ ] **No circular dependencies** - Route doesn't import from component, then import back

#### C. Type Safety
- [ ] **Types imported from schemas** - `@/lib/schemas/` for entities
- [ ] **Callback prop types exported** - Like `ActivityLogInput` interface
- [ ] **Generic types used sparingly** - Prefer specific, named types
- [ ] **No `any` types** - Except in proven scenarios documented

#### D. State Management
- [ ] **Local UI state only in components** - `useState` for modals, tabs, etc.
- [ ] **Data state only in routes/hooks** - `useQuery` for server data
- [ ] **No mixed concerns** - UI state and data fetching separated
- [ ] **Zustand for app-level UI state** - Not for data

---

## 2. Automated Detection Commands

Run these grep commands to identify violations:

### 2.1 Find useQuery/useMutation in presenter components

```bash
# Find all useQuery/useMutation in domain components (violation!)
grep -r "useQuery\|useMutation" src/components/domain \
  --include="*.tsx" \
  --include="*.ts" \
  -n

# Same, but excluding those that might be in shared utilities
grep -r "useQuery\|useMutation" src/components/domain \
  --include="*.tsx" \
  -l | xargs -I {} sh -c 'echo "=== {} ===" && grep -n "useQuery\|useMutation" "$@"' _ {}
```

**Expected Output:** Empty (no matches)

**Interpretation:**
- If any files match, those files are presenter components with data hooks
- Move data fetching to route/container level
- Pass data as props instead

### 2.2 Find inline query keys

```bash
# Find inline query key definitions (violation!)
grep -r "queryKey: \[" src/components/domain \
  --include="*.tsx" \
  --include="*.ts" \
  -n

# Also check routes for inline keys
grep -r "queryKey: \[" src/routes \
  --include="*.tsx" \
  --include="*.ts" \
  | grep -v "queryKeys\." \
  -n

# Find string-based query keys (older pattern)
grep -r "queryKey:.*'[a-z]" src/ \
  --include="*.tsx" \
  --include="*.ts" \
  -n
```

**Expected Output:** Empty (all should use `queryKeys.*`)

**Example Violations:**
```typescript
// ❌ WRONG - inline key
useQuery({
  queryKey: ['customers', id],  // This should fail!
  queryFn: () => getCustomer(id),
})

// ✅ CORRECT - centralized
useQuery({
  queryKey: queryKeys.customers.detail(id),
  queryFn: () => getCustomer(id),
})
```

### 2.3 Find manual polling patterns

```bash
# Find setInterval/setTimeout (violation!)
grep -r "setInterval\|setTimeout" src/components/domain \
  --include="*.tsx" \
  --include="*.ts" \
  -n

# Also check for manual polling in routes
grep -r "setInterval\|setTimeout" src/routes \
  --include="*.tsx" \
  -B 2 -A 2 \
  | grep -v "refetchInterval"
```

**Expected Output:** Empty or only in utility functions

**Why:** TanStack Query's `refetchInterval` is more efficient and handles cleanup automatically.

### 2.4 Find useState + useEffect data fetching patterns

```bash
# Find potential data fetching patterns
grep -r "useState\|useEffect" src/components/domain \
  --include="*.tsx" \
  | grep -v "^[^:]*:[^:]*:[^:]*useState.*setIs" \
  | grep -v "^[^:]*:[^:]*:[^:]*useState.*setOpen" \
  | grep -v "^[^:]*:[^:]*:[^:]*useState.*setActive"

# More specific: Look for useEffect with fetch/async
grep -r "useEffect.*async\|useEffect.*fetch\|useEffect.*getCustomers" \
  src/components/domain \
  --include="*.tsx" \
  -n
```

**Expected Output:** Empty (all data fetching should use TanStack Query)

### 2.5 Find direct server function calls in components

```bash
# Find imports of server functions in components
grep -r "from '@/server/functions" src/components/domain \
  --include="*.tsx" \
  -n

# Check for function calls that look like server functions
grep -r "getCustomer\|createOrder\|updateProduct" src/components/domain \
  --include="*.tsx" \
  -n | grep -v "// Example\|mock\|WRONG"
```

**Expected Output:** Empty (server functions should only be imported in routes/hooks)

### 2.6 Find components in wrong directories

```bash
# Components should be in src/components/{ui|domain|shared|layout}
# Find .tsx files in unexpected places
find src -name "*.tsx" -type f \
  | grep -v "routes/" \
  | grep -v "components/" \
  | grep -v "contexts/" \
  -v

# Specifically check domain structure
find src/components/domain -type d -name "components" \
  -exec echo "⚠️ Found nested /components in domain: {}" \;
```

**Expected Output:** Empty (no components in weird places)

### 2.7 Find missing type imports

```bash
# Find usage of types without import statements
# This is a manual check, but look for these patterns:
grep -r "type.*Opportunity\|type.*Customer\|interface.*Quote" \
  src/components/domain/*.tsx \
  | grep -v "import.*from '@/lib/schemas" \
  -A 1 -B 1

# Or use TypeScript compiler
npx tsc --noEmit 2>&1 | grep "Cannot find name"
```

---

## 3. ESLint Rule Suggestions

Add these ESLint rules to `eslint.config.js`:

### 3.1 Prevent useQuery in presenter components

```typescript
{
  files: ['src/components/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@tanstack/react-query'],
            importNames: ['useQuery', 'useMutation', 'useInfiniteQuery', 'useQueries'],
            message: 'Data hooks (useQuery/useMutation) are not allowed in presenter components. Move data fetching to the route/container. Import data as props instead.',
          },
        ],
      },
    ],
  },
}
```

### 3.2 Prevent server function imports in components

```typescript
{
  files: ['src/components/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/server/functions/**'],
            message: 'Server functions cannot be imported in components. Pass callbacks as props from the route/container instead.',
          },
        ],
      },
    ],
  },
}
```

### 3.3 Enforce centralized query keys

```typescript
{
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name="useQuery"] > ObjectExpression > Property[key.name="queryKey"] > ArrayExpression',
        message: 'Do not use inline query keys. Use queryKeys.* from @/lib/query-keys.ts instead.',
      },
    ],
  },
}
```

### 3.4 Warn about useState + useEffect for data

```typescript
{
  files: ['src/components/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'CallExpression[callee.name="useState"] ~ CallExpression[callee.name="useEffect"] > ArrowFunctionExpression > CallExpression[callee.property.name="then"]',
        message: 'Avoid manual data fetching with useState + useEffect. Use TanStack Query (useQuery) instead.',
      },
    ],
  },
}
```

### 3.5 Complete ESLint Configuration Addition

Add this to `eslint.config.js` in the rules section:

```javascript
// Add to the existing rules object
{
  files: ['src/components/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@tanstack/react-query'],
            importNames: [
              'useQuery',
              'useMutation',
              'useInfiniteQuery',
              'useQueries',
              'useQueryClient',
            ],
            message: 'Data fetching hooks are not allowed in presenter components. Move to route/container and pass data as props.',
          },
          {
            group: ['@/server/functions/**'],
            message: 'Server functions cannot be imported in components. Pass callbacks as props from routes.',
          },
        ],
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
},
// Shared/UI components are exempt
{
  files: ['src/components/shared/**/*.{ts,tsx}', 'src/components/ui/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': 'off',
  },
},
// Routes can use data hooks
{
  files: ['src/routes/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': 'off',
  },
}
```

---

## 4. Directory Structure Conventions

### Correct Structure

```
src/
├── components/
│   ├── ui/                          # shadcn primitives (no imports from domain)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── shared/                      # Reusable presenters (data passed as props)
│   │   ├── data-table/
│   │   │   ├── data-table.tsx      # Props: { data, columns, ... }
│   │   │   └── ...
│   │   ├── query-state.tsx         # Props: { isLoading, error, children }
│   │   └── ...
│   ├── domain/                      # Feature-specific presenters
│   │   ├── customers/
│   │   │   ├── customer-form.tsx   # Props: { initialData, onSubmit }
│   │   │   ├── customer-list.tsx   # Props: { customers, onRowClick }
│   │   │   └── components/         # Sub-components (not components of components!)
│   │   │       ├── customer-card.tsx
│   │   │       └── address-form.tsx
│   │   ├── orders/
│   │   │   ├── order-detail.tsx    # Props: { order, onUpdate }
│   │   │   └── order-list.tsx      # Props: { orders }
│   │   └── ...
│   └── layout/                      # Layout/shell components
│       ├── app-shell.tsx           # May have limited queries (org, user)
│       └── ...
├── routes/                          # File-based routes (containers)
│   └── _authenticated/
│       ├── customers/
│       │   ├── index.tsx           # Fetches data, renders CustomerList
│       │   └── $customerId.tsx     # Fetches customer, renders CustomerDetail
│       └── orders/
│           └── index.tsx
├── hooks/                           # Custom hooks (data fetching)
│   ├── customers/
│   │   ├── use-customers.ts        # useQuery wrapper
│   │   ├── use-create-customer.ts  # useMutation wrapper
│   │   └── ...
│   └── ...
├── lib/
│   ├── query-keys.ts               # CENTRALIZED query key factory
│   ├── schemas/                    # Zod validation schemas
│   └── ...
└── server/
    └── functions/                  # Server functions
        ├── customers/
        │   ├── customers.ts        # getCustomers, createCustomer, etc.
        │   └── ...
        └── ...
```

### Anti-Patterns to Avoid

```
❌ src/components/domain/customers/use-customers.ts
   └─ Data hooks do NOT belong in domain components

❌ src/components/domain/customers/components/customer-detail.tsx
   └─ Contains useQuery or server function imports

❌ src/routes/customers/customer-list.tsx (if it's just a presenter)
   └─ Use presenter component instead, put data fetching in index.tsx

❌ src/components/domain/customers/api.ts
   └─ API calls don't belong in components; use server/functions

❌ src/hooks/use-customers.ts (if mixing data + UI state)
   └─ Separate into use-customers (data) + use-customer-ui-state (UI)
```

---

## 5. Testing Guidance

### 5.1 Unit Test Pattern for Presenters

```typescript
// ✅ Test presenter with mock props only
describe('CustomerList', () => {
  it('renders customer list from props', () => {
    const customers = [
      { id: '1', name: 'Acme Corp', ... },
      { id: '2', name: 'TechCo', ... },
    ];

    const { getByText } = render(
      <CustomerList customers={customers} onRowClick={vi.fn()} />
    );

    expect(getByText('Acme Corp')).toBeInTheDocument();
  });

  it('calls onRowClick when customer clicked', () => {
    const onRowClick = vi.fn();
    const customers = [{ id: '1', name: 'Acme Corp', ... }];

    const { getByText } = render(
      <CustomerList customers={customers} onRowClick={onRowClick} />
    );

    fireEvent.click(getByText('Acme Corp'));
    expect(onRowClick).toHaveBeenCalledWith('1');
  });
});
```

### 5.2 Integration Test Pattern for Routes

```typescript
// ✅ Test route (container) with TanStack Query
describe('CustomersRoute', () => {
  it('fetches and displays customers', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    server.use(
      http.get('/api/customers', () => {
        return HttpResponse.json({
          customers: [{ id: '1', name: 'Acme Corp', ... }],
        });
      })
    );

    const { getByText } = render(<CustomersRoute />, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(getByText('Acme Corp')).toBeInTheDocument();
    });
  });

  it('invalidates cache on create mutation', async () => {
    const queryClient = new QueryClient();

    // Setup queries
    queryClient.setQueryData(
      queryKeys.customers.list(),
      [{ id: '1', name: 'Acme Corp' }]
    );

    // Run mutation and verify cache was cleared
    const mutation = useCreateCustomer();
    await mutation.mutateAsync({ name: 'NewCorp' });

    expect(queryClient.getQueryState(queryKeys.customers.lists())).toEqual(
      expect.objectContaining({ isInvalidated: true })
    );
  });
});
```

### 5.3 Snapshot Test Guidelines

```typescript
// ✅ Presenter snapshots are reliable (props don't change)
describe('QuoteBuilder snapshots', () => {
  it('matches snapshot with sample data', () => {
    const quote = { items: [...], notes: '...' };
    const { container } = render(
      <QuoteBuilder
        opportunityId="opp-1"
        currentVersion={quote}
        onSaveVersion={vi.fn()}
        isSaving={false}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

// ⚠️  Avoid snapshots for routes (query results may vary)
```

### 5.4 Accessibility Testing

```typescript
// ✅ All presenters should pass a11y tests
describe('CustomerList accessibility', () => {
  it('has proper heading hierarchy', () => {
    const { container } = render(
      <CustomerList customers={mockCustomers} onRowClick={vi.fn()} />
    );
    const headings = container.querySelectorAll('h1, h2, h3');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('table has proper ARIA attributes', () => {
    const { getByRole } = render(
      <CustomerList customers={mockCustomers} onRowClick={vi.fn()} />
    );
    const table = getByRole('table');
    expect(table).toHaveAttribute('role', 'table');
  });
});
```

---

## 6. Pre-commit Hook Configuration

Create `.git/hooks/pre-commit` to run automated checks:

```bash
#!/bin/bash

echo "🔍 Running architecture violation checks..."

# Check 1: No useQuery in domain components
violations=$(grep -r "useQuery\|useMutation" src/components/domain --include="*.tsx" 2>/dev/null)
if [ ! -z "$violations" ]; then
  echo "❌ FAILED: Found data hooks in presenter components:"
  echo "$violations"
  exit 1
fi

# Check 2: No inline query keys
violations=$(grep -r "queryKey: \[" src/components/domain --include="*.tsx" 2>/dev/null)
if [ ! -z "$violations" ]; then
  echo "❌ FAILED: Found inline query keys in components:"
  echo "$violations"
  exit 1
fi

# Check 3: No server function imports in components
violations=$(grep -r "from '@/server/functions" src/components/domain --include="*.tsx" 2>/dev/null)
if [ ! -z "$violations" ]; then
  echo "❌ FAILED: Found server function imports in components:"
  echo "$violations"
  exit 1
fi

echo "✅ Architecture checks passed!"
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 7. Enforcement Timeline

### Phase 1: Current Violations (Week 1)
1. Audit all domain components for violations
2. Create refactoring tasks
3. Document violations in code comments with TODO blocks

### Phase 2: Preventative Measures (Week 2)
1. Update ESLint configuration
2. Add pre-commit hooks
3. Update PR template with checklist

### Phase 3: Active Enforcement (Week 3+)
1. Enable ESLint rules (start with warnings)
2. Require PR reviews against checklist
3. Monthly architecture audits
4. Training on new patterns

---

## 8. Quick Reference: The Rules

### ✅ DO

- Use `queryKeys.*` from `@/lib/query-keys.ts` for all queries
- Import data hooks from `@/hooks` into routes only
- Pass data as props to presenter components
- Keep mutations in routes/hooks with proper cache invalidation
- Use `refetchInterval` for polling in hooks
- Organize components in `src/components/{ui|shared|domain}`
- Test presenters with mock data only
- Type props as named interfaces exported from component

### ❌ DON'T

- Use `useQuery` or `useMutation` in `src/components/domain`
- Define query keys inline (always use `queryKeys.*`)
- Import server functions in components
- Use `useState` + `useEffect` for data fetching
- Use `setInterval` or `setTimeout` for polling
- Mix UI state and data state in single hook
- Put data fetching logic in presenters
- Import components from routes into other components
- Use `any` types for props
- Test routes without mocking server responses

---

## 9. Examples: Violation Detection in Action

### Violation 1: useQuery in component

**File:** `src/components/domain/pipeline/quick-quote-form.tsx`

```typescript
// ❌ WRONG - This will be caught by ESLint
export function QuickQuoteForm() {
  const { data: products } = useQuery({
    queryKey: ['products'],  // Also caught - inline key
    queryFn: () => getProducts(),
  });

  return <form>...</form>;
}
```

**Detection:**
```bash
$ grep -n "useQuery" src/components/domain/pipeline/quick-quote-form.tsx
12:  const { data: products } = useQuery({

$ npm run lint
  × src/components/domain/pipeline/quick-quote-form.tsx:12:27
    error: Data hooks (useQuery/useMutation) are not allowed in presenter components
```

**Fix:** Move to route
```typescript
// routes/_authenticated/pipeline/$opportunityId.tsx
export function OpportunityDetailPage() {
  const { data: products } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => getProducts(),
  });

  return <QuickQuoteForm products={products} />;
}

// components/domain/pipeline/quick-quote-form.tsx
export function QuickQuoteForm({ products }: { products: Product[] }) {
  return <form>...</form>;
}
```

### Violation 2: Server function import in component

**File:** `src/components/domain/orders/order-status-badge.tsx`

```typescript
// ❌ WRONG
import { updateOrderStatus } from '@/server/functions/orders/orders';

export function OrderStatusBadge({ orderId }: { orderId: string }) {
  const handleUpdate = async () => {
    await updateOrderStatus({ data: { orderId, status: 'shipped' } });
  };

  return <button onClick={handleUpdate}>Ship</button>;
}
```

**Detection:**
```bash
$ grep -n "from '@/server/functions" src/components/domain/orders/order-status-badge.tsx
3:import { updateOrderStatus } from '@/server/functions/orders/orders';

$ npm run lint
  × src/components/domain/orders/order-status-badge.tsx:3:1
    error: Server functions cannot be imported in components
```

**Fix:** Move to hook, pass callback
```typescript
// hooks/orders/use-update-order-status.ts
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateOrderStatus({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

// routes/_authenticated/orders/$orderId.tsx
export function OrderDetailPage() {
  const { mutate: updateStatus } = useUpdateOrderStatus();

  return <OrderStatusBadge onUpdate={updateStatus} />;
}

// components/domain/orders/order-status-badge.tsx
export function OrderStatusBadge({
  orderId,
  onUpdate
}: {
  orderId: string;
  onUpdate: (status: string) => void;
}) {
  return <button onClick={() => onUpdate('shipped')}>Ship</button>;
}
```

---

## 10. Monitoring & Metrics

### Track These Metrics

```bash
# Monthly architecture audit
echo "=== Architecture Metrics ==="
echo "Total domain components: $(find src/components/domain -name "*.tsx" | wc -l)"
echo "Components with useQuery: $(grep -r "useQuery" src/components/domain --include="*.tsx" | wc -l)"
echo "Components with server imports: $(grep -r "from '@/server" src/components/domain --include="*.tsx" | wc -l)"
echo "Inline query keys: $(grep -r "queryKey: \[" src/ --include="*.tsx" | grep -v "queryKeys\." | wc -l)"
```

### Expected Results (Healthy Codebase)
```
Total domain components: 80
Components with useQuery: 0 ✅
Components with server imports: 0 ✅
Inline query keys: 0 ✅
```

---

## Summary

Enforce container/presenter separation through:

1. **Automated Detection:** ESLint rules + grep commands catch violations immediately
2. **Code Review:** Use the checklist for every PR
3. **Pre-commit Hooks:** Prevent commits with violations
4. **Documentation:** This guide + inline comments
5. **Testing:** Proper test patterns reinforce architecture
6. **Monitoring:** Monthly metrics track compliance

This multi-layered approach ensures architecture violations are caught at multiple points before reaching production.
