import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockCreateCustomer = vi.fn()
const mockCreateContact = vi.fn()
const mockCreateAddress = vi.fn()
const mockUseServerFn = vi.fn((fn: unknown) => fn)

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}))

vi.mock('@/server/functions/customers/customers', () => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
  getCustomerTags: vi.fn(),
  createCustomer: (...args: unknown[]) => mockCreateCustomer(...args),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  bulkDeleteCustomers: vi.fn(),
  bulkUpdateCustomers: vi.fn(),
  bulkAssignTags: vi.fn(),
  bulkUpdateHealthScores: vi.fn(),
  deleteCustomerTag: vi.fn(),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  createAddress: (...args: unknown[]) => mockCreateAddress(...args),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
}))

vi.mock('@/server/functions/financial/xero-operations', () => ({
  getCustomerXeroMappingStatus: vi.fn(),
  searchCustomerXeroContacts: vi.fn(),
  createCustomerXeroContact: vi.fn(),
  linkCustomerXeroContact: vi.fn(),
  unlinkCustomerXeroContact: vi.fn(),
}))

function createWrapper(queryClient = new QueryClient()) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'CustomerMutationHooksWrapper'
  return { Wrapper, queryClient }
}

describe('customer mutation hooks', () => {
  it('useCreateCustomer calls the canonical customer server function', async () => {
    mockCreateCustomer.mockResolvedValue({ id: 'customer-1' })

    const { useCreateCustomer } = await import('@/hooks/customers/use-customers')
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateCustomer(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Acme',
        status: 'prospect',
        type: 'business',
        creditHold: false,
        tags: [],
        email: '',
        phone: '',
        website: '',
        warrantyExpiryAlertOptOut: false,
      })
    })

    expect(mockCreateCustomer).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Acme' }),
    })
    expect(mockUseServerFn).toHaveBeenCalled()
  })

  it('contact and address hooks call the canonical customer server barrel', async () => {
    mockCreateContact.mockResolvedValue({ id: 'contact-1' })
    mockCreateAddress.mockResolvedValue({ id: 'address-1' })

    const { useCreateContact } = await import('@/hooks/customers/use-customer-contacts')
    const { useCreateAddress } = await import('@/hooks/customers/use-customer-addresses')

    const { Wrapper } = createWrapper()
    const contactHook = renderHook(() => useCreateContact(), { wrapper: Wrapper })
    const addressHook = renderHook(() => useCreateAddress(), { wrapper: Wrapper })

    await act(async () => {
      await contactHook.result.current.mutateAsync({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'Ada',
        lastName: 'Lovelace',
      })

      await addressHook.result.current.mutateAsync({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'billing',
        street1: '1 Main St',
        city: 'Perth',
        postcode: '6000',
        country: 'AU',
      })
    })

    expect(mockCreateContact).toHaveBeenCalledWith({
      data: expect.objectContaining({ firstName: 'Ada' }),
    })
    expect(mockCreateAddress).toHaveBeenCalledWith({
      data: expect.objectContaining({ street1: '1 Main St' }),
    })
  })

  it('useCreateCustomer invalidates finite and infinite customer lists together', async () => {
    mockCreateCustomer.mockResolvedValue({ id: 'customer-2' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { Wrapper } = createWrapper(queryClient)

    const { useCreateCustomer } = await import('@/hooks/customers/use-customers')
    const { result } = renderHook(() => useCreateCustomer(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Globex',
        status: 'prospect',
        type: 'business',
        creditHold: false,
        tags: [],
        email: '',
        phone: '',
        website: '',
        warrantyExpiryAlertOptOut: false,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.infiniteLists(),
    })
  })
})
