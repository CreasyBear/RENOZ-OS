import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetIssues = vi.fn();
const mockGetIssueById = vi.fn();
const mockGetIssuesWithSlaMetrics = vi.fn();
const mockPreviewIssueIntake = vi.fn();
const mockGetSupportMetrics = vi.fn();
const mockGetSlaConfigurations = vi.fn();
const mockGetSlaConfiguration = vi.fn();
const mockGetDefaultSlaConfiguration = vi.fn();
const mockHasSlsConfigurations = vi.fn();
const mockGetSlaMetrics = vi.fn();
const mockGetSlaReportByIssueType = vi.fn();
const mockGetSlaState = vi.fn();
const mockGetSlaEvents = vi.fn();
const mockGetIssueFeedback = vi.fn();
const mockListFeedback = vi.fn();
const mockGetCsatMetrics = vi.fn();
const mockValidateFeedbackToken = vi.fn();

vi.mock('@/server/functions/support/issues', () => ({
  getIssues: (...args: unknown[]) => mockGetIssues(...args),
  getIssueById: (...args: unknown[]) => mockGetIssueById(...args),
  getIssuesWithSlaMetrics: (...args: unknown[]) => mockGetIssuesWithSlaMetrics(...args),
  previewIssueIntake: (...args: unknown[]) => mockPreviewIssueIntake(...args),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
}));

vi.mock('@/server/functions/support/support-metrics', () => ({
  getSupportMetrics: (...args: unknown[]) => mockGetSupportMetrics(...args),
}));

vi.mock('@/server/functions/support/sla', () => ({
  getSlaConfigurations: (...args: unknown[]) => mockGetSlaConfigurations(...args),
  getSlaConfiguration: (...args: unknown[]) => mockGetSlaConfiguration(...args),
  getDefaultSlaConfiguration: (...args: unknown[]) => mockGetDefaultSlaConfiguration(...args),
  hasSlsConfigurations: (...args: unknown[]) => mockHasSlsConfigurations(...args),
  getSlaMetrics: (...args: unknown[]) => mockGetSlaMetrics(...args),
  getSlaReportByIssueType: (...args: unknown[]) => mockGetSlaReportByIssueType(...args),
  getSlaState: (...args: unknown[]) => mockGetSlaState(...args),
  getSlaEvents: (...args: unknown[]) => mockGetSlaEvents(...args),
  createSlaConfiguration: vi.fn(),
  updateSlaConfiguration: vi.fn(),
  seedDefaultSlaConfigurations: vi.fn(),
  startSlaTracking: vi.fn(),
  pauseSla: vi.fn(),
  resumeSla: vi.fn(),
  recordSlaResponse: vi.fn(),
  recordSlaResolution: vi.fn(),
}));

vi.mock('@/server/functions/customers/csat-responses', () => ({
  getIssueFeedback: (...args: unknown[]) => mockGetIssueFeedback(...args),
  listFeedback: (...args: unknown[]) => mockListFeedback(...args),
  getCsatMetrics: (...args: unknown[]) => mockGetCsatMetrics(...args),
  validateFeedbackToken: (...args: unknown[]) => mockValidateFeedbackToken(...args),
  submitInternalFeedback: vi.fn(),
  generateFeedbackToken: vi.fn(),
  submitPublicFeedback: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'SupportQueryNormalizationWave1Wrapper';
  return Wrapper;
}

describe('support query normalization wave 1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIssues.mockResolvedValue([]);
    mockGetIssueById.mockResolvedValue({ id: 'issue-1', issueNumber: 'ISS-001' });
    mockGetIssuesWithSlaMetrics.mockResolvedValue([]);
    mockPreviewIssueIntake.mockResolvedValue({ anchors: {}, supportContext: null });
    mockGetSupportMetrics.mockResolvedValue({
      overview: { openIssues: 0, inProgressIssues: 0, resolvedToday: 0, avgResolutionHours: 0 },
      sla: { totalTracked: 0, breached: 0, atRisk: 0, onTrack: 0, complianceRate: 100 },
      breakdown: { byStatus: [], byType: [], byPriority: [] },
      trend: { openedThisWeek: 0, closedThisWeek: 0, netChange: 0 },
      triage: { overdueSla: 0, escalated: 0, myIssues: 0 },
    });
    mockGetSlaConfigurations.mockResolvedValue([]);
    mockGetSlaConfiguration.mockResolvedValue({ id: 'sla-1', name: 'Default SLA' });
    mockGetDefaultSlaConfiguration.mockResolvedValue(null);
    mockHasSlsConfigurations.mockResolvedValue({ hasConfigurations: false });
    mockGetSlaMetrics.mockResolvedValue({
      total: 0,
      responseBreached: 0,
      resolutionBreached: 0,
      currentlyPaused: 0,
      resolved: 0,
      responseBreachRate: 0,
      resolutionBreachRate: 0,
      avgResponseTimeSeconds: null,
      avgResolutionTimeSeconds: null,
    });
    mockGetSlaReportByIssueType.mockResolvedValue([]);
    mockGetSlaState.mockResolvedValue({ status: 'active' });
    mockGetSlaEvents.mockResolvedValue([]);
    mockGetIssueFeedback.mockResolvedValue(null);
    mockListFeedback.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
    });
    mockGetCsatMetrics.mockResolvedValue({
      averageRating: 0,
      totalResponses: 0,
      ratingDistribution: [],
      trend: { previousPeriod: 0, currentPeriod: 0, change: 0, changePercent: 0 },
      recentLowRatings: [],
    });
    mockValidateFeedbackToken.mockResolvedValue({ valid: false, error: 'Invalid feedback link' });
  });

  it('treats issue lists as always-shaped and accepts empty arrays', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useIssuesWithSlaMetrics } = await import('@/hooks/support/use-issues');

    const { result } = renderHook(() => useIssuesWithSlaMetrics(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(result.current.error).toBeNull();
  });

  it('preserves issue detail not-found semantics', async () => {
    mockGetIssueById.mockRejectedValueOnce({
      message: 'Issue not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useIssue } = await import('@/hooks/support/use-issues');

    const { result } = renderHook(() => useIssue({ issueId: 'missing-issue' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested issue could not be found.',
    });
  });

  it('keeps nullable feedback lookups as valid null results', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useIssueFeedback } = await import('@/hooks/support/use-csat');

    const { result } = renderHook(() => useIssueFeedback({ issueId: 'issue-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('normalizes thrown SLA metric failures as system errors', async () => {
    mockGetSlaMetrics.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSlaMetrics } = await import('@/hooks/support/use-sla');

    const { result } = renderHook(() => useSlaMetrics(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'SLA metrics are temporarily unavailable. Please refresh and try again.',
    });
  });
});
