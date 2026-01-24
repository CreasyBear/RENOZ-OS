# Architecture Prevention - Quick Reference

## TL;DR: The Rules

### ✅ DO These Things

```typescript
// 1. Use centralized query keys from @/lib/query-keys.ts
useQuery({
  queryKey: queryKeys.customers.list(filters),
  queryFn: () => getCustomers({ data: filters }),
})

// 2. Put data fetching in routes or hooks, not components
// routes/_authenticated/customers/index.tsx
const { data } = useCustomers();
return <CustomerList customers={data} />;

// 3. Components receive data via props only
export function CustomerList({ customers }: { customers: Customer[] }) {
  return <div>{customers.map(...)}</div>;
}

// 4. Mutations invalidate caches
useMutation({
  mutationFn: (data) => createCustomer({ data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
  },
})

// 5. Use refetchInterval for polling
useQuery({
  queryKey: queryKeys.jobProgress.status(jobId),
  queryFn: () => getJobStatus({ data: { jobId } }),
  refetchInterval: 2000,
})

// 6. Pass callbacks as props from route
// Route:
const { mutate: updateCustomer } = useUpdateCustomer();
return <CustomerForm onSubmit={updateCustomer} />;

// Component:
export function CustomerForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  return <form onSubmit={(data) => onSubmit(data)} />;
}
```

### ❌ DON'T Do These Things

```typescript
// ❌ WRONG: useQuery in component
export function CustomerList() {
  const { data } = useQuery({ queryKey: ['customers'] });
  return <div>{data?.map(...)}</div>;
}

// ❌ WRONG: Inline query keys
useQuery({
  queryKey: ['customers', 'list', filters],  // NO!
  queryFn: () => getCustomers(),
})

// ❌ WRONG: Server function import in component
import { createCustomer } from '@/server/functions/customers/customers';
export function CustomerForm() {
  const handleSubmit = async (data) => {
    await createCustomer({ data });  // NO!
  };
}

// ❌ WRONG: Manual polling
useEffect(() => {
  const interval = setInterval(() => {
    fetchJobStatus();
  }, 2000);
  return () => clearInterval(interval);
}, []);

// ❌ WRONG: useState + useEffect for data
const [data, setData] = useState([]);
useEffect(() => {
  fetchCustomers().then(setData);
}, []);
```

---

## Quick Decision Tree

### Question: Where should I put this code?

```
Is it data fetching (useQuery/useMutation)?
├─ YES → src/routes/ or src/hooks/
└─ NO → Go to next question

Is it rendering UI?
├─ YES → src/components/domain/ or src/components/shared/
└─ NO → Go to next question

Is it a UI primitive (Button, Input, etc.)?
├─ YES → src/components/ui/
└─ NO → Go to next question

Is it app-level UI state (sidebar open, theme)?
└─ YES → Zustand store in src/lib/stores/
```

---

## Checklists

### Before Committing Code

- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run check:architecture` passes (0 violations)
- [ ] No `useQuery` in `src/components/domain/`
- [ ] No server function imports in components
- [ ] All query keys use `queryKeys.*`
- [ ] Mutations invalidate related caches

### When Adding a New Feature

1. **Create the data fetching hook** (`src/hooks/domain/use-*.ts`)
   ```typescript
   export function useCustomers(filters?: CustomerFilters) {
     return useQuery({
       queryKey: queryKeys.customers.list(filters),
       queryFn: () => getCustomers({ data: filters }),
     });
   }
   ```

2. **Create the route/container** (`src/routes/_authenticated/domain/index.tsx`)
   ```typescript
   export function DomainListPage() {
     const { data, isLoading, error } = useDomainItems();
     return <DomainList items={data} isLoading={isLoading} />;
   }
   ```

3. **Create the presenter component** (`src/components/domain/domain/domain-list.tsx`)
   ```typescript
   export function DomainList({ items, isLoading }: DomainListProps) {
     if (isLoading) return <Skeleton />;
     return <div>{items?.map(...)}</div>;
   }
   ```

### When Creating a Hook

- [ ] Hook is in `src/hooks/{domain}/use-*.ts`
- [ ] Hook only imports from `@tanstack/react-query`
- [ ] Hook imports server functions from `@/server/functions/`
- [ ] Hook uses centralized `queryKeys` from `@/lib/query-keys.ts`
- [ ] Mutations call `queryClient.invalidateQueries()`
- [ ] Hook is exported with `use` prefix

### When Creating a Component

- [ ] Component is in `src/components/domain/{domain}/{name}.tsx` (or `shared/` or `ui/`)
- [ ] Component has NO imports from `@tanstack/react-query`
- [ ] Component has NO imports from `@/server/functions/`
- [ ] Component receives all data via props
- [ ] Component receives all callbacks via props
- [ ] Props are typed with exported interface
- [ ] Component is documented with JSDoc
- [ ] Component is exported with PascalCase name

### When Creating a Route

- [ ] Route is in `src/routes/_authenticated/{domain}/{page}.tsx`
- [ ] Route imports hooks from `src/hooks/`
- [ ] Route handles loading and error states
- [ ] Route passes data to presenter components via props
- [ ] Route passes callbacks to presenter components via props
- [ ] No direct server function calls (use hooks instead)

---

## Common Patterns

### Pattern 1: Simple List View

```typescript
// Hook: src/hooks/customers/use-customers.ts
export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => getCustomers({ data: filters }),
    staleTime: 5 * 60 * 1000,
  });
}

// Route: src/routes/_authenticated/customers/index.tsx
export function CustomersPage() {
  const { data, isLoading, error } = useCustomers();

  if (error) return <ErrorState />;

  return (
    <PageLayout>
      <CustomerList customers={data} isLoading={isLoading} />
    </PageLayout>
  );
}

// Component: src/components/domain/customers/customer-list.tsx
export function CustomerList({
  customers = [],
  isLoading,
}: {
  customers: Customer[];
  isLoading?: boolean;
}) {
  return (
    <div>
      {isLoading && <Skeleton />}
      {customers.map(c => <div key={c.id}>{c.name}</div>)}
    </div>
  );
}
```

### Pattern 2: Create Mutation

```typescript
// Hook: src/hooks/customers/use-create-customer.ts
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      createCustomer({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.lists()
      });
      toast.success('Customer created');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Route: src/routes/_authenticated/customers/new.tsx
export function NewCustomerPage() {
  const { mutate, isPending } = useCreateCustomer();

  return <CustomerForm onSubmit={mutate} isLoading={isPending} />;
}

// Component: src/components/domain/customers/customer-form.tsx
interface CustomerFormProps {
  onSubmit: (data: CreateCustomerInput) => void;
  isLoading?: boolean;
}

export function CustomerForm({ onSubmit, isLoading }: CustomerFormProps) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isLoading}>Save</button>
    </form>
  );
}
```

### Pattern 3: Detail View with Actions

```typescript
// Hook: src/hooks/customers/use-customer.ts
export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => getCustomer({ data: { id } }),
    enabled: !!id,
  });
}

// Route: src/routes/_authenticated/customers/$customerId.tsx
export function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const { data, isLoading } = useCustomer(customerId);
  const { mutate: updateCustomer } = useUpdateCustomer();

  return (
    <PageLayout>
      <CustomerDetail
        customer={data}
        isLoading={isLoading}
        onUpdate={updateCustomer}
      />
    </PageLayout>
  );
}

// Component: src/components/domain/customers/customer-detail.tsx
export function CustomerDetail({
  customer,
  isLoading,
  onUpdate
}: {
  customer?: Customer;
  isLoading?: boolean;
  onUpdate: (data: UpdateCustomerInput) => void;
}) {
  if (isLoading) return <Skeleton />;
  if (!customer) return <NotFound />;

  return (
    <div>
      {customer.name}
      <button onClick={() => onUpdate({ id: customer.id, name: 'New' })}>
        Update
      </button>
    </div>
  );
}
```

---

## Automated Checks

### Run All Checks
```bash
npm run check:architecture
```

### Individual Checks

```bash
# Check for useQuery/useMutation in components
grep -r "useQuery\|useMutation" src/components/domain --include="*.tsx"

# Check for inline query keys
grep -r "queryKey: \[" src/ --include="*.tsx" | grep -v "queryKeys\."

# Check for server function imports in components
grep -r "from '@/server/functions" src/components/domain --include="*.tsx"

# Check for manual polling
grep -r "setInterval\|setTimeout" src/components/domain --include="*.tsx"

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Directory Structure

```
✅ CORRECT STRUCTURE:
src/
├── components/
│   ├── domain/customers/customer-list.tsx
│   ├── domain/customers/customer-detail.tsx
│   ├── domain/orders/order-list.tsx
│   ├── shared/data-table/data-table.tsx
│   └── ui/button.tsx
├── routes/
│   └── _authenticated/customers/index.tsx
└── hooks/
    ├── customers/use-customers.ts
    └── customers/use-create-customer.ts

❌ WRONG STRUCTURES:
├── src/components/domain/customers/use-customers.ts (hooks here!)
├── src/components/domain/customers/api.ts (API here!)
└── src/components/domain/customers/components/customer-card.tsx (nested!)
```

---

## Need Help?

1. **"What's the pattern for this?"** → Check Common Patterns section above
2. **"Where does this code go?"** → Use the Decision Tree
3. **"What violations exist?"** → Run `npm run check:architecture --verbose`
4. **"Can I use this library?"** → Check PREVENTION_STRATEGIES.md section 3
5. **"How do I test this?"** → See PREVENTION_STRATEGIES.md section 5
6. **"Full details?"** → Read PREVENTION_STRATEGIES.md

---

## Key Files

- `PREVENTION_STRATEGIES.md` - Complete prevention guide (read this!)
- `ARCHITECTURE_REVIEW.md` - PR checklist
- `.github/ARCHITECTURE_REVIEW.md` - GitHub template
- `eslint-architecture-rules.js` - ESLint rules configuration
- `scripts/check-architecture.sh` - Automated checks
- `src/lib/query-keys.ts` - Available query keys
- `.claude/rules/hook-architecture.md` - Hook patterns

---

## Summary

| Layer | Location | Can useQuery? | Can import server? | Receives props? |
|-------|----------|---------------|-------------------|-----------------|
| Routes | `src/routes/` | ✅ Yes | ✅ Yes | ✅ Yes |
| Hooks | `src/hooks/` | ✅ Yes | ✅ Yes | ✅ No |
| Domain Components | `src/components/domain/` | ❌ No | ❌ No | ✅ Yes |
| Shared Components | `src/components/shared/` | ⚠️ Limited | ❌ No | ✅ Yes |
| UI Components | `src/components/ui/` | ❌ No | ❌ No | ✅ Yes |

**Key Principle:** Data flows DOWN (from routes → components via props), never UP (components don't fetch data).
