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
  SerialNumberBatchEntry: () => <div>serial-entry</div>,
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
})
