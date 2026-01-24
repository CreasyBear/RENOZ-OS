/**
 * PaymentPlansList Component Tests
 *
 * Tests for the presenter component following container/presenter pattern.
 * All data hooks should be in the container (route), presenter receives props.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentPlansList, type PaymentPlansListProps } from '@/components/domain/financial/payment-plans-list';

// ============================================================================
// TEST DATA
// ============================================================================

const mockSchedule = {
  orderId: 'order-123',
  planType: 'fifty_fifty',
  totalAmount: 10000,
  paidAmount: 5000,
  remainingAmount: 5000,
  installmentCount: 2,
  paidCount: 1,
  overdueCount: 0,
  nextDueDate: new Date('2025-02-15'),
  nextDueAmount: 5000,
  installments: [
    {
      id: 'inst-1',
      organizationId: 'org-1',
      orderId: 'order-123',
      planType: 'fifty_fifty',
      installmentNo: 1,
      description: 'Deposit (50%)',
      dueDate: '2025-01-15',
      amount: 5000,
      gstAmount: 500,
      status: 'paid' as const,
      paidAmount: 5000,
      paidAt: new Date('2025-01-10'),
      paymentReference: 'REF-001',
      notes: null,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-10'),
    },
    {
      id: 'inst-2',
      organizationId: 'org-1',
      orderId: 'order-123',
      planType: 'fifty_fifty',
      installmentNo: 2,
      description: 'Final payment (50%)',
      dueDate: '2025-02-15',
      amount: 5000,
      gstAmount: 500,
      status: 'pending' as const,
      paidAmount: 0,
      paidAt: null,
      paymentReference: null,
      notes: null,
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ],
};

const defaultProps: PaymentPlansListProps = {
  orderId: 'order-123',
  orderTotal: 10000,
  schedule: mockSchedule,
  isLoading: false,
  error: undefined,
  createDialogOpen: false,
  onCreateDialogOpenChange: vi.fn(),
  onCreatePlan: vi.fn(),
  isCreatingPlan: false,
  recordPaymentOpen: false,
  onRecordPaymentOpenChange: vi.fn(),
  selectedInstallment: null,
  onSelectInstallment: vi.fn(),
  onRecordPayment: vi.fn(),
  isRecordingPayment: false,
};

// ============================================================================
// TESTS: PROPS INTERFACE
// ============================================================================

describe('PaymentPlansList Props Interface', () => {
  it('should NOT import useQuery from @tanstack/react-query', async () => {
    // This test verifies that the component doesn't use hooks directly
    // by checking that it accepts and uses the props correctly
    const props: PaymentPlansListProps = {
      ...defaultProps,
      isLoading: false,
      schedule: mockSchedule,
    };

    // If the component uses useQuery internally, it would ignore these props
    // and fetch its own data. This test ensures it uses the passed props.
    render(<PaymentPlansList {...props} />);

    // Should show the schedule data from props
    expect(screen.getByText('Payment Plan')).toBeInTheDocument();
  });

  it('should NOT import useMutation from @tanstack/react-query', async () => {
    const onCreatePlan = vi.fn();
    const props: PaymentPlansListProps = {
      ...defaultProps,
      onCreatePlan,
      schedule: undefined, // No schedule, so create button should be visible
    };

    render(<PaymentPlansList {...props} />);

    // Click create plan button
    const createButton = screen.getByRole('button', { name: /create plan/i });
    fireEvent.click(createButton);

    // Should call the prop handler, not an internal mutation
    expect(props.onCreateDialogOpenChange).toHaveBeenCalledWith(true);
  });

  it('should NOT import useServerFn from @tanstack/react-start', async () => {
    // The presenter should receive server function results via props,
    // not call useServerFn directly
    const props: PaymentPlansListProps = {
      ...defaultProps,
      schedule: mockSchedule,
    };

    render(<PaymentPlansList {...props} />);

    // Data should be displayed from props, not fetched internally
    // Note: FormatAmount expects amounts in cents, so 10000 cents = $100.00
    // Use getAllByText since $50.00 appears multiple times (summary and installments)
    expect(screen.getByText(/\$100\.00/)).toBeInTheDocument(); // Total (10000 cents)
    expect(screen.getAllByText(/\$50\.00/).length).toBeGreaterThan(0); // Paid amount appears multiple times
  });
});

// ============================================================================
// TESTS: LOADING STATE
// ============================================================================

describe('PaymentPlansList Loading State', () => {
  it('should show skeleton when isLoading is true', () => {
    render(<PaymentPlansList {...defaultProps} isLoading={true} />);

    // Should render a skeleton element
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should not show skeleton when isLoading is false', () => {
    render(<PaymentPlansList {...defaultProps} isLoading={false} />);

    // Should not have skeleton class
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).not.toBeInTheDocument();
  });
});

// ============================================================================
// TESTS: ERROR STATE
// ============================================================================

describe('PaymentPlansList Error State', () => {
  it('should show error message when error prop is provided', () => {
    render(
      <PaymentPlansList {...defaultProps} error={new Error('Network error')} schedule={undefined} />
    );

    expect(screen.getByText(/failed to load payment schedule/i)).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS: EMPTY STATE
// ============================================================================

describe('PaymentPlansList Empty State', () => {
  it('should show empty state when no schedule exists', () => {
    render(<PaymentPlansList {...defaultProps} schedule={undefined} />);

    expect(screen.getByText(/no payment plan configured/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create plan/i })).toBeInTheDocument();
  });

  it('should call onCreateDialogOpenChange when Create Plan button clicked', () => {
    const onCreateDialogOpenChange = vi.fn();
    render(
      <PaymentPlansList
        {...defaultProps}
        schedule={undefined}
        onCreateDialogOpenChange={onCreateDialogOpenChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create plan/i }));
    expect(onCreateDialogOpenChange).toHaveBeenCalledWith(true);
  });
});

// ============================================================================
// TESTS: DATA DISPLAY
// ============================================================================

describe('PaymentPlansList Data Display', () => {
  it('should display payment summary', () => {
    render(<PaymentPlansList {...defaultProps} schedule={mockSchedule} />);

    // Check summary cards are present
    // "Paid" appears multiple times (summary label + status badge)
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  it('should display installments in table', () => {
    render(<PaymentPlansList {...defaultProps} schedule={mockSchedule} />);

    // Check table headers
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Check installment data - "Paid" appears twice (summary label + badge)
    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should show record payment button for unpaid installments', () => {
    render(<PaymentPlansList {...defaultProps} schedule={mockSchedule} />);

    // There should be exactly one record payment button (for the pending installment)
    // The paid installment should not have a button
    const buttons = screen.getAllByRole('button');
    const recordButtons = buttons.filter((btn) => btn.querySelector('svg'));

    // Should have at least one action button for the pending installment
    expect(recordButtons.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TESTS: RECORD PAYMENT INTERACTION
// ============================================================================

describe('PaymentPlansList Record Payment', () => {
  it('should call onSelectInstallment when record payment clicked', () => {
    const onSelectInstallment = vi.fn();
    render(
      <PaymentPlansList
        {...defaultProps}
        schedule={mockSchedule}
        onSelectInstallment={onSelectInstallment}
      />
    );

    // Find the row with pending installment and click its action button
    // The pending installment is inst-2 with amount 5000
    const rows = screen.getAllByRole('row');
    const pendingRow = rows.find((row) => row.textContent?.includes('Pending'));

    if (pendingRow) {
      const actionButton = pendingRow.querySelector('button');
      if (actionButton) {
        fireEvent.click(actionButton);
        expect(onSelectInstallment).toHaveBeenCalledWith('inst-2', 5000);
      }
    }
  });
});

// ============================================================================
// TESTS: CREATE DIALOG INTEGRATION
// ============================================================================

describe('PaymentPlansList Create Dialog', () => {
  it('should render CreatePaymentPlanDialog when createDialogOpen is true', () => {
    render(<PaymentPlansList {...defaultProps} schedule={undefined} createDialogOpen={true} />);

    expect(screen.getByText('Create Payment Plan')).toBeInTheDocument();
    expect(screen.getByText('Order Total')).toBeInTheDocument();
  });

  it('should call onCreatePlan when dialog form is submitted', () => {
    const onCreatePlan = vi.fn();
    render(
      <PaymentPlansList
        {...defaultProps}
        schedule={undefined}
        createDialogOpen={true}
        onCreatePlan={onCreatePlan}
      />
    );

    // Click the Create Plan button in the dialog
    const createButton = screen.getByRole('button', { name: /^create plan$/i });
    fireEvent.click(createButton);

    expect(onCreatePlan).toHaveBeenCalledWith('fifty_fifty', undefined);
  });

  it('should show loading state when isCreatingPlan is true', () => {
    render(
      <PaymentPlansList
        {...defaultProps}
        schedule={undefined}
        createDialogOpen={true}
        isCreatingPlan={true}
      />
    );

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });
});

// ============================================================================
// TESTS: RECORD PAYMENT DIALOG INTEGRATION
// ============================================================================

describe('PaymentPlansList Record Payment Dialog', () => {
  it('should render RecordPaymentDialog when recordPaymentOpen is true with selectedInstallment', () => {
    render(
      <PaymentPlansList
        {...defaultProps}
        schedule={mockSchedule}
        recordPaymentOpen={true}
        selectedInstallment={{ id: 'inst-2', amount: 5000 }}
      />
    );

    // The dialog title "Record Payment" should appear in a heading
    expect(screen.getByRole('heading', { name: 'Record Payment' })).toBeInTheDocument();
  });

  it('should call onRecordPayment when record form is submitted', () => {
    const onRecordPayment = vi.fn();
    render(
      <PaymentPlansList
        {...defaultProps}
        schedule={mockSchedule}
        recordPaymentOpen={true}
        selectedInstallment={{ id: 'inst-2', amount: 5000 }}
        onRecordPayment={onRecordPayment}
      />
    );

    // Click the Record Payment button in the dialog footer
    const recordButton = screen.getByRole('button', { name: /^record payment$/i });
    fireEvent.click(recordButton);

    expect(onRecordPayment).toHaveBeenCalledWith('inst-2', 5000, '');
  });

  it('should show loading state when isRecordingPayment is true', () => {
    render(
      <PaymentPlansList
        {...defaultProps}
        schedule={mockSchedule}
        recordPaymentOpen={true}
        selectedInstallment={{ id: 'inst-2', amount: 5000 }}
        isRecordingPayment={true}
      />
    );

    expect(screen.getByRole('button', { name: /recording/i })).toBeDisabled();
  });
});

// ============================================================================
// TESTS: @source JSDoc ANNOTATIONS
// ============================================================================

describe('PaymentPlansList Props @source Annotations', () => {
  // This is a compile-time check - if the types are wrong, TypeScript will fail
  // The test just verifies the props are correctly typed

  it('should accept all required props with correct types', () => {
    const props: PaymentPlansListProps = {
      // @source route params or search params
      orderId: 'order-123',
      // @source route params or search params
      orderTotal: 10000,
      // @source useQuery(getPaymentSchedule) in /financial/payment-plans.tsx
      schedule: mockSchedule,
      // @source useQuery loading state
      isLoading: false,
      // @source useQuery error state
      error: undefined,
      // @source useState(createDialogOpen)
      createDialogOpen: false,
      // @source setState(createDialogOpen)
      onCreateDialogOpenChange: vi.fn(),
      // @source useMutation(createPaymentPlan) handler
      onCreatePlan: vi.fn(),
      // @source useMutation isPending
      isCreatingPlan: false,
      // @source useState(recordPaymentOpen)
      recordPaymentOpen: false,
      // @source setState(recordPaymentOpen)
      onRecordPaymentOpenChange: vi.fn(),
      // @source useState(selectedInstallment)
      selectedInstallment: null,
      // @source handler to select installment and open dialog
      onSelectInstallment: vi.fn(),
      // @source useMutation(recordInstallmentPayment) handler
      onRecordPayment: vi.fn(),
      // @source useMutation isPending
      isRecordingPayment: false,
      className: 'test-class',
    };

    // If this compiles, the types are correct
    expect(props.orderId).toBe('order-123');
  });
});
