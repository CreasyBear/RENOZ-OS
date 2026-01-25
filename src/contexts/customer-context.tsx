/**
 * Customer Context Provider
 *
 * Provides customer state and actions to descendant components:
 * - Current customer selection
 * - Customer search state
 * - Quick customer lookup
 * - Customer-related actions
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCustomerById } from '@/server/customers'

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerSummary {
  id: string
  customerCode: string
  name: string
  type: string
  status: string
  healthScore: number | null
  lifetimeValue: number | null
}

export interface CustomerContextValue {
  // Current customer state
  currentCustomerId: string | null
  currentCustomer: CustomerSummary | null
  isLoadingCustomer: boolean

  // Recent customers (for quick access)
  recentCustomers: CustomerSummary[]

  // Actions
  setCurrentCustomer: (customerId: string | null) => void
  addToRecent: (customer: CustomerSummary) => void
  clearRecent: () => void

  // Search state
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Quick lookup
  lookupCustomer: (customerId: string) => Promise<CustomerSummary | null>
}

// ============================================================================
// CONTEXT
// ============================================================================

const CustomerContext = createContext<CustomerContextValue | null>(null)

// ============================================================================
// STORAGE KEY
// ============================================================================

const RECENT_CUSTOMERS_KEY = 'renoz:recent-customers'
const MAX_RECENT_CUSTOMERS = 10

// ============================================================================
// PROVIDER
// ============================================================================

interface CustomerProviderProps {
  children: ReactNode
}

export function CustomerProvider({ children }: CustomerProviderProps) {
  const queryClient = useQueryClient()

  // State
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null)
  const [recentCustomers, setRecentCustomers] = useState<CustomerSummary[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(RECENT_CUSTOMERS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch current customer data
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: queryKeys.customers.detail(currentCustomerId ?? ''),
    queryFn: async () => {
      if (!currentCustomerId) return null
      const result = await getCustomerById({ data: { id: currentCustomerId } })
      if (!result) return null
      return {
        id: result.id,
        customerCode: result.customerCode,
        name: result.name,
        type: result.type,
        status: result.status,
        healthScore: result.healthScore,
        lifetimeValue: result.lifetimeValue
          ? typeof result.lifetimeValue === 'string' ? parseFloat(result.lifetimeValue) : result.lifetimeValue
          : null,
      } as CustomerSummary
    },
    enabled: !!currentCustomerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Set current customer
  const setCurrentCustomer = useCallback((customerId: string | null) => {
    setCurrentCustomerId(customerId)
  }, [])

  // Add to recent customers
  const addToRecent = useCallback((customer: CustomerSummary) => {
    setRecentCustomers((prev) => {
      const filtered = prev.filter((c) => c.id !== customer.id)
      const updated = [customer, ...filtered].slice(0, MAX_RECENT_CUSTOMERS)
      try {
        localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(updated))
      } catch {
        // Ignore storage errors
      }
      return updated
    })
  }, [])

  // Clear recent customers
  const clearRecent = useCallback(() => {
    setRecentCustomers([])
    try {
      localStorage.removeItem(RECENT_CUSTOMERS_KEY)
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Quick lookup
  const lookupCustomer = useCallback(
    async (customerId: string): Promise<CustomerSummary | null> => {
      try {
        const result = await queryClient.fetchQuery({
          queryKey: queryKeys.customers.detail(customerId),
          queryFn: async () => {
            const data = await getCustomerById({ data: { id: customerId } })
            if (!data) return null
            return {
              id: data.id,
              customerCode: data.customerCode,
              name: data.name,
              type: data.type,
              status: data.status,
              healthScore: data.healthScore,
              lifetimeValue: data.lifetimeValue
                ? typeof data.lifetimeValue === 'string' ? parseFloat(data.lifetimeValue) : data.lifetimeValue
                : null,
            } as CustomerSummary
          },
          staleTime: 5 * 60 * 1000,
        })
        return result
      } catch {
        return null
      }
    },
    [queryClient]
  )

  // Memoize context value
  const value = useMemo<CustomerContextValue>(
    () => ({
      currentCustomerId,
      currentCustomer: customerData ?? null,
      isLoadingCustomer,
      recentCustomers,
      setCurrentCustomer,
      addToRecent,
      clearRecent,
      searchQuery,
      setSearchQuery,
      lookupCustomer,
    }),
    [
      currentCustomerId,
      customerData,
      isLoadingCustomer,
      recentCustomers,
      setCurrentCustomer,
      addToRecent,
      clearRecent,
      searchQuery,
      lookupCustomer,
    ]
  )

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  )
}

// ============================================================================
// HOOKS
// ============================================================================

export function useCustomerContext(): CustomerContextValue {
  const context = useContext(CustomerContext)
  if (!context) {
    throw new Error('useCustomerContext must be used within a CustomerProvider')
  }
  return context
}

/**
 * Safe version that returns null if not within provider
 */
export function useCustomerContextSafe(): CustomerContextValue | null {
  return useContext(CustomerContext)
}
