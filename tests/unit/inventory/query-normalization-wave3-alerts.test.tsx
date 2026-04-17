import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListAlerts = vi.fn();
const mockGetAlert = vi.fn();
const mockGetTriggeredAlerts = vi.fn();
const mockGetAlertAnalytics = vi.fn();

vi.mock('@/server/functions/inventory', () => ({
  listAlerts: (...args: unknown[]) => mockListAlerts(...args),
  getAlert: (...args: unknown[]) => mockGetAlert(...args),
  createAlert: vi.fn(),
  updateAlert: vi.fn(),
  deleteAlert: vi.fn(),
  getTriggeredAlerts: (...args: unknown[]) => mockGetTriggeredAlerts(...args),
  acknowledgeAlert: vi.fn(),
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
});
