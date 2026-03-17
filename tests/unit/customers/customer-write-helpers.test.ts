import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockEnqueueSearchIndexOutbox = vi.fn()
const mockCustomersLogger = {
  warn: vi.fn(),
}

vi.mock('@/server/functions/_shared/search-index-outbox', () => ({
  enqueueSearchIndexOutbox: (...args: unknown[]) => mockEnqueueSearchIndexOutbox(...args),
}))

vi.mock('@/lib/logger', () => ({
  customersLogger: mockCustomersLogger,
}))

describe('customer write helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes blank optional customer fields', async () => {
    const { normalizeCustomerMutationInput } = await import(
      '@/server/functions/customers/customer-write-helpers'
    )

    expect(
      normalizeCustomerMutationInput({
        legalName: '',
        industry: '  ',
        taxId: '',
        registrationNumber: '',
        creditHoldReason: '',
        xeroContactId: ' ',
        parentId: '',
      })
    ).toEqual({
      legalName: undefined,
      industry: undefined,
      taxId: undefined,
      registrationNumber: undefined,
      creditHoldReason: undefined,
      xeroContactId: null,
      parentId: undefined,
    })
  })

  it('preserves existing xeroContactId when update input does not include it', async () => {
    const { normalizeCustomerMutationInput } = await import(
      '@/server/functions/customers/customer-write-helpers'
    )

    expect(
      normalizeCustomerMutationInput({
        name: 'Acme',
        legalName: '  ',
      })
    ).toEqual({
      name: 'Acme',
      legalName: undefined,
    })
  })

  it('normalizes blank optional contact and address fields', async () => {
    const { normalizeContactMutationInput, normalizeAddressMutationInput } = await import(
      '@/server/functions/customers/customer-write-helpers'
    )

    expect(
      normalizeContactMutationInput({
        title: '',
        department: ' ',
        notes: '',
      })
    ).toEqual({
      title: undefined,
      department: undefined,
      notes: undefined,
    })

    expect(
      normalizeAddressMutationInput({
        street2: '',
        state: ' ',
        notes: '',
      })
    ).toEqual({
      street2: undefined,
      state: undefined,
      notes: undefined,
    })
  })

  it('logs and swallows search outbox failures', async () => {
    mockEnqueueSearchIndexOutbox.mockRejectedValue(new Error('outbox unavailable'))

    const { enqueueCustomerSearchOutbox } = await import(
      '@/server/functions/customers/customer-write-helpers'
    )

    await expect(
      enqueueCustomerSearchOutbox(
        'org-1',
        {
          id: 'customer-1',
          name: 'Acme',
          email: null,
          phone: null,
        },
        'upsert'
      )
    ).resolves.toBeUndefined()

    expect(mockCustomersLogger.warn).toHaveBeenCalledWith(
      'Customer search outbox enqueue failed',
      expect.objectContaining({
        customerId: 'customer-1',
        action: 'upsert',
      })
    )
  })
})
