/**
 * AmendmentReviewDialog Component Tests
 *
 * Tests for the amendment review dialog covering:
 * - Rendering states (loading, with amendment data)
 * - Original vs proposed changes diff display
 * - Approve/reject buttons
 * - Rejection reason field
 * - Mutation handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AmendmentReviewDialog } from '@/components/domain/orders/amendment-review-dialog'

// Mock the server functions
vi.mock('@/lib/server/functions/order-amendments', () => ({
  getAmendment: vi.fn(),
  approveAmendment: vi.fn(),
  rejectAmendment: vi.fn(),
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

// Mock amendment data
const mockAmendment = {
  id: 'amendment-1',
  orderId: 'order-123',
  amendmentType: 'quantity_change',
  reason: 'Customer requested more items',
  status: 'pending',
  requestedAt: new Date('2024-01-15').toISOString(),
  changes: {
    type: 'quantity_change',
    description: 'Increase quantity for item',
    itemChanges: [
      {
        orderLineItemId: 'line-1',
        action: 'modify',
        before: { quantity: 5, unitPrice: 100 },
        after: { quantity: 10, unitPrice: 100 },
      },
    ],
    financialImpact: {
      subtotalBefore: 500,
      subtotalAfter: 1000,
      taxBefore: 50,
      taxAfter: 100,
      totalBefore: 550,
      totalAfter: 1100,
      difference: 550,
    },
  },
  requester: { name: 'John Doe', email: 'john@example.com' },
}

// Create QueryClient wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('AmendmentReviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders dialog when open is true', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Review Amendment')).toBeInTheDocument()
    })

    it('does not render dialog when open is false', () => {
      render(
        <AmendmentReviewDialog
          open={false}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows loading state while fetching amendment', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAmendment), 1000))
      )

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('renders amendment details when loaded', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Quantity Change')).toBeInTheDocument()
        expect(screen.getByText('Customer requested more items')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })
  })

  describe('Changes Diff Display', () => {
    it('shows before and after values for item changes', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Check for before values
        expect(screen.getByText(/5/)).toBeInTheDocument() // Before quantity
        // Check for after values
        expect(screen.getByText(/10/)).toBeInTheDocument() // After quantity
      })
    })

    it('shows financial impact summary', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/\$550\.00/)).toBeInTheDocument() // Total before
        expect(screen.getByText(/\$1,100\.00/)).toBeInTheDocument() // Total after
        expect(screen.getByText(/\+\$550\.00/)).toBeInTheDocument() // Difference
      })
    })
  })

  describe('Approve Action', () => {
    it('renders approve button', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
      })
    })

    it('calls approveAmendment when approve is clicked', async () => {
      const user = userEvent.setup()
      const { getAmendment, approveAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)
      ;(approveAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockAmendment, status: 'approved' })

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
      })

      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)

      await waitFor(() => {
        expect(approveAmendment).toHaveBeenCalledWith({
          data: {
            amendmentId: 'amendment-1',
            notes: undefined,
          },
        })
      })
    })

    it('calls onSuccess after successful approval', async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      const { getAmendment, approveAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)
      ;(approveAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockAmendment, status: 'approved' })

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
      })

      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Reject Action', () => {
    it('renders reject button', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
      })
    })

    it('shows rejection reason field when reject is clicked', async () => {
      const user = userEvent.setup()
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
      })

      const rejectButton = screen.getByRole('button', { name: /reject/i })
      await user.click(rejectButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument()
      })
    })

    it('requires rejection reason before confirming reject', async () => {
      const user = userEvent.setup()
      const { getAmendment, rejectAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)
      ;(rejectAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockAmendment, status: 'rejected' })

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
      })

      const rejectButton = screen.getByRole('button', { name: /reject/i })
      await user.click(rejectButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument()
      })

      // Try to confirm without reason
      const confirmRejectButton = screen.getByRole('button', { name: /confirm reject/i })
      await user.click(confirmRejectButton)

      await waitFor(() => {
        expect(screen.getByText(/rejection reason is required/i)).toBeInTheDocument()
      })
    })

    it('calls rejectAmendment with reason when confirmed', async () => {
      const user = userEvent.setup()
      const { getAmendment, rejectAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)
      ;(rejectAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockAmendment, status: 'rejected' })

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
      })

      const rejectButton = screen.getByRole('button', { name: /reject/i })
      await user.click(rejectButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument()
      })

      const reasonInput = screen.getByLabelText(/rejection reason/i)
      await user.type(reasonInput, 'Budget constraints')

      const confirmRejectButton = screen.getByRole('button', { name: /confirm reject/i })
      await user.click(confirmRejectButton)

      await waitFor(() => {
        expect(rejectAmendment).toHaveBeenCalledWith({
          data: {
            amendmentId: 'amendment-1',
            reason: 'Budget constraints',
          },
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error message when approval fails', async () => {
      const user = userEvent.setup()
      const { getAmendment, approveAmendment } = await import('@/lib/server/functions/order-amendments')
      const { toastError } = await import('@/hooks/use-toast')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendment)
      ;(approveAmendment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Approval failed'))

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
      })

      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith('Approval failed')
      })
    })

    it('shows error when amendment fetch fails', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'))

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load amendment/i)).toBeInTheDocument()
      })
    })
  })

  describe('Non-Pending Amendment', () => {
    it('disables approve/reject buttons for non-pending amendments', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockAmendment,
        status: 'approved',
      })

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const approveButton = screen.queryByRole('button', { name: /approve/i })
        const rejectButton = screen.queryByRole('button', { name: /reject/i })

        // Buttons should not be present for non-pending amendments
        expect(approveButton).not.toBeInTheDocument()
        expect(rejectButton).not.toBeInTheDocument()
      })
    })

    it('shows status badge for already processed amendments', async () => {
      const { getAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockAmendment,
        status: 'approved',
      })

      render(
        <AmendmentReviewDialog
          open={true}
          onOpenChange={vi.fn()}
          amendmentId="amendment-1"
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument()
      })
    })
  })
})
