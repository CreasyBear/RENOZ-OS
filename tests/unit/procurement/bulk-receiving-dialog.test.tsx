import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockToastError = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

vi.mock('@/hooks', () => ({
  toastError: (...args: unknown[]) => mockToastError(...args),
}))

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount, currency }: { amount: number | null; currency?: string }) => (
    <span>{amount == null ? 'n/a' : `${currency ?? 'AUD'} ${amount}`}</span>
  ),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    variant: _variant,
  }: {
    children: ReactNode
    disabled?: boolean
    onClick?: () => void
    variant?: string
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  buttonVariants: () => '',
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    id,
    onCheckedChange,
  }: {
    checked?: boolean | 'indeterminate'
    id?: string
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <input
      aria-checked={checked === 'indeterminate' ? 'mixed' : checked ? 'true' : 'false'}
      checked={checked === true}
      id={id}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      type="checkbox"
    />
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: ReactNode
    htmlFor?: string
  }) => <label htmlFor={htmlFor}>{children}</label>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => <div>progress:{value ?? 0}</div>,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/domain/procurement/receiving/serial-number-batch-entry', () => ({
  SerialNumberBatchEntry: ({
    existingSerialNumbers = [],
    onSerialNumbersChange,
  }: {
    existingSerialNumbers?: string[]
    onSerialNumbersChange: (serialNumbers: string[]) => void
  }) => (
    <div>
      <div>serial-entry:{existingSerialNumbers.join(',')}</div>
      <button type="button" onClick={() => onSerialNumbersChange([' sn-001 '])}>
        Use SN001
      </button>
    </div>
  ),
}))

describe('BulkReceivingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preselects caller-provided purchase orders and preserves them in the receive payload', async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      processed: 2,
      failed: 0,
      errors: [],
    })

    const { BulkReceivingDialog } = await import(
      '@/components/domain/procurement/receiving/bulk-receiving-dialog'
    )

    render(
      <BulkReceivingDialog
        open
        onOpenChange={vi.fn()}
        purchaseOrders={[
          {
            id: 'po-1',
            poNumber: 'PO-001',
            supplierName: 'RENOZ Cells',
            totalAmount: 100,
            currency: 'AUD',
          } as never,
          {
            id: 'po-2',
            poNumber: 'PO-002',
            supplierName: 'RENOZ Cells',
            totalAmount: 200,
            currency: 'AUD',
          } as never,
        ]}
        poDetailsWithSerials={[
          {
            poId: 'po-1',
            poNumber: 'PO-001',
            items: [],
            hasSerializedItems: false,
            totalSerializedQuantity: 0,
          },
          {
            poId: 'po-2',
            poNumber: 'PO-002',
            items: [],
            hasSerializedItems: false,
            totalSerializedQuantity: 0,
          },
        ]}
        onConfirm={onConfirm}
      />
    )

    expect(await screen.findByText('2 of 2 purchase orders selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('2 purchase orders ready to receive')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /receive 2 purchase orders/i }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        purchaseOrderIds: ['po-1', 'po-2'],
        serialNumbers: undefined,
      })
    })
  })

  it('does not surface raw onConfirm rejection copy from the presenter', async () => {
    const onConfirm = vi.fn().mockRejectedValue(
      new Error('duplicate key value violates unique constraint purchase_order_receipts_pkey')
    )

    const { BulkReceivingDialog } = await import(
      '@/components/domain/procurement/receiving/bulk-receiving-dialog'
    )

    render(
      <BulkReceivingDialog
        open
        onOpenChange={vi.fn()}
        purchaseOrders={[
          {
            id: 'po-1',
            poNumber: 'PO-001',
            supplierName: 'RENOZ Cells',
            totalAmount: 100,
            currency: 'AUD',
          } as never,
        ]}
        poDetailsWithSerials={[
          {
            poId: 'po-1',
            poNumber: 'PO-001',
            items: [],
            hasSerializedItems: false,
            totalSerializedQuantity: 0,
          },
        ]}
        onConfirm={onConfirm}
      />
    )

    expect(await screen.findByText('1 of 1 purchase orders selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /receive 1 purchase order/i }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText('1 purchase order ready to receive')).toBeInTheDocument()
    expect(mockToastError).not.toHaveBeenCalledWith(
      expect.stringContaining('duplicate key value violates')
    )
    expect(mockToastError).not.toHaveBeenCalledWith('Failed to process bulk receiving')
  })

  it('keeps bulk receiving on the select step while receiving details are loading', async () => {
    const onConfirm = vi.fn()

    const { BulkReceivingDialog } = await import(
      '@/components/domain/procurement/receiving/bulk-receiving-dialog'
    )

    render(
      <BulkReceivingDialog
        open
        isLoading
        onOpenChange={vi.fn()}
        purchaseOrders={[
          {
            id: 'po-1',
            poNumber: 'PO-001',
            supplierName: 'RENOZ Cells',
            totalAmount: 100,
            currency: 'AUD',
          } as never,
        ]}
        poDetailsWithSerials={[]}
        onConfirm={onConfirm}
      />
    )

    expect(await screen.findByText('1 of 1 purchase orders selected')).toBeInTheDocument()

    const nextButton = screen.getByRole('button', { name: /loading/i })
    expect(nextButton).toBeDisabled()

    fireEvent.click(nextButton)

    expect(screen.queryByText('1 purchase order ready to receive')).not.toBeInTheDocument()
    expect(mockToastError).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('blocks duplicate same-product serials before bulk receive review', async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      processed: 2,
      failed: 0,
      errors: [],
    })

    const { BulkReceivingDialog } = await import(
      '@/components/domain/procurement/receiving/bulk-receiving-dialog'
    )

    render(
      <BulkReceivingDialog
        open
        onOpenChange={vi.fn()}
        purchaseOrders={[
          {
            id: 'po-1',
            poNumber: 'PO-001',
            supplierName: 'RENOZ Cells',
            totalAmount: 100,
            currency: 'AUD',
          } as never,
          {
            id: 'po-2',
            poNumber: 'PO-002',
            supplierName: 'RENOZ Cells',
            totalAmount: 200,
            currency: 'AUD',
          } as never,
        ]}
        poDetailsWithSerials={[
          {
            poId: 'po-1',
            poNumber: 'PO-001',
            items: [
              {
                id: 'po-item-1',
                productId: 'product-1',
                productName: 'RENOZ LFP Module',
                productSku: 'LFP-100',
                quantityPending: 1,
                requiresSerialNumbers: true,
              },
            ],
            hasSerializedItems: true,
            totalSerializedQuantity: 1,
          },
          {
            poId: 'po-2',
            poNumber: 'PO-002',
            items: [
              {
                id: 'po-item-2',
                productId: 'product-1',
                productName: 'RENOZ LFP Module',
                productSku: 'LFP-100',
                quantityPending: 1,
                requiresSerialNumbers: true,
              },
            ],
            hasSerializedItems: true,
            totalSerializedQuantity: 1,
          },
        ]}
        onConfirm={onConfirm}
      />
    )

    expect(await screen.findByText('2 of 2 purchase orders selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    const serialButtons = screen.getAllByRole('button', { name: /use sn001/i })
    fireEvent.click(serialButtons[0])
    fireEvent.click(serialButtons[1])
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(mockToastError).toHaveBeenCalledWith(
      'PO-002 - RENOZ LFP Module: Serial SN-001 appears multiple times in this bulk receipt.'
    )
    expect(screen.queryByText('2 purchase orders ready to receive')).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('returns failed serialized bulk receipts to serial review instead of retrying immediately', async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      processed: 0,
      failed: 1,
      errors: [
        {
          poId: 'po-1',
          error: 'Serial "SN-001" already exists in stock.',
          code: 'invalid_serial_state',
        },
      ],
    })

    const { BulkReceivingDialog } = await import(
      '@/components/domain/procurement/receiving/bulk-receiving-dialog'
    )

    render(
      <BulkReceivingDialog
        open
        onOpenChange={vi.fn()}
        purchaseOrders={[
          {
            id: 'po-1',
            poNumber: 'PO-001',
            supplierName: 'RENOZ Cells',
            totalAmount: 100,
            currency: 'AUD',
          } as never,
        ]}
        poDetailsWithSerials={[
          {
            poId: 'po-1',
            poNumber: 'PO-001',
            items: [
              {
                id: 'po-item-1',
                productId: 'product-1',
                productName: 'RENOZ LFP Module',
                productSku: 'LFP-100',
                quantityPending: 1,
                requiresSerialNumbers: true,
              },
            ],
            hasSerializedItems: true,
            totalSerializedQuantity: 1,
          },
        ]}
        onConfirm={onConfirm}
      />
    )

    expect(await screen.findByText('1 of 1 purchase orders selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /use sn001/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /receive 1 purchase order/i }))

    expect(await screen.findByText('Failed Purchase Orders')).toBeInTheDocument()
    expect(screen.getByText('Serial "SN-001" already exists in stock.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /review failed serials/i }))

    expect(screen.getByText(/1 serialized item require serial numbers/i)).toBeInTheDocument()
    expect(screen.getByText(/serial-entry: sn-001/i)).toBeInTheDocument()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
