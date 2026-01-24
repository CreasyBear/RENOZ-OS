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
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { FormSkeleton } from '@/components/skeletons/shared';
import { PaymentPlansList, type PaymentSchedule } from '@/components/domain/financial/payment-plans-list';
import {
  createPaymentPlan,
  getPaymentSchedule,
  recordInstallmentPayment,
} from '@/server/functions/financial/payment-schedules';
import type { PaymentPlanType } from '@/lib/schemas';
import { queryKeys } from '@/lib/query-keys';

// ============================================================================
// SEARCH PARAMS SCHEMA
// ============================================================================

const paymentPlansSearchSchema = z.object({
  orderId: z.string().optional(),
  orderTotal: z.coerce.number().optional(),
});

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
    <PageLayout>
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
  const queryClient = useQueryClient();
  const { orderId, orderTotal } = Route.useSearch();

  // Server function wrappers
  const getScheduleFn = useServerFn(getPaymentSchedule);
  const createPlanFn = useServerFn(createPaymentPlan);
  const recordPaymentFn = useServerFn(recordInstallmentPayment);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<{
    id: string;
    amount: number;
  } | null>(null);

  // Query: Get payment schedule for order
  // Note: Server returns PaymentPlanSummary which is compatible with PaymentSchedule
  const {
    data: schedule,
    isLoading,
    error,
  } = useQuery<PaymentSchedule | null>({
    queryKey: queryKeys.financial.paymentScheduleDetail(orderId!),
    queryFn: async () => {
      const result = await getScheduleFn({ data: { orderId: orderId! } });
      return result as PaymentSchedule | null;
    },
    enabled: !!orderId,
  });

  // Mutation: Create payment plan
  const createPlanMutation = useMutation({
    mutationFn: (params: { planType: PaymentPlanType; numberOfPayments?: number }) =>
      createPlanFn({
        data: {
          orderId: orderId!,
          planType: params.planType,
          numberOfPayments: params.numberOfPayments,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.paymentScheduleDetail(orderId!) });
      setCreateDialogOpen(false);
    },
  });

  // Mutation: Record installment payment
  const recordPaymentMutation = useMutation({
    mutationFn: (params: { installmentId: string; paidAmount: number; paymentReference?: string }) =>
      recordPaymentFn({
        data: {
          installmentId: params.installmentId,
          paidAmount: params.paidAmount,
          paymentReference: params.paymentReference,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.paymentScheduleDetail(orderId!) });
      setRecordPaymentOpen(false);
      setSelectedInstallment(null);
    },
  });

  // Handler: Create payment plan
  const handleCreatePlan = useCallback(
    (planType: PaymentPlanType, monthlyCount?: number) => {
      createPlanMutation.mutate({
        planType,
        numberOfPayments: monthlyCount,
      });
    },
    [createPlanMutation]
  );

  // Handler: Select installment and open record dialog
  const handleSelectInstallment = useCallback((id: string, amount: number) => {
    setSelectedInstallment({ id, amount });
    setRecordPaymentOpen(true);
  }, []);

  // Handler: Record payment
  const handleRecordPayment = useCallback(
    (installmentId: string, amount: number, paymentRef?: string) => {
      recordPaymentMutation.mutate({
        installmentId,
        paidAmount: amount,
        paymentReference: paymentRef,
      });
    },
    [recordPaymentMutation]
  );

  // Show placeholder if no orderId provided
  if (!orderId) {
    return (
      <PageLayout>
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
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
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
