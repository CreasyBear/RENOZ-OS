import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewStats } from '@/components/domain/dashboard/overview/overview-stats';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', async () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

describe('OverviewStats', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('renders unavailable metrics as unavailable instead of zero', () => {
    render(
      <OverviewStats
        data={{
          wonThisMonth: {
            count: null,
            value: null,
            summaryState: 'unavailable',
          },
          ordersPending: {
            count: 0,
            summaryState: 'ready',
          },
          lowStockItems: {
            count: null,
            criticalCount: null,
            summaryState: 'unavailable',
          },
        }}
        summaryWarning="Some overview metrics are temporarily unavailable."
      />
    );

    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/summary unavailable/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('All fulfilled')).toBeInTheDocument();
  });

  it('routes the pending orders card to fulfillment instead of a partial status filter', () => {
    render(
      <OverviewStats
        data={{
          wonThisMonth: {
            count: 2,
            value: 5000,
            summaryState: 'ready',
          },
          ordersPending: {
            count: 4,
            summaryState: 'ready',
          },
          lowStockItems: {
            count: 1,
            criticalCount: 0,
            summaryState: 'ready',
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Orders Pending/i }));

    expect(navigate).toHaveBeenCalledWith({ to: '/orders/fulfillment' });
  });
});
