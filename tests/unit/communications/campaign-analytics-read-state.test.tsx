import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseCampaigns = vi.fn();
const mockUseEmailMetrics = vi.fn();

vi.mock('@/hooks/communications/use-campaigns', () => ({
  useCampaigns: (...args: unknown[]) => mockUseCampaigns(...args),
}));

vi.mock('@/hooks/communications/use-email-analytics', () => ({
  useEmailMetrics: (...args: unknown[]) => mockUseEmailMetrics(...args),
}));

vi.mock('@/components/shared', () => ({
  MetricCard: ({ title, value }: { title: string; value: string }) => (
    <div>
      <div>{title}</div>
      <div>{value}</div>
    </div>
  ),
}));

describe('campaign analytics read states', () => {
  it('uses operator-safe copy for cached analytics read failures', async () => {
    mockUseCampaigns.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      error: new Error('postgres timeout while loading campaign analytics'),
      refetch: vi.fn(),
    });
    mockUseEmailMetrics.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { default: AnalyticsPage } = await import(
      '@/routes/_authenticated/communications/campaigns/analytics-page'
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Showing cached analytics')).toBeInTheDocument();
    expect(
      screen.getByText('Campaign analytics are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('postgres timeout while loading campaign analytics')).not.toBeInTheDocument();
  });
});
