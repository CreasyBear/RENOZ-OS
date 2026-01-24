# Optimistic Updates Implementation Guide

**Status**: 🛠️ **READY FOR IMPLEMENTATION**
**Impact**: 🚀 **HIGH** (Immediate UX improvement)
**Effort**: 🔧 **MEDIUM** (2-3 days)

---

## 🎯 What Are Optimistic Updates?

Optimistic updates provide **instant UI feedback** by updating the local cache immediately when a user performs an action, then either confirming the change or rolling back if the server request fails.

**Before**: User clicks "Create Customer" → Loading spinner → Wait for server → Update UI
**After**: User clicks "Create Customer" → Instant UI update → Server confirmation (rollback on failure)

---

## 🏗️ Current QueryClient Configuration

**Location**: `src/routes/__root.tsx`

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
```

**✅ Good**: Already has reasonable staleTime
**🔧 Needs**: Better default options for mutations

---

## 🚀 Implementation: Optimistic Customer Creation

### Step 1: Enhanced QueryClient Configuration

```typescript
// Update src/routes/__root.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
    },
    mutations: {
      retry: 1,
      onError: (error, variables, context) => {
        // Global error handling
        console.error('Mutation failed:', error);
        // Could show toast notification here
      },
    },
  },
});
```

### Step 2: Optimistic Customer Creation Hook

**File**: `src/hooks/customers/use-customers.ts`

```typescript
// Add this to the existing useCreateCustomer hook
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) => createCustomer({ data }),
    onMutate: async (newCustomer) => {
      // Step 1: Cancel any outgoing refetches for customers
      await queryClient.cancelQueries({
        queryKey: queryKeys.customers.all
      });

      // Step 2: Snapshot the previous value for rollback
      const previousCustomers = queryClient.getQueryData(
        queryKeys.customers.list()
      );

      // Step 3: Optimistically update the cache
      queryClient.setQueryData(
        queryKeys.customers.list(),
        (old: any) => old ? [...old, {
          ...newCustomer,
          id: `temp-${Date.now()}`, // Temporary ID
          createdAt: new Date().toISOString(),
          status: 'active',
          // Add other default fields
        }] : [newCustomer]
      );

      // Step 4: Return context for cleanup
      return { previousCustomers };
    },
    onError: (err, newCustomer, context) => {
      // Step 5: Rollback on error
      if (context?.previousCustomers) {
        queryClient.setQueryData(
          queryKeys.customers.list(),
          context.previousCustomers
        );
      }
    },
    onSuccess: (result, variables) => {
      // Step 6: Update with real data from server
      queryClient.setQueryData(
        queryKeys.customers.list(),
        (old: any) =>
          old?.map((customer: any) =>
            customer.id?.startsWith('temp-')
              ? result // Replace temp with real data
              : customer
          )
      );

      // Step 7: Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all
      });
    },
  });
}
```

### Step 3: Update Customer List Hook for Better UX

**File**: `src/hooks/customers/use-customers.ts`

```typescript
export function useCustomers(options: UseCustomersOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => listCustomers({ data: filters }),
    enabled,
    // Enhanced options for better UX
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: 'always', // Refresh when user returns
    refetchOnReconnect: 'always', // Refresh when connection restored
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) return false;
      }
      return failureCount < 2;
    },
  });
}
```

---

## 🔄 Cross-Domain Invalidation Patterns

### Customer Updates Affect Multiple Domains

```typescript
// Add to useUpdateCustomer hook
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCustomerInput) => updateCustomer({ data }),
    onSuccess: (result, variables) => {
      // Invalidate customer-specific queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.id)
      });

      // Invalidate related domains
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all // Customer's orders
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.support.issues.all // Customer's support tickets
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranty.warranties.all // Customer's warranties
      });
    },
  });
}
```

---

## 🧪 Testing Optimistic Updates

### Unit Test Example

```typescript
// File: src/hooks/customers/use-customers.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateCustomer, useCustomers } from './use-customers';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('useCreateCustomer', () => {
  it('should optimistically update the cache', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Mock server function
    const mockCreateCustomer = vi.fn().mockResolvedValue({
      id: '123',
      name: 'Test Customer',
      email: 'test@example.com',
    });

    // Render hook
    const { result } = renderHook(() => useCreateCustomer(), { wrapper });

    // Initial state - no customers
    expect(queryClient.getQueryData(queryKeys.customers.list())).toBeUndefined();

    // Trigger optimistic update
    result.current.mutate({
      name: 'Test Customer',
      email: 'test@example.com',
    });

    // Verify optimistic update (should happen immediately)
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(queryKeys.customers.list());
      expect(cachedData).toHaveLength(1);
      expect(cachedData[0].name).toBe('Test Customer');
      expect(cachedData[0].id).toMatch(/^temp-/); // Temporary ID
    });

    // Wait for server confirmation and cache update
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(queryKeys.customers.list());
      expect(cachedData[0].id).toBe('123'); // Real ID from server
    });
  });

  it('should rollback on error', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Mock server function to fail
    const mockCreateCustomer = vi.fn().mockRejectedValue(new Error('Server error'));

    // Render hook
    const { result } = renderHook(() => useCreateCustomer(), { wrapper });

    // Trigger mutation
    result.current.mutate({
      name: 'Test Customer',
      email: 'test@example.com',
    });

    // Verify optimistic update
    await waitFor(() => {
      const cachedData = queryClient.getQueryData(queryKeys.customers.list());
      expect(cachedData).toHaveLength(1);
    });

    // Wait for error and rollback
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      const cachedData = queryClient.getQueryData(queryKeys.customers.list());
      expect(cachedData).toHaveLength(0); // Should be rolled back
    });
  });
});
```

---

## 📊 Implementation Priority

### Phase 1: Customer Domain (Start Here)
1. ✅ Update QueryClient configuration
2. 🔄 Implement optimistic customer creation
3. 🔄 Implement optimistic customer updates
4. 🔄 Implement optimistic customer deletion
5. 🔄 Add cross-domain invalidation

### Phase 2: Orders Domain (Next)
1. 🔄 Optimistic order creation
2. 🔄 Order status updates
3. 🔄 Order line item changes

### Phase 3: Jobs Domain (Complex)
1. 🔄 Task creation/updates
2. 🔄 Job status changes
3. 🔄 Calendar event updates

---

## 🎯 Expected Results

### Performance Improvements
- **UI Response Time**: ~90% faster for mutations (instant vs waiting for server)
- **User Satisfaction**: No loading spinners for common operations
- **Error Recovery**: Graceful rollback on failures

### User Experience Benefits
- **Instant Feedback**: Actions feel immediate and responsive
- **Reduced Anxiety**: No uncertainty during operations
- **Better Flow**: Seamless interaction patterns
- **Offline Resilience**: Works even with poor connectivity

---

## 🚀 Quick Implementation (5 minutes)

Add optimistic updates to customer creation:

1. **Update QueryClient** in `src/routes/__root.tsx`
2. **Modify `useCreateCustomer`** hook as shown above
3. **Test the implementation**

**Result**: Customer creation will be instant with automatic rollback on failure! ⚡

---

**Ready to implement optimistic updates?** This will make your app feel incredibly responsive! 🚀

Which domain would you like to start with?