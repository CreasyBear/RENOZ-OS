/**
 * AmendmentList Component Tests
 *
 * Tests for the amendment list component covering:
 * - Rendering states (loading, empty, with data, error)
 * - Status badges
 * - Dates display
 * - Requester name
 * - Action buttons
 * - Filtering
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AmendmentList } from '@/components/domain/orders/amendment-list'

// Mock the server functions
vi.mock('@/lib/server/functions/order-amendments', () => ({
  getOrderAmendments: vi.fn(),
  cancelAmendment: vi.fn(),
  applyAmendment: vi.fn(),
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

// Mock amendment data
const mockAmendments = [
  {
    id: 'amendment-1',
    amendmentType: 'quantity_change',
    reason: 'Customer requested increase',
    status: 'pending',
    requestedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
    reviewedAt: null,
    appliedAt: null,
    requesterName: 'John Doe',
    changes: {
      type: 'quantity_change',
      description: 'Increase quantity',
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
    approvalNotes: null,
  },
  {
    id: 'amendment-2',
    amendmentType: 'price_change',
    reason: 'Discount applied',
    status: 'approved',
    requestedAt: new Date('2024-01-14T10:00:00Z').toISOString(),
    reviewedAt: new Date('2024-01-14T14:00:00Z').toISOString(),
    appliedAt: null,
    requesterName: 'Jane Smith',
    changes: {
      type: 'price_change',
      description: 'Price adjustment',
      financialImpact: {
        subtotalBefore: 1000,
        subtotalAfter: 900,
        taxBefore: 100,
        taxAfter: 90,
        totalBefore: 1100,
        totalAfter: 990,
        difference: -110,
      },
    },
    approvalNotes: { note: 'Approved per manager' },
  },
  {
    id: 'amendment-3',
    amendmentType: 'item_remove',
    reason: 'Item no longer needed',
    status: 'applied',
    requestedAt: new Date('2024-01-13T10:00:00Z').toISOString(),
    reviewedAt: new Date('2024-01-13T11:00:00Z').toISOString(),
    appliedAt: new Date('2024-01-13T12:00:00Z').toISOString(),
    requesterName: 'Bob Wilson',
    changes: {
      type: 'item_remove',
      description: 'Remove item from order',
    },
    approvalNotes: null,
  },
]

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

describe('AmendmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('shows loading state while fetching', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAmendments), 1000))
      )

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      expect(screen.getByTestId('amendments-loading')).toBeInTheDocument()
    })

    it('shows empty state when no amendments', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/no amendments/i)).toBeInTheDocument()
      })
    })

    it('shows error state when fetch fails', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to load'))

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/failed to load amendments/i)).toBeInTheDocument()
      })
    })

    it('renders list of amendments', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendments)

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Customer requested increase')).toBeInTheDocument()
        expect(screen.getByText('Discount applied')).toBeInTheDocument()
        expect(screen.getByText('Item no longer needed')).toBeInTheDocument()
      })
    })
  })

  describe('Status Badges', () => {
    it('renders pending badge with correct styling', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[0]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        const badge = screen.getByText('Pending')
        expect(badge).toBeInTheDocument()
        expect(badge).toHaveClass('bg-yellow-100')
      })
    })

    it('renders approved badge with correct styling', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[1]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        const badge = screen.getByText('Approved')
        expect(badge).toBeInTheDocument()
        expect(badge).toHaveClass('bg-blue-100')
      })
    })

    it('renders applied badge with correct styling', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[2]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        const badge = screen.getByText('Applied')
        expect(badge).toBeInTheDocument()
        expect(badge).toHaveClass('bg-green-100')
      })
    })
  })

  describe('Amendment Type Labels', () => {
    it('displays human-readable amendment type labels', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendments)

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Quantity Change')).toBeInTheDocument()
        expect(screen.getByText('Price Change')).toBeInTheDocument()
        expect(screen.getByText('Item Remove')).toBeInTheDocument()
      })
    })
  })

  describe('Dates Display', () => {
    it('shows requested date for all amendments', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[0]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument()
      })
    })

    it('shows approved date when available', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[1]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/reviewed/i)).toBeInTheDocument()
        expect(screen.getByText(/14\/01\/2024/)).toBeInTheDocument()
      })
    })

    it('shows applied date when available', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[2]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/applied/i)).toBeInTheDocument()
        expect(screen.getByText(/13\/01\/2024/)).toBeInTheDocument()
      })
    })
  })

  describe('Requester Name', () => {
    it('displays requester name', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue(mockAmendments)

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
      })
    })
  })

  describe('Action Buttons', () => {
    it('shows review button for pending amendments', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[0]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument()
      })
    })

    it('shows apply button for approved amendments', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[1]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
      })
    })

    it('shows cancel button for pending amendments', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[0]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })

    it('does not show action buttons for applied amendments', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[2]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /review/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
      })
    })

    it('calls onReview when review button is clicked', async () => {
      const onReview = vi.fn()
      const user = userEvent.setup()
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[0]])

      render(<AmendmentList orderId="order-123" onReview={onReview} />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument()
      })

      const reviewButton = screen.getByRole('button', { name: /review/i })
      await user.click(reviewButton)

      expect(onReview).toHaveBeenCalledWith('amendment-1')
    })

    it('calls applyAmendment when apply button is clicked', async () => {
      const user = userEvent.setup()
      const { getOrderAmendments, applyAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[1]])
      ;(applyAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockAmendments[1], status: 'applied' })

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(applyAmendment).toHaveBeenCalledWith({
          data: { amendmentId: 'amendment-2', forceApply: false },
        })
      })
    })

    it('calls cancelAmendment when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const { getOrderAmendments, cancelAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[0]])
      ;(cancelAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockAmendments[0], status: 'cancelled' })

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(cancelAmendment).toHaveBeenCalledWith({
          data: { amendmentId: 'amendment-1' },
        })
      })
    })
  })

  describe('Financial Impact Display', () => {
    it('shows financial impact when available', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[0]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/\+\$550\.00/)).toBeInTheDocument()
      })
    })

    it('shows negative impact with minus sign', async () => {
      const { getOrderAmendments } = await import('@/lib/server/functions/order-amendments')
      ;(getOrderAmendments as ReturnType<typeof vi.fn>).mockResolvedValue([mockAmendments[1]])

      render(<AmendmentList orderId="order-123" />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/-\$110\.00/)).toBeInTheDocument()
      })
    })
  })
})
