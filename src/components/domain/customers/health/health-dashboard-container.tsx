/**
 * HealthDashboard Container
 *
 * Container responsibilities:
 * - Fetches customer health history via useCustomerHealthHistory hook
 * - Passes data to presenter
 *
 * @see ./health-dashboard.tsx (presenter)
 * @see src/hooks/customers/use-customer-health.ts (hooks)
 */

import { useCustomerHealthHistory } from '@/hooks/customers';
import { HealthDashboardPresenter } from './health-dashboard';
import type { HealthDashboardContainerProps } from './health-dashboard';

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
      onScheduleCall={onScheduleCall}
      onSendEmail={onSendEmail}
      onRefresh={onRefresh}
      className={className}
    />
  );
}

export default HealthDashboardContainer;
