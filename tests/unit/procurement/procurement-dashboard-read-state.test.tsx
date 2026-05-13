import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROCUREMENT_APPROVALS_FALLBACK_MESSAGE,
  PROCUREMENT_DASHBOARD_FALLBACK_MESSAGE,
  PROCUREMENT_ORDER_METRICS_FALLBACK_MESSAGE,
  PROCUREMENT_SPEND_METRICS_FALLBACK_MESSAGE,
  PROCUREMENT_SUPPLIER_METRICS_FALLBACK_MESSAGE,
  getProcurementApprovalsErrorMessage,
  getProcurementDashboardErrorMessage,
  getProcurementOrderMetricsErrorMessage,
  getProcurementSpendMetricsErrorMessage,
  getProcurementSupplierMetricsErrorMessage,
} from '@/components/domain/procurement/procurement-dashboard-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';
import type {
  OrderMetrics,
  SpendMetrics,
  SupplierMetrics,
} from '@/lib/schemas/procurement';

const mockUseProcurementDashboard = vi.fn();
const mockUseSpendMetrics = vi.fn();
const mockUseOrderMetrics = vi.fn();
const mockUseSupplierMetrics = vi.fn();
const mockUseProcurementAlerts = vi.fn();
const mockUsePendingApprovals = vi.fn();
const mockUseActivityFeed = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  createFileRoute: () => (config: Record<string, unknown>) => ({
    ...config,
    useNavigate: () => vi.fn(),
    useSearch: () => ({ range: 'month' }),
  }),
  useNavigate: () => vi.fn(),
  useSearch: () => ({ range: 'month' }),
}));

vi.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className} />;
  return {
    TrendingUp: Icon,
    TrendingDown: Icon,
    CheckCircle: Icon,
    DollarSign: Icon,
    Building2: Icon,
    ShoppingCart: Icon,
  };
});

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

vi.mock('@/components/domain/procurement/procurement-dashboard', () => ({
  ProcurementDashboard: () => <div>procurement-dashboard-rendered</div>,
}));

vi.mock('@/components/skeletons/financial', () => ({
  FinancialDashboardSkeleton: () => <div>financial-skeleton</div>,
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => <progress value={value} />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>skeleton</div>,
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

vi.mock('@/components/shared/error-state', () => ({
  ErrorState: ({
    title,
    message,
  }: {
    title?: ReactNode;
    message?: ReactNode;
  }) => (
    <div>
      {title ? <div>{title}</div> : null}
      {message ? <div>{message}</div> : null}
    </div>
  ),
}));

const rawDatabaseError = new Error(
  'duplicate key value violates unique constraint procurement_dashboard_pkey'
);

const spendMetrics: SpendMetrics = {
  totalSpend: 1000,
  monthlySpend: 1000,
  budgetTotal: 5000,
  budgetUsed: 1000,
  trendPercent: 5,
  trendDirection: 'up',
};

const orderMetrics: OrderMetrics = {
  totalOrders: 3,
  pendingApproval: 1,
  awaitingDelivery: 1,
  completedThisMonth: 1,
};

const supplierMetrics: SupplierMetrics = {
  totalSuppliers: 2,
  activeSuppliers: 1,
  avgRating: 4.2,
  topPerformers: [],
};

describe('procurement dashboard read state', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseProcurementDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: rawDatabaseError,
    });
    mockUseSpendMetrics.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: rawDatabaseError,
      refetch: vi.fn(),
    });
    mockUseOrderMetrics.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: rawDatabaseError,
      refetch: vi.fn(),
    });
    mockUseSupplierMetrics.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: rawDatabaseError,
      refetch: vi.fn(),
    });
    mockUseProcurementAlerts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: rawDatabaseError,
      refetch: vi.fn(),
    });
    mockUsePendingApprovals.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: rawDatabaseError,
      refetch: vi.fn(),
    });
    mockUseActivityFeed.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it('keeps normalized read-query procurement dashboard copy', () => {
    const normalizedError = normalizeReadQueryError(
      {
        message: 'database connection failed',
        statusCode: 503,
        code: 'INTERNAL_ERROR',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: PROCUREMENT_SPEND_METRICS_FALLBACK_MESSAGE,
      }
    );

    expect(getProcurementSpendMetricsErrorMessage(normalizedError)).toBe(
      PROCUREMENT_SPEND_METRICS_FALLBACK_MESSAGE
    );
    expect(getProcurementOrderMetricsErrorMessage(rawDatabaseError)).toBe(
      PROCUREMENT_ORDER_METRICS_FALLBACK_MESSAGE
    );
    expect(getProcurementSupplierMetricsErrorMessage(rawDatabaseError)).toBe(
      PROCUREMENT_SUPPLIER_METRICS_FALLBACK_MESSAGE
    );
    expect(getProcurementApprovalsErrorMessage(rawDatabaseError)).toBe(
      PROCUREMENT_APPROVALS_FALLBACK_MESSAGE
    );
    expect(getProcurementDashboardErrorMessage(rawDatabaseError)).toBe(
      PROCUREMENT_DASHBOARD_FALLBACK_MESSAGE
    );
  });

  it('does not surface raw widget errors when stale metric payloads are present', async () => {
    const { DashboardWidgets } = await import(
      '@/components/domain/procurement/dashboard-widgets'
    );

    render(
      <DashboardWidgets
        spendMetrics={spendMetrics}
        orderMetrics={orderMetrics}
        supplierMetrics={supplierMetrics}
        errors={{
          spend: rawDatabaseError,
          orders: rawDatabaseError,
          suppliers: rawDatabaseError,
          approvals: rawDatabaseError,
        }}
      />
    );

    expect(screen.getByText(PROCUREMENT_SPEND_METRICS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_ORDER_METRICS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_SUPPLIER_METRICS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_APPROVALS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('does not surface raw widget errors when metric payloads are missing', async () => {
    const { DashboardWidgets } = await import(
      '@/components/domain/procurement/dashboard-widgets'
    );

    render(
      <DashboardWidgets
        errors={{
          spend: rawDatabaseError,
          orders: rawDatabaseError,
          suppliers: rawDatabaseError,
          approvals: rawDatabaseError,
        }}
      />
    );

    expect(screen.getByText(PROCUREMENT_SPEND_METRICS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_ORDER_METRICS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_SUPPLIER_METRICS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(PROCUREMENT_APPROVALS_FALLBACK_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });

  it('does not surface raw full-page procurement dashboard errors', async () => {
    const { ProcurementDashboardPage } = await import(
      '@/routes/_authenticated/procurement/-dashboard-page'
    );

    render(<ProcurementDashboardPage />);

    expect(
      screen.getByText(`5 widgets failed to load. ${PROCUREMENT_DASHBOARD_FALLBACK_MESSAGE}`)
    ).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key value violates/i)).not.toBeInTheDocument();
  });
});
