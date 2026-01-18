/**
 * AmendmentRequestDialog Component Tests
 *
 * Tests for the amendment request dialog covering:
 * - Rendering states (open/closed)
 * - Form validation
 * - Amendment type selection
 * - Reason text field
 * - Changes selection
 * - Mutation handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AmendmentRequestDialog } from '@/components/domain/orders/amendment-request-dialog'

// Mock the server functions
vi.mock('@/lib/server/functions/order-amendments', () => ({
  requestAmendment: vi.fn(),
}))

vi.mock('@/lib/server/functions/orders', () => ({
  getOrderWithCustomer: vi.fn(),
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

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

describe('AmendmentRequestDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders dialog when open is true', () => {
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Request Amendment')).toBeInTheDocument()
    })

    it('does not render dialog when open is false', () => {
      render(
        <AmendmentRequestDialog
          open={false}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders amendment type selector', () => {
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Amendment Type')).toBeInTheDocument()
    })

    it('renders reason text area', () => {
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByLabelText(/reason/i)).toBeInTheDocument()
    })

    it('renders cancel and submit buttons', () => {
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /request/i })).toBeInTheDocument()
    })
  })

  describe('Amendment Type Selection', () => {
    it('renders all amendment type options', async () => {
      const user = userEvent.setup()
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      // Click to open the select
      const typeSelect = screen.getByRole('combobox', { name: /amendment type/i })
      await user.click(typeSelect)

      // Check for amendment type options
      await waitFor(() => {
        expect(screen.getByText('Quantity Change')).toBeInTheDocument()
        expect(screen.getByText('Price Change')).toBeInTheDocument()
        expect(screen.getByText('Item Add')).toBeInTheDocument()
        expect(screen.getByText('Item Remove')).toBeInTheDocument()
      })
    })

    it('updates selected amendment type', async () => {
      const user = userEvent.setup()
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      const typeSelect = screen.getByRole('combobox', { name: /amendment type/i })
      await user.click(typeSelect)

      const quantityOption = await screen.findByText('Quantity Change')
      await user.click(quantityOption)

      await waitFor(() => {
        expect(typeSelect).toHaveTextContent('Quantity Change')
      })
    })
  })

  describe('Form Validation', () => {
    it('requires amendment type to be selected', async () => {
      const user = userEvent.setup()
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      // Fill in reason but not type
      const reasonInput = screen.getByLabelText(/reason/i)
      await user.type(reasonInput, 'Test reason for amendment')

      const submitButton = screen.getByRole('button', { name: /request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please select an amendment type/i)).toBeInTheDocument()
      })
    })

    it('requires reason to be provided', async () => {
      const user = userEvent.setup()
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      // Select type but not reason
      const typeSelect = screen.getByRole('combobox', { name: /amendment type/i })
      await user.click(typeSelect)
      const quantityOption = await screen.findByText('Quantity Change')
      await user.click(quantityOption)

      const submitButton = screen.getByRole('button', { name: /request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/reason is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Actions', () => {
    it('calls onOpenChange(false) when cancel is clicked', async () => {
      const onOpenChange = vi.fn()
      const user = userEvent.setup()
      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={onOpenChange}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('disables submit button while submitting', async () => {
      const user = userEvent.setup()
      const { requestAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(requestAmendment as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      // Fill form
      const typeSelect = screen.getByRole('combobox', { name: /amendment type/i })
      await user.click(typeSelect)
      const quantityOption = await screen.findByText('Quantity Change')
      await user.click(quantityOption)

      const reasonInput = screen.getByLabelText(/reason/i)
      await user.type(reasonInput, 'Test reason')

      const submitButton = screen.getByRole('button', { name: /request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Success Handling', () => {
    it('calls onSuccess when amendment is created successfully', async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()
      const { requestAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(requestAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'amendment-1' })

      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
          onSuccess={onSuccess}
        />,
        { wrapper: createWrapper() }
      )

      // Fill form
      const typeSelect = screen.getByRole('combobox', { name: /amendment type/i })
      await user.click(typeSelect)
      const quantityOption = await screen.findByText('Quantity Change')
      await user.click(quantityOption)

      const reasonInput = screen.getByLabelText(/reason/i)
      await user.type(reasonInput, 'Test reason for amendment')

      const submitButton = screen.getByRole('button', { name: /request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('closes dialog on successful submission', async () => {
      const onOpenChange = vi.fn()
      const user = userEvent.setup()
      const { requestAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(requestAmendment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'amendment-1' })

      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={onOpenChange}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      // Fill form
      const typeSelect = screen.getByRole('combobox', { name: /amendment type/i })
      await user.click(typeSelect)
      const quantityOption = await screen.findByText('Quantity Change')
      await user.click(quantityOption)

      const reasonInput = screen.getByLabelText(/reason/i)
      await user.type(reasonInput, 'Test reason')

      const submitButton = screen.getByRole('button', { name: /request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error message when mutation fails', async () => {
      const user = userEvent.setup()
      const { requestAmendment } = await import('@/lib/server/functions/order-amendments')
      ;(requestAmendment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to request amendment'))

      const { toastError } = await import('@/hooks/use-toast')

      render(
        <AmendmentRequestDialog
          open={true}
          onOpenChange={vi.fn()}
          orderId="order-123"
        />,
        { wrapper: createWrapper() }
      )

      // Fill form
      const typeSelect = screen.getByRole('combobox', { name: /amendment type/i })
      await user.click(typeSelect)
      const quantityOption = await screen.findByText('Quantity Change')
      await user.click(quantityOption)

      const reasonInput = screen.getByLabelText(/reason/i)
      await user.type(reasonInput, 'Test reason')

      const submitButton = screen.getByRole('button', { name: /request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith('Failed to request amendment')
      })
    })
  })
})
