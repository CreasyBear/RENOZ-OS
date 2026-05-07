import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListAlerts = vi.fn();
const mockGetAlert = vi.fn();
const mockCreateAlert = vi.fn();
const mockUpdateAlert = vi.fn();
const mockDeleteAlert = vi.fn();
const mockGetTriggeredAlerts = vi.fn();
const mockAcknowledgeAlert = vi.fn();
const mockGetAlertAnalytics = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();

vi.mock('@/hooks/_shared/use-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

vi.mock('@/server/functions/inventory', () => ({
  listAlerts: (...args: unknown[]) => mockListAlerts(...args),
  getAlert: (...args: unknown[]) => mockGetAlert(...args),
  createAlert: (...args: unknown[]) => mockCreateAlert(...args),
  updateAlert: (...args: unknown[]) => mockUpdateAlert(...args),
  deleteAlert: (...args: unknown[]) => mockDeleteAlert(...args),
  getTriggeredAlerts: (...args: unknown[]) => mockGetTriggeredAlerts(...args),
  acknowledgeAlert: (...args: unknown[]) => mockAcknowledgeAlert(...args),
  getAlertAnalytics: (...args: unknown[]) => mockGetAlertAnalytics(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventoryAlertsQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory alerts query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAlerts.mockResolvedValue({
      alerts: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
      activeCount: 0,
    });
    mockGetAlert.mockResolvedValue({
      id: 'alert-1',
      alertType: 'low_stock',
      threshold: { minQuantity: 5 },
      isActive: true,
      product: null,
      location: null,
    });
    mockGetTriggeredAlerts.mockResolvedValue({
      alerts: [],
      count: 0,
    });
    mockGetAlertAnalytics.mockResolvedValue({
      summary: {
        totalAlerts: 0,
        activeAlerts: 0,
        inactiveAlerts: 0,
        recentlyTriggered: 0,
        periodDays: 30,
      },
      byType: [],
      dailyTriggers: [],
      recommendations: [],
    });
  });

  it('treats alert lists, triggered alerts, and analytics as always-shaped success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useAlerts, useTriggeredAlerts, useAlertAnalytics } = await import(
      '@/hooks/inventory/use-alerts'
    );

    const alerts = renderHook(() => useAlerts(), {
      wrapper: createWrapper(queryClient),
    });
    const triggered = renderHook(() => useTriggeredAlerts(), {
      wrapper: createWrapper(queryClient),
    });
    const analytics = renderHook(() => useAlertAnalytics(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(alerts.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(triggered.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(analytics.result.current.isSuccess).toBe(true));

    expect(alerts.result.current.data).toEqual({
      alerts: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
      activeCount: 0,
    });
    expect(triggered.result.current.data).toEqual({
      alerts: [],
      count: 0,
    });
    expect(analytics.result.current.data).toMatchObject({
      summary: {
        totalAlerts: 0,
        activeAlerts: 0,
      },
      byType: [],
    });
  });

  it('preserves not-found semantics for alert detail reads', async () => {
    mockGetAlert.mockRejectedValueOnce({
      message: 'Alert not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useAlert } = await import('@/hooks/inventory/use-alerts');

    const { result } = renderHook(() => useAlert('missing-alert'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested inventory alert could not be found.',
    });
  });

  it('renders triggered alert failures as unavailable instead of all clear', async () => {
    const { AlertsPanel } = await import('@/components/domain/inventory/alerts/alerts-panel');

    render(
      <AlertsPanel
        alerts={[]}
        isError
        errorMessage="Triggered inventory alerts are temporarily unavailable. Please refresh and try again."
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('Inventory alert status is temporarily unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Triggered inventory alerts are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('All Clear')).not.toBeInTheDocument();
  });

  it('does not offer acknowledgement actions for read-only fallback alerts', async () => {
    const onAcknowledge = vi.fn();
    const { AlertsPanel } = await import('@/components/domain/inventory/alerts/alerts-panel');

    render(
      <AlertsPanel
        alerts={[
          {
            id: '00000000-0000-4000-8000-000000000001',
            alertType: 'low_stock',
            severity: 'warning',
            productName: 'Battery Module',
            message: 'Battery Module is below the fallback stock threshold',
            value: 2,
            threshold: 10,
            triggeredAt: new Date('2026-05-07T00:00:00Z'),
            isFallback: true,
          },
        ]}
        onAcknowledge={onAcknowledge}
      />
    );

    expect(screen.getByText('Rule required')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /acknowledge alert/i })).not.toBeInTheDocument();
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it('renders alert-rule failures as unavailable instead of no rules', async () => {
    const { AlertsList } = await import('@/components/domain/inventory/alerts/alerts-list');

    render(
      <AlertsList
        alerts={[]}
        isError
        errorMessage="Inventory alert rules are temporarily unavailable. Please refresh and try again."
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('Inventory alert rules are temporarily unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Inventory alert rules are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('No Alert Rules')).not.toBeInTheDocument();
  });

  it('renders alert presenter failures as unavailable instead of raw errors', async () => {
    const { AlertsListPresenter } = await import('@/components/domain/inventory/alerts/alerts-list-presenter');

    render(
      <AlertsListPresenter
        alerts={[]}
        isLoading={false}
        error={new Error('select from inventory_alerts violates row-level security policy')}
        sortField="severity"
        sortDirection="desc"
        onSort={vi.fn()}
        selectedIds={new Set()}
        isAllSelected={false}
        isPartiallySelected={false}
        onSelect={vi.fn()}
        onSelectAll={vi.fn()}
        onShiftClickRange={vi.fn()}
        isSelected={() => false}
      />
    );

    expect(screen.getByText('Inventory alert rules are temporarily unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText('Inventory alert rules are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('select from inventory_alerts violates row-level security policy')
    ).not.toBeInTheDocument();
  });

  it('uses safe mutation fallback copy instead of raw alert create errors', async () => {
    mockCreateAlert.mockRejectedValue(
      new Error('duplicate key value violates unique constraint inventory_alerts_rule_key')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCreateAlert } = await import('@/hooks/inventory/use-alerts');

    const { result } = renderHook(() => useCreateAlert(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        alertType: 'low_stock',
        threshold: { minQuantity: 5 },
        isActive: true,
        notificationChannels: [],
        escalationUsers: [],
      })
    ).rejects.toThrow('inventory_alerts_rule_key');

    expect(mockToastError).toHaveBeenCalledWith('Failed to create alert rule');
  });

  it('uses safe mutation fallback copy instead of raw alert acknowledge errors', async () => {
    mockAcknowledgeAlert.mockRejectedValue(
      new Error('update on table triggered_inventory_alerts violates row-level security policy')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useAcknowledgeAlert } = await import('@/hooks/inventory/use-alerts');

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync('alert-1')).rejects.toThrow(
      'row-level security policy'
    );

    expect(mockToastError).toHaveBeenCalledWith('Failed to acknowledge alert');
  });

  it('does not claim fallback alert acknowledgements as persisted changes', async () => {
    mockAcknowledgeAlert.mockResolvedValueOnce({
      alert: null,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      message:
        'Fallback inventory alerts are read-only. Create an alert rule to track and acknowledge this condition.',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useAcknowledgeAlert } = await import('@/hooks/inventory/use-alerts');

    const { result } = renderHook(() => useAcknowledgeAlert(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync('00000000-0000-4000-8000-000000000001')
    ).resolves.toMatchObject({ acknowledged: false });

    expect(mockToastInfo).toHaveBeenCalledWith(
      'Fallback inventory alerts are read-only. Create an alert rule to track and acknowledge this condition.'
    );
    expect(mockToastSuccess).not.toHaveBeenCalledWith('Alert acknowledged');
  });

  it('uses safe route submit copy instead of raw alert rule errors', async () => {
    const { getAlertRuleSubmitError } = await import(
      '@/routes/_authenticated/inventory/alert-error-messages'
    );

    expect(
      getAlertRuleSubmitError(
        new Error('duplicate key value violates unique constraint inventory_alerts_rule_key')
      )
    ).toBe('Failed to save alert rule');
  });

  it('uses stable unavailable copy instead of raw alert read errors', async () => {
    const {
      getAlertRulesReadErrorMessage,
      getTriggeredAlertsReadErrorMessage,
    } = await import('@/routes/_authenticated/inventory/alert-error-messages');

    expect(
      getTriggeredAlertsReadErrorMessage(
        new Error('select from triggered_inventory_alerts violates row-level security policy')
      )
    ).toBe('Triggered inventory alerts are temporarily unavailable. Please refresh and try again.');

    expect(
      getAlertRulesReadErrorMessage(
        new Error('select from inventory_alerts violates row-level security policy')
      )
    ).toBe('Inventory alert rules are temporarily unavailable. Please refresh and try again.');
  });
});
