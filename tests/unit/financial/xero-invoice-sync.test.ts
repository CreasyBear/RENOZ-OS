import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbState = vi.hoisted(() => ({
  order: {
    id: 'order-1',
    total: 100,
    organizationId: 'org-1',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  updatedOrder: {
    paidAmount: '110.00',
    balanceDue: '-10.00',
    paymentStatus: 'paid',
  },
  committedPayments: [] as Array<Record<string, unknown>>,
  eventStates: [] as string[],
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({
      handler: (handler: unknown) => handler,
    }),
  }),
}))

vi.mock('@tanstack/react-start/server', () => ({
  setResponseStatus: vi.fn(),
}))

vi.mock('@/lib/server/protected', () => ({
  withAuth: vi.fn(),
}))

vi.mock('@/server/functions/orders/order-payments', () => ({
  updateOrderPaymentStatus: vi.fn(async () => undefined),
}))

vi.mock('@/server/functions/financial/xero-adapter', () => ({
  getInvoiceDetailsFromXero: vi.fn(),
  getInvoiceStatusFromXero: vi.fn(),
  getInvoiceUrl: vi.fn(),
  getXeroPaymentById: vi.fn(),
  getXeroSyncReadiness: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: 'event-1' }],
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [dbState.order],
        }),
      }),
    }),
    update: () => ({
      set: (values: { resultState?: string }) => ({
        where: async () => {
          if (values.resultState) {
            dbState.eventStates.push(values.resultState)
          }
        },
      }),
    }),
    transaction: async (
      callback: (tx: {
        insert: () => { values: (values: Record<string, unknown>) => Promise<void> }
        select: () => {
          from: () => {
            where: () => {
              limit: () => Promise<Array<typeof dbState.updatedOrder>>
            }
          }
        }
      }) => Promise<unknown>
    ) => {
      const stagedPayments: Array<Record<string, unknown>> = []
      const tx = {
        insert: () => ({
          values: async (values: Record<string, unknown>) => {
            stagedPayments.push(values)
          },
        }),
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [dbState.updatedOrder],
            }),
          }),
        }),
      }

      const result = await callback(tx)
      dbState.committedPayments.push(...stagedPayments)
      return result
    },
  },
}))

describe('applyXeroPaymentUpdate', () => {
  beforeEach(() => {
    dbState.committedPayments = []
    dbState.eventStates = []
    dbState.order = {
      id: 'order-1',
      total: 100,
      organizationId: 'org-1',
      createdBy: 'user-1',
      updatedBy: 'user-1',
    }
    dbState.updatedOrder = {
      paidAmount: '110.00',
      balanceDue: '-10.00',
      paymentStatus: 'paid',
    }
  })

  it('rejects overpayments without committing payment side effects', async () => {
    const { applyXeroPaymentUpdate } = await import('@/server/functions/financial/xero-invoice-sync')

    const result = await applyXeroPaymentUpdate({
      organizationId: 'org-1',
      xeroInvoiceId: 'inv-1',
      paymentId: 'payment-1',
      amountPaid: 110,
      paymentDate: '2026-03-17',
      reference: 'PAY-1',
    })

    expect(result).toMatchObject({
      success: false,
      resultState: 'rejected',
    })
    expect(dbState.committedPayments).toEqual([])
    expect(dbState.eventStates).toContain('rejected')
  })
})
