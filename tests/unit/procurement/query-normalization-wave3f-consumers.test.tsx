import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseProcurementDashboard = vi.fn();
const mockUseSpendMetrics = vi.fn();
const mockUseOrderMetrics = vi.fn();
const mockUseSupplierMetrics = vi.fn();
const mockUseProcurementAlerts = vi.fn();
const mockUsePendingApprovals = vi.fn();
const mockUseActivityFeed = vi.fn();
const mockUseCreateCustomReport = vi.fn();
const mockUseCreateScheduledReport = vi.fn();
const mockUseGenerateReport = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  createFileRoute: () => () => ({
    useNavigate: () => vi.fn(),
    useSearch: () => ({
      range: 'month',
    }),
  }),
  useSearch: () => ({
    dateFrom: '2026-03-20',
    dateTo: '2026-04-20',
    tab: 'overview',
  }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/components/layout', () => ({
  PageLayout: Object.assign(
    ({ children }: { children: ReactNode; variant?: string }) => <div>{children}</div>,
    {
      Header: ({ title, description }: { title: ReactNode; description?: ReactNode }) => (
        <div>
          <div>{title}</div>
          {description ? <div>{description}</div> : null}
        </div>
      ),
      Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }
  ),
  RouteErrorFallback: ({ error }: { error: unknown }) => <div>{String(error)}</div>,
}));

vi.mock('@/components/shared/error-state', () => ({
  ErrorState: ({
    title,
    message,
  }: {
    title?: string;
    message: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
}));

vi.mock('@/components/skeletons/financial', () => ({
  FinancialDashboardSkeleton: () => <div>financial-skeleton</div>,
}));

vi.mock('@/components/domain/procurement/procurement-dashboard', () => ({
  ProcurementDashboard: ({
    errors,
    alerts,
  }: {
    errors?: { orders?: Error | null; alerts?: Error | null };
    alerts?: Array<{ id: string }>;
  }) => (
    <div>
      <span>dashboard-rendered</span>
      {errors?.orders ? <span>{errors.orders.message}</span> : null}
      {errors?.alerts ? <span>alerts-error-prop</span> : null}
      <span>alert-count:{alerts?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/components/domain/reports/procurement-reports', () => ({
  ProcurementReports: ({
    warning,
    error,
    analytics,
  }: {
    warning?: string | null;
    error?: Error | null;
    analytics?: unknown;
  }) => (
    <div>
      <span>reports-rendered</span>
      {warning ? <span>{warning}</span> : null}
      {error ? <span>reports-error:{error.message}</span> : null}
      {analytics ? <span>reports-has-analytics</span> : null}
    </div>
  ),
}));

vi.mock('@/components/domain/settings/scheduled-report-form', () => ({
  ScheduledReportForm: () => <div>scheduled-report-form</div>,
}));

vi.mock('@/hooks/suppliers', () => ({
  useProcurementDashboard: (...args: unknown[]) => mockUseProcurementDashboard(...args),
  useSpendMetrics: (...args: unknown[]) => mockUseSpendMetrics(...args),
  useOrderMetrics: (...args: unknown[]) => mockUseOrderMetrics(...args),
  useSupplierMetrics: (...args: unknown[]) => mockUseSupplierMetrics(...args),
  useProcurementAlerts: (...args: unknown[]) => mockUseProcurementAlerts(...args),
  usePendingApprovals: (...args: unknown[]) => mockUsePendingApprovals(...args),
}));

vi.mock('@/hooks/activities', () => ({
  useActivityFeed: (...args: unknown[]) => mockUseActivityFeed(...args),
}));

vi.mock('@/hooks/reports', () => ({
  useCreateCustomReport: () => mockUseCreateCustomReport(),
  useCreateScheduledReport: () => mockUseCreateScheduledReport(),
  useGenerateReport: () => mockUseGenerateReport(),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/utils/csv', () => ({
  generateCSV: vi.fn(),
  downloadCSV: vi.fn(),
  formatDateForFilename: vi.fn(() => '2026-04-20'),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>skeleton</div>,
}));

describe('procurement consumer normalization wave 3f', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseProcurementDashboard.mockReturnValue({
      data: {
        supplierPerformance: [],
        spendAnalysis: { byCategory: [], bySupplier: [], trends: [] },
        efficiencyMetrics: {
          avgProcessingTime: 0,
          approvalCycleTime: 0,
          orderFulfillmentRate: 0,
          costSavingsRate: 0,
          automationRate: 0,
          supplierDiversity: 0,
        },
        costSavings: {
          totalSavings: 0,
          savingsByType: [],
          monthlySavings: [],
        },
      },
      isLoading: false,
      error: null,
    });
    mockUseSpendMetrics.mockReturnValue({
      data: {
        totalSpend: 1000,
        trends: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseOrderMetrics.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Order metrics are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });
    mockUseSupplierMetrics.mockReturnValue({
      data: {
        totalSuppliers: 0,
        activeSuppliers: 0,
        avgRating: 0,
        topPerformers: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseProcurementAlerts.mockReturnValue({
      data: {
        alerts: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUsePendingApprovals.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseActivityFeed.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    mockUseCreateCustomReport.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockUseCreateScheduledReport.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseGenerateReport.mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  it('keeps the procurement dashboard visible when a widget fails but usable data remains', async () => {
    const { ProcurementDashboardPage } = await import('@/routes/_authenticated/procurement/dashboard');

    render(<ProcurementDashboardPage />);

    expect(screen.getByText('dashboard-rendered')).toBeInTheDocument();
    expect(
      screen.getByText('Order metrics are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Failed to load procurement data')).not.toBeInTheDocument();
  });

  it('shows alert unavailability instead of a fake empty state when alerts fail without data', async () => {
    const { ProcurementAlerts } = await import('@/components/domain/procurement/procurement-alerts');

    render(
      <ProcurementAlerts
        alerts={[]}
        error={new Error('Procurement alerts are temporarily unavailable. Please refresh and try again.')}
      />
    );

    expect(screen.getByText('Procurement alerts unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No Active Alerts')).not.toBeInTheDocument();
  });

  it('keeps procurement reports visible with a warning when stale analytics data exists', async () => {
    mockUseProcurementDashboard.mockReturnValueOnce({
      data: {
        supplierPerformance: [],
        spendAnalysis: { byCategory: [], bySupplier: [], trends: [] },
        efficiencyMetrics: {
          avgProcessingTime: 0,
          approvalCycleTime: 0,
          orderFulfillmentRate: 0,
          costSavingsRate: 0,
          automationRate: 0,
          supplierDiversity: 0,
        },
        costSavings: {
          totalSavings: 0,
          savingsByType: [],
          monthlySavings: [],
        },
      },
      isLoading: false,
      error: new Error('Procurement analytics are temporarily unavailable. Please refresh and try again.'),
    });

    const { ProcurementReportsPage } = await import(
      '@/components/domain/reports/procurement-reports-page'
    );

    render(<ProcurementReportsPage />);

    expect(screen.getByText('reports-rendered')).toBeInTheDocument();
    expect(
      screen.getByText('Procurement analytics are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/reports-error:/)).not.toBeInTheDocument();
  });
});
