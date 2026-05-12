import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

const mockCreateCustomer = vi.fn()
const mockUpdateCustomerBundle = vi.fn()
const mockCreateContact = vi.fn()
const mockUpdateContact = vi.fn()
const mockDeleteContact = vi.fn()
const mockCreateAddress = vi.fn()
const mockUpdateAddress = vi.fn()
const mockDeleteAddress = vi.fn()
const mockUseServerFn = vi.fn((fn: unknown) => fn)

vi.mock('@tanstack/react-start', () => ({
  useServerFn: (fn: unknown) => mockUseServerFn(fn),
}))

vi.mock('@/server/functions/customers/customers', () => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
  getCustomerTags: vi.fn(),
  createCustomer: (...args: unknown[]) => mockCreateCustomer(...args),
  updateCustomerBundle: (...args: unknown[]) => mockUpdateCustomerBundle(...args),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  bulkDeleteCustomers: vi.fn(),
  bulkUpdateCustomers: vi.fn(),
  bulkAssignTags: vi.fn(),
  bulkUpdateHealthScores: vi.fn(),
  deleteCustomerTag: vi.fn(),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  updateContact: (...args: unknown[]) => mockUpdateContact(...args),
  deleteContact: (...args: unknown[]) => mockDeleteContact(...args),
  createAddress: (...args: unknown[]) => mockCreateAddress(...args),
  updateAddress: (...args: unknown[]) => mockUpdateAddress(...args),
  deleteAddress: (...args: unknown[]) => mockDeleteAddress(...args),
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('refreshes contact mutation surfaces without customer or contact root invalidation', async () => {
    const customerId = '550e8400-e29b-41d4-a716-446655440000'
    mockUpdateContact.mockResolvedValue({ id: 'contact-1', customerId })
    mockDeleteContact.mockResolvedValue({ success: true, id: 'contact-1', customerId })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { Wrapper } = createWrapper(queryClient)

    const { useUpdateContact, useDeleteContact } = await import(
      '@/hooks/customers/use-customer-contacts'
    )

    const updateHook = renderHook(() => useUpdateContact(), { wrapper: Wrapper })
    const deleteHook = renderHook(() => useDeleteContact(), { wrapper: Wrapper })

    await act(async () => {
      await updateHook.result.current.mutateAsync({
        id: 'contact-1',
        firstName: 'Ada',
      })
      await deleteHook.result.current.mutateAsync('contact-1')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.detail(customerId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.contacts.byCustomer(customerId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.contacts.detail('contact-1'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.customers.all,
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.contacts.all,
    })
  })

  it('refreshes address mutation customer detail without customer root invalidation', async () => {
    const customerId = '550e8400-e29b-41d4-a716-446655440000'
    mockUpdateAddress.mockResolvedValue({ id: 'address-1', customerId })
    mockDeleteAddress.mockResolvedValue({ success: true, id: 'address-1', customerId })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { Wrapper } = createWrapper(queryClient)

    const { useUpdateAddress, useDeleteAddress } = await import(
      '@/hooks/customers/use-customer-addresses'
    )

    const updateHook = renderHook(() => useUpdateAddress(), { wrapper: Wrapper })
    const deleteHook = renderHook(() => useDeleteAddress(), { wrapper: Wrapper })

    await act(async () => {
      await updateHook.result.current.mutateAsync({
        id: 'address-1',
        city: 'Perth',
      })
      await deleteHook.result.current.mutateAsync('address-1')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.detail(customerId),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.customers.all,
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

  it('refreshes customer bundle mutation surfaces without customer or contact root invalidation', async () => {
    const customerId = '550e8400-e29b-41d4-a716-446655440000'
    mockUpdateCustomerBundle.mockResolvedValue({ id: customerId, name: 'Acme Energy' })

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { Wrapper } = createWrapper(queryClient)

    const { useUpdateCustomerBundle } = await import('@/hooks/customers/use-customers')
    const { result } = renderHook(() => useUpdateCustomerBundle(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        id: customerId,
        customer: { name: 'Acme Energy' },
        contacts: [
          {
            id: '660e8400-e29b-41d4-a716-446655440001',
            firstName: 'Ada',
            lastName: 'Lovelace',
            isPrimary: true,
            decisionMaker: true,
            influencer: false,
            emailOptIn: true,
            smsOptIn: false,
          },
          {
            firstName: 'Grace',
            lastName: 'Hopper',
            isPrimary: false,
            decisionMaker: false,
            influencer: true,
            emailOptIn: true,
            smsOptIn: false,
          },
        ],
        addresses: [],
      })
    })

    expect(mockUpdateCustomerBundle).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: customerId }),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.detail(customerId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.infiniteLists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.contacts.byCustomer(customerId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.contacts.lists(),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.contacts.detail('660e8400-e29b-41d4-a716-446655440001'),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.customers.all,
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.contacts.all,
    })
  })
})
