import {
  getInventoryDashboardReadErrorMessage,
  getWmsDashboardReadErrorMessage,
} from './dashboard-read-error-messages';

interface BuildInventoryDashboardReadStateInput {
  wmsData: unknown;
  dashboardData: unknown;
  wmsError: unknown;
  dashboardError: unknown;
  isWmsLoading: boolean;
  isDashboardLoading: boolean;
}

export interface InventoryDashboardReadState {
  isLoading: boolean;
  showWmsUnavailable: boolean;
  showWmsDegraded: boolean;
  showDashboardUnavailable: boolean;
  showDashboardDegraded: boolean;
  wmsErrorMessage: string;
  dashboardErrorMessage: string;
}

export function buildInventoryDashboardReadState({
  wmsData,
  dashboardData,
  wmsError,
  dashboardError,
  isWmsLoading,
  isDashboardLoading,
}: BuildInventoryDashboardReadStateInput): InventoryDashboardReadState {
  const hasUsableWmsData = !!wmsData;
  const hasUsableDashboardData = !!dashboardData;

  return {
    isLoading: isWmsLoading || isDashboardLoading,
    showWmsUnavailable: !!wmsError && !hasUsableWmsData,
    showWmsDegraded: !!wmsError && hasUsableWmsData,
    showDashboardUnavailable: !!dashboardError && !hasUsableDashboardData,
    showDashboardDegraded: !!dashboardError && hasUsableDashboardData,
    wmsErrorMessage: getWmsDashboardReadErrorMessage(wmsError) ?? 'Please refresh and try again.',
    dashboardErrorMessage:
      getInventoryDashboardReadErrorMessage(dashboardError) ?? 'Please refresh and try again.',
  };
}
