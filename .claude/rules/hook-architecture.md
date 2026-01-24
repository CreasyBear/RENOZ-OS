# Hook Architecture Rules

> **See also:** [STANDARDS.md](../../STANDARDS.md) for comprehensive patterns including barrel exports, component architecture, and folder structure.

## Core Principle: Data Fetching = TanStack Query

**ALWAYS** use TanStack Query for server data operations. Never use `useState` + `useEffect` for data fetching.

### ✅ CORRECT: TanStack Query for Data
```typescript
export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => getCustomers({ data: filters }),
    staleTime: 30 * 1000,
  });
}
```

### ❌ WRONG: Bespoke State Management
```typescript
export function useCustomers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers().then(setData).finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
```

## Query Key Rules

**ALWAYS** use centralized query keys from `@/lib/query-keys.ts`. Never define local query keys.

### ✅ CORRECT: Centralized Keys
```typescript
import { queryKeys } from '@/lib/query-keys';

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.list(),
    queryFn: () => getCustomers(),
  });
}
```

### ❌ WRONG: Local Keys
```typescript
const customerKeys = {
  all: ['customers'] as const,
  list: () => [...customerKeys.all, 'list'] as const,
};
```

## Mutation Rules

**ALWAYS** use `useMutation` and **ALWAYS** invalidate related queries on success.

### ✅ CORRECT: Proper Mutation
```typescript
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) => createCustomer({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}
```

## Polling Rules

**NEVER** use `setInterval` or manual polling. **ALWAYS** use TanStack Query's `refetchInterval`.

### ✅ CORRECT: TanStack Query Polling
```typescript
export function useJobProgress(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobProgress.status(jobId),
    queryFn: () => getJobStatus({ data: { jobId } }),
    refetchInterval: (data) => {
      return data?.status === 'completed' ? false : 2000;
    },
  });
}
```

### ❌ WRONG: Manual Polling
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchJobStatus().then(setData);
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

## UI State Rules

**ONLY** use bespoke composables for UI state. Never mix UI state with data fetching.

### ✅ CORRECT: UI State Hook
```typescript
export function useModalState() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
```

### ❌ WRONG: Mixed Concerns
```typescript
export function useCustomers() {
  const [data, setData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false); // UI state in data hook

  useEffect(() => {
    fetchCustomers().then(setData);
  }, []);

  return { data, modalOpen, setModalOpen };
}
```

## Real-time Rules

For WebSocket/real-time updates, use bespoke composables for connection management but **ALWAYS** invalidate TanStack Query caches.

### ✅ CORRECT: Realtime Pattern
```typescript
export function useRealtimeOrders() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = createRealtimeSubscription('orders');

    channel.on('update', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    });

    return () => channel.close();
  }, [queryClient]);

  // Still use TanStack Query for data
  return useOrders();
}
```

## Performance Rules

- **ALWAYS** set appropriate `staleTime` (30s-5min for most data)
- **ALWAYS** use `enabled` to prevent unnecessary requests
- **CONSIDER** `refetchIntervalInBackground: true` for polling hooks
- **AVOID** unnecessary re-renders with proper dependency arrays

## Testing Rules

- **ALWAYS** test loading and error states
- **ALWAYS** mock server responses for data hooks
- **CONSIDER** testing with real TanStack Query cache state
- **VERIFY** query invalidation works correctly in mutations

## Migration Priority

When converting existing hooks:

1. **HIGH**: Hooks with manual polling
2. **HIGH**: Hooks with bespoke data fetching
3. **MEDIUM**: Hooks with local query keys
4. **LOW**: Well-structured UI hooks (leave as-is)

## Code Review Checklist

- [ ] Uses TanStack Query for all data operations?
- [ ] Uses centralized query keys only?
- [ ] Mutations invalidate related caches?
- [ ] No manual polling or state management?
- [ ] Appropriate staleTime values?
- [ ] Proper TypeScript types throughout?
- [ ] Handles loading/error states correctly?