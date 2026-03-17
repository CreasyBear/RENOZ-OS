import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

function createWrapper() {
  const queryClient = new QueryClient()
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'CustomerMutationHooksWrapper'
  return Wrapper
}

describe('customer mutation hooks', () => {
  it('useCreateCustomer calls the canonical customer server function', async () => {
    mockCreateCustomer.mockResolvedValue({ id: 'customer-1' })

    const { useCreateCustomer } = await import('@/hooks/customers/use-customers')
    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() })

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

    const contactHook = renderHook(() => useCreateContact(), { wrapper: createWrapper() })
    const addressHook = renderHook(() => useCreateAddress(), { wrapper: createWrapper() })

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
})
