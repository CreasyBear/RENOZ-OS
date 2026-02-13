/**
 * HealthDashboard Container
 *
 * Container responsibilities:
 * - Fetches customer health history via useCustomerHealthHistory hook
 * - Fetches action plans via useCustomerActionPlans hook
 * - Passes data to presenter
 *
 * @see ./health-dashboard.tsx (presenter)
 * @see src/hooks/customers/use-customer-health.ts (hooks)
 * @see src/hooks/customers/use-action-plans.ts (hooks)
 */

import {
  useCustomerHealthHistory,
  useCustomerActionPlans,
  useCreateActionPlan,
  useCompleteActionPlan,
  useDeleteActionPlan,
} from '@/hooks/customers';
import {
  HealthDashboardPresenter,
  type HealthDashboardContainerProps,
} from './health-dashboard';

// ============================================================================
// CONTAINER
// ============================================================================

export function HealthDashboardContainer({
  customer,
  onScheduleCall,
  onSendEmail,
  onRefresh,
  className,
}: HealthDashboardContainerProps) {
  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  const {
    data: healthHistory,
    isLoading: isLoadingMetrics,
  } = useCustomerHealthHistory(customer.id, 6);

  // Fetch action plans
  const {
    data: actionPlansData,
    isLoading: isLoadingActionPlans,
  } = useCustomerActionPlans(customer.id);

  // Action plan mutations
  const createActionPlanMutation = useCreateActionPlan();
  const completeActionPlanMutation = useCompleteActionPlan();
  const deleteActionPlanMutation = useDeleteActionPlan();

  // Transform health history to the format expected by presenter
  const healthMetrics = healthHistory?.map((h) => ({
    metricDate: h.date,
    overallScore: h.overallScore,
    recencyScore: h.recencyScore,
    frequencyScore: h.frequencyScore,
    monetaryScore: h.monetaryScore,
    engagementScore: h.engagementScore,
  })) ?? [];

  return (
    <HealthDashboardPresenter
      customer={customer}
      healthMetrics={healthMetrics}
      isLoadingMetrics={isLoadingMetrics}
      actionPlans={actionPlansData?.items ?? []}
      isLoadingActionPlans={isLoadingActionPlans}
      onCreateActionPlan={async (data) => {
        await createActionPlanMutation.mutateAsync({
          customerId: customer.id,
          ...data,
        });
      }}
      onCompleteActionPlan={async (id) => {
        await completeActionPlanMutation.mutateAsync(id);
      }}
      onDeleteActionPlan={async (id) => {
        await deleteActionPlanMutation.mutateAsync(id);
      }}
      onScheduleCall={onScheduleCall}
      onSendEmail={onSendEmail}
      onRefresh={onRefresh}
      className={className}
    />
  );
}

export default HealthDashboardContainer;
