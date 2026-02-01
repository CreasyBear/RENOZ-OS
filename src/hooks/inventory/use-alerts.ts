/**
 * Inventory Alerts Hooks
 *
 * TanStack Query hooks for inventory alert management:
 * - Alert rules configuration
 * - Triggered alerts monitoring
 * - Alert acknowledgment
 *
 * @see src/server/functions/inventory/alerts.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '../_shared/use-toast';
import {
  listAlerts,
  getAlert,
  createAlert,
  updateAlert,
  deleteAlert,
  getTriggeredAlerts,
  acknowledgeAlert,
  getAlertAnalytics,
} from '@/server/functions/inventory';

// ============================================================================
// TYPES
// ============================================================================

export interface AlertFilters {
  alertType?: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiry' | 'slow_moving' | 'forecast_deviation';
  isActive?: boolean;
  productId?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'alertType' | 'isActive' | 'lastTriggeredAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UseAlertsOptions extends AlertFilters {
  enabled?: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch alert rules with filtering
 */
export function useAlerts(options: UseAlertsOptions = {}) {
  const { enabled = true, ...filters } = options;

  return useQuery({
    queryKey: queryKeys.inventory.alerts(filters),
    queryFn: () => listAlerts({ data: filters }),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch single alert rule details
 */
export function useAlert(alertId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.alert(alertId),
    queryFn: () => getAlert({ data: { id: alertId } }),
    enabled: enabled && !!alertId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch currently triggered alerts
 */
export function useTriggeredAlerts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.triggeredAlerts(),
    queryFn: () => getTriggeredAlerts(),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Fetch alert analytics and statistics
 */
export function useAlertAnalytics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.alertAnalytics(),
    queryFn: () => getAlertAnalytics({ data: {} }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new alert rule
 */
export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createAlert>[0]['data']) =>
      createAlert({ data }),
    onSuccess: () => {
      toast.success('Alert rule created');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alertsAll() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create alert rule');
    },
  });
}

/**
 * Update an existing alert rule
 */
export function useUpdateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAlert({ data: { id, data } }),
    onSuccess: (_, variables) => {
      toast.success('Alert rule updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alertsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alert(variables.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update alert rule');
    },
  });
}

/**
 * Delete an alert rule
 */
export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => deleteAlert({ data: { id: alertId } }),
    onSuccess: () => {
      toast.success('Alert rule deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alertsAll() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete alert rule');
    },
  });
}

/**
 * Acknowledge a triggered alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert({ data: { alertId } }),
    onSuccess: () => {
      toast.success('Alert acknowledged');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.triggeredAlerts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alertAnalytics() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to acknowledge alert');
    },
  });
}

/**
 * Toggle alert rule active status
 */
export function useToggleAlertActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, isActive }: { alertId: string; isActive: boolean }) =>
      updateAlert({ data: { id: alertId, data: { isActive } } }),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'Alert enabled' : 'Alert disabled');
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alertsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alert(variables.alertId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update alert');
    },
  });
}
