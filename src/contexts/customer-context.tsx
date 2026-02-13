/* eslint-disable react-refresh/only-export-components -- Context file exports provider + hook */
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
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useCustomer, usePrefetchCustomer } from '@/hooks/customers'

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

  // Fetch current customer data using hook (per STANDARDS.md)
  const { data: customerResult, isLoading: isLoadingCustomer } = useCustomer({
    id: currentCustomerId ?? '',
    enabled: !!currentCustomerId,
  })

  // Transform customer data to summary format
  const customerData = useMemo<CustomerSummary | null>(() => {
    if (!customerResult) return null
    return {
      id: customerResult.id,
      customerCode: customerResult.customerCode,
      name: customerResult.name,
      type: customerResult.type,
      status: customerResult.status,
      healthScore: customerResult.healthScore,
      lifetimeValue: customerResult.lifetimeValue
        ? typeof customerResult.lifetimeValue === 'string'
          ? parseFloat(customerResult.lifetimeValue)
          : customerResult.lifetimeValue
        : null,
    }
  }, [customerResult])

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

  // Quick lookup - uses prefetch pattern via queryClient
  const prefetchCustomer = usePrefetchCustomer()
  const lookupCustomer = useCallback(
    async (customerId: string): Promise<CustomerSummary | null> => {
      try {
        // Prefetch and return from cache
        await prefetchCustomer(customerId)
        const data = queryClient.getQueryData<CustomerSummary>(
          queryKeys.customers.detail(customerId)
        )
        return data ?? null
      } catch {
        return null
      }
    },
    [queryClient, prefetchCustomer]
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
