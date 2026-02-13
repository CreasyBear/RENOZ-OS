/**
 * Payment Plans Page (Container)
 *
 * Container component managing data fetching and mutations for payment plans.
 * Delegates rendering to PaymentPlansList presenter component.
 *
 * @see src/components/domain/financial/payment-plans-list.tsx (presenter)
 * @see src/server/functions/financial/payment-schedules.ts
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json (DOM-FIN-004)
 */

import { useState, useCallback } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FormSkeleton } from '@/components/skeletons/shared';
import { PaymentPlansList } from '@/components/domain/financial/payment-plans-list';
import type { PaymentScheduleResponse } from '@/lib/schemas';
import {
  usePaymentSchedule,
  useCreatePaymentPlan,
  useRecordInstallmentPayment,
} from '@/hooks/financial';
import { paymentPlansSearchSchema, type PaymentPlanType } from '@/lib/schemas';
import { toast } from '@/lib/toast';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/financial/payment-plans')({
  component: PaymentPlansPage,
  validateSearch: paymentPlansSearchSchema,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/financial" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Payment Plans"
        description="Customer payment plans and installment tracking"
      />
      <PageLayout.Content>
        <FormSkeleton sections={2} />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// PAGE COMPONENT (CONTAINER)
// ============================================================================

function PaymentPlansPage() {
  const { orderId, orderTotal } = Route.useSearch();
  const navigate = useNavigate();

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<{
    id: string;
    amount: number;
  } | null>(null);

  // Query: Get payment schedule for order using centralized hook
  const {
    data: scheduleData,
    isLoading,
    error,
    refetch,
  } = usePaymentSchedule(orderId ?? '', !!orderId);

  // Cast to the expected type
  const schedule = scheduleData as PaymentScheduleResponse | null;

  // Mutation: Create payment plan using centralized hook
  const createPlanMutation = useCreatePaymentPlan();

  // Mutation: Record installment payment using centralized hook
  const recordPaymentMutation = useRecordInstallmentPayment();

  // Handler: Create payment plan with forward momentum
  const handleCreatePlan = useCallback(
    (planType: PaymentPlanType, monthlyCount?: number) => {
      if (!orderId) return;
      createPlanMutation.mutate(
        {
          orderId,
          planType,
          paymentTermsDays: 30,
          numberOfPayments: monthlyCount,
        },
        {
          onSuccess: (schedule) => {
            setCreateDialogOpen(false);
            toast.success('Payment plan created successfully', {
              description: `${schedule.installments.length} installments scheduled.`,
              action: {
                label: 'View Schedule',
                onClick: () => {
                  // Schedule is already visible, but could scroll to it or highlight
                  // For now, just show success
                },
              },
            });
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to create payment plan');
          },
        }
      );
    },
    [createPlanMutation, orderId]
  );

  // Handler: Select installment and open record dialog
  const handleSelectInstallment = useCallback((id: string, amount: number) => {
    setSelectedInstallment({ id, amount });
    setRecordPaymentOpen(true);
  }, []);

  // Handler: Record payment with forward momentum
  const handleRecordPayment = useCallback(
    (installmentId: string, amount: number, paymentRef?: string) => {
      recordPaymentMutation.mutate(
        {
          installmentId,
          paidAmount: amount,
          paymentReference: paymentRef,
        },
        {
          onSuccess: () => {
            setRecordPaymentOpen(false);
            setSelectedInstallment(null);
            toast.success('Payment recorded successfully', {
              description: 'Installment status updated.',
              action: orderId ? {
                label: 'View Order',
                onClick: () => navigate({ to: '/orders/$orderId', params: { orderId } }),
              } : undefined,
            });
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to record payment');
          },
        }
      );
    },
    [recordPaymentMutation, orderId, navigate]
  );

  // Show placeholder if no orderId provided
  if (!orderId) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header
          title="Payment Plans"
          description="Customer payment plans and installment tracking"
        />
        <PageLayout.Content>
          <div className="text-muted-foreground py-8 text-center">
            <p>Select an order to view its payment plan</p>
            <p className="text-sm">
              Payment plans are managed per order. Navigate from an order detail page to view or
              create a payment plan.
            </p>
            <div className="mt-4">
              <Link
                to="/orders"
                className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
              >
                Go to Orders
              </Link>
            </div>
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Payment Plans"
        description="Customer payment plans and installment tracking"
      />
      <PageLayout.Content>
        <PaymentPlansList
          orderId={orderId}
          orderTotal={orderTotal ?? 0}
          schedule={schedule}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          createDialogOpen={createDialogOpen}
          onCreateDialogOpenChange={setCreateDialogOpen}
          onCreatePlan={handleCreatePlan}
          isCreatingPlan={createPlanMutation.isPending}
          recordPaymentOpen={recordPaymentOpen}
          onRecordPaymentOpenChange={setRecordPaymentOpen}
          selectedInstallment={selectedInstallment}
          onSelectInstallment={handleSelectInstallment}
          onRecordPayment={handleRecordPayment}
          isRecordingPayment={recordPaymentMutation.isPending}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
