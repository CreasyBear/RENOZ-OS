# Hooks Architecture & Patterns

## Overview

This document establishes patterns for hook usage in the Renoz CRM application, based on a comprehensive audit of existing hooks. The goal is to maintain consistency, performance, and maintainability by clearly defining when to use TanStack Query vs bespoke composables.

## Core Principles

### 1. **Data Fetching = TanStack Query**
All server data fetching must use TanStack Query. This includes:
- CRUD operations
- List views with pagination/filtering
- Detail views
- Analytics and reporting data
- Real-time polling scenarios

### 2. **UI State = Bespoke Composables**
Client-side UI interactions should use bespoke composables:
- Form state management
- Modal/dialog state
- Local component state
- Debounced user interactions

### 3. **Centralized Query Keys**
All TanStack Query operations must use the centralized `queryKeys` factory from `@/lib/query-keys.ts`.

## Pattern Categories

## 📊 Data Fetching Hooks (TanStack Query)

### When to Use
- Fetching data from server APIs
- Operations requiring caching, invalidation, or background updates
- Real-time data that needs polling
- Operations that benefit from optimistic updates

### Required Structure
```typescript
// ✅ CORRECT PATTERN
export function useEntityList(filters?: EntityFilters) {
  return useQuery({
    queryKey: queryKeys.entity.list(filters),
    queryFn: () => fetchEntityList({ data: filters }),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useEntityDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.entity.detail(id),
    queryFn: () => fetchEntityDetail({ data: { id } }),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### Mutation Pattern
```typescript
// ✅ CORRECT PATTERN
export function useCreateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEntityInput) => createEntity({ data }),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.entity.lists() });
    },
  });
}
```

## 🎨 UI State Hooks (Bespoke Composables)

### When to Use
- Component-specific state
- User interaction state
- Form validation state
- UI animation state
- Local preferences

### Required Structure
```typescript
// ✅ CORRECT PATTERN
export function useCustomHook(initialValue?: T) {
  const [state, setState] = useState(initialValue);

  const actions = useMemo(() => ({
    update: (value: T) => setState(value),
    reset: () => setState(initialValue),
  }), [initialValue]);

  return { state, ...actions };
}
```

## 🔄 Real-time & Polling Patterns

### Polling with TanStack Query
```typescript
// ✅ CORRECT PATTERN
export function useJobProgress(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobProgress.status(jobId),
    queryFn: () => getJobStatus({ data: { jobId } }),
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling when complete
      return data?.status === 'completed' ? false : 2000;
    },
    refetchIntervalInBackground: true,
  });
}
```

### WebSocket Integration
```typescript
// ✅ CORRECT PATTERN
export function useRealtimeSubscription(options: SubscriptionOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = createSubscription(options);

    channel.on('update', () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: options.queryKey });
    });

    return () => channel.unsubscribe();
  }, [options, queryClient]);

  // Use TanStack Query for data fetching
  return useQuery({ ... });
}
```

## 🚫 Anti-Patterns

### ❌ Manual State Management for Data
```typescript
// 🚫 AVOID THIS
export function useEntityList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData().then(setData).catch(setError).finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
```

### ❌ Local Query Keys
```typescript
// 🚫 AVOID THIS
const entityKeys = {
  all: ['entities'] as const,
  list: () => [...entityKeys.all, 'list'] as const,
};

// ✅ USE THIS INSTEAD
queryKeys.entities.list()
```

### ❌ Manual Polling
```typescript
// 🚫 AVOID THIS
useEffect(() => {
  const interval = setInterval(() => {
    fetchData().then(setData);
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

## 📁 Hook Organization

### Directory Structure
```
src/hooks/
├── _shared/           # Utility hooks (toast, mobile, etc.)
├── {domain}/          # Domain-specific hooks
│   ├── index.ts       # Re-exports
│   ├── use-{entity}.ts
│   └── use-{entity}-analytics.ts
├── use-{global}.ts    # Global hooks
└── README.md          # This file
```

### Index Files
Each domain should have an index.ts that re-exports hooks:
```typescript
// hooks/customers/index.ts
export { useCustomers } from './use-customers';
export { useCustomerAnalytics } from './use-customer-analytics';
export type { CustomerFilters } from '@/lib/query-keys';
```

## 🔧 Development Guidelines

### Adding New Data Hooks
1. **Always use TanStack Query** for server data
2. **Add query keys** to `@/lib/query-keys.ts` first
3. **Include proper types** for filters and responses
4. **Add staleTime** appropriate for the data (30s-5min)
5. **Handle loading/error states** appropriately
6. **Invalidate related queries** in mutations

### Adding New UI Hooks
1. **Use bespoke composables** for UI state
2. **Include actions** as part of the return object
3. **Use useMemo** for expensive computations
4. **Consider useCallback** for functions passed to children

### Testing Hooks
- **Data hooks**: Test with TanStack Query testing utilities
- **UI hooks**: Test component integration
- **Mock server responses** for data hooks
- **Test loading/error states** thoroughly

## 📋 Migration Checklist

When converting existing hooks:

- [ ] Replace `useState`/`useEffect` data fetching with `useQuery`
- [ ] Move query keys to centralized system
- [ ] Convert mutations to `useMutation` with proper invalidation
- [ ] Replace manual polling with `refetchInterval`
- [ ] Update all imports and re-exports
- [ ] Test functionality thoroughly

## 🎯 Quality Assurance

### Code Review Checklist
- [ ] Uses TanStack Query for data fetching?
- [ ] Uses centralized query keys?
- [ ] Has appropriate staleTime?
- [ ] Mutations invalidate related queries?
- [ ] No manual state management for server data?
- [ ] Proper TypeScript types?
- [ ] Includes error handling?

### Performance Considerations
- [ ] Appropriate staleTime values?
- [ ] Efficient query key structures?
- [ ] Minimal unnecessary re-renders?
- [ ] Proper dependency arrays?

---

## Examples from Audit

### ✅ Good Examples (Already Compliant)
- `use-customers.ts` - Proper TanStack Query usage
- `use-inventory.ts` - Well-structured with optimistic updates
- `use-job-tasks.ts` - Good mutation patterns

### 🔄 Converted Examples
- `use-job-progress.ts` - Converted from manual polling to TanStack Query
- `use-locations.ts` - Converted from bespoke state to TanStack Query
- `use-customer-analytics.ts` - Migrated to centralized query keys

### 📝 Bespoke Examples (Appropriately Custom)
- `use-mobile.ts` - UI responsiveness hook
- `use-toast.ts` - Notification system wrapper
- `use-undoable-action.ts` - Complex UI interaction pattern
- `use-realtime.ts` - WebSocket subscription management