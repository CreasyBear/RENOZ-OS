import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListCustomReports = vi.fn();
const mockGetCustomReport = vi.fn();
const mockListReportFavorites = vi.fn();
const mockListScheduledReports = vi.fn();
const mockGetScheduledReport = vi.fn();
const mockGetScheduledReportStatus = vi.fn();
const mockGetWinLossAnalysis = vi.fn();
const mockGetCompetitors = vi.fn();

const mockUseReportFavorites = vi.fn();
const mockUseScheduledReports = vi.fn();
const mockUseWinLossAnalysis = vi.fn();
const mockUseCompetitors = vi.fn();
const mockUseCreateScheduledReport = vi.fn();
const mockUseGenerateReport = vi.fn();
const mockUseUpdateScheduledReport = vi.fn();
const mockUseDeleteScheduledReport = vi.fn();
const mockUseExecuteScheduledReport = vi.fn();
const mockUseBulkDeleteScheduledReports = vi.fn();
const mockUseBulkUpdateScheduledReports = vi.fn();
const mockUseCreateReportFavorite = vi.fn();
const mockUseDeleteReportFavorite = vi.fn();

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>();
  const createServerFn = () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      validator: () => builder,
      handler: (fn: unknown) => fn,
    };
    return builder;
  };

  return {
    ...actual,
    createServerFn,
    useServerFn: <T,>(fn: T) => fn,
  };
});

vi.mock('@/server/functions/reports', () => ({
  listCustomReports: (...args: unknown[]) => mockListCustomReports(...args),
  getCustomReport: (...args: unknown[]) => mockGetCustomReport(...args),
  createCustomReport: vi.fn(),
  updateCustomReport: vi.fn(),
  deleteCustomReport: vi.fn(),
  executeCustomReport: vi.fn(),
  listReportFavorites: (...args: unknown[]) => mockListReportFavorites(...args),
  createReportFavorite: vi.fn(),
  deleteReportFavorite: vi.fn(),
  bulkDeleteReportFavorites: vi.fn(),
  listScheduledReports: (...args: unknown[]) => mockListScheduledReports(...args),
  getScheduledReport: (...args: unknown[]) => mockGetScheduledReport(...args),
  getScheduledReportStatus: (...args: unknown[]) => mockGetScheduledReportStatus(...args),
  createScheduledReport: vi.fn(),
  updateScheduledReport: vi.fn(),
  deleteScheduledReport: vi.fn(),
  executeScheduledReport: vi.fn(),
  bulkUpdateScheduledReports: vi.fn(),
  bulkDeleteScheduledReports: vi.fn(),
  generateReport: vi.fn(),
}));

vi.mock('@/server/functions/pipeline/win-loss-reasons', () => ({
  getWinLossAnalysis: (...args: unknown[]) => mockGetWinLossAnalysis(...args),
  getCompetitors: (...args: unknown[]) => mockGetCompetitors(...args),
}));

vi.mock('@/hooks/reports', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/reports')>();
  return {
    ...actual,
    useReportFavorites: (...args: unknown[]) => mockUseReportFavorites(...args),
    useCreateReportFavorite: (...args: unknown[]) => mockUseCreateReportFavorite(...args),
    useDeleteReportFavorite: (...args: unknown[]) => mockUseDeleteReportFavorite(...args),
    useScheduledReports: (...args: unknown[]) => mockUseScheduledReports(...args),
    useCreateScheduledReport: (...args: unknown[]) => mockUseCreateScheduledReport(...args),
    useUpdateScheduledReport: (...args: unknown[]) => mockUseUpdateScheduledReport(...args),
    useDeleteScheduledReport: (...args: unknown[]) => mockUseDeleteScheduledReport(...args),
    useExecuteScheduledReport: (...args: unknown[]) => mockUseExecuteScheduledReport(...args),
    useBulkDeleteScheduledReports: (...args: unknown[]) => mockUseBulkDeleteScheduledReports(...args),
    useBulkUpdateScheduledReports: (...args: unknown[]) => mockUseBulkUpdateScheduledReports(...args),
    useWinLossAnalysis: (...args: unknown[]) => mockUseWinLossAnalysis(...args),
    useCompetitors: (...args: unknown[]) => mockUseCompetitors(...args),
    useGenerateReport: (...args: unknown[]) => mockUseGenerateReport(...args),
  };
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks', () => ({
  useConfirmation: () => ({
    confirm: vi.fn().mockResolvedValue({ confirmed: true }),
  }),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/domain/settings/scheduled-reports-list-presenter', () => ({
  ScheduledReportsListPresenter: ({
    reports,
    error,
  }: {
    reports: Array<{ id: string }>;
    error: Error | null;
  }) => <div>{error ? `reports-error:${error.message}` : `reports:${reports.length}`}</div>,
}));

vi.mock('@/components/domain/reports/win-loss-analysis', () => ({
  WinLossAnalysis: () => <div>win-loss-presenter</div>,
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ReportsWave4EWrapper';
  return Wrapper;
}

describe('reports query normalization wave 4e', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListCustomReports.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetCustomReport.mockResolvedValue({
      id: 'report-1',
      name: 'Ops Report',
    });
    mockListReportFavorites.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockListScheduledReports.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetScheduledReport.mockResolvedValue({
      id: 'scheduled-1',
      name: 'Nightly Report',
      isActive: true,
    });
    mockGetScheduledReportStatus.mockResolvedValue({
      id: 'scheduled-1',
      name: 'Nightly Report',
      isActive: true,
      lastRunAt: null,
      nextRunAt: null,
      lastRunStatus: null,
      lastRunMessage: null,
    });
    mockGetWinLossAnalysis.mockResolvedValue({
      wins: [],
      losses: [],
      trends: [],
      summary: {
        totalWon: 0,
        totalLost: 0,
        totalWonValue: 0,
        totalLostValue: 0,
        overallWinRate: 0,
      },
      dateRange: { dateFrom: undefined, dateTo: undefined },
    });
    mockGetCompetitors.mockResolvedValue({
      competitors: [],
    });

    const idleMutation = { mutateAsync: vi.fn(), isPending: false };
    mockUseReportFavorites.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseCreateReportFavorite.mockReturnValue(idleMutation);
    mockUseDeleteReportFavorite.mockReturnValue(idleMutation);
    mockUseScheduledReports.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseCreateScheduledReport.mockReturnValue(idleMutation);
    mockUseUpdateScheduledReport.mockReturnValue(idleMutation);
    mockUseDeleteScheduledReport.mockReturnValue(idleMutation);
    mockUseExecuteScheduledReport.mockReturnValue(idleMutation);
    mockUseBulkDeleteScheduledReports.mockReturnValue(idleMutation);
    mockUseBulkUpdateScheduledReports.mockReturnValue(idleMutation);
    mockUseWinLossAnalysis.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseCompetitors.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseGenerateReport.mockReturnValue(idleMutation);
  });

  it('preserves not-found semantics for custom report detail', async () => {
    mockGetCustomReport.mockRejectedValue({
      message: 'Custom report not found',
      code: 'NOT_FOUND',
      status: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCustomReport } = await import('@/hooks/reports/use-custom-reports');

    renderHook(
      () => useCustomReport({ id: 'report-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()[0]?.state.status).toBe('error');
    });
    expect(
      (queryClient.getQueryCache().getAll()[0]?.state.error as { failureKind?: string }).failureKind
    ).toBe('not-found');
  });

  it('treats report favorites as healthy empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useReportFavorites } = await import('@/hooks/reports/use-report-favorites');

    const { result } = renderHook(
      () => useReportFavorites(),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
  });

  it('preserves not-found semantics for scheduled report status', async () => {
    mockGetScheduledReportStatus.mockRejectedValue({
      message: 'Scheduled report not found',
      code: 'NOT_FOUND',
      status: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useScheduledReportStatus } = await import('@/hooks/reports/use-scheduled-reports');

    renderHook(
      () => useScheduledReportStatus({ id: 'scheduled-1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()[0]?.state.status).toBe('error');
    });
    expect(
      (queryClient.getQueryCache().getAll()[0]?.state.error as { failureKind?: string }).failureKind
    ).toBe('not-found');
  });

  it('treats win-loss analysis as healthy empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWinLossAnalysis } = await import('@/hooks/reports/use-win-loss');

    const { result } = renderHook(
      () => useWinLossAnalysis(),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.wins).toEqual([]);
  });

  it('shows cached favorites degradation on the reports landing page', async () => {
    mockUseReportFavorites.mockReturnValue({
      data: { items: [{ id: 'fav-1', reportType: 'customer' }] },
      isLoading: false,
      error: new Error('Report favorites are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });
    mockUseScheduledReports.mockReturnValue({
      data: { items: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { ReportsLandingContent } = await import('@/components/domain/reports/reports-landing-content');
    render(<ReportsLandingContent />);

    expect(screen.getByText('Showing cached favorites')).toBeInTheDocument();
  });

  it('shows cached scheduled reports while keeping the list container usable', async () => {
    mockUseScheduledReports.mockReturnValue({
      data: { items: [{ id: 'scheduled-1', name: 'Nightly', isActive: true }], pagination: { totalItems: 1 } },
      isLoading: false,
      error: new Error('Scheduled reports are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { ScheduledReportsListContainer } = await import('@/components/domain/settings/scheduled-reports-list-container');

    render(
      <ScheduledReportsListContainer
        filters={{ search: '', frequency: null, format: null, isActive: null }}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.getByText('Showing cached scheduled reports')).toBeInTheDocument();
    expect(screen.getByText('reports:1')).toBeInTheDocument();
  });

  it('shows cached win-loss degradation while keeping the presenter visible', async () => {
    mockUseWinLossAnalysis.mockReturnValue({
      data: {
        wins: [],
        losses: [],
        trends: [],
        summary: {
          totalWon: 0,
          totalLost: 0,
          totalWonValue: 0,
          totalLostValue: 0,
          overallWinRate: 0,
        },
      },
      isLoading: false,
      error: new Error('Win/loss analysis is temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });
    mockUseCompetitors.mockReturnValue({
      data: { competitors: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { WinLossAnalysisContainer } = await import('@/components/domain/reports/win-loss-analysis-container');
    render(<WinLossAnalysisContainer />);

    expect(screen.getByText('Showing cached win/loss data')).toBeInTheDocument();
    expect(screen.getByText('win-loss-presenter')).toBeInTheDocument();
  });
});
