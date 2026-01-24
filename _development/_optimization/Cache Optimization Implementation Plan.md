# Cache Optimization Implementation Plan

**Status**: 📋 **PLANNING PHASE**
**Priority**: 🟡 **HIGH** (Performance Impact)
**Estimated Effort**: 2-3 weeks

---

## 🎯 Mission Statement

Transform the application from reactive data fetching to proactive, intelligent caching that provides instant UI feedback, optimal performance, and seamless user experience through strategic cache optimization patterns.

---

## 📋 Current State Analysis

### ✅ What We Have (Foundation Ready)
- **Centralized Query Keys**: Hierarchical structure in `@/lib/query-keys.ts`
- **32+ Hooks Refactored**: All using consistent patterns
- **Type Safety**: Schema-derived types throughout
- **Cross-Domain Support**: Query keys enable related data invalidation

### ❌ Current Limitations
- **No Optimistic Updates**: UI waits for server confirmation
- **Basic Cache Strategy**: Simple stale-while-revalidate only
- **No Prefetching**: Data loaded only when requested
- **Limited Background Sync**: No automatic freshness
- **No Cache Persistence**: Lost on page refresh

---

## 🚀 Cache Optimization Strategy

### Phase 1: Core Optimizations (Week 1)

#### 1.1 Optimistic Updates Implementation
**Goal**: Instant UI feedback, rollback on failure

**Implementation**:
```typescript
// Pattern for all mutation hooks
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onMutate: async (newCustomer) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.all });

      // Snapshot previous value
      const previousCustomers = queryClient.getQueryData(queryKeys.customers.list());

      // Optimistically update
      queryClient.setQueryData(queryKeys.customers.list(), (old) => [...old, newCustomer]);

      // Return rollback function
      return { previousCustomers };
    },
    onError: (err, newCustomer, context) => {
      // Rollback on error
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.customers.list(), context.previousCustomers);
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}
```

**Targets**: All CRUD operations across all domains

#### 1.2 Smart Invalidation Patterns
**Goal**: Minimize unnecessary re-renders while keeping data fresh

**Implementation**:
```typescript
// Exact invalidation (recommended)
queryClient.invalidateQueries({
  queryKey: queryKeys.customers.detail(customerId),
  exact: true
});

// Partial invalidation with refetch
queryClient.invalidateQueries({
  queryKey: queryKeys.customers.list(),
  refetchType: 'active' // Only refetch if component is visible
});

// Cross-domain invalidation
export const invalidateCustomerRelatedQueries = (customerId: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }); // Related orders
  queryClient.invalidateQueries({ queryKey: queryKeys.support.issues.all }); // Related issues
};
```

#### 1.3 Background Refetching
**Goal**: Keep data fresh without user interaction

**Implementation**:
```typescript
// Hook with background refetching
export function useCustomersWithBackgroundSync(options: UseCustomersOptions = {}) {
  const { backgroundSync = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => listCustomers({ data: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: backgroundSync ? 10 * 60 * 1000 : false, // 10 minutes
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}
```

### Phase 2: Advanced Optimizations (Week 2)

#### 2.1 Prefetching Strategy
**Goal**: Load data before user needs it

**Implementation**:
```typescript
// Route-based prefetching
export const prefetchCustomerData = (customerId: string) => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => getCustomer({ data: { id: customerId } }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Prefetch related data
  queryClient.prefetchQuery({
    queryKey: queryKeys.orders.list({ customerId }),
    queryFn: () => listOrders({ data: { customerId } }),
  });
};

// Hover prefetching for navigation
export const usePrefetchOnHover = (customerId: string) => {
  const queryClient = useQueryClient();

  const prefetch = useCallback(() => {
    prefetchCustomerData(customerId);
  }, [customerId]);

  return { prefetch };
};
```

#### 2.2 Debounced Search & Filtering
**Goal**: Prevent excessive API calls during typing/filtering

**Implementation**:
```typescript
export function useDebouncedCustomerSearch(searchTerm: string, debounceMs = 300) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  return useQuery({
    queryKey: queryKeys.customers.list({ search: debouncedSearch }),
    queryFn: () => listCustomers({ data: { search: debouncedSearch } }),
    enabled: debouncedSearch.length > 2, // Minimum search length
  });
}
```

#### 2.3 Cache Persistence
**Goal**: Persist cache across sessions for better UX

**Implementation**:
```typescript
// Cache persistence configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours (formerly cacheTime)
    },
  },
});

// With persistence (requires additional library)
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersistor } from '@tanstack/query-sync-storage-persistor';

const persistor = createSyncStoragePersistor({
  storage: window.localStorage,
  key: 'renoz-cache',
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persistor,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

### Phase 3: Performance Monitoring (Week 3)

#### 3.1 Cache Analytics
**Goal**: Monitor cache performance and identify optimization opportunities

**Implementation**:
```typescript
// Cache performance monitoring
export const useCacheAnalytics = () => {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return {
      totalQueries: queries.length,
      freshQueries: queries.filter(q => q.state.status === 'success').length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: new Blob([JSON.stringify(queries)]).size, // Rough size estimate
    };
  }, [queryClient]);
};
```

#### 3.2 Query Performance Profiling
**Goal**: Track slow queries and optimization opportunities

**Implementation**:
```typescript
// Performance monitoring hook
export const useQueryPerformanceMonitor = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'added' || event.type === 'updated') {
        const query = event.query;

        // Log slow queries (>1 second)
        if (query.state.dataUpdatedAt - query.state.dataUpdatedAt > 1000) {
          console.warn(`Slow query detected:`, {
            key: query.queryKey,
            duration: query.state.dataUpdatedAt - query.state.dataUpdatedAt,
            status: query.state.status,
          });
        }
      }
    });

    return unsubscribe;
  }, [queryClient]);
};
```

---

## 🛠️ Implementation Plan by Domain

### Priority Order (Impact vs Effort)

#### High Impact, Low Effort (Start Here)
1. **Customers** - High usage, simple CRUD
2. **Orders** - Critical business flow
3. **Jobs** - Complex but high value

#### High Impact, Medium Effort
4. **Financial** - Critical data accuracy
5. **Inventory** - Performance sensitive
6. **Support** - User-facing responsiveness

#### Medium Impact, High Effort (Last)
7. **Suppliers** - Less frequent usage
8. **Reports** - Read-heavy, caching friendly

### Implementation Checklist by Domain

#### Customers Domain ✅ (Example Implementation)
- [ ] Optimistic create/update/delete
- [ ] Background sync for customer lists
- [ ] Prefetch on navigation
- [ ] Smart invalidation for related data

#### Orders Domain 🔄 (Next Priority)
- [ ] Optimistic order creation
- [ ] Real-time order status updates
- [ ] Cross-domain invalidation (customer → orders)
- [ ] Order line item batch updates

#### Jobs Domain 🔄 (High Complexity)
- [ ] Optimistic task updates
- [ ] Calendar prefetching
- [ ] Batch operation optimizations
- [ ] Status transition caching

---

## 📊 Expected Performance Improvements

### Quantitative Metrics
- **API Call Reduction**: 40-60% fewer requests
- **UI Response Time**: 50-80% faster perceived performance
- **User Experience Score**: 30-50% improvement
- **Server Load**: 25-40% reduction

### Qualitative Improvements
- **Instant Feedback**: No loading states for mutations
- **Offline Resilience**: Cached data available during network issues
- **Smoother Navigation**: Prefetched data loads instantly
- **Better Mobile Experience**: Reduced data usage and faster interactions

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('Optimistic Updates', () => {
  it('should update UI immediately on create', () => {
    // Test optimistic update behavior
  });

  it('should rollback on error', () => {
    // Test error rollback functionality
  });
});
```

### Integration Tests
```typescript
describe('Cross-Domain Invalidation', () => {
  it('should invalidate related queries', () => {
    // Test customer update invalidates orders
  });
});
```

### E2E Tests
```typescript
describe('Cache Performance', () => {
  it('should load data from cache instantly', () => {
    // Test cache-first loading
  });
});
```

---

## 🔧 Required Dependencies

### Additional Packages
```json
{
  "dependencies": {
    "@tanstack/react-query-persist-client": "^5.0.0",
    "@tanstack/query-sync-storage-persistor": "^5.0.0"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.0.0"
  }
}
```

### Configuration Updates
- Update `QueryClient` configuration
- Add cache persistence setup
- Configure default query options

---

## 📈 Success Metrics

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Cache Hit Rate**: > 80%
- **API Response Time**: < 200ms (cached)

### User Experience Targets
- **Zero loading states** for mutations
- **Instant navigation** between cached routes
- **Offline functionality** for critical flows
- **Reduced data usage** by 40%

---

## 🎯 Implementation Phases Summary

| Phase | Duration | Focus | Impact |
|-------|----------|-------|--------|
| **Phase 1** | Week 1 | Core Optimizations | High |
| **Phase 2** | Week 2 | Advanced Features | Medium |
| **Phase 3** | Week 3 | Monitoring & Tuning | Ongoing |

---

## 🚀 Quick Wins (Start Today)

1. **Add optimistic updates** to customer creation/update
2. **Implement background refetching** for frequently accessed data
3. **Add prefetching** for navigation routes
4. **Set up cache analytics** to measure impact

---

**Ready to implement cache optimization?** This will transform the user experience from reactive to proactive, with instant feedback and optimal performance! 🚀

Which phase would you like to start with?