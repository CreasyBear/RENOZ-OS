import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RESEND_API_KEY = 're_test_key';

const mockListInstallers = vi.fn();
const mockGetInstaller = vi.fn();
const mockListChecklistTemplates = vi.fn();
const mockGetJobChecklist = vi.fn();
const mockGetCalendarOAuthConnection = vi.fn();
const mockGetJobTimeEntries = vi.fn();
const mockGetJobCostingReport = vi.fn();

const mockUseInstallers = vi.fn();
const mockUseInstallerAvailability = vi.fn();
const mockUseCreateJobTemplate = vi.fn();
const mockUseUpdateJobTemplate = vi.fn();
const mockUseChecklistTemplates = vi.fn();
const mockUseJobTimeEntries = vi.fn();
const mockUseStartTimer = vi.fn();
const mockUseStopTimer = vi.fn();
const mockUseCreateManualEntry = vi.fn();

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>();
  const createServerFn = () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
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

vi.mock('@/server/functions/installers', () => ({
  listInstallers: (...args: unknown[]) => mockListInstallers(...args),
  listAllActiveInstallers: vi.fn(),
  getInstaller: (...args: unknown[]) => mockGetInstaller(...args),
  createInstallerProfile: vi.fn(),
  updateInstallerProfile: vi.fn(),
  deleteInstallerProfile: vi.fn(),
  createCertification: vi.fn(),
  updateCertification: vi.fn(),
  verifyCertification: vi.fn(),
  deleteCertification: vi.fn(),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  createTerritory: vi.fn(),
  updateTerritory: vi.fn(),
  deleteTerritory: vi.fn(),
  createBlockout: vi.fn(),
  updateBlockout: vi.fn(),
  deleteBlockout: vi.fn(),
  checkAvailability: vi.fn(),
  getInstallerWorkload: vi.fn(),
  suggestInstallers: vi.fn(),
  updateInstallerStatusBatch: vi.fn(),
}));

vi.mock('@/server/functions/jobs/checklists', () => ({
  listChecklistTemplates: (...args: unknown[]) => mockListChecklistTemplates(...args),
  getChecklistTemplate: vi.fn(),
  createChecklistTemplate: vi.fn(),
  updateChecklistTemplate: vi.fn(),
  deleteChecklistTemplate: vi.fn(),
  applyChecklistToJob: vi.fn(),
  updateChecklistItem: vi.fn(),
  getJobChecklist: (...args: unknown[]) => mockGetJobChecklist(...args),
  getChecklistItem: vi.fn(),
}));

vi.mock('@/server/functions/jobs/job-templates', () => ({
  listJobTemplates: vi.fn(),
  getJobTemplate: vi.fn(),
  createJobTemplate: vi.fn(),
  updateJobTemplate: vi.fn(),
  deleteJobTemplate: vi.fn(),
  createJobFromTemplate: vi.fn(),
  exportCalendarData: vi.fn(),
}));

vi.mock('@/server/functions/jobs/oauth-bridge', () => ({
  syncJobToCalendar: vi.fn(),
  updateJobCalendarEvent: vi.fn(),
  removeJobFromCalendar: vi.fn(),
  listAvailableCalendars: vi.fn().mockResolvedValue([]),
  getCalendarOAuthConnection: (...args: unknown[]) => mockGetCalendarOAuthConnection(...args),
}));

vi.mock('@/server/functions/jobs/job-time', () => ({
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  createManualEntry: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
  getJobTimeEntries: (...args: unknown[]) => mockGetJobTimeEntries(...args),
  calculateJobLaborCost: vi.fn(),
  getTimeEntry: vi.fn(),
}));

vi.mock('@/server/functions/jobs/job-materials', () => ({
  listJobMaterials: vi.fn(),
  addJobMaterial: vi.fn(),
  updateJobMaterial: vi.fn(),
  removeJobMaterial: vi.fn(),
  reserveJobStock: vi.fn(),
  calculateJobMaterialCost: vi.fn(),
  getJobMaterial: vi.fn(),
  recordMaterialInstallation: vi.fn(),
}));

vi.mock('@/server/functions/jobs/job-costing', () => ({
  calculateJobCost: vi.fn(),
  getJobProfitability: vi.fn(),
  getJobCostingReport: (...args: unknown[]) => mockGetJobCostingReport(...args),
}));

vi.mock('@/hooks/jobs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/jobs')>();
  return {
    ...actual,
    useInstallers: (...args: unknown[]) => mockUseInstallers(...args),
    useInstallerAvailability: (...args: unknown[]) => mockUseInstallerAvailability(...args),
    useCreateJobTemplate: (...args: unknown[]) => mockUseCreateJobTemplate(...args),
    useUpdateJobTemplate: (...args: unknown[]) => mockUseUpdateJobTemplate(...args),
    useChecklistTemplates: (...args: unknown[]) => mockUseChecklistTemplates(...args),
    useJobTimeEntries: (...args: unknown[]) => mockUseJobTimeEntries(...args),
    useStartTimer: (...args: unknown[]) => mockUseStartTimer(...args),
    useStopTimer: (...args: unknown[]) => mockUseStopTimer(...args),
    useCreateManualEntry: (...args: unknown[]) => mockUseCreateManualEntry(...args),
  };
});

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  return {
    ...actual,
    useCreateJobTemplate: (...args: unknown[]) => mockUseCreateJobTemplate(...args),
    useUpdateJobTemplate: (...args: unknown[]) => mockUseUpdateJobTemplate(...args),
    useChecklistTemplates: (...args: unknown[]) => mockUseChecklistTemplates(...args),
    toast: {
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
  };
});

vi.mock('@/lib/schemas/jobs/job-validation', () => ({
  useJobFormValidation: () => ({
    validateField: vi.fn(),
    getFieldValidation: () => ({ isValid: true }),
    getFieldError: () => null,
    getFieldSuggestion: () => null,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/components/domain/jobs/time/active-timer', () => ({
  ActiveTimer: () => <div>active-timer</div>,
}));

vi.mock('@/components/domain/jobs/time/time-entry-dialog', () => ({
  TimeEntryDialog: () => <div>time-entry-dialog</div>,
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'JobsQueryNormalizationWave4BAdminWrapper';
  return Wrapper;
}

describe('jobs query normalization wave 4b admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListInstallers.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetInstaller.mockResolvedValue({
      id: 'installer-1',
      name: 'Taylor Installer',
    });
    mockListChecklistTemplates.mockResolvedValue({
      templates: [],
    });
    mockGetJobChecklist.mockResolvedValue({
      checklist: null,
    });
    mockGetCalendarOAuthConnection.mockResolvedValue(null);
    mockGetJobTimeEntries.mockResolvedValue({
      totalMinutes: 0,
      billableMinutes: 0,
      nonBillableMinutes: 0,
      activeTimers: 0,
      entries: [],
    });
    mockGetJobCostingReport.mockResolvedValue({
      jobs: [],
      total: 0,
      summary: {
        totalJobs: 0,
        totalQuoted: 0,
        totalActualCost: 0,
        totalProfit: 0,
        averageMarginPercent: 0,
        profitableCount: 0,
        lossCount: 0,
      },
    });

    const idleMutation = { mutateAsync: vi.fn(), isPending: false };
    mockUseInstallers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Installer directory is temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });
    mockUseInstallerAvailability.mockReturnValue({
      data: { availability: {} },
    });
    mockUseCreateJobTemplate.mockReturnValue(idleMutation);
    mockUseUpdateJobTemplate.mockReturnValue(idleMutation);
    mockUseChecklistTemplates.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Checklist templates are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });
    mockUseJobTimeEntries.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Time tracking is temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });
    mockUseStartTimer.mockReturnValue(idleMutation);
    mockUseStopTimer.mockReturnValue(idleMutation);
    mockUseCreateManualEntry.mockReturnValue(idleMutation);
  });

  it('treats installer list as always-shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInstallers } = await import('@/hooks/jobs/use-installers');

    const { result } = renderHook(() => useInstallers({ page: 1, pageSize: 20 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      items: [],
      pagination: { totalItems: 0 },
    });
  });

  it('preserves installer not-found semantics', async () => {
    mockGetInstaller.mockRejectedValueOnce({
      message: 'Installer not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInstaller } = await import('@/hooks/jobs/use-installers');

    const { result } = renderHook(() => useInstaller('missing-installer'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested installer could not be found.',
    });
  });

  it('treats checklist templates as always-shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useChecklistTemplates } = await import('@/hooks/jobs/use-job-templates-config');

    const { result } = renderHook(() => useChecklistTemplates({ includeInactive: false }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      templates: [],
    });
  });

  it('treats job checklist as nullable-by-design when no checklist is applied yet', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobChecklist } = await import('@/hooks/jobs/use-job-templates-config');

    const { result } = renderHook(() => useJobChecklist({ jobId: 'job-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      checklist: null,
    });
  });

  it('treats calendar OAuth connection as nullable-by-design when no connection exists', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCalendarOAuthConnection } = await import('@/hooks/jobs/use-job-scheduling');

    const { result } = renderHook(() => useCalendarOAuthConnection(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('preserves project not-found semantics for time tracking reads', async () => {
    mockGetJobTimeEntries.mockRejectedValueOnce({
      message: 'Job not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobTimeEntries } = await import('@/hooks/jobs/use-job-resources');

    const { result } = renderHook(() => useJobTimeEntries({ jobId: 'missing-job' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested project could not be found.',
    });
  });

  it('treats job costing report as always-shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useJobCostingReport } = await import('@/hooks/jobs/use-job-resources');

    const { result } = renderHook(
      () =>
        useJobCostingReport({
          limit: 25,
          offset: 0,
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      jobs: [],
      total: 0,
    });
  });

  it('shows installer availability unavailable state instead of fake empty copy', async () => {
    const { InstallerAvailabilityCalendar } = await import(
      '@/components/domain/jobs/installers/installer-availability-calendar'
    );

    render(<InstallerAvailabilityCalendar />);

    expect(screen.getByText('Installer availability unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No installers found')).not.toBeInTheDocument();
  });

  it('shows time tracking unavailable state instead of silent zero-summary fallback', async () => {
    const { TimeCard } = await import('@/components/domain/jobs/projects/sidebar/time-card');

    render(<TimeCard projectId="project-1" />);

    expect(screen.getByText('Time tracking unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Total Hours:')).not.toBeInTheDocument();
  });
});
