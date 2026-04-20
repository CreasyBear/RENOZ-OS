import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetWarrantyAnalyticsSummary = vi.fn();
const mockGetClaimsByProduct = vi.fn();
const mockGetClaimsTrend = vi.fn();
const mockGetClaimsByType = vi.fn();
const mockGetSlaComplianceMetrics = vi.fn();
const mockGetCycleCountAtClaim = vi.fn();
const mockGetExtensionVsResolution = vi.fn();
const mockGetWarrantyAnalyticsFilterOptions = vi.fn();

vi.mock('@/server/functions/warranty/analytics/warranty-analytics', () => ({
  getWarrantyAnalyticsSummary: (...args: unknown[]) => mockGetWarrantyAnalyticsSummary(...args),
  getClaimsByProduct: (...args: unknown[]) => mockGetClaimsByProduct(...args),
  getClaimsTrend: (...args: unknown[]) => mockGetClaimsTrend(...args),
  getClaimsByType: (...args: unknown[]) => mockGetClaimsByType(...args),
  getSlaComplianceMetrics: (...args: unknown[]) => mockGetSlaComplianceMetrics(...args),
  getCycleCountAtClaim: (...args: unknown[]) => mockGetCycleCountAtClaim(...args),
  getExtensionVsResolution: (...args: unknown[]) => mockGetExtensionVsResolution(...args),
  getWarrantyAnalyticsFilterOptions: (...args: unknown[]) =>
    mockGetWarrantyAnalyticsFilterOptions(...args),
  exportWarrantyAnalytics: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'WarrantyAnalyticsQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('warranty analytics query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWarrantyAnalyticsSummary.mockResolvedValue({
      totalWarranties: 0,
      activeClaims: 0,
      claimsRate: 0,
      averageClaimCost: 0,
      totalClaimsCost: 0,
      warrantyRevenue: 0,
      warrantiesChange: 0,
      claimsChange: 0,
      claimsRateChange: 0,
      avgCostChange: 0,
      totalCostChange: 0,
      revenueChange: 0,
    });
    mockGetClaimsByProduct.mockResolvedValue({
      items: [],
      totalClaims: 0,
    });
    mockGetClaimsTrend.mockResolvedValue({
      months: [],
      totalClaims: 0,
      averagePerMonth: 0,
    });
    mockGetClaimsByType.mockResolvedValue({
      items: [],
      totalClaims: 0,
    });
    mockGetSlaComplianceMetrics.mockResolvedValue({
      responseComplianceRate: 100,
      claimsWithinResponseSla: 0,
      claimsBreachedResponseSla: 0,
      averageResponseTimeHours: 0,
      resolutionComplianceRate: 100,
      claimsWithinResolutionSla: 0,
      claimsBreachedResolutionSla: 0,
      averageResolutionTimeDays: 0,
      totalResolvedClaims: 0,
      totalPendingClaims: 0,
    });
    mockGetCycleCountAtClaim.mockResolvedValue({
      overall: {
        averageCycleCount: 0,
        minCycleCount: 0,
        maxCycleCount: 0,
        totalClaimsWithData: 0,
      },
      byClaimType: [],
    });
    mockGetExtensionVsResolution.mockResolvedValue({
      extensions: {
        items: [],
        totalExtensions: 0,
        totalRevenue: 0,
      },
      resolutions: {
        items: [],
        totalResolutions: 0,
        totalCost: 0,
      },
    });
    mockGetWarrantyAnalyticsFilterOptions.mockResolvedValue({
      warrantyTypes: [],
      claimTypes: [],
      dateRanges: [],
    });
  });

  it('treats analytics reads as always-shaped and accepts zero or empty success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const {
      useWarrantyAnalyticsSummary,
      useClaimsByProduct,
      useClaimsTrend,
      useClaimsByType,
      useSlaComplianceMetrics,
      useCycleCountAtClaim,
      useExtensionVsResolution,
    } = await import('@/hooks/warranty/analytics/use-warranty-analytics');

    const summary = renderHook(() => useWarrantyAnalyticsSummary(), {
      wrapper: createWrapper(queryClient),
    });
    const claimsByProduct = renderHook(() => useClaimsByProduct(), {
      wrapper: createWrapper(queryClient),
    });
    const claimsTrend = renderHook(() => useClaimsTrend(), {
      wrapper: createWrapper(queryClient),
    });
    const claimsByType = renderHook(() => useClaimsByType(), {
      wrapper: createWrapper(queryClient),
    });
    const slaCompliance = renderHook(() => useSlaComplianceMetrics(), {
      wrapper: createWrapper(queryClient),
    });
    const cycleCount = renderHook(() => useCycleCountAtClaim(), {
      wrapper: createWrapper(queryClient),
    });
    const extensionVsResolution = renderHook(() => useExtensionVsResolution(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(summary.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(claimsByProduct.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(claimsTrend.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(claimsByType.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(slaCompliance.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(cycleCount.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(extensionVsResolution.result.current.isSuccess).toBe(true));

    expect(summary.result.current.data).toMatchObject({
      totalWarranties: 0,
      activeClaims: 0,
      claimsRate: 0,
    });
    expect(claimsByProduct.result.current.data).toEqual({
      items: [],
      totalClaims: 0,
    });
    expect(claimsTrend.result.current.data).toEqual({
      months: [],
      totalClaims: 0,
      averagePerMonth: 0,
    });
    expect(claimsByType.result.current.data).toEqual({
      items: [],
      totalClaims: 0,
    });
    expect(slaCompliance.result.current.data).toMatchObject({
      responseComplianceRate: 100,
      totalPendingClaims: 0,
    });
    expect(cycleCount.result.current.data).toEqual({
      overall: {
        averageCycleCount: 0,
        minCycleCount: 0,
        maxCycleCount: 0,
        totalClaimsWithData: 0,
      },
      byClaimType: [],
    });
    expect(extensionVsResolution.result.current.data).toEqual({
      extensions: {
        items: [],
        totalExtensions: 0,
        totalRevenue: 0,
      },
      resolutions: {
        items: [],
        totalResolutions: 0,
        totalCost: 0,
      },
    });
  });

  it('treats warranty analytics filter options as always-shaped', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyAnalyticsFilterOptions } = await import(
      '@/hooks/warranty/analytics/use-warranty-analytics'
    );

    const { result } = renderHook(() => useWarrantyAnalyticsFilterOptions(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      warrantyTypes: [],
      claimTypes: [],
      dateRanges: [],
    });
  });

  it('normalizes real analytics failures without inventing null semantics', async () => {
    mockGetWarrantyAnalyticsSummary.mockRejectedValueOnce({
      message: 'Gateway timeout',
      statusCode: 503,
      code: 'SERVER_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyAnalyticsSummary } = await import(
      '@/hooks/warranty/analytics/use-warranty-analytics'
    );

    const { result } = renderHook(() => useWarrantyAnalyticsSummary(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Warranty analytics summary is temporarily unavailable. Please refresh and try again.',
    });
  });

  it('keeps the combined dashboard in an error state when a headline analytics query fails', async () => {
    mockGetWarrantyAnalyticsSummary.mockRejectedValueOnce({
      message: 'Gateway timeout',
      statusCode: 503,
      code: 'SERVER_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWarrantyAnalyticsDashboard } = await import(
      '@/hooks/warranty/analytics/use-warranty-analytics'
    );

    const { result } = renderHook(() => useWarrantyAnalyticsDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.queries.summary as { error?: unknown }).error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
    });
    expect((result.current.queries.claimsByProduct as { isSuccess?: boolean }).isSuccess).toBe(true);
  });
});
